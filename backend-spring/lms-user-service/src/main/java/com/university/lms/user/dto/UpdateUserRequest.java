package com.university.lms.user.dto;

import com.university.lms.common.domain.UserLocale;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Request DTO for updating user profile.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    @Size(max = 150, message = "Display name must not exceed 150 characters")
    private String displayName;

    @Size(max = 150, message = "First name must not exceed 150 characters")
    private String firstName;

    @Size(max = 150, message = "Last name must not exceed 150 characters")
    private String lastName;

    @Size(max = 1000, message = "Bio must not exceed 1000 characters")
    private String bio;

    private UserLocale locale;

    private String theme;

    private String avatarUrl;

    private Map<String, Object> preferences;
}

