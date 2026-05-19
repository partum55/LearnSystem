package com.university.lms.course.assessment.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Rule DTO used by quiz section quota selectors. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizSectionRuleDto {

  private UUID id;
  private String questionType;
  private String difficulty;
  private String tag;
  private Integer quota;
}
