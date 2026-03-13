package com.university.lms.plugin.api.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Declares that the annotated method or class requires one or more plugin permissions.
 *
 * <p>The plugin runtime (via an AOP aspect) intercepts calls to annotated elements and
 * verifies that the active plugin's {@link com.university.lms.plugin.api.PluginManifest#permissions()}
 * list contains every scope listed in {@link #value()}. If any scope is missing, a
 * {@link com.university.lms.plugin.api.exception.PluginPermissionDeniedException} is thrown
 * before the method body executes.
 *
 * <p>When placed on a type, the check applies to every method in that type. A method-level
 * annotation takes precedence over a type-level one (most-specific wins).
 *
 * <p>Standard permission scopes defined by the LMS:
 * <ul>
 *   <li>{@code "courses.read"}     — read course and module data</li>
 *   <li>{@code "users.read"}       — read user profiles and enrolments</li>
 *   <li>{@code "grades.read"}      — read gradebook entries</li>
 *   <li>{@code "grades.write"}     — create or update gradebook entries</li>
 *   <li>{@code "submissions.read"} — read submission content</li>
 * </ul>
 *
 * <p>Usage:
 * <pre>{@code
 * @RequiresPermission({"submissions.read", "grades.write"})
 * public void autoGrade(UUID assignmentId) { ... }
 * }</pre>
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresPermission {

    /**
     * One or more permission scope strings that must all be present in the plugin manifest.
     */
    String[] value();
}
