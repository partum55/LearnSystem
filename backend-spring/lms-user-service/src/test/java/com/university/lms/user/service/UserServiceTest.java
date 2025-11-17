package com.university.lms.user.service;

import com.university.lms.common.domain.UserRole;
import com.university.lms.user.domain.User;
import com.university.lms.user.dto.LoginRequest;
import com.university.lms.user.dto.RegisterRequest;
import com.university.lms.user.dto.UserDto;
import com.university.lms.user.dto.AuthResponse;
import com.university.lms.user.repository.UserRepository;
import com.university.lms.common.security.JwtService;
import com.university.lms.user.util.TestDataFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UserService.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private UserService userService;

    @Test
    void registerUser_WithValidData_ShouldSaveAndReturnUser() {
        // Given
        RegisterRequest request = TestDataFactory.createValidRegisterRequest();
        User savedUser = TestDataFactory.createStudentUser();
        savedUser.setEmail(request.getEmail());

        UserDto userDto = UserDto.builder()
                .id(savedUser.getId())
                .email(savedUser.getEmail())
                .role(savedUser.getRole())
                .build();

        when(userRepository.existsByEmailIgnoreCase(request.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(request.getPassword())).thenReturn("hashed-password");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(userMapper.toDto(any(User.class))).thenReturn(userDto);

        // When
        UserDto result = userService.registerUser(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmail()).isEqualTo(request.getEmail());
        assertThat(result.getRole()).isEqualTo(UserRole.STUDENT);

        verify(userRepository).existsByEmailIgnoreCase(request.getEmail());
        verify(passwordEncoder).encode(request.getPassword());
        verify(userRepository).save(any(User.class));
        verify(userMapper).toDto(any(User.class));
    }

    @Test
    void registerUser_WithExistingEmail_ShouldThrowException() {
        // Given
        RegisterRequest request = TestDataFactory.createValidRegisterRequest();
        when(userRepository.existsByEmailIgnoreCase(request.getEmail())).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> userService.registerUser(request))
                .isInstanceOf(RuntimeException.class);

        verify(userRepository).existsByEmailIgnoreCase(request.getEmail());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void login_WithValidCredentials_ShouldReturnAuthResponse() {
        // Given
        LoginRequest request = TestDataFactory.createValidLoginRequest();
        User user = TestDataFactory.createStudentUser();
        user.setEmail(request.getEmail());
        user.setPasswordHash("hashed-password");

        UserDto userDto = UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .build();

        when(userRepository.findByEmailIgnoreCase(request.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(request.getPassword(), user.getPasswordHash())).thenReturn(true);
        when(jwtService.generateToken(any(User.class))).thenReturn("access-token");
        when(jwtService.generateRefreshToken(any(User.class))).thenReturn("refresh-token");
        when(userMapper.toDto(any(User.class))).thenReturn(userDto);

        // When
        AuthResponse result = userService.login(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getAccessToken()).isEqualTo("access-token");
        assertThat(result.getRefreshToken()).isEqualTo("refresh-token");
        assertThat(result.getUser()).isNotNull();
        assertThat(result.getUser().getEmail()).isEqualTo(request.getEmail());

        verify(userRepository).findByEmailIgnoreCase(request.getEmail());
        verify(passwordEncoder).matches(request.getPassword(), user.getPasswordHash());
        verify(jwtService).generateToken(any(User.class));
        verify(userMapper).toDto(any(User.class));
    }

    @Test
    void login_WithInvalidPassword_ShouldThrowException() {
        // Given
        LoginRequest request = TestDataFactory.createValidLoginRequest();
        User user = TestDataFactory.createStudentUser();
        user.setEmail(request.getEmail());

        when(userRepository.findByEmailIgnoreCase(request.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(request.getPassword(), user.getPasswordHash())).thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> userService.login(request))
                .isInstanceOf(RuntimeException.class);

        verify(userRepository).findByEmailIgnoreCase(request.getEmail());
        verify(passwordEncoder).matches(request.getPassword(), user.getPasswordHash());
        verify(jwtService, never()).generateToken(any(User.class));
    }

    @Test
    void login_WithNonExistentUser_ShouldThrowException() {
        // Given
        LoginRequest request = TestDataFactory.createValidLoginRequest();
        when(userRepository.findByEmailIgnoreCase(request.getEmail())).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.login(request))
                .isInstanceOf(RuntimeException.class);

        verify(userRepository).findByEmailIgnoreCase(request.getEmail());
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    @Test
    void getUserById_WhenExists_ShouldReturnUser() {
        // Given
        UUID userId = UUID.randomUUID();
        User user = TestDataFactory.createStudentUser();
        user.setId(userId);

        UserDto userDto = UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userMapper.toDto(any(User.class))).thenReturn(userDto);

        // When
        UserDto result = userService.getUserById(userId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(userId);
        assertThat(result.getEmail()).isEqualTo(user.getEmail());

        verify(userRepository).findById(userId);
        verify(userMapper).toDto(any(User.class));
    }

    @Test
    void getUserById_WhenNotExists_ShouldThrowException() {
        // Given
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.getUserById(userId))
                .isInstanceOf(RuntimeException.class);

        verify(userRepository).findById(userId);
    }
}
