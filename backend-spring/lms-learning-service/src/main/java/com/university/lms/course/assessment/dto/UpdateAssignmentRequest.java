package com.university.lms.course.assessment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
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
 * DTO for updating assignments.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAssignmentRequest {

    private UUID moduleId;
    private UUID topicId;
    private UUID categoryId;
    private Integer position;

    @Size(max = 255)
    private String title;

    private String description;

    @Pattern(regexp = "^(PLAIN|MARKDOWN|HTML|RICH)$")
    private String descriptionFormat;

    private String instructions;

    @Pattern(regexp = "^(PLAIN|MARKDOWN|HTML|RICH)$")
    private String instructionsFormat;

    private List<Map<String, Object>> resources;

    private String starterCode;
    private String programmingLanguage;
    private Boolean autoGradingEnabled;
    private List<Map<String, Object>> testCases;
    private Map<String, Object> vplConfig;

    @DecimalMin("0.01")
    @DecimalMax("10000.00")
    private BigDecimal maxPoints;

    private LocalDateTime dueDate;
    private LocalDateTime availableFrom;
    private LocalDateTime availableUntil;

    private Boolean allowLateSubmission;
    @DecimalMin("0")
    @DecimalMax("100")
    private BigDecimal latePenaltyPercent;

    private List<String> submissionTypes;
    private List<String> allowedFileTypes;
    private Long maxFileSize;
    private Integer maxFiles;

    private UUID quizId;
    @Valid
    private InlineQuizRequest quiz;
    private String externalToolUrl;

    private Boolean gradeAnonymously;
    private Boolean peerReviewEnabled;
    @Min(0)
    private Integer peerReviewsRequired;

    private Integer estimatedDuration;

    private Boolean isArchived;
    private Boolean isPublished;
}
