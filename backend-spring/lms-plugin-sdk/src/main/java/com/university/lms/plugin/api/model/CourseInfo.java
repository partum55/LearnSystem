package com.university.lms.plugin.api.model;

import java.util.UUID;

/**
 * Read-only projection of a course exposed to plugins.
 *
 * @param id          Unique course identifier.
 * @param code        Short institutional course code (e.g. {@code "CS-101"}).
 * @param title       Full display title.
 * @param description Course overview or syllabus summary.
 */
public record CourseInfo(
        UUID id,
        String code,
        String title,
        String description
) {}
