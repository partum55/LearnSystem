package com.university.lms.ai.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record WidgetGenerationRequest(
    @NotBlank String prompt,
    String existingCode,
    List<Message> conversationHistory,
    String language
) {
    public record Message(String role, String content) {}
}
