package com.university.lms.ai.provider;

import java.util.List;
import java.util.Map;

public record GeminiResponse(
        List<Candidate> candidates,
        UsageMetadata usageMetadata
) {
    public record Candidate(Content content, String finishReason) {}
    public record Content(List<Part> parts) {}
    public record Part(String text) {}
    public record UsageMetadata(
            Integer promptTokenCount,
            Integer candidatesTokenCount,
            Integer totalTokenCount
    ) {}

    public String extractText() {
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }
        Candidate first = candidates.get(0);
        if (first.content() == null || first.content().parts() == null || first.content().parts().isEmpty()) {
            return null;
        }
        return first.content().parts().get(0).text();
    }
}
