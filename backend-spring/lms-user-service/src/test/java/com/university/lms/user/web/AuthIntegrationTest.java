package com.university.lms.user.web;

import com.university.lms.user.BaseIntegrationTest;
import com.university.lms.user.dto.AuthResponse;
import com.university.lms.user.dto.LoginRequest;
import com.university.lms.user.dto.RegisterRequest;
import com.university.lms.user.dto.UserDto;
import com.university.lms.user.repository.UserRepository;
import com.university.lms.user.util.TestDataFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for authentication flow.
 */
class AuthIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @AfterEach
    void cleanup() {
        userRepository.deleteAll();
    }

    @Test
    void testCompleteAuthenticationFlow() {
        // 1. Register a new user
        RegisterRequest registerRequest = TestDataFactory.createValidRegisterRequest();

        ResponseEntity<UserDto> registerResponse = restTemplate.postForEntity(
                "/auth/register",
                registerRequest,
                UserDto.class
        );

        assertThat(registerResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(registerResponse.getBody()).isNotNull();
        assertThat(registerResponse.getBody().getEmail()).isEqualTo(registerRequest.getEmail());
        assertThat(registerResponse.getBody().getId()).isNotNull();

        // 2. Login with registered credentials
        LoginRequest loginRequest = LoginRequest.builder()
                .email(registerRequest.getEmail())
                .password(registerRequest.getPassword())
                .build();

        ResponseEntity<AuthResponse> loginResponse = restTemplate.postForEntity(
                "/auth/login",
                loginRequest,
                AuthResponse.class
        );

        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(loginResponse.getBody()).isNotNull();
        assertThat(loginResponse.getBody().getAccessToken()).isNotNull();
        assertThat(loginResponse.getBody().getRefreshToken()).isNotNull();
        assertThat(loginResponse.getBody().getUser()).isNotNull();
        assertThat(loginResponse.getBody().getUser().getEmail()).isEqualTo(registerRequest.getEmail());
    }

    @Test
    void register_WithDuplicateEmail_ShouldReturnConflict() {
        // Given - register first user
        RegisterRequest firstRequest = TestDataFactory.createValidRegisterRequest();
        restTemplate.postForEntity("/auth/register", firstRequest, UserDto.class);

        // When - try to register with same email
        RegisterRequest duplicateRequest = TestDataFactory.createValidRegisterRequest();
        ResponseEntity<UserDto> response = restTemplate.postForEntity(
                "/auth/register",
                duplicateRequest,
                UserDto.class
        );

        // Then
        assertThat(response.getStatusCode()).isIn(HttpStatus.CONFLICT, HttpStatus.BAD_REQUEST);
    }

    @Test
    void login_WithInvalidCredentials_ShouldReturnUnauthorized() {
        // Given - register user
        RegisterRequest registerRequest = TestDataFactory.createValidRegisterRequest();
        restTemplate.postForEntity("/auth/register", registerRequest, UserDto.class);

        // When - login with wrong password
        LoginRequest loginRequest = LoginRequest.builder()
                .email(registerRequest.getEmail())
                .password("WrongPassword123")
                .build();

        ResponseEntity<AuthResponse> response = restTemplate.postForEntity(
                "/auth/login",
                loginRequest,
                AuthResponse.class
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void login_WithNonExistentUser_ShouldReturnUnauthorized() {
        // Given
        LoginRequest loginRequest = LoginRequest.builder()
                .email("nonexistent@ucu.edu.ua")
                .password("Password123")
                .build();

        // When
        ResponseEntity<AuthResponse> response = restTemplate.postForEntity(
                "/auth/login",
                loginRequest,
                AuthResponse.class
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}

