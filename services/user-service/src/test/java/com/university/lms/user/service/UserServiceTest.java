package com.university.lms.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.university.lms.common.domain.UserLocale;
import com.university.lms.common.domain.UserRole;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.user.client.CourseClient;
import com.university.lms.user.domain.User;
import com.university.lms.user.dto.UpdateUserRequest;
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

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private UserMapper userMapper;
  @Mock private CourseClient courseClient;
  @Mock private CacheManager cacheManager;

  @InjectMocks private UserService service;

  @Test
  void getUserById_returnsProfile() {
    UUID userId = UUID.randomUUID();
    User user = User.builder()
        .id(userId)
        .email("user@example.com")
        .role(UserRole.STUDENT)
        .locale(UserLocale.EN)
        .isActive(true)
        .build();
    UserDto dto = UserDto.builder().id(userId).email("user@example.com").build();

    when(userRepository.findByIdAndIsDeletedFalse(userId)).thenReturn(Optional.of(user));
    when(userMapper.toDto(user)).thenReturn(dto);

    UserDto result = service.getUserById(userId);

    assertThat(result.getId()).isEqualTo(userId);
    assertThat(result.getEmail()).isEqualTo("user@example.com");
  }

  @Test
  void getUserById_notFound_throws() {
    UUID userId = UUID.randomUUID();
    when(userRepository.findByIdAndIsDeletedFalse(userId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.getUserById(userId))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void updateUser_normalizesProfileFields() {
    UUID userId = UUID.randomUUID();
    User user = User.builder()
        .id(userId)
        .email("user@example.com")
        .role(UserRole.STUDENT)
        .locale(UserLocale.EN)
        .isActive(true)
        .build();
    UpdateUserRequest request = UpdateUserRequest.builder()
        .displayName("  Test User  ")
        .theme("DARK")
        .build();
    UserDto dto = UserDto.builder().id(userId).displayName("Test User").theme("dark").build();

    when(userRepository.findByIdAndIsDeletedFalse(userId)).thenReturn(Optional.of(user));
    when(userRepository.save(user)).thenReturn(user);
    when(userMapper.toDto(user)).thenReturn(dto);

    UserDto result = service.updateUser(userId, request);

    assertThat(result.getDisplayName()).isEqualTo("Test User");
    assertThat(result.getTheme()).isEqualTo("dark");
  }
}
