package com.university.lms.plugin.api.service;

import com.university.lms.plugin.api.model.CourseInfo;
import com.university.lms.plugin.api.model.ModuleInfo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Read-only access to course and module data for plugin use.
 *
 * <p>Access to this service requires the {@code "courses.read"} permission in the plugin
 * manifest. All methods are scoped to courses the calling plugin has been granted access to.
 */
public interface CourseQueryService {

    /**
     * Looks up a course by its unique identifier.
     *
     * @param courseId the course UUID
     * @return the course projection, or {@link Optional#empty()} if not found
     */
    Optional<CourseInfo> findById(UUID courseId);

    /**
     * Returns all courses where the given user is the primary instructor.
     *
     * @param userId the instructor's user UUID
     * @return ordered list of courses; empty if the user teaches no courses
     */
    List<CourseInfo> findByInstructor(UUID userId);

    /**
     * Returns the ordered list of modules (weeks/units) belonging to a course.
     *
     * @param courseId the course UUID
     * @return modules sorted by {@link ModuleInfo#position()}; empty list if none exist
     */
    List<ModuleInfo> getModules(UUID courseId);
}
