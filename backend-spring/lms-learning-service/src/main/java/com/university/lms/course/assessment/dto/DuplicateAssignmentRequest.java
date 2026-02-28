package com.university.lms.course.assessment.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Optional target payload for assignment duplication. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DuplicateAssignmentRequest {

  private UUID targetCourseId;
  private UUID targetModuleId;
}
