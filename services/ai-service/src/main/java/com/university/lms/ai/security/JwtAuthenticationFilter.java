package com.university.lms.ai.security;

import com.university.lms.common.security.JwtService;
import com.university.lms.common.security.SecurityAuditLogger;
import com.university.lms.ai.service.UserServiceClient;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/** AI service JWT authentication filter. Relies on token claims for user identity and role. */
@Component
@Slf4j
public class JwtAuthenticationFilter
    extends com.university.lms.common.security.JwtAuthenticationFilter {

  private final UserServiceClient userServiceClient;

  public JwtAuthenticationFilter(
      JwtService jwtService,
      SecurityAuditLogger auditLogger,
      UserServiceClient userServiceClient) {
    super(jwtService, auditLogger);
    this.userServiceClient = userServiceClient;
  }

  @Override
  protected UserDetails getUserDetails(UUID userId, String email, String roleFromToken) {
    UserServiceClient.UserSummary user = userServiceClient.getUser(userId);
    return new UserDetails() {
      @Override
      public UUID getId() {
        return userId;
      }

      @Override
      public String getEmail() {
        return user != null && user.email() != null ? user.email() : email;
      }

      @Override
      public String getRole() {
        return user != null && user.role() != null ? user.role() : roleFromToken;
      }

      @Override
      public boolean isActive() {
        return user == null || user.active();
      }
    };
  }
}
