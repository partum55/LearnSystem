package com.university.lms.course.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Aggregated dashboard payload for instructor to-do list. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherTodoDashboardDto {
  private UUID userId;

  @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
  private LocalDateTime generatedAt;

  private int pendingGradingCount;
  private int missingSubmissionCount;
  private int upcomingDeadlineCount;

  @Builder.Default private List<TeacherTodoSubmissionItemDto> pendingGrading = new ArrayList<>();
  @Builder.Default private List<TeacherTodoMissingItemDto> missingSubmissions = new ArrayList<>();
  @Builder.Default private List<TeacherTodoDeadlineItemDto> upcomingDeadlines = new ArrayList<>();
}
