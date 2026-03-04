package com.university.lms.submission.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Submission DTO with camelCase + snake_case compatibility fields.
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
    private Map<String, Object> rubricEvaluation;
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

    @JsonProperty("assignment_id")
    public UUID getAssignmentIdSnake() {
        return assignmentId;
    }

    @JsonProperty("user_id")
    public UUID getUserIdSnake() {
        return userId;
    }

    @JsonProperty("student_name")
    public String getStudentNameSnake() {
        return studentName;
    }

    @JsonProperty("student_email")
    public String getStudentEmailSnake() {
        return studentEmail;
    }

    @JsonProperty("text_answer")
    public String getTextAnswerSnake() {
        return textAnswer;
    }

    @JsonProperty("submission_url")
    public String getSubmissionUrlSnake() {
        return submissionUrl;
    }

    @JsonProperty("programming_language")
    public String getProgrammingLanguageSnake() {
        return programmingLanguage;
    }

    @JsonProperty("raw_score")
    public BigDecimal getRawScoreSnake() {
        return rawScore;
    }

    @JsonProperty("draft_grade")
    public BigDecimal getDraftGradeSnake() {
        return draftGrade;
    }

    @JsonProperty("draft_feedback")
    public String getDraftFeedbackSnake() {
        return draftFeedback;
    }

    @JsonProperty("published_grade")
    public BigDecimal getPublishedGradeSnake() {
        return publishedGrade;
    }

    @JsonProperty("published_feedback")
    public String getPublishedFeedbackSnake() {
        return publishedFeedback;
    }

    @JsonProperty("rubric_evaluation")
    public Map<String, Object> getRubricEvaluationSnake() {
        return rubricEvaluation;
    }

    @JsonProperty("submission_version")
    public Integer getSubmissionVersionSnake() {
        return submissionVersion;
    }

    @JsonProperty("has_unpublished_teacher_notes")
    public Boolean getHasUnpublishedTeacherNotesSnake() {
        return hasUnpublishedTeacherNotes;
    }

    @JsonProperty("is_re_review_in_progress")
    public Boolean getIsReReviewInProgressSnake() {
        return isReReviewInProgress;
    }

    @JsonProperty("is_late")
    public Boolean getIsLateSnake() {
        return isLate;
    }

    @JsonProperty("days_late")
    public Integer getDaysLateSnake() {
        return daysLate;
    }

    @JsonProperty("submitted_at")
    public LocalDateTime getSubmittedAtSnake() {
        return submittedAt;
    }

    @JsonProperty("graded_at")
    public LocalDateTime getGradedAtSnake() {
        return gradedAt;
    }

    @JsonProperty("published_at")
    public LocalDateTime getPublishedAtSnake() {
        return publishedAt;
    }

    @JsonProperty("created_at")
    public LocalDateTime getCreatedAtSnake() {
        return createdAt;
    }

    @JsonProperty("updated_at")
    public LocalDateTime getUpdatedAtSnake() {
        return updatedAt;
    }

    @JsonProperty("entity_version")
    public Long getVersionSnake() {
        return version;
    }

    @JsonProperty("uploaded_files")
    public List<SubmissionFileResponse> getUploadedFilesSnake() {
        return uploadedFiles;
    }
}
