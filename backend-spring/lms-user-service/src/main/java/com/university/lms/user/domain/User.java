package com.university.lms.user.domain;

import com.university.lms.common.domain.UserLocale;
import com.university.lms.common.domain.UserRole;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * User entity - maps directly from Django's User model.
 * Primary entity for Identity & Access Management.
 */
@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_user_email", columnList = "email"),
        @Index(name = "idx_user_role", columnList = "role"),
        @Index(name = "idx_user_student_id", columnList = "student_id")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false, length = 254)
    private String email;

    @Column(name = "display_name", length = 150)
    private String displayName;

    @Column(name = "first_name", length = 150)
    private String firstName;

    @Column(name = "last_name", length = 150)
    private String lastName;

    @Column(name = "student_id", unique = true, length = 50)
    private String studentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private UserRole role = UserRole.STUDENT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    @Builder.Default
    private UserLocale locale = UserLocale.UK;

    @Column(length = 10)
    @Builder.Default
    private String theme = "light";

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "is_active")
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "is_staff")
    @Builder.Default
    private boolean isStaff = false;

    @Column(name = "is_deleted")
    @Builder.Default
    private boolean isDeleted = false;

    @Column(name = "email_verified")
    @Builder.Default
    private boolean emailVerified = false;

    @Column(name = "email_verification_token", length = 255)
    private String emailVerificationToken;

    @Column(name = "password_reset_token", length = 255)
    private String passwordResetToken;

    @Column(name = "password_reset_expires")
    private LocalDateTime passwordResetExpires;

    /**
     * User preferences stored as JSONB for flexibility.
     * Maps to Django's JSONField.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> preferences = new HashMap<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Business methods

    /**
     * Get the full name of the user.
     */
    public String getFullName() {
        if (displayName != null && !displayName.isBlank()) {
            return displayName;
        }
        if (firstName != null && !firstName.isBlank() && lastName != null && !lastName.isBlank()) {
            return firstName + " " + lastName;
        }
        if (firstName != null && !firstName.isBlank()) {
            return firstName;
        }
        if (lastName != null && !lastName.isBlank()) {
            return lastName;
        }
        return email;
    }

    /**
     * Check if the user has admin privileges.
     */
    public boolean isAdmin() {
        return role == UserRole.SUPERADMIN;
    }

    /**
     * Check if the user is a teacher or admin.
     */
    public boolean isTeacherOrAdmin() {
        return role == UserRole.TEACHER || role == UserRole.SUPERADMIN;
    }

    /**
     * Check if the password reset token is still valid.
     */
    public boolean isPasswordResetTokenValid() {
        return passwordResetToken != null
                && passwordResetExpires != null
                && passwordResetExpires.isAfter(LocalDateTime.now());
    }
}
