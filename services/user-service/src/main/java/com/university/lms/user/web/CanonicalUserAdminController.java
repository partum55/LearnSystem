package com.university.lms.user.web;

import com.university.lms.common.domain.UserRole;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.user.dto.AdminUpdateUserRequest;
import com.university.lms.user.dto.UserDto;
import com.university.lms.user.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/v1/admin/users")
@RequiredArgsConstructor
@Validated
public class CanonicalUserAdminController {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "createdAt",
            "updatedAt",
            "email",
            "displayName",
            "firstName",
            "lastName",
            "role"
    );

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PageResponse<UserDto>> listUsers(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) UserRole role,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") Sort.Direction direction) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, resolveSortField(sortBy)));
        PageResponse<UserDto> response = role != null
                ? userService.getUsersByRole(role, pageable)
                : userService.searchUsers(query, pageable);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDto> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDto> updateUser(
            @PathVariable UUID id,
            @RequestAttribute("userId") UUID actorId,
            @RequestAttribute("userRole") String actorRoleStr,
            @Valid @RequestBody AdminUpdateUserRequest request) {
        UserRole actorRole = UserRole.fromValue(actorRoleStr);
        return ResponseEntity.ok(userService.adminUpdateUser(id, request, actorId, actorRole));
    }

    private String resolveSortField(String sortBy) {
        String normalizedSortField = sortBy == null ? "" : sortBy.trim();
        if (!ALLOWED_SORT_FIELDS.contains(normalizedSortField)) {
            throw new ValidationException("sortBy", "Unsupported sort field: " + sortBy);
        }
        return normalizedSortField;
    }
}
