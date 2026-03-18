package com.university.lms.course.assessment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Optional payload for starting secure quiz attempts.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StartQuizAttemptRequest {
  private Boolean secureConsent;
  private Boolean startedInFullscreen;
  private Boolean reducedSecurityMode;
}
