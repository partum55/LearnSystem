package com.university.lms.plugin.runtime;

import com.university.lms.plugin.api.LmsPlugin;
import com.university.lms.plugin.api.PluginContext;
import com.university.lms.plugin.api.PluginManifest;
import com.university.lms.plugin.api.service.CourseQueryService;
import com.university.lms.plugin.api.service.GradeService;
import com.university.lms.plugin.api.service.SubmissionQueryService;
import com.university.lms.plugin.api.service.UserQueryService;
import com.university.lms.plugin.runtime.repository.InstalledPluginRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

/**
 * Factory that assembles a fully wired {@link PluginContext} for a given plugin.
 *
 * <p>For each plugin the factory:
 * <ol>
 *   <li>Resolves the plugin's PostgreSQL schema name via {@link PluginSchemaManager}</li>
 *   <li>Creates a schema-scoped {@link DefaultPluginDataStore}</li>
 *   <li>Creates a {@link DefaultPluginConfigStore} backed by the plugin's database row</li>
 *   <li>Assembles a {@link DefaultPluginContext} with all LMS services wired in</li>
 *   <li>Wraps it in a {@link PluginSandbox} permission-checking proxy</li>
 * </ol>
 */
@Component
@RequiredArgsConstructor
public class DefaultPluginContextFactory {

    private final DataSource dataSource;
    private final PluginSchemaManager schemaManager;
    private final PluginSandbox sandbox;
    private final DefaultPluginEventBus eventBus;
    private final InstalledPluginRepository installedPluginRepository;

    /*
     * LMS domain service beans exposed to plugins. These are optional dependencies —
     * if the host application (lms-learning-service) does not provide them, the context
     * will contain null-safe no-op stubs. In production the learning service provides
     * concrete implementations via its own Spring context.
     */
    private final CourseQueryService courseQueryService;
    private final UserQueryService userQueryService;
    private final GradeService gradeService;
    private final SubmissionQueryService submissionQueryService;

    /**
     * Builds a sandboxed {@link PluginContext} for the supplied plugin.
     *
     * @param plugin the live plugin bean
     * @return a sandbox-wrapped context ready to be passed to lifecycle methods
     */
    public PluginContext createContext(LmsPlugin plugin) {
        PluginManifest manifest = plugin.getManifest();
        String schemaName = schemaManager.toSchemaName(manifest.id());

        DefaultPluginDataStore dataStore = new DefaultPluginDataStore(dataSource, schemaName);
        DefaultPluginConfigStore configStore =
                new DefaultPluginConfigStore(manifest.id(), installedPluginRepository);

        DefaultPluginContext raw = new DefaultPluginContext(
                manifest,
                courseQueryService,
                userQueryService,
                gradeService,
                submissionQueryService,
                eventBus,
                dataStore,
                configStore);

        return sandbox.createSandboxedContext(raw, manifest.permissions());
    }
}
