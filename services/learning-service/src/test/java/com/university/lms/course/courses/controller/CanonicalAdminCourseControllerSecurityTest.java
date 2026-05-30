package com.university.lms.course.courses.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.university.lms.course.courses.service.CourseOwnerService;
import com.university.lms.course.dto.CourseDto;
import com.university.lms.course.service.CourseService;
import com.university.lms.course.web.RequestUserContext;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Security/authorization integration test for {@code POST /v1/admin/courses/{courseId}/reassign-owner}.
 * Drives the real {@code @PreAuthorize("hasRole('ADMIN')")} gate through the Spring Security filter
 * chain + method security (business logic is mocked):
 *   - unauthenticated -> 401 (authentication entry point)
 *   - authenticated non-admin (STUDENT) -> 403 (access denied)
 *   - ADMIN -> reaches the service -> 200
 *
 * <p>The controller is imported explicitly and the context is anchored on the nested
 * {@link TestSecurityConfig} rather than the full {@code CourseServiceApplication}, so the heavy
 * JPA / production-filter beans (which need infrastructure outside a web slice) are not pulled in.
 */
@WebMvcTest
@Import({
  CanonicalAdminCourseController.class,
  CanonicalAdminCourseControllerSecurityTest.TestSecurityConfig.class
})
class CanonicalAdminCourseControllerSecurityTest {

  private static final String PATH =
      "/v1/admin/courses/11111111-1111-1111-1111-111111111111/reassign-owner";
  private static final String BODY =
      "{\"newOwnerId\":\"22222222-2222-2222-2222-222222222222\"}";

  @Autowired private MockMvc mockMvc;

  @MockBean private CourseService courseService;
  @MockBean private CourseOwnerService courseOwnerService;
  @MockBean private RequestUserContext requestUserContext;

  @Test
  void unauthenticatedIsUnauthorized() throws Exception {
    mockMvc
        .perform(post(PATH).contentType("application/json").content(BODY).with(csrf()))
        .andExpect(status().isUnauthorized());

    verify(courseOwnerService, never()).reassignOwner(any(), any());
  }

  @Test
  void authenticatedNonAdminIsForbidden() throws Exception {
    mockMvc
        .perform(
            post(PATH)
                .contentType("application/json")
                .content(BODY)
                .with(user("student").roles("STUDENT"))
                .with(csrf()))
        .andExpect(status().isForbidden());

    verify(courseOwnerService, never()).reassignOwner(any(), any());
  }

  @Test
  void adminReachesService() throws Exception {
    when(courseOwnerService.reassignOwner(any(UUID.class), any(UUID.class)))
        .thenReturn(CourseDto.builder().id(UUID.randomUUID()).code("CS101").build());

    mockMvc
        .perform(
            post(PATH)
                .contentType("application/json")
                .content(BODY)
                .with(user("admin").roles("ADMIN"))
                .with(csrf()))
        .andExpect(status().isOk());

    verify(courseOwnerService).reassignOwner(any(UUID.class), any(UUID.class));
  }

  /**
   * Minimal security chain mirroring production semantics: method security enabled,
   * unauthenticated -> 401, authenticated-but-denied -> 403, CSRF disabled (handled at the gateway).
   */
  @Configuration
  @EnableWebSecurity
  @EnableMethodSecurity(prePostEnabled = true)
  static class TestSecurityConfig {
    @Bean
    SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
      http.csrf(AbstractHttpConfigurer::disable)
          .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
          .exceptionHandling(
              ex ->
                  ex.authenticationEntryPoint((req, res, e) -> res.setStatus(401))
                      .accessDeniedHandler((req, res, e) -> res.setStatus(403)));
      return http.build();
    }
  }
}
