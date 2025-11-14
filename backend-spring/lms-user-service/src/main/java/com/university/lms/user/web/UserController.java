package com.university.lms.user.web;

import com.university.lms.common.domain.UserRole;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.user.dto.ChangePasswordRequest;
import com.university.lms.user.dto.UpdateUserRequest;
import com.university.lms.user.dto.UserDto;
import com.university.lms.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for user management operations.
 * Matches Django's users endpoints.
 */
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;

    /**
     * Get current user profile.
     * GET /api/users/me
     */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserDto> getCurrentUser(@RequestAttribute("userId") UUID userId) {
        log.info("Get current user profile: {}", userId);
        UserDto user = userService.getUserById(userId);
        return ResponseEntity.ok(user);
    }

    /**
     * Update current user profile.
     * PUT /api/users/me
     */
    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserDto> updateCurrentUser(
            @RequestAttribute("userId") UUID userId,
            @Valid @RequestBody UpdateUserRequest request) {
        log.info("Update current user profile: {}", userId);
        UserDto user = userService.updateUser(userId, request);
        return ResponseEntity.ok(user);
    }

    /**
     * Change password for current user.
     * POST /api/users/me/change-password
     */
    @PostMapping("/me/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> changePassword(
            @RequestAttribute("userId") UUID userId,
            @Valid @RequestBody ChangePasswordRequest request) {
        log.info("Change password for user: {}", userId);
        userService.changePassword(userId, request);
        return ResponseEntity.ok().build();
    }

    /**
     * Get user by ID.
     * GET /api/users/{id}
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserDto> getUserById(@PathVariable UUID id) {
        log.info("Get user by ID: {}", id);
        UserDto user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    /**
     * Search users with pagination.
     * GET /api/users?query=...&page=0&size=20
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'SUPERADMIN')")
    public ResponseEntity<PageResponse<UserDto>> searchUsers(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) UserRole role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") Sort.Direction direction) {

        log.info("Search users: query={}, role={}, page={}, size={}", query, role, page, size);

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        PageResponse<UserDto> response = role != null
                ? userService.getUsersByRole(role, pageable)
                : userService.searchUsers(query, pageable);

        return ResponseEntity.ok(response);
    }

    /**
     * Update user by ID (admin only).
     * PUT /api/users/{id}
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<UserDto> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request) {
        log.info("Admin update user: {}", id);
        UserDto user = userService.updateUser(id, request);
        return ResponseEntity.ok(user);
    }

    /**
     * Deactivate user (admin only).
     * POST /api/users/{id}/deactivate
     */
    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<Void> deactivateUser(@PathVariable UUID id) {
        log.info("Deactivate user: {}", id);
        userService.deactivateUser(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Activate user (admin only).
     * POST /api/users/{id}/activate
     */
    @PostMapping("/{id}/activate")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<Void> activateUser(@PathVariable UUID id) {
        log.info("Activate user: {}", id);
        userService.activateUser(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Delete user (admin only).
     * DELETE /api/users/{id}
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID id) {
        log.info("Delete user: {}", id);
        userService.deleteUser(id);
        return ResponseEntity.ok().build();
    }
}

