package com.university.lms.ai.security;

import com.university.lms.common.security.JwtService;
import com.university.lms.common.security.JwtTokenBlacklistService;
import com.university.lms.common.security.SecurityAuditLogger;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/** AI service JWT authentication filter. Relies on token claims for user identity and role. */
@Component
@Slf4j
public class JwtAuthenticationFilter
    extends com.university.lms.common.security.JwtAuthenticationFilter {

  public JwtAuthenticationFilter(
      JwtService jwtService,
      JwtTokenBlacklistService tokenBlacklistService,
      SecurityAuditLogger auditLogger) {
    super(jwtService, tokenBlacklistService, auditLogger);
  }

  @Override
  protected UserDetails getUserDetails(UUID userId, String email, String roleFromToken) {
    return new UserDetails() {
      @Override
      public UUID getId() {
        return userId;
      }

      @Override
      public String getEmail() {
        return email;
      }

      @Override
      public String getRole() {
        return null;
      }

      @Override
      public boolean isActive() {
        return true;
      }
    };
  }
}
