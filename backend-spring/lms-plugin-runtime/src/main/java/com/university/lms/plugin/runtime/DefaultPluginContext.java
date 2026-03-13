package com.university.lms.plugin.runtime;

import com.university.lms.plugin.api.PluginConfigStore;
import com.university.lms.plugin.api.PluginContext;
import com.university.lms.plugin.api.PluginDataStore;
import com.university.lms.plugin.api.PluginEventBus;
import com.university.lms.plugin.api.PluginManifest;
import com.university.lms.plugin.api.service.CourseQueryService;
import com.university.lms.plugin.api.service.GradeService;
import com.university.lms.plugin.api.service.SubmissionQueryService;
import com.university.lms.plugin.api.service.UserQueryService;

/**
 * Default implementation of {@link PluginContext} wiring all services together for a single plugin.
 *
 * <p>Instances are created per-plugin by {@link DefaultPluginContextFactory}. The sandboxed
 * variant produced by {@link PluginSandbox} wraps this class in a permission-checking proxy;
 * this class itself does not perform permission checks — it assumes it is only accessed through
 * the sandbox.
 */
public class DefaultPluginContext implements PluginContext {

    private final PluginManifest manifest;
    private final CourseQueryService courses;
    private final UserQueryService users;
    private final GradeService grades;
    private final SubmissionQueryService submissions;
    private final PluginEventBus eventBus;
    private final PluginDataStore dataStore;
    private final PluginConfigStore configStore;

    public DefaultPluginContext(
            PluginManifest manifest,
            CourseQueryService courses,
            UserQueryService users,
            GradeService grades,
            SubmissionQueryService submissions,
            PluginEventBus eventBus,
            PluginDataStore dataStore,
            PluginConfigStore configStore) {
        this.manifest = manifest;
        this.courses = courses;
        this.users = users;
        this.grades = grades;
        this.submissions = submissions;
        this.eventBus = eventBus;
        this.dataStore = dataStore;
        this.configStore = configStore;
    }

    @Override
    public CourseQueryService courses() {
        return courses;
    }

    @Override
    public UserQueryService users() {
        return users;
    }

    @Override
    public GradeService grades() {
        return grades;
    }

    @Override
    public SubmissionQueryService submissions() {
        return submissions;
    }

    @Override
    public PluginEventBus eventBus() {
        return eventBus;
    }

    @Override
    public PluginDataStore dataStore() {
        return dataStore;
    }

    @Override
    public PluginConfigStore configStore() {
        return configStore;
    }

    @Override
    public PluginManifest manifest() {
        return manifest;
    }
}
