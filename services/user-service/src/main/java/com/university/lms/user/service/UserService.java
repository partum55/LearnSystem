package com.university.lms.user.service;

import com.university.lms.common.domain.UserRole;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.user.client.CourseClient;
import com.university.lms.user.domain.User;
import com.university.lms.user.dto.AdminUpdateUserRequest;
import com.university.lms.user.dto.CreateUserRequest;
import com.university.lms.user.dto.UpdateUserRequest;
import com.university.lms.user.dto.UserDto;
import com.university.lms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private static final Set<String> ALLOWED_THEMES = Set.of("LIGHT", "DARK");
    private static final String USERS_CACHE = "users";

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final CourseClient courseClient;
    private final CacheManager cacheManager;

    @Value("${supabase.url:https://aarkyaevxuhlkefayzro.supabase.co}")
    private String supabaseUrl;

    @Value("${supabase.secret-key:}")
    private String supabaseSecretKey;

    private RestTemplate restTemplate = new RestTemplate();

    @Transactional
    public UserDto createUser(CreateUserRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ValidationException("email", "Email already exists");
        }

        if (request.getStudentId() != null && !request.getStudentId().isBlank()) {
            if (userRepository.existsByStudentId(request.getStudentId().trim())) {
                throw new ValidationException("studentId", "Student ID already exists");
            }
        }

        // 1. Create user in Supabase Auth
        log.info("Creating user in Supabase Auth: {}", email);
        UUID userId;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("apikey", supabaseSecretKey);
            headers.set("Authorization", "Bearer " + supabaseSecretKey);

            Map<String, Object> body = new HashMap<>();
            body.put("email", email);
            body.put("password", request.getPassword());
            body.put("email_confirm", true);

            Map<String, String> userMetadata = new HashMap<>();
            if (request.getFirstName() != null && !request.getFirstName().isBlank()) {
                userMetadata.put("first_name", request.getFirstName().trim());
            }
            if (request.getLastName() != null && !request.getLastName().isBlank()) {
                userMetadata.put("last_name", request.getLastName().trim());
            }
            body.put("user_metadata", userMetadata);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            String url = supabaseUrl.replaceAll("/+$", "") + "/auth/v1/admin/users";
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null || !responseBody.containsKey("id")) {
                throw new ValidationException("email", "Invalid response from Supabase Auth");
            }
            userId = UUID.fromString(responseBody.get("id").toString());
        } catch (Exception ex) {
            log.error("Failed to create user in Supabase: {}", ex.getMessage());
            throw new ValidationException("email", "Failed to create user in Supabase Auth: " + ex.getMessage());
        }

        // 2. Fetch the created profile from public.users (inserted via Postgres trigger)
        User user = userRepository.findById(userId)
                .orElseGet(() -> userRepository.findByEmailIgnoreCase(email)
                        .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString())));

        // 3. Update with role and other details
        user.setRole(request.getRole() == null ? UserRole.USER : request.getRole());
        user.setFirstName(normalizeOptional(request.getFirstName()));
        user.setLastName(normalizeOptional(request.getLastName()));
        user.setStudentId(normalizeOptional(request.getStudentId()));
        if (request.getLocale() != null) {
            user.setLocale(request.getLocale());
        } else {
            user.setLocale(com.university.lms.common.domain.UserLocale.UK);
        }
        user.setEmailVerified(true);
        user.setActive(true);

        User savedUser = userRepository.save(user);
        log.info("Successfully provisioned admin user profile: {}", savedUser.getId());

        return userMapper.toDto(savedUser);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = USERS_CACHE, key = "#id")
    public UserDto getUserById(UUID id) {
        return userMapper.toDto(getRequiredUserById(id));
    }

    @Transactional(readOnly = true)
    public UserDto getUserByEmail(String email) {
        String normalizedEmail = normalizeEmail(email);
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", normalizedEmail));
        return userMapper.toDto(user);
    }

    @Transactional
    @CacheEvict(value = USERS_CACHE, key = "#id")
    public UserDto updateUser(UUID id, UpdateUserRequest request) {
        User user = getRequiredUserById(id);

        UpdateUserRequest normalizedRequest = normalizeUpdateRequest(request);
        userMapper.updateUserFromRequest(normalizedRequest, user);

        User updatedUser = userRepository.save(user);
        log.info("User updated: {}", id);

        return userMapper.toDto(updatedUser);
    }

    @Transactional
    @CacheEvict(value = USERS_CACHE, key = "#targetUserId")
    public UserDto adminUpdateUser(UUID targetUserId, AdminUpdateUserRequest request, UUID actorId, UserRole actorRole) {
        User targetUser = getRequiredUserById(targetUserId);

        if (actorRole != UserRole.ADMIN) {
            throw new ValidationException("role", "Only administrators can perform this action");
        }

        if (actorId != null && actorId.equals(targetUserId) && request.getRole() == UserRole.ADMIN) {
            throw new ValidationException("role", "User cannot make themselves ADMIN");
        }

        if (request.getRole() != null) {
            targetUser.setRole(request.getRole());
        }
        if (request.getIsActive() != null) {
            targetUser.setActive(request.getIsActive());
        }

        User savedUser = userRepository.save(targetUser);
        log.info("User {} updated by admin {} ({})", targetUserId, actorId, actorRole);
        return userMapper.toDto(savedUser);
    }

    @Transactional(readOnly = true)
    public PageResponse<UserDto> searchUsers(String query, Pageable pageable) {
        String normalizedQuery = normalizeOptional(query);
        Page<User> userPage = normalizedQuery == null
                ? userRepository.findAll(pageable)
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

        Page<User> userPage = userRepository.findByRole(role, pageable);
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
        getRequiredUserById(userId);
        courseClient.deleteUserData(userId);

        if (hasSupabaseAdminCredentials()) {
            deleteSupabaseAuthUser(userId);
            if (userRepository.existsById(userId)) {
                userRepository.deleteById(userId);
            }
        } else {
            log.warn("SUPABASE_SECRET_KEY is not configured; deleting only local profile {}", userId);
            userRepository.deleteById(userId);
        }
        log.info("User deleted: {}", userId);
    }

    private boolean hasSupabaseAdminCredentials() {
        return supabaseSecretKey != null && !supabaseSecretKey.isBlank();
    }

    private void deleteSupabaseAuthUser(UUID userId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("apikey", supabaseSecretKey);
            headers.set("Authorization", "Bearer " + supabaseSecretKey);

            HttpEntity<Void> entity = new HttpEntity<>(headers);
            String url = supabaseUrl.replaceAll("/+$", "") + "/auth/v1/admin/users/" + userId;
            restTemplate.exchange(url, HttpMethod.DELETE, entity, Void.class);
        } catch (HttpClientErrorException.NotFound ex) {
            log.warn("Supabase Auth user {} was already missing; deleting local profile", userId);
        } catch (Exception ex) {
            log.error("Failed to delete Supabase Auth user {}: {}", userId, ex.getMessage());
            throw new ValidationException("userId", "Failed to delete Supabase Auth user: " + ex.getMessage());
        }
    }

    private User getRequiredUserById(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));
    }

    private UpdateUserRequest normalizeUpdateRequest(UpdateUserRequest request) {
        return UpdateUserRequest.builder()
                .firstName(normalizeOptional(request.getFirstName()))
                .lastName(normalizeOptional(request.getLastName()))
                .locale(request.getLocale())
                .theme(normalizeTheme(request.getTheme()))
                .avatarUrl(normalizeOptional(request.getAvatarUrl()))
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
        String upperCaseTheme = lowerCaseTheme.toUpperCase(Locale.ROOT);
        if (!ALLOWED_THEMES.contains(upperCaseTheme)) {
            throw new ValidationException("theme", "Supported values are: light, dark");
        }
        return upperCaseTheme;
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
