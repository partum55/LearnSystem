package com.university.lms.submission.service;

import com.university.lms.common.exception.ConflictException;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.gradebook.event.SubmissionGradedEvent;
import com.university.lms.submission.domain.Submission;
import com.university.lms.submission.domain.SubmissionComment;
import com.university.lms.submission.domain.SubmissionFile;
import com.university.lms.submission.domain.SubmissionGradeAudit;
import com.university.lms.submission.dto.AddCommentRequest;
import com.university.lms.submission.dto.BulkPublishGradesRequest;
import com.university.lms.submission.dto.BulkPublishGradesResponse;
import com.university.lms.submission.dto.CreateSubmissionRequest;
import com.university.lms.submission.dto.GradeDraftRequest;
import com.university.lms.submission.dto.PublishGradeRequest;
import com.university.lms.submission.dto.ReviewQueueResponse;
import com.university.lms.submission.dto.SpeedGraderResponse;
import com.university.lms.submission.dto.SubmissionResponse;
import com.university.lms.submission.dto.SubmitSubmissionRequest;
import com.university.lms.submission.dto.UpdateSubmissionDraftRequest;
import com.university.lms.submission.repository.SubmissionCommentRepository;
import com.university.lms.submission.repository.SubmissionFileRepository;
import com.university.lms.submission.repository.SubmissionGradeAuditRepository;
import com.university.lms.submission.repository.SubmissionRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
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

