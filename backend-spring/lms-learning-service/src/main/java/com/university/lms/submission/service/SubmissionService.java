package com.university.lms.submission.service;

import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.submission.domain.Submission;
import com.university.lms.submission.domain.SubmissionComment;
import com.university.lms.submission.domain.SubmissionFile;
import com.university.lms.submission.dto.*;
import com.university.lms.submission.repository.SubmissionCommentRepository;
import com.university.lms.submission.repository.SubmissionFileRepository;
import com.university.lms.submission.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
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
    private final AssignmentRepository assignmentRepository;

    @Transactional(readOnly = true)
    public List<SubmissionResponse> getSubmissionsForAssignment(UUID assignmentId, UUID requesterId, String requesterRole) {
        List<Submission> submissions = isStaff(requesterRole)
                ? submissionRepository.findByAssignmentIdOrderByCreatedAtAsc(assignmentId)
                : submissionRepository.findByAssignmentIdAndUserIdOrderByCreatedAtAsc(assignmentId, requesterId);

        return submissions.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SubmissionResponse getMySubmission(UUID assignmentId, UUID userId) {
        return submissionRepository.findByAssignmentIdAndUserId(assignmentId, userId)
                .map(this::toResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public SubmissionResponse getSubmission(UUID submissionId, UUID requesterId, String requesterRole) {
        Submission submission = findSubmission(submissionId);
        assertCanAccess(submission, requesterId, requesterRole);
        return toResponse(submission);
    }

    @Transactional
    public SubmissionResponse createOrGetDraft(CreateSubmissionRequest request, UUID userId, String userEmail) {
        Submission submission = submissionRepository.findByAssignmentIdAndUserId(request.getAssignmentId(), userId)
                .orElseGet(() -> Submission.builder()
                        .assignmentId(request.getAssignmentId())
                        .userId(userId)
                        .studentEmail(userEmail)
                        .studentName(deriveNameFromEmail(userEmail))
                        .status("DRAFT")
                        .build());

        if (StringUtils.hasText(request.getContent())) {
            submission.setTextAnswer(request.getContent());
        }

        if (!StringUtils.hasText(submission.getStudentEmail()) && StringUtils.hasText(userEmail)) {
            submission.setStudentEmail(userEmail);
        }

        if (!StringUtils.hasText(submission.getStudentName()) && StringUtils.hasText(userEmail)) {
            submission.setStudentName(deriveNameFromEmail(userEmail));
        }

        Submission saved = submissionRepository.save(submission);
        return toResponse(saved);
    }

    @Transactional
    public SubmissionResponse createAndSubmit(
            UUID assignmentId,
            String content,
            List<MultipartFile> files,
            UUID userId,
            String userEmail) {

        Submission submission = submissionRepository.findByAssignmentIdAndUserId(assignmentId, userId)
                .orElseGet(() -> Submission.builder()
                        .assignmentId(assignmentId)
                        .userId(userId)
                        .studentEmail(userEmail)
                        .studentName(deriveNameFromEmail(userEmail))
                        .status("DRAFT")
                        .build());

        if (StringUtils.hasText(content)) {
            submission.setTextAnswer(content);
        }

        submission.setStatus("SUBMITTED");
        submission.setSubmittedAt(LocalDateTime.now());
        applyLateFlags(submission, submission.getSubmittedAt());

        Submission saved = submissionRepository.save(submission);
        addFilesInternal(saved, files);

        return toResponse(findSubmission(saved.getId()));
    }

    @Transactional
    public SubmissionResponse uploadFiles(
            UUID submissionId,
            List<MultipartFile> files,
            UUID requesterId,
            String requesterRole) {

        Submission submission = findSubmission(submissionId);
        assertOwnerOrStaff(submission, requesterId, requesterRole);

        addFilesInternal(submission, files);
        return toResponse(findSubmission(submissionId));
    }

    @Transactional
    public SubmissionResponse submit(
            UUID submissionId,
            SubmitSubmissionRequest request,
            UUID requesterId,
            String requesterRole) {

        Submission submission = findSubmission(submissionId);
        assertOwnerOrStaff(submission, requesterId, requesterRole);

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

        submission.setStatus("SUBMITTED");
        submission.setSubmittedAt(LocalDateTime.now());
        applyLateFlags(submission, submission.getSubmittedAt());

        submissionRepository.save(submission);
        return toResponse(findSubmission(submissionId));
    }

    @Transactional
    public SubmissionResponse grade(
            UUID submissionId,
            GradeSubmissionRequest request,
            UUID graderId,
            String requesterRole) {

        if (!isStaff(requesterRole)) {
            throw new ValidationException("Only teaching staff can grade submissions");
        }

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
        return toResponse(findSubmission(submissionId));
    }

    @Transactional
    public SubmissionResponse addComment(
            UUID submissionId,
            AddCommentRequest request,
            UUID authorId,
            String authorEmail,
            String requesterRole) {

        Submission submission = findSubmission(submissionId);
        assertOwnerOrStaff(submission, authorId, requesterRole);

        SubmissionComment comment = SubmissionComment.builder()
                .submission(submission)
                .authorId(authorId)
                .authorEmail(authorEmail)
                .authorName(deriveNameFromEmail(authorEmail))
                .comment(request.getComment())
                .build();

        submissionCommentRepository.save(comment);
        return toResponse(findSubmission(submissionId));
    }

    @Transactional(readOnly = true)
    public SpeedGraderResponse getSpeedGraderQueue(UUID assignmentId, String requesterRole) {
        if (!isStaff(requesterRole)) {
            throw new ValidationException("Only teaching staff can access speedgrader queue");
        }

        List<Submission> all = submissionRepository.findByAssignmentIdOrderByCreatedAtAsc(assignmentId);

        List<SubmissionResponse> ungraded = all.stream()
                .filter(s -> !"GRADED".equalsIgnoreCase(s.getStatus()))
                .map(this::toResponse)
                .collect(Collectors.toList());

        List<SubmissionResponse> recentlyGraded = all.stream()
                .filter(s -> "GRADED".equalsIgnoreCase(s.getStatus()))
                .sorted(Comparator.comparing(Submission::getGradedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toResponse)
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
        assertCanAccess(submission, requesterId, requesterRole);

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

    private void assertCanAccess(Submission submission, UUID requesterId, String requesterRole) {
        if (requesterId == null && !StringUtils.hasText(requesterRole)) {
            // Internal service-to-service read where no end-user context is propagated.
            return;
        }

        if (isStaff(requesterRole)) {
            return;
        }

        if (requesterId == null || !submission.getUserId().equals(requesterId)) {
            throw new ValidationException("You do not have access to this submission");
        }
    }

    private void assertOwnerOrStaff(Submission submission, UUID requesterId, String requesterRole) {
        if (isStaff(requesterRole)) {
            return;
        }

        if (!submission.getUserId().equals(requesterId)) {
            throw new ValidationException("Only submission owner or teaching staff can perform this action");
        }
    }

    private boolean isStaff(String role) {
        return "TEACHER".equalsIgnoreCase(role)
                || "TA".equalsIgnoreCase(role)
                || "SUPERADMIN".equalsIgnoreCase(role);
    }

    private void applyLateFlags(Submission submission, LocalDateTime submittedAt) {
        try {
            LocalDateTime dueDate = assignmentRepository.findById(submission.getAssignmentId())
                    .map(assignment -> assignment.getDueDate())
                    .orElse(null);

            if (dueDate == null || submittedAt == null) {
                submission.setIsLate(false);
                submission.setDaysLate(0);
                return;
            }

            if (submittedAt.isAfter(dueDate)) {
                long minutesLate = Duration.between(dueDate, submittedAt).toMinutes();
                int daysLate = (int) Math.max(1, Math.ceil(minutesLate / 1440.0));
                submission.setIsLate(true);
                submission.setDaysLate(daysLate);
            } else {
                submission.setIsLate(false);
                submission.setDaysLate(0);
            }
        } catch (Exception ex) {
            log.debug("Unable to resolve assignment due date for late calculation: {}", ex.getMessage());
            submission.setIsLate(false);
            submission.setDaysLate(0);
        }
    }

    private SubmissionResponse toResponse(Submission submission) {
        List<SubmissionFileResponse> files = Optional.ofNullable(submission.getFiles())
                .orElseGet(List::of)
                .stream()
                .sorted(Comparator.comparing(SubmissionFile::getUploadedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(file -> SubmissionFileResponse.builder()
                        .id(file.getId())
                        .filename(file.getFilename())
                        .fileUrl(file.getFileUrl())
                        .fileSize(file.getFileSize())
                        .uploadedAt(file.getUploadedAt())
                        .build())
                .collect(Collectors.toList());

        List<SubmissionCommentResponse> comments = Optional.ofNullable(submission.getComments())
                .orElseGet(List::of)
                .stream()
                .sorted(Comparator.comparing(SubmissionComment::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(comment -> SubmissionCommentResponse.builder()
                        .id(comment.getId())
                        .authorId(comment.getAuthorId())
                        .authorName(comment.getAuthorName())
                        .authorEmail(comment.getAuthorEmail())
                        .comment(comment.getComment())
                        .createdAt(comment.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        String studentEmail = firstNonBlank(submission.getStudentEmail());
        String studentName = firstNonBlank(submission.getStudentName(), deriveNameFromEmail(studentEmail));

        return SubmissionResponse.builder()
                .id(submission.getId())
                .assignmentId(submission.getAssignmentId())
                .userId(submission.getUserId())
                .user(submission.getUserId() != null ? submission.getUserId().toString() : null)
                .studentName(studentName)
                .studentEmail(studentEmail)
                .status(submission.getStatus())
                .textAnswer(submission.getTextAnswer())
                .submissionUrl(submission.getSubmissionUrl())
                .programmingLanguage(submission.getProgrammingLanguage())
                .grade(submission.getGrade())
                .feedback(submission.getFeedback())
                .rubricEvaluation(submission.getRubricEvaluation())
                .isLate(submission.getIsLate())
                .daysLate(submission.getDaysLate())
                .submittedAt(submission.getSubmittedAt())
                .gradedAt(submission.getGradedAt())
                .createdAt(submission.getCreatedAt())
                .updatedAt(submission.getUpdatedAt())
                .files(files)
                .uploadedFiles(files)
                .comments(comments)
                .build();
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

    private String deriveNameFromEmail(String email) {
        if (!StringUtils.hasText(email)) {
            return "Student";
        }

        String localPart = email.split("@")[0];
        if (!StringUtils.hasText(localPart)) {
            return "Student";
        }

        String[] tokens = localPart.replace('.', ' ').replace('_', ' ').split("\\s+");
        return Arrays.stream(tokens)
                .filter(StringUtils::hasText)
                .map(token -> Character.toUpperCase(token.charAt(0)) + token.substring(1))
                .collect(Collectors.joining(" "));
    }

    public record DownloadedFile(Resource resource, MediaType mediaType, String fileName) {
    }
}
