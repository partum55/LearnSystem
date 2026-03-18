package com.university.lms.plugin.api;

import com.university.lms.plugin.api.service.CourseQueryService;
import com.university.lms.plugin.api.service.GradeService;
import com.university.lms.plugin.api.service.SubmissionQueryService;
import com.university.lms.plugin.api.service.UserQueryService;

/**
 * Runtime environment injected into a plugin during each lifecycle callback.
 *
 * <p>{@code PluginContext} is the single access point for all LMS capabilities exposed to
 * plugins. The runtime implementation enforces that every service method call matches the
 * permissions declared in the plugin's {@link PluginManifest#permissions()} list; a call
 * without the required scope throws
 * {@link com.university.lms.plugin.api.exception.PluginPermissionDeniedException}.
 *
 * <p>Plugin authors should not cache the context instance beyond the lifecycle method that
 * received it; the runtime may supply a fresh proxy on each call.
 */
public interface PluginContext {

    /**
     * Read-only access to course and module data.
     * Requires permission {@code "courses.read"}.
     */
    CourseQueryService courses();

    /**
     * Read-only access to user and enrolment data.
     * Requires permission {@code "users.read"}.
     */
    UserQueryService users();

    /**
     * Read and write access to gradebook entries.
     * Reading requires {@code "grades.read"}; writing requires {@code "grades.write"}.
     */
    GradeService grades();

    /**
     * Read-only access to assignment submissions.
     * Requires permission {@code "submissions.read"}.
     */
    SubmissionQueryService submissions();

    /**
     * Pub/sub bus for subscribing to and unsubscribing from LMS domain events.
     */
    PluginEventBus eventBus();

    /**
     * Isolated, schema-scoped JDBC store for plugin-owned data.
     */
    PluginDataStore dataStore();

    /**
     * Persistent key-value store for administrator-supplied plugin configuration.
     */
    PluginConfigStore configStore();

    /**
     * Returns the manifest of the plugin that owns this context instance.
     */
    PluginManifest manifest();
}
