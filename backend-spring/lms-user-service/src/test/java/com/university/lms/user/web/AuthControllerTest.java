package com.university.lms.user.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.common.security.JwtService;
import com.university.lms.common.domain.UserRole;
import com.university.lms.user.dto.*;
import com.university.lms.user.service.UserService;
import com.university.lms.user.util.TestDataFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for AuthController.
 */
@WebMvcTest(
    controllers = AuthController.class,
    excludeAutoConfiguration = {
        HibernateJpaAutoConfiguration.class,
        DataSourceAutoConfiguration.class,
        JpaRepositoriesAutoConfiguration.class
    },
    excludeFilters = {
        @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
            classes = com.university.lms.user.config.JpaAuditingConfig.class)
    }
)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private com.university.lms.user.repository.UserRepository userRepository;

    @Test
    void register_WithValidData_ShouldReturnCreatedUser() throws Exception {
        // Given
        RegisterRequest request = TestDataFactory.createValidRegisterRequest();
        UserDto userDto = UserDto.builder()
            .id(UUID.randomUUID())
            .email(request.getEmail())
            .displayName(request.getDisplayName())
            .role(UserRole.STUDENT)
            .isActive(true)
            .emailVerified(false)
            .build();

        when(userService.registerUser(any(RegisterRequest.class))).thenReturn(userDto);

        // When & Then
        mockMvc.perform(post("/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.email").value(request.getEmail()))
            .andExpect(jsonPath("$.displayName").value(request.getDisplayName()))
            .andExpect(jsonPath("$.role").value("STUDENT"))
            .andExpect(jsonPath("$.active").value(true))
            .andExpect(jsonPath("$.emailVerified").value(false));
    }

    @Test
    void register_WithInvalidEmail_ShouldReturnBadRequest() throws Exception {
        // Given
        RegisterRequest request = TestDataFactory.createValidRegisterRequest();
        request.setEmail("invalid-email");

        // When & Then
        mockMvc.perform(post("/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void register_WithShortPassword_ShouldReturnBadRequest() throws Exception {
        // Given
        RegisterRequest request = TestDataFactory.createValidRegisterRequest();
        request.setPassword("short");

        // When & Then
        mockMvc.perform(post("/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void register_WithWeakPassword_ShouldReturnBadRequest() throws Exception {
        // Given
        RegisterRequest request = TestDataFactory.createValidRegisterRequest();
        request.setPassword("weakpassword"); // No uppercase or digits

        // When & Then
        mockMvc.perform(post("/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void register_WithEmptyEmail_ShouldReturnBadRequest() throws Exception {
        // Given
        RegisterRequest request = TestDataFactory.createValidRegisterRequest();
        request.setEmail("");

        // When & Then
        mockMvc.perform(post("/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void login_WithValidCredentials_ShouldReturnAuthResponse() throws Exception {
        // Given
        LoginRequest request = TestDataFactory.createValidLoginRequest();
        AuthResponse authResponse = AuthResponse.builder()
            .accessToken("test-access-token")
            .refreshToken("test-refresh-token")
            .user(UserDto.builder()
                .id(UUID.randomUUID())
                .email(request.getEmail())
                .displayName("Test User")
                .role(UserRole.STUDENT)
                .isActive(true)
                .build())
            .build();

        when(userService.login(any(LoginRequest.class))).thenReturn(authResponse);

        // When & Then
        mockMvc.perform(post("/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").value("test-access-token"))
            .andExpect(jsonPath("$.refreshToken").value("test-refresh-token"))
            .andExpect(jsonPath("$.user").exists())
            .andExpect(jsonPath("$.user.email").value(request.getEmail()));
    }

    @Test
    void login_WithInvalidEmail_ShouldReturnBadRequest() throws Exception {
        // Given
        LoginRequest request = LoginRequest.builder()
            .email("invalid-email")
            .password("password")
            .build();

        // When & Then
        mockMvc.perform(post("/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void login_WithEmptyPassword_ShouldReturnBadRequest() throws Exception {
        // Given
        LoginRequest request = LoginRequest.builder()
            .email("test@ucu.edu.ua")
            .password("")
            .build();

        // When & Then
        mockMvc.perform(post("/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void verifyEmail_WithValidToken_ShouldReturnOk() throws Exception {
        // When & Then
        mockMvc.perform(post("/auth/verify-email")
                .with(csrf())
                .param("token", "valid-verification-token"))
            .andExpect(status().isOk());
    }

    @Test
    void forgotPassword_WithValidEmail_ShouldReturnOk() throws Exception {
        // When & Then
        mockMvc.perform(post("/auth/forgot-password")
                .with(csrf())
                .param("email", "test@ucu.edu.ua"))
            .andExpect(status().isOk());
    }

    @Test
    void resetPassword_WithValidData_ShouldReturnOk() throws Exception {
        // Given
        ResetPasswordRequest request = ResetPasswordRequest.builder()
            .token("valid-reset-token")
            .newPassword("NewPass123")
            .build();

        // When & Then
        mockMvc.perform(post("/auth/reset-password")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk());
    }

    @Test
    void logout_ShouldReturnOk() throws Exception {
        // When & Then
        mockMvc.perform(post("/auth/logout")
                .with(csrf()))
            .andExpect(status().isOk());
    }
}
