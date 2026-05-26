package com.university.lms.course.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class InternalTokenFilter extends OncePerRequestFilter {

  private static final String HEADER = "X-Internal-Token";

  @Value("${security.internal-token:}")
  private String expectedToken;

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain)
      throws ServletException, IOException {
    String servletPath = request.getServletPath();
    if (!servletPath.startsWith("/internal/") && !servletPath.startsWith("/v1/internal/")) {
      filterChain.doFilter(request, response);
      return;
    }

    if (expectedToken == null || expectedToken.isBlank()) {
      response.setStatus(HttpServletResponse.SC_FORBIDDEN);
      response.setContentType("application/json");
      response.getWriter().write("{\"code\":\"FORBIDDEN\",\"message\":\"Internal token not configured\"}");
      return;
    }

    String token = request.getHeader(HEADER);
    if (!expectedToken.equals(token)) {
      response.setStatus(HttpServletResponse.SC_FORBIDDEN);
      response.setContentType("application/json");
      response.getWriter().write("{\"code\":\"FORBIDDEN\",\"message\":\"Invalid internal token\"}");
      return;
    }

    filterChain.doFilter(request, response);
  }
}
