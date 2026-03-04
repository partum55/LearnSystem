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

/** Contextual reminders feed for a student. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentContextReminderFeedDto {
  private UUID userId;

  @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
  private LocalDateTime generatedAt;

  @Builder.Default private List<StudentContextReminderDto> reminders = new ArrayList<>();
}
