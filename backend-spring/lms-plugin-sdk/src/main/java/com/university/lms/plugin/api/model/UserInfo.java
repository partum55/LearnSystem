package com.university.lms.plugin.api.model;

import java.util.UUID;

/**
 * Read-only projection of an LMS user exposed to plugins.
 *
 * @param id          Unique user identifier.
 * @param email       Institutional or personal email address.
 * @param displayName Human-readable name (first + last or preferred name).
 * @param role        Primary role string (e.g. {@code "STUDENT"}, {@code "TEACHER"}, {@code "ADMIN"}).
 */
public record UserInfo(
        UUID id,
        String email,
        String displayName,
        String role
) {}
