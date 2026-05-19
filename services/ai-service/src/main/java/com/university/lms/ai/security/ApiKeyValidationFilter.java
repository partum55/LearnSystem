package com.university.lms.ai.security;

import com.university.lms.ai.service.UserApiKeyResolver;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
@Slf4j
public class ApiKeyValidationFilter extends OncePerRequestFilter {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private static final Set<String> EXCLUDED_PATHS = Set.of(
            "/v1/ai/health", "/v1/ai/ready", "/v1/ai/alive",
            "/actuator/health", "/actuator/info", "/actuator/prometheus"
    );

    private final UserApiKeyResolver userApiKeyResolver;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getServletPath();

        // Skip for health/actuator endpoints
        if (EXCLUDED_PATHS.stream().anyMatch(path::startsWith)) {
            filterChain.doFilter(request, response);
            return;
        }

        UUID userId = (UUID) request.getAttribute("userId");
        String userRole = (String) request.getAttribute("userRole");

        // If not authenticated yet (JWT filter hasn't run or failed), pass through
        if (userId == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String apiKey = userApiKeyResolver.resolveApiKey(userId, userRole);

        if (apiKey == null || apiKey.isBlank()) {
            log.warn("AI request denied for user {} — no API key configured", userId);
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setCharacterEncoding("UTF-8");
            response.setContentType("application/json;charset=UTF-8");
            Map<String, String> errorBody = Map.of(
                    "error", "AI API key required",
                    "message", "Please add your Groq API key in Settings."
            );
            response.getWriter().write(OBJECT_MAPPER.writeValueAsString(errorBody));
            return;
        }

        request.setAttribute("userApiKey", apiKey);
        filterChain.doFilter(request, response);
    }
}
