package com.university.lms.ai.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.service.AiKeyResolution;
import com.university.lms.ai.service.AiKeyResolver;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
@Slf4j
public class ApiKeyValidationFilter extends OncePerRequestFilter {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private static final Set<String> EXCLUDED_PATHS = Set.of(
            "/v1/ai/health",
            "/v1/ai/ready",
            "/v1/ai/alive",
            "/v1/users/me/ai-settings",
            "/actuator/health",
            "/actuator/info",
            "/actuator/prometheus"
    );

    private final AiKeyResolver aiKeyResolver;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getServletPath();

        if (EXCLUDED_PATHS.stream().anyMatch(path::startsWith)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (path.startsWith("/v1/ai/")) {
            writeError(
                    response,
                    HttpServletResponse.SC_NOT_IMPLEMENTED,
                    "AI_GENERATION_NOT_IMPLEMENTED",
                    "AI generation endpoints are not enabled in this readiness pass"
            );
            return;
        }

        UUID userId = (UUID) request.getAttribute("userId");
        String userRole = (String) request.getAttribute("userRole");

        if (userId == null) {
            filterChain.doFilter(request, response);
            return;
        }

        AiKeyResolution resolution = aiKeyResolver.resolve(userId, userRole);

        if (!resolution.aiEnabled()) {
            writeError(response, HttpServletResponse.SC_FORBIDDEN, "AI_FEATURES_DISABLED", "AI features are disabled");
            return;
        }

        if (!resolution.hasUsableKey()) {
            log.warn("AI request denied for user {} because no AI API key is configured", userId);
            writeError(
                    response,
                    HttpServletResponse.SC_FORBIDDEN,
                    "AI_KEY_REQUIRED",
                    "Please add your Gemini API key in Profile AI Settings."
            );
            return;
        }

        request.setAttribute("userApiKey", resolution.apiKey());
        request.setAttribute("aiProvider", resolution.provider().name());
        request.setAttribute("aiKeySource", resolution.keySource().name());
        filterChain.doFilter(request, response);
    }

    private void writeError(HttpServletResponse response, int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(OBJECT_MAPPER.writeValueAsString(Map.of(
                "code", code,
                "message", message
        )));
    }
}
