package com.university.lms.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.university.lms.common.domain.UserLocale;
import com.university.lms.common.domain.UserRole;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.common.security.JwtService;
import com.university.lms.common.security.JwtTokenBlacklistService;
import com.university.lms.user.client.CourseClient;
import com.university.lms.user.domain.User;
import com.university.lms.user.dto.LoginRequest;
import com.university.lms.user.dto.AuthResponse;
import com.university.lms.user.dto.RegisterRequest;
import com.university.lms.user.dto.UserDto;
import com.university.lms.user.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private JwtService jwtService;
  @Mock private UserMapper userMapper;
  @Mock private EmailService emailService;
  @Mock private JwtTokenBlacklistService tokenBlacklistService;
  @Mock private CourseClient courseClient;
  @Mock private CacheManager cacheManager;

  @InjectMocks private UserService service;

  @Test
  void registerUser_success() {
    RegisterRequest request = RegisterRequest.builder()
        .email("test@example.com")
        .password("password123")
        .displayName("Test User")
        .build();

    when(userRepository.existsByEmailIgnoreCase("test@example.com")).thenReturn(false);
    when(passwordEncoder.encode("password123")).thenReturn("encoded");
    when(userRepository.save(any(User.class))).thenAnswer(inv -> {
      User u = inv.getArgument(0);
      u.setId(UUID.randomUUID());
      return u;
    });
    UserDto dto = UserDto.builder().id(UUID.randomUUID()).email("test@example.com").build();
    when(userMapper.toDto(any(User.class))).thenReturn(dto);

    UserDto result = service.registerUser(request);

    assertThat(result.getEmail()).isEqualTo("test@example.com");
    verify(emailService).sendVerificationEmail(any(User.class));
  }

  @Test
  void registerUser_duplicateEmail_throws() {
    RegisterRequest request = RegisterRequest.builder()
        .email("existing@example.com")
        .password("password123")
        .build();

    when(userRepository.existsByEmailIgnoreCase("existing@example.com")).thenReturn(true);

    assertThatThrownBy(() -> service.registerUser(request))
        .isInstanceOf(ValidationException.class);
  }

  @Test
  void login_validCredentials_returnsAuthResponse() {
    LoginRequest request = LoginRequest.builder()
        .email("user@example.com")
        .password("correct")
        .build();

    User user = User.builder()
        .id(UUID.randomUUID())
        .email("user@example.com")
        .passwordHash("hashed")
        .role(UserRole.STUDENT)
        .isActive(true)
        .build();

    when(userRepository.findByEmailIgnoreCaseAndIsDeletedFalse("user@example.com"))
        .thenReturn(Optional.of(user));
    when(passwordEncoder.matches("correct", "hashed")).thenReturn(true);
    when(jwtService.generateToken(any(), anyString())).thenReturn("access-token");
    when(jwtService.generateRefreshToken(any(), anyString())).thenReturn("refresh-token");
    when(jwtService.getExpirationTime()).thenReturn(3600L);
    UserDto dto = UserDto.builder().id(user.getId()).email("user@example.com").build();
    when(userMapper.toDto(user)).thenReturn(dto);

    AuthResponse response = service.login(request);

    assertThat(response.getAccessToken()).isEqualTo("access-token");
  }

  @Test
  void login_invalidPassword_throws() {
    LoginRequest request = LoginRequest.builder()
        .email("user@example.com")
        .password("wrong")
        .build();

    User user = User.builder()
        .id(UUID.randomUUID())
        .email("user@example.com")
        .passwordHash("hashed")
        .role(UserRole.STUDENT)
        .isActive(true)
        .build();

    when(userRepository.findByEmailIgnoreCaseAndIsDeletedFalse("user@example.com"))
        .thenReturn(Optional.of(user));
    when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

    assertThatThrownBy(() -> service.login(request))
        .isInstanceOf(ValidationException.class);
  }

  @Test
  void getUserById_notFound_throws() {
    UUID userId = UUID.randomUUID();
    when(userRepository.findByIdAndIsDeletedFalse(userId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.getUserById(userId))
        .isInstanceOf(Exception.class);
  }
}