/**
 * Core submission domain service.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionService {

  private static final String STATUS_DRAFT = "DRAFT";
  private static final String STATUS_SUBMITTED = "SUBMITTED";
  private static final String STATUS_IN_REVIEW = "IN_REVIEW";
  private static final String STATUS_GRADED_DRAFT = "GRADED_DRAFT";
  private static final String STATUS_GRADED_PUBLISHED = "GRADED_PUBLISHED";
  private static final String ASSIGNMENT_TYPE_SEMINAR = "SEMINAR";

  private final SubmissionRepository submissionRepository;
  private final SubmissionFileRepository submissionFileRepository;
  private final SubmissionCommentRepository submissionCommentRepository;
  private final SubmissionGradeAuditRepository submissionGradeAuditRepository;
  private final SubmissionFileStorageService fileStorageService;
  private final SubmissionAccessService submissionAccessService;
  private final SubmissionLateStatusService submissionLateStatusService;
  private final SubmissionMapper submissionMapper;
  private final ApplicationEventPublisher eventPublisher;
  private final AssignmentRepository assignmentRepository;

  @Transactional(readOnly = true)
  public List<SubmissionResponse> getSubmissionsForAssignment(
      UUID assignmentId, UUID requesterId, String requesterRole) {
    List<Submission> submissions =
        submissionAccessService.isStaff(requesterRole)
            ? submissionRepository.findByAssignmentIdOrderByCreatedAtAsc(assignmentId)
            : submissionRepository.findByAssignmentIdAndUserIdOrderByCreatedAtAsc(
                assignmentId, requesterId);

    return submissions.stream()
        .map(submission -> toResponseForViewer(submission, requesterRole))
        .collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public SubmissionResponse getMySubmission(UUID assignmentId, UUID userId) {
    return submissionRepository
        .findByAssignmentIdAndUserId(assignmentId, userId)
        .map(submission -> toResponseForViewer(submission, "STUDENT"))
        .orElse(null);
  }

  @Transactional(readOnly = true)
  public SubmissionResponse getSubmission(UUID submissionId, UUID requesterId, String requesterRole) {
    Submission submission = findSubmission(submissionId);
    submissionAccessService.assertCanAccess(submission, requesterId, requesterRole);
    return toResponseForViewer(submission, requesterRole);
  }

  @Transactional
  public SubmissionResponse createOrGetDraft(CreateSubmissionRequest request, UUID userId, String userEmail) {
    Submission submission = findOrCreateSubmission(request.getAssignmentId(), userId, userEmail);

    if (StringUtils.hasText(request.getContent())) {
      submission.setTextAnswer(request.getContent());
    }

    ensureStudentIdentity(submission, userEmail);

    Submission saved = submissionRepository.save(submission);
    return toResponseForViewer(saved, "STUDENT");
  }

  @Transactional
  public SubmissionResponse createAndSubmit(
      UUID assignmentId, String content, List<MultipartFile> files, UUID userId, String userEmail) {

    Submission submission = findOrCreateSubmission(assignmentId, userId, userEmail);
    ensureStudentIdentity(submission, userEmail);

    Snapshot before = Snapshot.from(submission);
    String previousStatus = normalize(submission.getStatus(), STATUS_DRAFT);

    if (StringUtils.hasText(content)) {
      submission.setTextAnswer(content);
    }

    Submission saved = submissionRepository.save(submission);
    addFilesInternal(saved, files);
    Submission reloaded = findSubmission(saved.getId());

    if (!STATUS_DRAFT.equals(previousStatus) && !hasSubmissionChanged(reloaded, before)) {
      throw new ValidationException(
          "submission", "No changes detected. Update content or files before resubmitting");
    }

    LocalDateTime now = LocalDateTime.now();
    if (!STATUS_DRAFT.equals(previousStatus)) {
      reloaded.setSubmissionVersion(nextSubmissionVersion(reloaded.getSubmissionVersion()));
      reloaded.setLastResubmittedAt(now);
    }

    transitionToInReview(reloaded, now);
    submissionRepository.save(reloaded);

    return toResponseForViewer(findSubmission(reloaded.getId()), "STUDENT");
  }

  @Transactional
  public SubmissionResponse uploadFiles(
      UUID submissionId, List<MultipartFile> files, UUID requesterId, String requesterRole) {

    Submission submission = findSubmission(submissionId);
    submissionAccessService.assertOwnerOrStaff(submission, requesterId, requesterRole);

    addFilesInternal(submission, files);
    return toResponseForViewer(findSubmission(submissionId), requesterRole);
  }

  @Transactional
  public SubmissionResponse submit(
      UUID submissionId,
      SubmitSubmissionRequest request,
      UUID requesterId,
      String requesterRole) {

    Submission submission = findSubmission(submissionId);
    submissionAccessService.assertOwnerOrStaff(submission, requesterId, requesterRole);

    SubmitSubmissionRequest safeRequest = request == null ? new SubmitSubmissionRequest() : request;
    Snapshot before = Snapshot.from(submission);
    String previousStatus = normalize(submission.getStatus(), STATUS_DRAFT);

    applySubmissionPayload(submission, safeRequest);

    if (!STATUS_DRAFT.equals(previousStatus) && !hasSubmissionChanged(submission, before)) {
      throw new ValidationException(
          "submission", "No changes detected. Update content or files before resubmitting");
    }

    LocalDateTime now = LocalDateTime.now();
    if (!STATUS_DRAFT.equals(previousStatus)) {
      submission.setSubmissionVersion(nextSubmissionVersion(submission.getSubmissionVersion()));
      submission.setLastResubmittedAt(now);
    }

    transitionToInReview(submission, now);
    submissionRepository.save(submission);
    return toResponseForViewer(findSubmission(submissionId), requesterRole);
  }

  @Transactional
  public SubmissionResponse updateDraft(
      UUID submissionId,
      UpdateSubmissionDraftRequest request,
      UUID requesterId,
      String requesterRole) {

    Submission submission = findSubmission(submissionId);
    submissionAccessService.assertOwnerOrStaff(submission, requesterId, requesterRole);

    if (!STATUS_DRAFT.equalsIgnoreCase(submission.getStatus())) {
      throw new ValidationException("draft", "Only draft submissions can be updated");
    }

    if (request.getContent() != null) {
      submission.setTextAnswer(request.getContent());
    } else if (request.getTextAnswer() != null) {
      submission.setTextAnswer(request.getTextAnswer());
    }

    if (request.getSubmissionUrl() != null) {
      submission.setSubmissionUrl(request.getSubmissionUrl());
    }

    if (request.getProgrammingLanguage() != null) {
      submission.setProgrammingLanguage(request.getProgrammingLanguage());
    }

    Submission saved = submissionRepository.save(submission);
    return toResponseForViewer(saved, requesterRole);
  }

  @Transactional
  public SubmissionResponse saveGradeDraft(
      UUID submissionId,
      GradeDraftRequest request,
      UUID graderId,
      String requesterRole) {

    submissionAccessService.assertStaff(requesterRole, "Only teaching staff can save draft grades");

    Submission submission = findSubmission(submissionId);
    assertVersionMatches(submission, request.getVersion());

    if (STATUS_DRAFT.equalsIgnoreCase(submission.getStatus())) {
      throw new ValidationException("submission", "Submission has not been submitted yet");
    }

    Assignment assignment = findAssignment(submission.getAssignmentId());

    BigDecimal rawScore = firstNonNull(request.getRawScore(), submission.getRawScore());
    BigDecimal finalScore = request.getFinalScore();

    if (finalScore == null && rawScore != null) {
      finalScore =
          Boolean.TRUE.equals(request.getOverridePenalty())
              ? rawScore
              : calculatePenaltyAdjustedScore(rawScore, submission, assignment);
    }

    if (finalScore == null) {
      throw new ValidationException("grade", "Draft final score is required");
    }

    finalScore = roundScore(finalScore);
    rawScore = rawScore == null ? null : roundScore(rawScore);

    BigDecimal prevRaw = submission.getRawScore();
    BigDecimal prevFinal = firstNonNull(submission.getDraftGrade(), submission.getPublishedGrade());
    String prevFeedback = firstNonBlank(submission.getDraftFeedback(), submission.getPublishedFeedback());

    submission.setRawScore(rawScore);
    submission.setDraftGrade(finalScore);
    submission.setDraftFeedback(request.getFeedback());
    submission.setStatus(STATUS_GRADED_DRAFT);
    submission.setGradedAt(LocalDateTime.now());
    submission.setGraderId(graderId);

    Submission saved = submissionRepository.save(submission);

    recordAudit(
        saved,
        graderId,
        "DRAFT_SAVE",
        prevRaw,
        saved.getRawScore(),
        prevFinal,
        saved.getDraftGrade(),
        prevFeedback,
        saved.getDraftFeedback());

    return toResponseForViewer(saved, requesterRole);
  }

  @Transactional
  public SubmissionResponse publishGrade(
      UUID submissionId,
      PublishGradeRequest request,
      UUID graderId,
      String requesterRole) {

    submissionAccessService.assertStaff(requesterRole, "Only teaching staff can publish grades");

    Submission submission = findSubmission(submissionId);
    assertVersionMatches(submission, request.getVersion());

    BigDecimal finalScore =
        firstNonNull(request.getFinalScore(), submission.getDraftGrade(), submission.getPublishedGrade(), submission.getGrade());

    if (finalScore == null) {
      throw new ValidationException("grade", "Published score is required");
    }

    finalScore = roundScore(finalScore);
    String feedback = firstNonBlank(request.getFeedback(), submission.getDraftFeedback(), submission.getPublishedFeedback(), submission.getFeedback());

    BigDecimal prevFinal = submission.getPublishedGrade();
    String prevFeedback = submission.getPublishedFeedback();

    submission.setPublishedGrade(finalScore);
    submission.setPublishedFeedback(feedback);
    submission.setPublishedAt(LocalDateTime.now());
    submission.setPublishedBy(graderId);

    submission.setGrade(finalScore);
    submission.setFeedback(feedback);
    submission.setStatus(STATUS_GRADED_PUBLISHED);
    submission.setGradedAt(LocalDateTime.now());
    submission.setGraderId(graderId);

    submission.setDraftGrade(null);
    submission.setDraftFeedback(null);

    Submission saved = submissionRepository.save(submission);

    recordAudit(
        saved,
        graderId,
        "PUBLISH",
        saved.getRawScore(),
        saved.getRawScore(),
        prevFinal,
        saved.getPublishedGrade(),
        prevFeedback,
        saved.getPublishedFeedback());

    publishGradebookEvent(saved, finalScore);

    return toResponseForViewer(saved, requesterRole);
  }

  @Transactional
  public BulkPublishGradesResponse publishBulk(
      BulkPublishGradesRequest request,
      UUID graderId,
      String requesterRole) {

    submissionAccessService.assertStaff(requesterRole, "Only teaching staff can publish grades");

    List<BulkPublishGradesResponse.ItemResult> results = new ArrayList<>();
    int published = 0;

    for (BulkPublishGradesRequest.BulkPublishItem item : request.getItems()) {
      try {
        publishGrade(
            item.getSubmissionId(),
            PublishGradeRequest.builder().version(item.getVersion()).build(),
            graderId,
            requesterRole);
        published++;
        results.add(
            BulkPublishGradesResponse.ItemResult.builder()
                .submissionId(item.getSubmissionId())
                .status("published")
                .message("Published")
                .build());
      } catch (ResourceNotFoundException ex) {
        results.add(
            BulkPublishGradesResponse.ItemResult.builder()
                .submissionId(item.getSubmissionId())
                .status("not_found")
                .message(ex.getMessage())
                .build());
      } catch (ConflictException ex) {
        results.add(
            BulkPublishGradesResponse.ItemResult.builder()
                .submissionId(item.getSubmissionId())
                .status("conflict")
                .message(ex.getMessage())
                .build());
      } catch (ValidationException ex) {
        results.add(
            BulkPublishGradesResponse.ItemResult.builder()
                .submissionId(item.getSubmissionId())
                .status("validation_error")
                .message(ex.getMessage())
                .build());
      }
    }

    return BulkPublishGradesResponse.builder()
        .total(request.getItems().size())
        .published(published)
        .results(results)
        .build();
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

    SubmissionComment comment =
        SubmissionComment.builder()
            .submission(submission)
            .authorId(authorId)
            .authorEmail(authorEmail)
            .authorName(submissionMapper.deriveNameFromEmail(authorEmail))
            .comment(request.getComment())
            .build();

    submissionCommentRepository.save(comment);
    return toResponseForViewer(findSubmission(submissionId), requesterRole);
  }

  @Transactional(readOnly = true)
  public SpeedGraderResponse getSpeedGraderQueue(UUID assignmentId, String requesterRole) {
    submissionAccessService.assertStaff(requesterRole, "Only teaching staff can access speedgrader queue");

    List<Submission> all = submissionRepository.findByAssignmentIdOrderByCreatedAtAsc(assignmentId);

    List<SubmissionResponse> ungraded =
        all.stream()
            .filter(s -> !STATUS_GRADED_PUBLISHED.equalsIgnoreCase(s.getStatus()))
            .map(s -> toResponseForViewer(s, requesterRole))
            .collect(Collectors.toList());

    List<SubmissionResponse> recentlyGraded =
        all.stream()
            .filter(s -> STATUS_GRADED_PUBLISHED.equalsIgnoreCase(s.getStatus()))
            .sorted(
                Comparator.comparing(
                    Submission::getPublishedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .map(s -> toResponseForViewer(s, requesterRole))
            .collect(Collectors.toList());

    return SpeedGraderResponse.builder().ungraded(ungraded).recentlyGraded(recentlyGraded).build();
  }

  @Transactional(readOnly = true)
  public ReviewQueueResponse getReviewQueue(
      UUID assignmentId,
      String status,
      String search,
      int page,
      int size,
      String sort,
      String requesterRole) {

    submissionAccessService.assertStaff(requesterRole, "Only teaching staff can access review queue");

    int safePage = Math.max(page, 0);
    int safeSize = Math.min(Math.max(size, 1), 100);

    String normalizedStatus = StringUtils.hasText(status) ? status.trim().toUpperCase(Locale.ROOT) : null;
    String normalizedSearch = StringUtils.hasText(search) ? search.trim().toLowerCase(Locale.ROOT) : null;

    List<Submission> filtered =
        submissionRepository.findByAssignmentIdOrderByCreatedAtAsc(assignmentId).stream()
            .filter(
                submission ->
                    normalizedStatus == null
                        || normalizedStatus.equals(normalize(submission.getStatus(), "")))
            .filter(
                submission -> {
                  if (normalizedSearch == null) {
                    return true;
                  }
                  String studentName =
                      submission.getStudentName() == null
                          ? ""
                          : submission.getStudentName().toLowerCase(Locale.ROOT);
                  String studentEmail =
                      submission.getStudentEmail() == null
                          ? ""
                          : submission.getStudentEmail().toLowerCase(Locale.ROOT);
                  return studentName.contains(normalizedSearch) || studentEmail.contains(normalizedSearch);
                })
            .sorted(queueComparator(sort))
            .toList();

    int total = filtered.size();
    int fromIndex = Math.min(safePage * safeSize, total);
    int toIndex = Math.min(fromIndex + safeSize, total);

    List<SubmissionResponse> content =
        filtered.subList(fromIndex, toIndex).stream()
            .map(submission -> toResponseForViewer(submission, requesterRole))
            .collect(Collectors.toList());

    int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / safeSize);

    return ReviewQueueResponse.builder()
        .content(content)
        .pageNumber(safePage)
        .pageSize(safeSize)
        .totalElements(total)
        .totalPages(totalPages)
        .build();
  }

  @Transactional(readOnly = true)
  public DownloadedFile loadFile(UUID submissionId, UUID fileId, UUID requesterId, String requesterRole) {

    Submission submission = findSubmission(submissionId);
    submissionAccessService.assertCanAccess(submission, requesterId, requesterRole);

    SubmissionFile file =
        submissionFileRepository
            .findByIdAndSubmission_Id(fileId, submissionId)
            .orElseThrow(() -> new ResourceNotFoundException("SubmissionFile", "id", fileId));

    Resource resource = new PathResource(file.getStoragePath());
    if (!resource.exists() || !resource.isReadable()) {
      throw new ResourceNotFoundException("Submission file content not found");
    }

    MediaType mediaType =
        MediaTypeFactory.getMediaType(file.getFilename()).orElse(MediaType.APPLICATION_OCTET_STREAM);

    return new DownloadedFile(resource, mediaType, file.getFilename());
  }

  private Submission findOrCreateSubmission(UUID assignmentId, UUID userId, String userEmail) {
    assertSubmissionAllowed(assignmentId);
    return submissionRepository
        .findByAssignmentIdAndUserId(assignmentId, userId)
        .orElseGet(
            () ->
                Submission.builder()
                    .assignmentId(assignmentId)
                    .userId(userId)
                    .studentEmail(userEmail)
                    .studentName(submissionMapper.deriveNameFromEmail(userEmail))
                    .status(STATUS_DRAFT)
                    .submissionVersion(1)
                    .build());
  }

  private void assertSubmissionAllowed(UUID assignmentId) {
    Assignment assignment = findAssignment(assignmentId);
    String assignmentType = normalize(assignment.getAssignmentType(), "");
    if (ASSIGNMENT_TYPE_SEMINAR.equals(assignmentType)) {
      throw new ValidationException(
          "submission", "Seminar assignments do not accept student submissions");
    }
  }

  private void ensureStudentIdentity(Submission submission, String userEmail) {
    if (!StringUtils.hasText(submission.getStudentEmail()) && StringUtils.hasText(userEmail)) {
      submission.setStudentEmail(userEmail);
    }

    if (!StringUtils.hasText(submission.getStudentName()) && StringUtils.hasText(userEmail)) {
      submission.setStudentName(submissionMapper.deriveNameFromEmail(userEmail));
    }
  }

  private void transitionToInReview(Submission submission, LocalDateTime submittedAt) {
    submission.setStatus(STATUS_IN_REVIEW);
    submission.setSubmittedAt(submittedAt);
    submission.setReviewStartedAt(submittedAt);
    submission.setGradedAt(null);
    submission.setGraderId(null);
    submission.setRawScore(null);
    submission.setDraftGrade(null);
    submission.setDraftFeedback(null);

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

      SubmissionFile file =
          SubmissionFile.builder()
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
    return submissionRepository
        .findById(submissionId)
        .orElseThrow(() -> new ResourceNotFoundException("Submission", "id", submissionId));
  }

  private Assignment findAssignment(UUID assignmentId) {
    return assignmentRepository
        .findById(assignmentId)
        .orElseThrow(() -> new ResourceNotFoundException("Assignment", "id", assignmentId));
  }

  private SubmissionResponse toResponseForViewer(Submission submission, String requesterRole) {
    SubmissionResponse response = submissionMapper.toResponse(submission);
    if (!submissionAccessService.isStaff(requesterRole)) {
      sanitizeForStudent(response);
    }
    return response;
  }

  private void sanitizeForStudent(SubmissionResponse response) {
    response.setRawScore(null);
    response.setDraftGrade(null);
    response.setDraftFeedback(null);
    response.setHasUnpublishedTeacherNotes(false);
    response.setVersion(null);

    String status = normalize(response.getStatus(), "");
    if (!STATUS_GRADED_PUBLISHED.equals(status)) {
      response.setComments(List.of());
    }

    if (STATUS_IN_REVIEW.equals(status) || STATUS_GRADED_DRAFT.equals(status) || STATUS_SUBMITTED.equals(status)) {
      if (response.getPublishedGrade() != null) {
        response.setGrade(response.getPublishedGrade());
        response.setFeedback(response.getPublishedFeedback());
      } else {
        response.setGrade(null);
        response.setFeedback(null);
      }
    }
  }

  private BigDecimal calculatePenaltyAdjustedScore(
      BigDecimal rawScore, Submission submission, Assignment assignment) {
    if (rawScore == null) {
      return null;
    }

    if (!Boolean.TRUE.equals(submission.getIsLate()) || submission.getDaysLate() == null) {
      return rawScore;
    }

    BigDecimal latePenaltyPercent =
        assignment.getLatePenaltyPercent() == null ? BigDecimal.ZERO : assignment.getLatePenaltyPercent();

    if (latePenaltyPercent.compareTo(BigDecimal.ZERO) <= 0) {
      return rawScore;
    }

    BigDecimal daysLate = BigDecimal.valueOf(Math.max(submission.getDaysLate(), 0));
    BigDecimal penaltyFactor =
        BigDecimal.ONE.subtract(latePenaltyPercent.multiply(daysLate).divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));

    if (penaltyFactor.compareTo(BigDecimal.ZERO) < 0) {
      penaltyFactor = BigDecimal.ZERO;
    }

    return rawScore.multiply(penaltyFactor);
  }

  private BigDecimal roundScore(BigDecimal score) {
    return score.setScale(2, RoundingMode.HALF_UP);
  }

  private void assertVersionMatches(Submission submission, Long expectedVersion) {
    if (expectedVersion == null) {
      return;
    }

    Long actualVersion = submission.getVersion() == null ? 0L : submission.getVersion();
    if (!Objects.equals(actualVersion, expectedVersion)) {
      throw new ConflictException("Submission was updated by another reviewer. Reload and try again.");
    }
  }

  private boolean hasSubmissionChanged(Submission submission, Snapshot before) {
    if (!Objects.equals(trimToNull(submission.getTextAnswer()), before.textAnswer())) {
      return true;
    }
    if (!Objects.equals(trimToNull(submission.getSubmissionUrl()), before.submissionUrl())) {
      return true;
    }
    if (!Objects.equals(trimToNull(submission.getProgrammingLanguage()), before.programmingLanguage())) {
      return true;
    }

    if (submission.getFiles() == null || submission.getFiles().isEmpty()) {
      return false;
    }

    LocalDateTime baseline = before.submittedAt();
    return submission.getFiles().stream()
        .map(SubmissionFile::getUploadedAt)
        .filter(Objects::nonNull)
        .anyMatch(uploadedAt -> baseline == null || uploadedAt.isAfter(baseline));
  }

  private int nextSubmissionVersion(Integer current) {
    int normalized = current == null ? 1 : current;
    return Math.max(1, normalized + 1);
  }

  private void recordAudit(
      Submission submission,
      UUID changedBy,
      String changeType,
      BigDecimal prevRaw,
      BigDecimal nextRaw,
      BigDecimal prevFinal,
      BigDecimal nextFinal,
      String prevFeedback,
      String nextFeedback) {

    SubmissionGradeAudit audit =
        SubmissionGradeAudit.builder()
            .submissionId(submission.getId())
            .changedBy(changedBy)
            .changeType(changeType)
            .prevRawScore(prevRaw)
            .newRawScore(nextRaw)
            .prevFinalScore(prevFinal)
            .newFinalScore(nextFinal)
            .prevFeedback(prevFeedback)
            .newFeedback(nextFeedback)
            .submissionVersion(
                submission.getSubmissionVersion() == null ? 1 : submission.getSubmissionVersion())
            .entityVersion(submission.getVersion() == null ? 0L : submission.getVersion())
            .build();

    submissionGradeAuditRepository.save(audit);
  }

  private void publishGradebookEvent(Submission submission, BigDecimal grade) {
    try {
      UUID courseId =
          assignmentRepository.findById(submission.getAssignmentId()).map(Assignment::getCourseId).orElse(null);

      if (courseId != null) {
        eventPublisher.publishEvent(
            new SubmissionGradedEvent(
                this,
                submission.getId(),
                submission.getAssignmentId(),
                submission.getUserId(),
                courseId,
                grade,
                Boolean.TRUE.equals(submission.getIsLate())));
        log.info("Published SubmissionGradedEvent for submission {}", submission.getId());
      }
    } catch (Exception e) {
      log.warn("Failed to publish SubmissionGradedEvent: {}", e.getMessage());
    }
  }

  private Comparator<Submission> queueComparator(String sort) {
    String normalized = normalize(sort, "needs_review");

    if ("created_asc".equals(normalized)) {
      return Comparator.comparing(Submission::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()));
    }
    if ("updated_desc".equals(normalized)) {
      return Comparator.comparing(Submission::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder()));
    }

    return Comparator.comparingInt((Submission s) -> reviewPriority(s.getStatus()))
        .thenComparing(Submission::getLastResubmittedAt, Comparator.nullsLast(Comparator.reverseOrder()))
        .thenComparing(Submission::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder()));
  }

  private int reviewPriority(String status) {
    String normalized = normalize(status, "");
    if (STATUS_IN_REVIEW.equals(normalized) || STATUS_SUBMITTED.equals(normalized)) {
      return 0;
    }
    if (STATUS_GRADED_DRAFT.equals(normalized)) {
      return 1;
    }
    if (STATUS_GRADED_PUBLISHED.equals(normalized)) {
      return 2;
    }
    return 3;
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

  @SafeVarargs
  private static <T> T firstNonNull(T... values) {
    for (T value : values) {
      if (value != null) {
        return value;
      }
    }
    return null;
  }

  private String trimToNull(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    return value.trim();
  }

  private record Snapshot(
      String textAnswer,
      String submissionUrl,
      String programmingLanguage,
      LocalDateTime submittedAt) {

    static Snapshot from(Submission submission) {
      return new Snapshot(
          submission == null ? null : normalizeText(submission.getTextAnswer()),
          submission == null ? null : normalizeText(submission.getSubmissionUrl()),
          submission == null ? null : normalizeText(submission.getProgrammingLanguage()),
          submission == null ? null : submission.getSubmittedAt());
    }

    private static String normalizeText(String value) {
      if (!StringUtils.hasText(value)) {
        return null;
      }
      return value.trim();
    }
  }

  public record DownloadedFile(Resource resource, MediaType mediaType, String fileName) {}
}
