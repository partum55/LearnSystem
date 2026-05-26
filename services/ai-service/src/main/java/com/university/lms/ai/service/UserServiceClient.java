package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@Slf4j
public class UserServiceClient {

    private final RestTemplate restTemplate;
    private final String userServiceUrl;
    private final String internalToken;

    public UserServiceClient(
            @Value("${services.user-service.url:http://localhost:8081}") String userServiceUrl,
            @Value("${security.internal-token:}") String internalToken
    ) {
        this.restTemplate = new RestTemplate();
        this.userServiceUrl = userServiceUrl;
        this.internalToken = internalToken;
    }

    public UserSummary getUser(UUID userId) {
        String url = String.format("%s/api/internal/users/%s", userServiceUrl, userId);

        HttpHeaders headers = new HttpHeaders();
        if (internalToken != null && !internalToken.isBlank()) {
            headers.set("X-Internal-Token", internalToken);
        }

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);
            JsonNode body = response.getBody();
            if (response.getStatusCode().is2xxSuccessful() && body != null) {
                String email = text(body, "email");
                String role = text(body, "role");
                String status = text(body, "status");
                boolean active = body.path("active").asBoolean(true)
                        && body.path("isActive").asBoolean(true)
                        && !"deleted".equalsIgnoreCase(status)
                        && !"inactive".equalsIgnoreCase(status);
                return new UserSummary(email, role, active);
            }
        } catch (Exception e) {
            log.warn("Unable to resolve user {} from user-service: {}", userId, e.getMessage());
        }
        return null;
    }

    private String text(JsonNode body, String field) {
        JsonNode value = body.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    public record UserSummary(String email, String role, boolean active) {}
}
