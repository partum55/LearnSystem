package com.university.lms.course.web;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Component;

/** Request-scoped user context extracted from JWT filter attributes. */
@Component
@RequiredArgsConstructor
public class RequestUserContext {

  private final HttpServletRequest request;

  public UUID requireUserId() {
    Object userId = request.getAttribute("userId");
    if (userId instanceof UUID id) {
      return id;
    }
    throw new AuthenticationCredentialsNotFoundException("User not authenticated");
  }

  public String requireUserRole() {
    Object role = request.getAttribute("userRole");
    if (role == null) {
      throw new AuthenticationCredentialsNotFoundException("User role not found in request");
    }

    String roleValue = role.toString();
    if (roleValue.isBlank()) {
      throw new AuthenticationCredentialsNotFoundException("User role not found in request");
    }
    return roleValue;
  }
}
