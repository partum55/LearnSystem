package com.university.lms.user.util;

import com.university.lms.common.domain.UserLocale;
import com.university.lms.common.domain.UserRole;
import com.university.lms.user.domain.User;
import com.university.lms.user.dto.LoginRequest;
import com.university.lms.user.dto.RegisterRequest;
import com.university.lms.user.dto.UpdateUserRequest;

import java.util.UUID;

/**
 * Factory class for creating test data objects.
 */
public class TestDataFactory {

    public static RegisterRequest createRegisterRequest(String email, String password) {
        return RegisterRequest.builder()
            .email(email)
            .password(password)
            .displayName("Test User")
            .firstName("Test")
            .lastName("User")
            .role(UserRole.STUDENT)
            .locale(UserLocale.EN)
            .build();
    }

    public static RegisterRequest createValidRegisterRequest() {
        return createRegisterRequest("test@ucu.edu.ua", "TestPass123");
    }

    public static RegisterRequest createTeacherRegisterRequest() {
        return RegisterRequest.builder()
            .email("teacher@ucu.edu.ua")
            .password("TeacherPass123")
            .displayName("Test Teacher")
            .firstName("Test")
            .lastName("Teacher")
            .role(UserRole.TEACHER)
            .locale(UserLocale.EN)
            .build();
    }

    public static LoginRequest createLoginRequest(String email, String password) {
        return LoginRequest.builder()
            .email(email)
            .password(password)
            .build();
    }

    public static LoginRequest createValidLoginRequest() {
        return createLoginRequest("test@ucu.edu.ua", "TestPass123");
    }

    public static UpdateUserRequest createUpdateUserRequest() {
        return UpdateUserRequest.builder()
            .displayName("Updated User")
            .firstName("Updated")
            .lastName("User")
            .locale(UserLocale.UK)
            .build();
    }

    public static User createUser(String email, UserRole role) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setPasswordHash("$2a$10$test-hashed-password");
        user.setDisplayName("Test User");
        user.setFirstName("Test");
        user.setLastName("User");
        user.setRole(role);
        user.setLocale(UserLocale.EN);
        user.setActive(true);
        user.setEmailVerified(true);
        return user;
    }

    public static User createStudentUser() {
        return createUser("student@ucu.edu.ua", UserRole.STUDENT);
    }

    public static User createTeacherUser() {
        return createUser("teacher@ucu.edu.ua", UserRole.TEACHER);
    }

    public static User createAdminUser() {
        return createUser("admin@ucu.edu.ua", UserRole.SUPERADMIN);
    }
}

