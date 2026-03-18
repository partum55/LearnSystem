package com.university.lms.submission.service;

import com.university.lms.submission.domain.Submission;
import com.university.lms.submission.domain.SubmissionComment;
import com.university.lms.submission.domain.SubmissionFile;
import com.university.lms.submission.dto.SubmissionCommentResponse;
import com.university.lms.submission.dto.SubmissionFileResponse;
import com.university.lms.submission.dto.SubmissionResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Maps submission domain entities to transport DTOs.
 */
@Component
public class SubmissionMapper {

    public SubmissionResponse toResponse(Submission submission) {
        List<SubmissionFileResponse> files = Optional.<Collection<SubmissionFile>>ofNullable(submission.getFiles())
                .orElseGet(List::of)
                .stream()
                .sorted(Comparator.comparing(SubmissionFile::getUploadedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .map(file -> SubmissionFileResponse.builder()
                        .id(file.getId())
                        .filename(file.getFilename())
                        .fileUrl(file.getFileUrl())
                        .fileSize(file.getFileSize())
                        .uploadedAt(file.getUploadedAt())
                        .build())
                .collect(Collectors.toList());

        List<SubmissionCommentResponse> comments = Optional.<Collection<SubmissionComment>>ofNullable(submission.getComments())
                .orElseGet(List::of)
                .stream()
                .sorted(Comparator.comparing(SubmissionComment::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
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
                .rawScore(submission.getRawScore())
                .draftGrade(submission.getDraftGrade())
                .draftFeedback(submission.getDraftFeedback())
                .publishedGrade(submission.getPublishedGrade())
                .publishedFeedback(submission.getPublishedFeedback())
                .feedback(submission.getFeedback())
                .submissionVersion(submission.getSubmissionVersion())
                .hasUnpublishedTeacherNotes(StringUtils.hasText(submission.getDraftFeedback()))
                .isReReviewInProgress(isReReviewInProgress(submission))
                .version(submission.getVersion())
                .isLate(submission.getIsLate())
                .daysLate(submission.getDaysLate())
                .submittedAt(submission.getSubmittedAt())
                .gradedAt(submission.getGradedAt())
                .publishedAt(submission.getPublishedAt())
                .createdAt(submission.getCreatedAt())
                .updatedAt(submission.getUpdatedAt())
                .files(files)
                .uploadedFiles(files)
                .comments(comments)
                .build();
    }

    private boolean isReReviewInProgress(Submission submission) {
        if (submission == null || submission.getStatus() == null) {
            return false;
        }
        String status = submission.getStatus().trim().toUpperCase(Locale.ROOT);
        return "IN_REVIEW".equals(status) && submission.getPublishedGrade() != null;
    }

    public String deriveNameFromEmail(String email) {
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
                .map(token -> token.substring(0, 1).toUpperCase(Locale.ROOT) + token.substring(1))
                .collect(Collectors.joining(" "));
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }
}
