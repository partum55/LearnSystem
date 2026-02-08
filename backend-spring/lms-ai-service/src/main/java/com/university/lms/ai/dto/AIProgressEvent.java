package com.university.lms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for streaming progress updates */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIProgressEvent {

  private String eventType; // "progress", "module", "assignment", "complete", "error"
  private String message;
  private Integer percentage;
  private Object data;
  private String error;

  public static AIProgressEvent progress(String message, int percentage) {
    return AIProgressEvent.builder()
        .eventType("progress")
        .message(message)
        .percentage(percentage)
        .build();
  }

  public static AIProgressEvent data(String type, Object data) {
    return AIProgressEvent.builder().eventType(type).data(data).build();
  }

  public static AIProgressEvent complete(String message) {
    return AIProgressEvent.builder().eventType("complete").message(message).percentage(100).build();
  }

  public static AIProgressEvent error(String error) {
    return AIProgressEvent.builder().eventType("error").error(error).build();
  }
}
