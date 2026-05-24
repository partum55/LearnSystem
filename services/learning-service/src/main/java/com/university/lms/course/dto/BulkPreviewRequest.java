package com.university.lms.course.dto;

import java.io.Serializable;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkPreviewRequest implements Serializable {
  private static final long serialVersionUID = 1L;

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Row implements Serializable {
    private static final long serialVersionUID = 1L;
    private String email;
    private String role; // TEACHER, TA, STUDENT
  }

  private List<Row> rows;
}
