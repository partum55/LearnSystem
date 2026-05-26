package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import lombok.extern.slf4j.Slf4j;

import java.util.UUID;

@Component
@Slf4j
public class LearningServiceClient {

    private final RestTemplate restTemplate;
    private final String learningServiceUrl;
    private final String internalToken;

    public LearningServiceClient(
            @Value("${services.learning-service.url:http://localhost:8089}") String learningServiceUrl,
            @Value("${security.internal-token:}") String internalToken
    ) {
        this.restTemplate = new RestTemplate();
        this.learningServiceUrl = learningServiceUrl;
        this.internalToken = internalToken;
    }

    public String getCourseRole(UUID courseId, UUID userId) {
        String url = String.format("%s/api/v1/internal/courses/%s/members/%s/role", learningServiceUrl, courseId, userId);
        
        HttpHeaders headers = new HttpHeaders();
        if (internalToken != null && !internalToken.isBlank()) {
            headers.set("X-Internal-Token", internalToken);
        }
        
        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);
                    
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode roleNode = response.getBody().get("role");
                if (roleNode != null && !roleNode.isNull()) {
                    return roleNode.asText();
                }
            }
        } catch (Exception e) {
            log.warn("Unable to resolve course role for user {} in course {}: {}", userId, courseId, e.getMessage());
        }
        return null;
    }
}
