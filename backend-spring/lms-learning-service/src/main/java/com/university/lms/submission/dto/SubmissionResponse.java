package com.university.lms.submission.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Submission response DTO — all fields camelCase.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SubmissionResponse {

    private UUID id;
    private UUID assignmentId;
    private UUID userId;
    private String user;

    private String studentName;
    private String studentEmail;

    private String status;
    private String textAnswer;
    private String submissionUrl;
    private String programmingLanguage;

    private BigDecimal grade;
    private BigDecimal rawScore;
    private BigDecimal draftGrade;
    private String draftFeedback;
    private BigDecimal publishedGrade;
    private String publishedFeedback;
    private String feedback;
    private Integer submissionVersion;
    private Boolean hasUnpublishedTeacherNotes;
    private Boolean isReReviewInProgress;
    private Long version;

    private Boolean isLate;
    private Integer daysLate;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime submittedAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime gradedAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime publishedAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    private List<SubmissionFileResponse> files;
    private List<SubmissionFileResponse> uploadedFiles;
    private List<SubmissionCommentResponse> comments;
}
