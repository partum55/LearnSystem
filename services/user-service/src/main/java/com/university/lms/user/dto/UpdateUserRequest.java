package com.university.lms.user.dto;

import com.university.lms.common.domain.UserLocale;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for updating user profile.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    @Size(max = 150, message = "First name must not exceed 150 characters")
    private String firstName;

    @Size(max = 150, message = "Last name must not exceed 150 characters")
    private String lastName;

    private UserLocale locale;

    @Pattern(regexp = "^(?i)(light|dark)$", message = "Theme must be either 'light' or 'dark'")
    private String theme;

    @Size(max = 2048, message = "Avatar URL must not exceed 2048 characters")
    private String avatarUrl;
}
