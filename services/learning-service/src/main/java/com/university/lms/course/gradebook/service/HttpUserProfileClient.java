package com.university.lms.course.gradebook.service;

import com.university.lms.course.web.RequestUserContext;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@Primary
public class HttpUserProfileClient implements UserProfileClient {
  private final WebClient webClient;
  private final RequestUserContext requestUserContext;
  private final String internalToken;

  public HttpUserProfileClient(
      @Value("${user-service.url:${USER_SERVICE_URL:http://localhost:8081}}") String userServiceUrl,
      @Value("${security.internal-token:${INTERNAL_SERVICE_TOKEN:}}") String internalToken,
      RequestUserContext requestUserContext) {
    this.webClient = WebClient.builder()
        .baseUrl(userServiceUrl)
        .build();
    this.requestUserContext = requestUserContext;
    this.internalToken = internalToken;
  }

  private boolean isCurrentRequestAdmin() {
    try {
      String role = requestUserContext.requireUserRole();
      return "ADMIN".equalsIgnoreCase(role);
    } catch (Exception e) {
      return false;
    }
  }

  @Override
  public Optional<UserProfile> findProfile(UUID userId) {
    try {
      UserResponse response = webClient.get()
          .uri("/internal/users/{id}", userId)
          .headers(headers -> {
            if (internalToken != null && !internalToken.isBlank()) {
              headers.set("X-Internal-Token", internalToken);
            }
          })
          .retrieve()
          .bodyToMono(UserResponse.class)
          .block();

      if (response == null || response.id() == null) {
        return Optional.empty();
      }

      boolean fetchedIsAdmin = "ADMIN".equalsIgnoreCase(response.role()) || "ADMIN".equalsIgnoreCase(response.role());
      if (fetchedIsAdmin && !isCurrentRequestAdmin()) {
        return Optional.of(new UserProfile(
            response.id(),
            "Admin",
            "",
            null,
            response.role()
        ));
      }

      String displayName = response.displayName();
      if (displayName == null || displayName.isBlank()) {
        if (response.firstName() != null && response.lastName() != null) {
          displayName = response.firstName() + " " + response.lastName();
        } else {
          displayName = response.email();
        }
      }

      return Optional.of(new UserProfile(
          response.id(),
          displayName,
          response.email(),
          response.avatarUrl(),
          response.role()
      ));
    } catch (Exception e) {
      return Optional.empty();
    }
  }

  private record UserResponse(UUID id, String email, String displayName, String firstName, String lastName, String avatarUrl, String role) {}
}
