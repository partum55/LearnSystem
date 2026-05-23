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
import java.util.UUID;

/**
 * Application profile for a Supabase Auth user.
 */
@Entity
@Table(schema = "public", name = "users", indexes = {
        @Index(name = "idx_users_email", columnList = "email"),
        @Index(name = "idx_users_role", columnList = "role"),
        @Index(name = "idx_users_student_id", columnList = "student_id")
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

    @Column(name = "first_name", length = 150)
    private String firstName;

    @Column(name = "last_name", length = 150)
    private String lastName;

    @Column(name = "student_id", unique = true, length = 50)
    private String studentId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "public.user_role")
    @Builder.Default
    private UserRole role = UserRole.USER;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "public.user_locale")
    @Builder.Default
    private UserLocale locale = UserLocale.UK;

    @Column(length = 10)
    @Builder.Default
    private String theme = "LIGHT";

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "is_active")
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "email_verified")
    @Builder.Default
    private boolean emailVerified = false;

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

    public String getDisplayName() {
        return getFullName();
    }

    /**
     * Check if the user has admin privileges.
     */
    public boolean isAdmin() {
        return role == UserRole.ADMIN;
    }

    /**
     * Check if the user is a teacher or admin.
     */
    public boolean isTeacherOrAdmin() {
        return role == UserRole.TEACHER || role == UserRole.ADMIN;
    }

}
