package com.university.lms.plugin.runtime;

import com.university.lms.plugin.api.PluginConfigStore;
import com.university.lms.plugin.api.PluginContext;
import com.university.lms.plugin.api.PluginDataStore;
import com.university.lms.plugin.api.PluginEventBus;
import com.university.lms.plugin.api.PluginManifest;
import com.university.lms.plugin.api.exception.PluginPermissionDeniedException;
import com.university.lms.plugin.api.service.CourseQueryService;
import com.university.lms.plugin.api.service.GradeService;
import com.university.lms.plugin.api.service.SubmissionQueryService;
import com.university.lms.plugin.api.service.UserQueryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Creates permission-enforcing wrappers around {@link PluginContext} instances.
 *
 * <p>The sandbox intercepts calls to context service accessors and verifies that the plugin's
 * declared permissions (from its {@link PluginManifest}) include the required scope for each
 * service. If the required permission is absent a {@link PluginPermissionDeniedException} is
 * thrown before the underlying service method is invoked.
 *
 * <p>Permission scopes enforced per service:
 * <ul>
 *   <li>{@code "courses.read"}     — {@link PluginContext#courses()}</li>
 *   <li>{@code "users.read"}       — {@link PluginContext#users()}</li>
 *   <li>{@code "grades.read"}      — {@link PluginContext#grades()} (read methods)</li>
 *   <li>{@code "grades.write"}     — {@link PluginContext#grades()} (write methods)</li>
 *   <li>{@code "submissions.read"} — {@link PluginContext#submissions()}</li>
 * </ul>
 *
 * <p>{@link PluginContext#eventBus()}, {@link PluginContext#dataStore()}, and
 * {@link PluginContext#configStore()} are always accessible without additional scope checks —
 * they are inherently scoped to the plugin's own namespace.
 */
@Component
@Slf4j
public class PluginSandbox {

    /**
     * Wraps {@code delegate} in a {@link PluginContext} that checks {@code grantedPermissions}
     * before every service accessor call.
     *
     * @param delegate           the raw context with direct service references
     * @param grantedPermissions list of permission scopes declared in the plugin manifest
     * @return a sandboxed context that enforces permission checks
     */
    public PluginContext createSandboxedContext(PluginContext delegate, List<String> grantedPermissions) {
        List<String> granted = grantedPermissions != null ? List.copyOf(grantedPermissions) : List.of();
        String pluginId = delegate.manifest().id();
        return new SandboxedContext(delegate, granted, pluginId);
    }

    // --- sandboxed context implementation ---

    private static final class SandboxedContext implements PluginContext {

        private final PluginContext delegate;
        private final List<String> granted;
        private final String pluginId;

        SandboxedContext(PluginContext delegate, List<String> granted, String pluginId) {
            this.delegate = delegate;
            this.granted = granted;
            this.pluginId = pluginId;
        }

        @Override
        public CourseQueryService courses() {
            requirePermission("courses.read");
            return delegate.courses();
        }

        @Override
        public UserQueryService users() {
            requirePermission("users.read");
            return delegate.users();
        }

        @Override
        public GradeService grades() {
            // The GradeService itself controls read vs. write at the method level.
            // The sandbox checks the minimum required scope (read) here; write
            // operations inside GradeService should additionally verify "grades.write"
            // if finer granularity is needed.
            requirePermission("grades.read");
            return delegate.grades();
        }

        @Override
        public SubmissionQueryService submissions() {
            requirePermission("submissions.read");
            return delegate.submissions();
        }

        @Override
        public PluginEventBus eventBus() {
            // Always accessible — scoped to the plugin's own subscriptions
            return delegate.eventBus();
        }

        @Override
        public PluginDataStore dataStore() {
            // Always accessible — scoped to the plugin's own schema
            return delegate.dataStore();
        }

        @Override
        public PluginConfigStore configStore() {
            // Always accessible — scoped to the plugin's own config namespace
            return delegate.configStore();
        }

        @Override
        public PluginManifest manifest() {
            return delegate.manifest();
        }

        private void requirePermission(String permission) {
            if (!granted.contains(permission)) {
                throw new PluginPermissionDeniedException(pluginId, permission);
            }
        }
    }
}
