package com.university.lms.plugin.api.model;

import java.util.UUID;

/**
 * Read-only projection of a course module (week/unit) exposed to plugins.
 *
 * @param id       Unique module identifier.
 * @param title    Display title of the module.
 * @param position 1-based ordering index within the parent course.
 */
public record ModuleInfo(
        UUID id,
        String title,
        int position
) {}
