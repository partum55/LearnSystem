package com.university.lms.user.repository;

import com.university.lms.common.domain.UserRole;
import com.university.lms.user.domain.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for User entity operations.
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Find active (not soft-deleted) user by email (case-insensitive).
     */
    Optional<User> findByEmailIgnoreCaseAndIsDeletedFalse(String email);

    /**
     * Find active (not soft-deleted) user by ID.
     */
    Optional<User> findByIdAndIsDeletedFalse(UUID id);

    /**
     * Check if email exists (case-insensitive).
     */
    boolean existsByEmailIgnoreCase(String email);

    /**
     * Check if student ID exists.
     */
    boolean existsByStudentId(String studentId);

    /**
     * Find user by email verification token.
     */
    Optional<User> findByEmailVerificationTokenAndIsDeletedFalse(String token);

    /**
     * Find user by password reset token.
     */
    Optional<User> findByPasswordResetTokenAndIsDeletedFalse(String token);

    /**
     * Count not-deleted users by role.
     */
    long countByRoleAndIsDeletedFalse(UserRole role);

    /**
     * Find users by role (not deleted).
     */
    Page<User> findByRoleAndIsDeletedFalse(UserRole role, Pageable pageable);

    /**
     * Find all active (not deleted) users.
     */
    Page<User> findByIsDeletedFalse(Pageable pageable);

    /**
     * Search users by email, name or student ID.
     */
    @Query("SELECT u FROM User u WHERE " +
            "u.isDeleted = false AND (" +
            "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(u.displayName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(u.studentId) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> searchUsers(@Param("search") String search, Pageable pageable);
}
