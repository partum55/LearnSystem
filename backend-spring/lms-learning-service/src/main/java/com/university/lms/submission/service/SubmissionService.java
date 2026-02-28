package com.university.lms.submission.service;

import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.submission.domain.Submission;
import com.university.lms.submission.domain.SubmissionComment;
import com.university.lms.submission.domain.SubmissionFile;
import com.university.lms.submission.dto.AddCommentRequest;
import com.university.lms.submission.dto.CreateSubmissionRequest;
import com.university.lms.submission.dto.GradeSubmissionRequest;
import com.university.lms.submission.dto.SpeedGraderResponse;
import com.university.lms.submission.dto.SubmissionResponse;
import com.university.lms.submission.dto.SubmitSubmissionRequest;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.gradebook.event.SubmissionGradedEvent;
import com.university.lms.submission.repository.SubmissionCommentRepository;
import com.university.lms.submission.repository.SubmissionFileRepository;
import com.university.lms.submission.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Core submission domain service.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final SubmissionFileRepository submissionFileRepository;
    private final SubmissionCommentRepository submissionCommentRepository;
    private final SubmissionFileStorageService fileStorageService;
    private final SubmissionAccessService submissionAccessService;
    private final SubmissionLateStatusService submissionLateStatusService;
    private final SubmissionMapper submissionMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final AssignmentRepository assignmentRepository;

    @Transactional(readOnly = true)
    public List<SubmissionResponse> getSubmissionsForAssignment(UUID assignmentId, UUID requesterId, String requesterRole) {
        List<Submission> submissions = submissionAccessService.isStaff(requesterRole)
                ? submissionRepository.findByAssignmentIdOrderByCreatedAtAsc(assignmentId)
                : submissionRepository.findByAssignmentIdAndUserIdOrderByCreatedAtAsc(assignmentId, requesterId);

        return submissions.stream().map(submissionMapper::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SubmissionResponse getMySubmission(UUID assignmentId, UUID userId) {
        return submissionRepository.findByAssignmentIdAndUserId(assignmentId, userId)
                .map(submissionMapper::toResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public SubmissionResponse getSubmission(UUID submissionId, UUID requesterId, String requesterRole) {
        Submission submission = findSubmission(submissionId);
        submissionAccessService.assertCanAccess(submission, requesterId, requesterRole);
        return submissionMapper.toResponse(submission);
    }

    @Transactional
    public SubmissionResponse createOrGetDraft(CreateSubmissionRequest request, UUID userId, String userEmail) {
        Submission submission = findOrCreateSubmission(request.getAssignmentId(), userId, userEmail);

        if (StringUtils.hasText(request.getContent())) {
            submission.setTextAnswer(request.getContent());
        }

        ensureStudentIdentity(submission, userEmail);

        Submission saved = submissionRepository.save(submission);
        return submissionMapper.toResponse(saved);
    }

    @Transactional
    public SubmissionResponse createAndSubmit(
            UUID assignmentId,
            String content,
            List<MultipartFile> files,
            UUID userId,
            String userEmail) {

        Submission submission = findOrCreateSubmission(assignmentId, userId, userEmail);

        if (StringUtils.hasText(content)) {
            submission.setTextAnswer(content);
        }

        ensureStudentIdentity(submission, userEmail);
        markSubmitted(submission);

        Submission saved = submissionRepository.save(submission);
        addFilesInternal(saved, files);

        return submissionMapper.toResponse(findSubmission(saved.getId()));
    }

    @Transactional
    public SubmissionResponse uploadFiles(
            UUID submissionId,
            List<MultipartFile> files,
            UUID requesterId,
            String requesterRole) {

        Submission submission = findSubmission(submissionId);
        submissionAccessService.assertOwnerOrStaff(submission, requesterId, requesterRole);

        addFilesInternal(submission, files);
        return submissionMapper.toResponse(findSubmission(submissionId));
    }

    @Transactional
    public SubmissionResponse submit(
            UUID submissionId,
            SubmitSubmissionRequest request,
            UUID requesterId,
            String requesterRole) {

        Submission submission = findSubmission(submissionId);
        submissionAccessService.assertOwnerOrStaff(submission, requesterId, requesterRole);

        applySubmissionPayload(submission, request);
        markSubmitted(submission);

        submissionRepository.save(submission);
        return submissionMapper.toResponse(findSubmission(submissionId));
    }

    @Transactional
    public SubmissionResponse grade(
            UUID submissionId,
            GradeSubmissionRequest request,
            UUID graderId,
            String requesterRole) {

        submissionAccessService.assertStaff(requesterRole, "Only teaching staff can grade submissions");

        Submission submission = findSubmission(submissionId);
        BigDecimal grade = request.resolvedGrade();

        if (grade == null) {
            throw new ValidationException("grade", "Grade value is required");
        }

        submission.setGrade(grade);
        submission.setFeedback(request.getFeedback());
        if (request.getRubricEvaluation() != null) {
            submission.setRubricEvaluation(request.getRubricEvaluation());
        }
        submission.setStatus("GRADED");
        submission.setGradedAt(LocalDateTime.now());
        submission.setGraderId(graderId);

        submissionRepository.save(submission);

        // Publish event so gradebook entry is created/updated
        try {
            UUID courseId = assignmentRepository.findById(submission.getAssignmentId())
                    .map(a -> a.getCourseId())
                    .orElse(null);
            if (courseId != null) {
                eventPublisher.publishEvent(new SubmissionGradedEvent(
                        this,
                        submission.getId(),
                        submission.getAssignmentId(),
                        submission.getUserId(),
                        courseId,
                        grade,
                        Boolean.TRUE.equals(submission.getIsLate())
                ));
                log.info("Published SubmissionGradedEvent for submission {}", submissionId);
            }
        } catch (Exception e) {
            log.warn("Failed to publish SubmissionGradedEvent: {}", e.getMessage());
        }

        return submissionMapper.toResponse(findSubmission(submissionId));
    }

    @Transactional
    public SubmissionResponse addComment(
            UUID submissionId,
            AddCommentRequest request,
            UUID authorId,
            String authorEmail,
            String requesterRole) {

        Submission submission = findSubmission(submissionId);
        submissionAccessService.assertOwnerOrStaff(submission, authorId, requesterRole);

        SubmissionComment comment = SubmissionComment.builder()
                .submission(submission)
                .authorId(authorId)
                .authorEmail(authorEmail)
                .authorName(submissionMapper.deriveNameFromEmail(authorEmail))
                .comment(request.getComment())
                .build();

        submissionCommentRepository.save(comment);
        return submissionMapper.toResponse(findSubmission(submissionId));
    }

    @Transactional(readOnly = true)
    public SpeedGraderResponse getSpeedGraderQueue(UUID assignmentId, String requesterRole) {
        submissionAccessService.assertStaff(requesterRole, "Only teaching staff can access speedgrader queue");

        List<Submission> all = submissionRepository.findByAssignmentIdOrderByCreatedAtAsc(assignmentId);

        List<SubmissionResponse> ungraded = all.stream()
                .filter(s -> !"GRADED".equalsIgnoreCase(s.getStatus()))
                .map(submissionMapper::toResponse)
                .collect(Collectors.toList());

        List<SubmissionResponse> recentlyGraded = all.stream()
                .filter(s -> "GRADED".equalsIgnoreCase(s.getStatus()))
                .sorted(Comparator.comparing(Submission::getGradedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(submissionMapper::toResponse)
                .collect(Collectors.toList());

        return SpeedGraderResponse.builder()
                .ungraded(ungraded)
                .recentlyGraded(recentlyGraded)
                .build();
    }

    @Transactional(readOnly = true)
    public DownloadedFile loadFile(
            UUID submissionId,
            UUID fileId,
            UUID requesterId,
            String requesterRole) {

        Submission submission = findSubmission(submissionId);
        submissionAccessService.assertCanAccess(submission, requesterId, requesterRole);

        SubmissionFile file = submissionFileRepository.findByIdAndSubmission_Id(fileId, submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("SubmissionFile", "id", fileId));

        Resource resource = new PathResource(file.getStoragePath());
        if (!resource.exists() || !resource.isReadable()) {
            throw new ResourceNotFoundException("Submission file content not found");
        }

        MediaType mediaType = MediaTypeFactory.getMediaType(file.getFilename())
                .orElse(MediaType.APPLICATION_OCTET_STREAM);

        return new DownloadedFile(resource, mediaType, file.getFilename());
    }

    private Submission findOrCreateSubmission(UUID assignmentId, UUID userId, String userEmail) {
        return submissionRepository.findByAssignmentIdAndUserId(assignmentId, userId)
                .orElseGet(() -> Submission.builder()
                        .assignmentId(assignmentId)
                        .userId(userId)
                        .studentEmail(userEmail)
                        .studentName(submissionMapper.deriveNameFromEmail(userEmail))
                        .status("DRAFT")
                        .build());
    }

    private void ensureStudentIdentity(Submission submission, String userEmail) {
        if (!StringUtils.hasText(submission.getStudentEmail()) && StringUtils.hasText(userEmail)) {
            submission.setStudentEmail(userEmail);
        }

        if (!StringUtils.hasText(submission.getStudentName()) && StringUtils.hasText(userEmail)) {
            submission.setStudentName(submissionMapper.deriveNameFromEmail(userEmail));
        }
    }

    private void markSubmitted(Submission submission) {
        LocalDateTime submittedAt = LocalDateTime.now();
        submission.setStatus("SUBMITTED");
        submission.setSubmittedAt(submittedAt);
        submissionLateStatusService.applyLateFlags(submission, submittedAt);
    }

    private void applySubmissionPayload(Submission submission, SubmitSubmissionRequest request) {
        String submissionType = normalize(request.getType(), "UNKNOWN");

        switch (submissionType) {
            case "CODE" -> {
                String code = firstNonBlank(request.getCode(), request.getTextAnswer());
                if (!StringUtils.hasText(code)) {
                    throw new ValidationException("code", "Code submission is empty");
                }
                submission.setTextAnswer(code);
                submission.setProgrammingLanguage(request.getLanguage());
            }
            case "TEXT" -> {
                if (!StringUtils.hasText(request.getTextAnswer())) {
                    throw new ValidationException("textAnswer", "Text submission is empty");
                }
                submission.setTextAnswer(request.getTextAnswer());
            }
            case "URL" -> {
                if (!StringUtils.hasText(request.getUrl())) {
                    throw new ValidationException("url", "Submission URL is empty");
                }
                submission.setSubmissionUrl(request.getUrl());
            }
            default -> {
                if (StringUtils.hasText(request.getTextAnswer())) {
                    submission.setTextAnswer(request.getTextAnswer());
                }
                if (StringUtils.hasText(request.getUrl())) {
                    submission.setSubmissionUrl(request.getUrl());
                }
            }
        }
    }

    private void addFilesInternal(Submission submission, List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            return;
        }

        for (MultipartFile multipartFile : files) {
            SubmissionFileStorageService.StoredFile stored = fileStorageService.store(submission.getId(), multipartFile);

            SubmissionFile file = SubmissionFile.builder()
                    .submission(submission)
                    .filename(stored.getOriginalFilename())
                    .fileUrl("")
                    .storagePath(stored.getStoragePath())
                    .contentType(stored.getContentType())
                    .fileSize(stored.getSize())
                    .build();

            SubmissionFile savedFile = submissionFileRepository.save(file);
            savedFile.setFileUrl("/submissions/" + submission.getId() + "/files/" + savedFile.getId());
            submissionFileRepository.save(savedFile);
        }
    }

    private Submission findSubmission(UUID submissionId) {
        return submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission", "id", submissionId));
    }

    private String normalize(String value, String fallback) {
        if (!StringUtils.hasText(value)) {
            return fallback;
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    public record DownloadedFile(Resource resource, MediaType mediaType, String fileName) {
    }
}
