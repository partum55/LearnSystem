package com.university.lms.user.dto;

import com.university.lms.common.domain.UserLocale;
import com.university.lms.common.domain.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for user registration.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    @Size(max = 254, message = "Email must not exceed 254 characters")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
        message = "Password must contain at least one uppercase letter, one lowercase letter, and one digit"
    )
    private String password;

    @Size(max = 150, message = "Display name must not exceed 150 characters")
    private String displayName;

    @Size(max = 150, message = "First name must not exceed 150 characters")
    private String firstName;

    @Size(max = 150, message = "Last name must not exceed 150 characters")
    private String lastName;

    @Size(max = 50, message = "Student ID must not exceed 50 characters")
    private String studentId;

    /**
     * Registration is restricted to STUDENT role in service validation.
     * The field is kept for backward compatibility with existing clients.
     */
    @Builder.Default
    private UserRole role = UserRole.STUDENT;

    @Builder.Default
    private UserLocale locale = UserLocale.UK;
}
