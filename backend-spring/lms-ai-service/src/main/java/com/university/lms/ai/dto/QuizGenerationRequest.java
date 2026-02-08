package com.university.lms.ai.dto;

import lombok.Data;

/** Request for AI-powered quiz generation */
@Data
public class QuizGenerationRequest {
  private String topic;
  private String language; // "uk" or "en"
  private Integer questionCount;
  private String difficulty; // "easy", "medium", "hard"
  private String[] questionTypes; // "MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", etc.
  private String context; // Additional context about the course/module
}
