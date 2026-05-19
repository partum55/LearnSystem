package com.university.lms.course.assessment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * DTO for creating assignments.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAssignmentRequest {

    @NotNull(message = "Course ID is required")
    private UUID courseId;

    private UUID moduleId;
    private UUID topicId;
    private UUID categoryId;
    private Integer position;

    @NotBlank(message = "Assignment type is required")
    @Pattern(regexp = "^(QUIZ|FILE_UPLOAD|TEXT|CODE|URL|MANUAL_GRADE|EXTERNAL|SEMINAR|VIRTUAL_LAB)$")
    private String assignmentType;

    @NotBlank(message = "Title is required")
    @Size(max = 255)
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    @Pattern(regexp = "^(PLAIN|MARKDOWN|HTML|RICH)$")
    private String descriptionFormat;

    private String instructions;

    @Pattern(regexp = "^(PLAIN|MARKDOWN|HTML|RICH)$")
    private String instructionsFormat;

    @Builder.Default
    private List<Map<String, Object>> resources = new ArrayList<>();

    // Code submission
    private String starterCode;
    private String programmingLanguage;
    private Boolean autoGradingEnabled;
    @Builder.Default
    private List<Map<String, Object>> testCases = new ArrayList<>();
    private Map<String, Object> vplConfig;

    // Grading
    @NotNull(message = "Max points is required")
    @DecimalMin("0.01")
    @DecimalMax("10000.00")
    private BigDecimal maxPoints;

    // Dates
    private LocalDateTime dueDate;
    private LocalDateTime availableFrom;
    private LocalDateTime availableUntil;

    // Late submission
    private Boolean allowLateSubmission;
    @DecimalMin("0")
    @DecimalMax("100")
    private BigDecimal latePenaltyPercent;

    // Submission settings
    @Builder.Default
    private List<String> submissionTypes = new ArrayList<>();
    @Builder.Default
    private List<String> allowedFileTypes = new ArrayList<>();
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

    private Boolean isTemplate;
    private Boolean isPublished;
}
