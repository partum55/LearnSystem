package com.university.lms.plugin.api.service;

import com.university.lms.plugin.api.model.UserInfo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Read-only access to user and enrolment data for plugin use.
 *
 * <p>Access to this service requires the {@code "users.read"} permission in the plugin
 * manifest. PII (email, display name) is returned only when this permission is granted; future
 * SDK versions may introduce a separate {@code "users.pii"} scope.
 */
public interface UserQueryService {

    /**
     * Looks up a user by their unique identifier.
     *
     * @param userId the user UUID
     * @return the user projection, or {@link Optional#empty()} if not found
     */
    Optional<UserInfo> findById(UUID userId);

    /**
     * Returns all students currently enrolled in the given course.
     *
     * @param courseId the course UUID
     * @return list of enrolled students; empty if no active enrolments exist
     */
    List<UserInfo> getEnrolledStudents(UUID courseId);
}
