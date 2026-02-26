package com.university.lms.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Response DTO for AI-generated course matching CourseExport JSON import format. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class GeneratedCourseResponse {

  @JsonProperty("version")
  private String version;

  @JsonProperty("course")
  @Valid
  @NotNull
  private CourseData course;

  @JsonProperty("modules")
  @Valid
  @NotNull
  @Size(max = 24)
  private List<ModuleData> modules;

  @JsonProperty("quizzes")
  @Valid
  private List<QuizData> quizzes;

  @JsonProperty("questionBank")
  @Valid
  private List<QuestionData> questionBank;

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class CourseData {
    @NotBlank
    @Size(max = 50)
    private String code;

    @NotBlank
    @Size(max = 255)
    private String titleUk;

    @NotBlank
    @Size(max = 255)
    private String titleEn;

    @NotBlank
    @Size(max = 4000)
    private String descriptionUk;

    @NotBlank
    @Size(max = 4000)
    private String descriptionEn;

    @Size(max = 8000)
    private String syllabus;

    @Size(max = 20)
    private String visibility;

    private Boolean isPublished;

    @Min(1)
    @Max(1000)
    private Integer maxStudents;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class ModuleData {
    @NotBlank
    @Size(max = 255)
    private String title;

    @NotBlank
    @Size(max = 5000)
    private String description;

    @NotNull
    @Min(0)
    @Max(100)
    private Integer position;

    private Boolean isPublished;

    @Valid
    @Size(max = 50)
    private List<AssignmentData> assignments;

    @Valid
    @Size(max = 20)
    private List<ResourceData> resources;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class ResourceData {
    @NotBlank
    @Size(max = 255)
    private String title;

    @Size(max = 2000)
    private String description;

    @NotBlank
    @Size(max = 30)
    private String resourceType;

    @Size(max = 2000)
    private String externalUrl;

    @Size(max = 8000)
    private String textContent;

    @Min(0)
    @Max(100)
    private Integer position;

    private Boolean isDownloadable;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class AssignmentData {
    @NotBlank
    @Size(max = 255)
    private String title;

    @NotBlank
    @Size(max = 5000)
    private String description;

    @NotBlank
    @Size(max = 30)
    private String assignmentType;

    @NotBlank
    @Size(max = 8000)
    private String instructions;

    @Min(1)
    @Max(1000)
    private Integer maxPoints;

    private List<String> submissionTypes;

    private List<String> allowedFileTypes;

    @Size(max = 30)
    private String programmingLanguage;

    @Size(max = 8000)
    private String starterCode;

    private List<String> tags;

    @Size(max = 30)
    private String estimatedDuration;

    private Boolean isPublished;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class QuizData {
    @NotBlank
    @Size(max = 255)
    private String title;

    @NotBlank
    @Size(max = 4000)
    private String description;

    @Size(max = 255)
    private String moduleTitle;

    @Min(5)
    @Max(180)
    private Integer timeLimit;

    @Min(1)
    @Max(10)
    private Integer attemptsAllowed;

    private Boolean shuffleQuestions;

    private Boolean shuffleAnswers;

    @Min(0)
    @Max(100)
    private Integer passPercentage;

    private Boolean showCorrectAnswers;

    private List<String> questionRefs;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class QuestionData {
    @Size(max = 100)
    private String id;

    @NotBlank
    @Size(max = 2000)
    private String stem;

    @NotBlank
    @Size(max = 50)
    private String questionType;

    @NotNull
    @Min(1)
    @Max(100)
    private Integer points;

    private Object options;

    private Object correctAnswer;

    @Size(max = 2000)
    private String explanation;
  }
}
