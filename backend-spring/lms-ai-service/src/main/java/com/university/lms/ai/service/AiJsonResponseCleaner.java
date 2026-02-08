package com.university.lms.ai.service;

/** Utility for normalizing LLM JSON responses by removing markdown fences. */
public final class AiJsonResponseCleaner {

  private AiJsonResponseCleaner() {
    // Utility class
  }

  public static String clean(String response) {
    if (response == null) {
      return null;
    }

    String cleaned = response.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.substring(3);
    }

    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length() - 3);
    }

    return cleaned.trim();
  }
}
