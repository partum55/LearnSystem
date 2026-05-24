package com.university.lms.course.dto;

import java.io.Serializable;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkConfirmRequest implements Serializable {
  private static final long serialVersionUID = 1L;

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Enrollment implements Serializable {
    private static final long serialVersionUID = 1L;
    private UUID userId;
    private String role; // TEACHER, TA, STUDENT
  }

  private List<Enrollment> enrollments;
}
