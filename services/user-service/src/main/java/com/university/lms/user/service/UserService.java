package com.university.lms.user.service;

import com.university.lms.common.domain.UserRole;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.user.client.CourseClient;
import com.university.lms.user.domain.User;
import com.university.lms.user.dto.UpdateUserRequest;
import com.university.lms.user.dto.UserDto;
import com.university.lms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private static final Set<String> ALLOWED_THEMES = Set.of("light", "dark");
    private static final String USERS_CACHE = "users";

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final CourseClient courseClient;
    private final CacheManager cacheManager;

    @Transactional(readOnly = true)
    @Cacheable(value = USERS_CACHE, key = "#id")
    public UserDto getUserById(UUID id) {
        return userMapper.toDto(getRequiredUserById(id));
    }

    @Transactional(readOnly = true)
    public UserDto getUserByEmail(String email) {
        String normalizedEmail = normalizeEmail(email);
        User user = userRepository.findByEmailIgnoreCaseAndIsDeletedFalse(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", normalizedEmail));
        return userMapper.toDto(user);
    }

    @Transactional
    @CacheEvict(value = USERS_CACHE, key = "#id")
    public UserDto updateUser(UUID id, UpdateUserRequest request) {
        User user = getRequiredUserById(id);

        UpdateUserRequest normalizedRequest = normalizeUpdateRequest(request);
        userMapper.updateUserFromRequest(normalizedRequest, user);

        if (normalizedRequest.getPreferences() != null) {
            user.setPreferences(new HashMap<>(normalizedRequest.getPreferences()));
        }

        User updatedUser = userRepository.save(user);
        log.info("User updated: {}", id);

        return userMapper.toDto(updatedUser);
    }

    @Transactional(readOnly = true)
    public PageResponse<UserDto> searchUsers(String query, Pageable pageable) {
        String normalizedQuery = normalizeOptional(query);
        Page<User> userPage = normalizedQuery == null
                ? userRepository.findByIsDeletedFalse(pageable)
                : userRepository.searchUsers(normalizedQuery, pageable);

        return PageResponse.of(
                userPage.getContent().stream().map(userMapper::toDto).toList(),
                userPage.getNumber(),
                userPage.getSize(),
                userPage.getTotalElements()
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<UserDto> getUsersByRole(UserRole role, Pageable pageable) {
        if (role == null) {
            throw new ValidationException("role", "Role is required");
        }

        Page<User> userPage = userRepository.findByRoleAndIsDeletedFalse(role, pageable);
        return PageResponse.of(
                userPage.getContent().stream().map(userMapper::toDto).toList(),
                userPage.getNumber(),
                userPage.getSize(),
                userPage.getTotalElements()
        );
    }

    @Transactional
    @CacheEvict(value = USERS_CACHE, key = "#userId")
    public void deactivateUser(UUID userId) {
        User user = getRequiredUserById(userId);
        user.setActive(false);
        userRepository.save(user);
        log.info("User deactivated: {}", userId);
    }

    @Transactional
    @CacheEvict(value = USERS_CACHE, key = "#userId")
    public void activateUser(UUID userId) {
        User user = getRequiredUserById(userId);
        user.setActive(true);
        userRepository.save(user);
        log.info("User activated: {}", userId);
    }

    @Transactional
    @CacheEvict(value = USERS_CACHE, key = "#userId")
    public void deleteUser(UUID userId) {
        User user = getRequiredUserById(userId);

        try {
            courseClient.deleteUserData(userId);
        } catch (Exception ex) {
            log.error("Failed to cleanup course data for user {}: {}", userId, ex.getMessage());
            // We might want to allow deletion even if course cleanup fails, or retry.
        }

        userRepository.delete(user);
        log.info("User deleted: {}", userId);
    }

    private User getRequiredUserById(UUID userId) {
        return userRepository.findByIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));
    }

    private UpdateUserRequest normalizeUpdateRequest(UpdateUserRequest request) {
        return UpdateUserRequest.builder()
                .displayName(normalizeOptional(request.getDisplayName()))
                .firstName(normalizeOptional(request.getFirstName()))
                .lastName(normalizeOptional(request.getLastName()))
                .bio(normalizeOptional(request.getBio()))
                .locale(request.getLocale())
                .theme(normalizeTheme(request.getTheme()))
                .avatarUrl(normalizeOptional(request.getAvatarUrl()))
                .preferences(request.getPreferences() == null ? null : new HashMap<>(request.getPreferences()))
                .build();
    }

    private String normalizeEmail(String email) {
        String normalizedEmail = normalizeOptional(email);
        if (normalizedEmail == null) {
            throw new ValidationException("Email is required");
        }
        return normalizedEmail.toLowerCase(Locale.ROOT);
    }

    private String normalizeTheme(String theme) {
        String normalizedTheme = normalizeOptional(theme);
        if (normalizedTheme == null) {
            return null;
        }

        String lowerCaseTheme = normalizedTheme.toLowerCase(Locale.ROOT);
        if (!ALLOWED_THEMES.contains(lowerCaseTheme)) {
            throw new ValidationException("theme", "Supported values are: light, dark");
        }
        return lowerCaseTheme;
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void evictUserCache(UUID userId) {
        Cache cache = cacheManager.getCache(USERS_CACHE);
        if (cache != null) {
            cache.evict(userId);
        }
    }
}
