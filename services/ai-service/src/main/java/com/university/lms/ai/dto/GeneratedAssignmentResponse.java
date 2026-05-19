package com.university.lms.ai.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

/** Response containing AI-generated assignment */
@Data
public class GeneratedAssignmentResponse {
  @NotBlank
  @Size(max = 200)
  private String title;

  @NotBlank
  @Size(max = 4000)
  private String description;

  @NotBlank
  @Size(max = 8000)
  private String instructions;

  @NotBlank
  @Size(max = 30)
  private String assignmentType;

  @NotNull
  @Min(1)
  @Max(1000)
  private Integer maxPoints;

  @Min(5)
  @Max(600)
  private Integer timeLimit; // in minutes, optional

  @Size(max = 25)
  private List<@NotBlank @Size(max = 200) String> learningObjectives;

  @Size(max = 25)
  private List<@NotBlank @Size(max = 500) String> resources;
}
