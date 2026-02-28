package com.university.lms.course.assessment.document.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Response returned when template content is cloned into a submission document. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CloneTemplateResponse {

  private UUID assignmentId;
  private UUID submissionId;
}
