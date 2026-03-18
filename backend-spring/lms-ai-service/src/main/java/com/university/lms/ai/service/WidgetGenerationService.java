package com.university.lms.ai.service;

import com.university.lms.ai.dto.WidgetGenerationRequest;
import com.university.lms.ai.dto.WidgetGenerationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WidgetGenerationService {

    private final LlamaApiService llamaApiService;

    private static final String SYSTEM_PROMPT = """
            You are an expert interactive widget builder for an educational platform.
            Generate a SINGLE self-contained HTML file with inline <style> and <script> tags.

            Requirements:
            - Use modern CSS (flexbox, grid, CSS variables, transitions) and vanilla JavaScript (ES2020+)
            - NO external dependencies, CDNs, or imports — everything must be inline
            - Make it visually polished with a dark theme:
              background: #0a0a0b, text: #fafafa, accent borders: rgba(255,255,255,0.08),
              accent color: #3b82f6, font-family: system-ui, -apple-system, sans-serif
            - The HTML will run inside a sandboxed iframe with NO network access
            - Make it interactive and educational — respond to user input (clicks, sliders, typing)
            - Add a postMessage call for auto-resize: window.parent.postMessage({type:'resize',height:document.body.scrollHeight},'*')
              inside a ResizeObserver on document.body
            - Keep total output under 8000 tokens

            Output ONLY the complete HTML document starting with <!DOCTYPE html>. No markdown fences, no explanation, no commentary.
            """;

    public WidgetGenerationResponse generateWidget(WidgetGenerationRequest request, String apiKey) {
        String userPrompt = buildUserPrompt(request);
        String systemPrompt = buildSystemPrompt(request);

        log.info("Generating interactive widget for prompt: {}", truncate(request.prompt(), 80));

        String result;
        if (apiKey != null && !apiKey.isBlank()) {
            result = llamaApiService.generateWithKey(userPrompt, systemPrompt, apiKey);
        } else {
            result = llamaApiService.generate(userPrompt, systemPrompt);
        }

        String html = cleanHtmlResponse(result);
        String summary = extractSummary(request.prompt());

        return new WidgetGenerationResponse(html, summary);
    }

    private String buildSystemPrompt(WidgetGenerationRequest request) {
        String lang = request.language() != null ? request.language() : "en";
        return SYSTEM_PROMPT + "\nUser's preferred language: " + lang;
    }

    private String buildUserPrompt(WidgetGenerationRequest request) {
        StringBuilder prompt = new StringBuilder();

        // Include conversation history for iterations
        if (request.conversationHistory() != null && !request.conversationHistory().isEmpty()) {
            prompt.append("Previous conversation:\n");
            for (WidgetGenerationRequest.Message msg : request.conversationHistory()) {
                prompt.append(msg.role()).append(": ").append(msg.content()).append("\n");
            }
            prompt.append("\n");
        }

        // Include existing code for refinement
        if (request.existingCode() != null && !request.existingCode().isBlank()) {
            prompt.append("Current widget HTML code:\n```html\n");
            prompt.append(request.existingCode());
            prompt.append("\n```\n\n");
            prompt.append("Modify the above widget based on this instruction: ");
        } else {
            prompt.append("Create an interactive widget: ");
        }

        prompt.append(request.prompt());
        return prompt.toString();
    }

    private String cleanHtmlResponse(String response) {
        if (response == null) return "";
        String cleaned = response.trim();

        // Strip markdown fences
        if (cleaned.startsWith("```html")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }

        return cleaned.trim();
    }

    private String extractSummary(String prompt) {
        if (prompt.length() <= 100) return prompt;
        return prompt.substring(0, 97) + "...";
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
    }
}
