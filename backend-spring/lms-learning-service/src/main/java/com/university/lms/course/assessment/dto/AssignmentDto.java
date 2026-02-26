package com.university.lms.course.assessment.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * DTO for Assignment responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentDto implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private UUID id;
    private UUID courseId;
    private UUID moduleId;
    private UUID categoryId;
    private Integer position;

    private String assignmentType;
    private String title;
    private String description;
    private String descriptionFormat;
    private String instructions;
    private String instructionsFormat;

    private List<Map<String, Object>> resources;

    // Code submission
    private String starterCode;
    private String programmingLanguage;
    private Boolean autoGradingEnabled;
    private List<Map<String, Object>> testCases;

    // Grading
    private BigDecimal maxPoints;
    private Map<String, Object> rubric;

    // Dates
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime dueDate;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime availableFrom;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime availableUntil;

    // Late submission
    private Boolean allowLateSubmission;
    private BigDecimal latePenaltyPercent;

    // Submission settings
    private List<String> submissionTypes;
    private List<String> allowedFileTypes;
    private Long maxFileSize;
    private Integer maxFiles;

    // Quiz reference
    private UUID quizId;

    // External tool
    private String externalToolUrl;

    // Grading options
    private Boolean gradeAnonymously;
    private Boolean peerReviewEnabled;
    private Integer peerReviewsRequired;

    // Metadata
    private List<String> tags;
    private Integer estimatedDuration;

    // Template/archive
    private Boolean isTemplate;
    private Boolean isArchived;
    private UUID originalAssignmentId;

    private Boolean isPublished;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    private UUID createdBy;

    // Computed fields
    private Boolean isAvailable;
    private Boolean isOverdue;
    private Boolean requiresSubmission;
}

