package com.university.lms.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.university.lms.common.domain.UserLocale;
import com.university.lms.common.domain.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * User data transfer object for API responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private UUID id;
    private String email;
    private String displayName;
    private String firstName;
    private String lastName;
    private String studentId;
    private UserRole role;
    private UserLocale locale;
    private String theme;
    private String avatarUrl;
    private String bio;
    private boolean isActive;
    private boolean emailVerified;
    private Map<String, Object> preferences;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Get full name.
     */
    public String getFullName() {
        if (displayName != null && !displayName.isBlank()) {
            return displayName;
        }
        if (firstName != null && lastName != null) {
            return firstName + " " + lastName;
        }
        return email;
    }
}

