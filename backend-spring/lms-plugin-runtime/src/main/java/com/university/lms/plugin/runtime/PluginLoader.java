package com.university.lms.plugin.runtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.plugin.api.LmsPlugin;
import com.university.lms.plugin.api.PluginContext;
import com.university.lms.plugin.api.PluginManifest;
import com.university.lms.plugin.api.annotation.PluginController;
import com.university.lms.plugin.runtime.entity.InstalledPlugin;
import com.university.lms.plugin.runtime.repository.InstalledPluginRepository;
import com.university.lms.plugin.runtime.python.PythonProcessManager;
import com.university.lms.plugin.runtime.python.PythonPluginInstaller;
import com.university.lms.plugin.runtime.python.PythonPluginBridge;
import com.university.lms.plugin.runtime.python.PythonPluginAdapter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationContext;
import org.springframework.context.event.EventListener;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;

/**
 * Plugin loader supporting both classpath Spring-bean discovery and hot-loaded JAR files.
 *
 * <p>At startup, loads classpath plugins via {@code getBeansOfType} and also scans the
 * {@code plugin.storage.path} directory for previously uploaded JARs. New plugins can be
 * installed at runtime via {@link #installPlugin(Path)} without a restart.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PluginLoader {

    private final ApplicationContext applicationContext;
    private final PluginRegistry registry;
    private final PluginSchemaManager schemaManager;
    private final DefaultPluginContextFactory contextFactory;
    private final InstalledPluginRepository installedPluginRepository;
    private final PluginRouteRegistrar routeRegistrar;
    private final ObjectMapper objectMapper;
    private final PythonProcessManager pythonProcessManager;
    private final PythonPluginInstaller pythonInstaller;
    private final PythonPluginBridge pythonBridge;

    @Value("${plugin.storage.path:/data/plugins}")
    private String pluginStoragePath;

    /**
     * Fires after Spring context is fully refreshed. Loads classpath plugins
     * and re-loads previously uploaded JARs from the storage directory.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void loadPlugins() {
        // Phase 1: classpath-based plugins (backward compatibility)
        var pluginBeans = applicationContext.getBeansOfType(LmsPlugin.class);
        log.info("Plugin loader: discovered {} classpath plugin bean(s)", pluginBeans.size());
        for (LmsPlugin plugin : pluginBeans.values()) {
            try {
                loadClasspathPlugin(plugin);
            } catch (Exception ex) {
                PluginManifest manifest = safeManifest(plugin);
                String id = manifest != null ? manifest.id() : plugin.getClass().getName();
                log.error("Failed to load classpath plugin '{}': {}", id, ex.getMessage(), ex);
                if (manifest != null) {
                    registry.register(new PluginRegistration(plugin, manifest, PluginStatus.ERROR));
                }
            }
        }

        // Phase 2: hot-loaded JARs from storage directory
        Path storagePath = Paths.get(pluginStoragePath);
        if (Files.isDirectory(storagePath)) {
            try (DirectoryStream<Path> stream = Files.newDirectoryStream(storagePath, "*.jar")) {
                for (Path jarPath : stream) {
                    try {
                        installPlugin(jarPath);
                    } catch (Exception ex) {
                        log.error("Failed to load JAR plugin '{}': {}", jarPath.getFileName(), ex.getMessage(), ex);
                    }
                }
            } catch (IOException ex) {
                log.error("Failed to scan plugin storage directory '{}': {}", storagePath, ex.getMessage());
            }
        } else {
            log.info("Plugin storage directory '{}' does not exist; skipping JAR scan", storagePath);
        }

        // Phase 3: Python sidecar plugins
        List<InstalledPlugin> pythonPlugins = installedPluginRepository.findByRuntime("python");
        log.info("Plugin loader: found {} Python plugin(s) to restore", pythonPlugins.size());
        for (InstalledPlugin entity : pythonPlugins) {
            if (entity.getStatus() != PluginStatus.ENABLED) continue;
            try {
                Path extractDir = Paths.get(pluginStoragePath, "python", entity.getPluginId());
                if (!Files.isDirectory(extractDir)) {
                    log.warn("Python plugin '{}' extract dir missing, marking ERROR", entity.getPluginId());
                    entity.setStatus(PluginStatus.ERROR);
                    installedPluginRepository.save(entity);
                    continue;
                }
                PluginManifest manifest = objectMapper.readValue(
                        extractDir.resolve("plugin.json").toFile(), PluginManifest.class);

                Map<String, String> envVars = buildPythonEnvVars(entity);
                int port = pythonProcessManager.startPlugin(entity.getPluginId(), extractDir, envVars);

                entity.setProcessPort(port);
                installedPluginRepository.save(entity);

                pythonBridge.callLifecycle(entity.getPluginId(), "enable");
                registerPythonProxyRoute(entity.getPluginId());

                PythonPluginAdapter adapter = new PythonPluginAdapter(entity.getPluginId(), manifest);
                registry.register(new PluginRegistration(adapter, manifest, PluginStatus.ENABLED));

                log.info("Restored Python plugin '{}' on port {}", entity.getPluginId(), port);
            } catch (Exception ex) {
                log.error("Failed to restore Python plugin '{}': {}", entity.getPluginId(), ex.getMessage(), ex);
                entity.setStatus(PluginStatus.ERROR);
                installedPluginRepository.save(entity);
            }
        }

        log.info("Plugin loader: {} plugin(s) registered ({} enabled)",
                registry.getAll().size(),
                registry.getEnabled().size());
    }

    /**
     * Installs a plugin from a JAR file at runtime (hot-load).
     *
     * <p>Reads {@code plugin.json} from the JAR root, instantiates the backend class,
     * runs schema/migrations, calls lifecycle methods, and registers dynamic routes.
     *
     * @param jarPath filesystem path to the plugin JAR
     * @return the plugin registration
     */
    public synchronized PluginRegistration installPlugin(Path jarPath) throws Exception {
        log.info("Installing plugin from JAR: {}", jarPath);

        // Step 1: Read manifest from JAR
        PluginManifest manifest = readManifestFromJar(jarPath);
        String pluginId = manifest.id();

        // Skip if already loaded (e.g., during startup re-scan)
        if (registry.isRegistered(pluginId)) {
            log.info("Plugin '{}' already registered, skipping", pluginId);
            return registry.get(pluginId).orElseThrow();
        }

        // Step 2: Create URLClassLoader
        URLClassLoader classLoader = new URLClassLoader(
                new URL[]{jarPath.toUri().toURL()},
                getClass().getClassLoader()
        );

        try {
            // Step 3: Load and instantiate the LmsPlugin class
            String backendClassName = manifest.entryPoints().backendClass();
            @SuppressWarnings("unchecked")
            Class<? extends LmsPlugin> pluginClass =
                    (Class<? extends LmsPlugin>) classLoader.loadClass(backendClassName);
            LmsPlugin plugin = pluginClass.getDeclaredConstructor().newInstance();

            // Step 4: Schema + migrations
            schemaManager.ensureSchema(pluginId);
            schemaManager.runMigrations(pluginId, null);

            // Step 5: Persist entity
            boolean isNew = !installedPluginRepository.existsByPluginId(pluginId);
            InstalledPlugin entity = installedPluginRepository.findByPluginId(pluginId)
                    .orElseGet(() -> buildNewEntity(manifest));

            entity.setName(manifest.name());
            entity.setVersion(manifest.version());
            entity.setDescription(manifest.description());
            entity.setAuthor(manifest.author());
            entity.setType(manifest.type());
            entity.setPermissions(manifest.permissions());
            entity.setJarFileName(jarPath.getFileName().toString());

            if (isNew) {
                entity.setStatus(PluginStatus.ENABLED);
            }
            entity = installedPluginRepository.save(entity);

            // Step 6: Create context and call lifecycle methods
            PluginContext context = contextFactory.createContext(plugin);
            if (isNew) {
                log.info("Calling onInstall for new plugin '{}'", pluginId);
                plugin.onInstall(context);
            }

            PluginStatus status = entity.getStatus();
            List<Object> controllerInstances = List.of();

            if (status == PluginStatus.ENABLED) {
                log.info("Calling onEnable for plugin '{}'", pluginId);
                plugin.onEnable(context);

                // Step 7: Scan JAR for @PluginController classes and register routes
                controllerInstances = scanAndInstantiateControllers(classLoader, jarPath);
                if (!controllerInstances.isEmpty()) {
                    routeRegistrar.registerControllers(pluginId, controllerInstances);
                }
            }

            // Step 8: Register in memory
            PluginRegistration registration = new PluginRegistration(
                    plugin, manifest, status, classLoader, controllerInstances, jarPath);
            registry.register(registration);

            log.info("Plugin '{}' v{} installed successfully with status {}", pluginId, manifest.version(), status);
            return registration;

        } catch (Exception ex) {
            // Clean up classloader on failure
            try {
                classLoader.close();
            } catch (IOException closeEx) {
                log.warn("Failed to close classloader after install failure: {}", closeEx.getMessage());
            }
            throw ex;
        }
    }

    /**
     * Installs a Python plugin from a ZIP file.
     */
    public synchronized PluginRegistration installPythonPlugin(Path zipPath) throws Exception {
        log.info("Installing Python plugin from ZIP: {}", zipPath);

        PluginManifest manifest = pythonInstaller.readManifestFromZip(zipPath);
        String pluginId = manifest.id();

        if (pluginId == null || !pluginId.matches("[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}")) {
            throw new IllegalArgumentException("Invalid plugin ID format: " + pluginId);
        }

        if (registry.isRegistered(pluginId)) {
            log.info("Plugin '{}' already registered, skipping", pluginId);
            return registry.get(pluginId).orElseThrow();
        }

        // Extract ZIP
        Path baseDir = Paths.get(pluginStoragePath);
        Path extractDir = pythonInstaller.extractZip(zipPath, pluginId, baseDir);

        try {
            // Setup virtualenv and install dependencies
            pythonInstaller.setupVirtualenv(extractDir);

            // Schema
            schemaManager.ensureSchema(pluginId);

            // Start process
            Map<String, String> envVars = buildPythonEnvVars(pluginId, manifest);
            int port = pythonProcessManager.startPlugin(pluginId, extractDir, envVars);

            // Call lifecycle
            pythonBridge.callLifecycle(pluginId, "install");

            // Persist entity
            InstalledPlugin entity = installedPluginRepository.findByPluginId(pluginId)
                    .orElseGet(() -> buildNewEntity(manifest));
            entity.setName(manifest.name());
            entity.setVersion(manifest.version());
            entity.setDescription(manifest.description());
            entity.setAuthor(manifest.author());
            entity.setType(manifest.type());
            entity.setPermissions(manifest.permissions());
            entity.setRuntime("python");
            entity.setProcessPort(port);
            entity.setStatus(PluginStatus.ENABLED);
            entity = installedPluginRepository.save(entity);

            // Register proxy route
            registerPythonProxyRoute(pluginId);

            // Register adapter in memory
            PythonPluginAdapter adapter = new PythonPluginAdapter(pluginId, manifest);
            PluginRegistration registration = new PluginRegistration(adapter, manifest, PluginStatus.ENABLED);
            registry.register(registration);

            pythonBridge.callLifecycle(pluginId, "enable");

            log.info("Python plugin '{}' v{} installed on port {}", pluginId, manifest.version(), port);
            return registration;

        } catch (Exception ex) {
            pythonProcessManager.stopPlugin(pluginId);
            pythonInstaller.cleanup(pluginId, Paths.get(pluginStoragePath));
            throw ex;
        }
    }

    /**
     * Unloads a hot-loaded plugin: disables, unregisters routes, closes classloader, drops schema.
     *
     * @param pluginId the plugin to unload
     */
    public synchronized void unloadPlugin(String pluginId) {
        PluginRegistration reg = registry.get(pluginId)
                .orElseThrow(() -> new IllegalArgumentException("Plugin not registered: " + pluginId));

        if ("python".equals(reg.manifest().resolvedRuntime())) {
            pythonBridge.callLifecycle(pluginId, "disable");
            pythonBridge.callLifecycle(pluginId, "uninstall");
            pythonProcessManager.stopPlugin(pluginId);
            routeRegistrar.unregisterControllers(pluginId);
            schemaManager.dropSchema(pluginId);
            pythonInstaller.cleanup(pluginId, Paths.get(pluginStoragePath));
            registry.unregister(pluginId);
            installedPluginRepository.findByPluginId(pluginId)
                    .ifPresent(installedPluginRepository::delete);
            log.info("Python plugin '{}' fully unloaded", pluginId);
            return;
        }

        log.info("Unloading plugin '{}'", pluginId);

        // Lifecycle callbacks
        try {
            PluginContext context = contextFactory.createContext(reg.plugin());
            reg.plugin().onDisable(context);
            reg.plugin().onUninstall(context);
        } catch (Exception ex) {
            log.warn("Plugin '{}' lifecycle callback failed during unload: {}", pluginId, ex.getMessage());
        }

        // Unregister routes
        routeRegistrar.unregisterControllers(pluginId);

        // Close classloader if hot-loaded
        if (reg.classLoader() != null) {
            try {
                reg.classLoader().close();
                log.info("Closed classloader for plugin '{}'", pluginId);
            } catch (IOException ex) {
                log.warn("Failed to close classloader for plugin '{}': {}", pluginId, ex.getMessage());
            }
        }

        // Drop schema
        schemaManager.dropSchema(pluginId);

        // Remove from registry and database
        registry.unregister(pluginId);
        installedPluginRepository.findByPluginId(pluginId)
                .ifPresent(installedPluginRepository::delete);

        log.info("Plugin '{}' fully unloaded", pluginId);
    }

    /**
     * Enables a previously disabled hot-loaded plugin: calls onEnable and re-registers routes.
     */
    public synchronized void enablePlugin(String pluginId) {
        PluginRegistration reg = registry.get(pluginId)
                .orElseThrow(() -> new IllegalArgumentException("Plugin not registered: " + pluginId));

        if ("python".equals(reg.manifest().resolvedRuntime())) {
            try {
                InstalledPlugin entity = installedPluginRepository.findByPluginId(pluginId).orElseThrow();
                Path extractDir = Paths.get(pluginStoragePath, "python", pluginId);
                Map<String, String> envVars = buildPythonEnvVars(entity);
                int port = pythonProcessManager.startPlugin(pluginId, extractDir, envVars);
                entity.setProcessPort(port);
                entity.setStatus(PluginStatus.ENABLED);
                installedPluginRepository.save(entity);
                pythonBridge.callLifecycle(pluginId, "enable");
                registerPythonProxyRoute(pluginId);
                registry.register(reg.withStatus(PluginStatus.ENABLED));
            } catch (Exception ex) {
                log.error("Failed to enable Python plugin '{}': {}", pluginId, ex.getMessage(), ex);
                throw new IllegalStateException("Failed to enable Python plugin: " + pluginId, ex);
            }
            return;
        }

        PluginContext context = contextFactory.createContext(reg.plugin());
        reg.plugin().onEnable(context);

        // Re-register routes if this is a hot-loaded plugin with controllers
        List<Object> controllers = reg.controllerInstances();
        if (reg.jarPath() != null && controllers.isEmpty()) {
            try {
                controllers = scanAndInstantiateControllers(reg.classLoader(), reg.jarPath());
            } catch (Exception ex) {
                log.warn("Failed to scan controllers for plugin '{}': {}", pluginId, ex.getMessage());
                controllers = List.of();
            }
        }
        if (!controllers.isEmpty()) {
            routeRegistrar.registerControllers(pluginId, controllers);
        }

        PluginRegistration updated = new PluginRegistration(
                reg.plugin(), reg.manifest(), PluginStatus.ENABLED,
                reg.classLoader(), controllers, reg.jarPath());
        registry.register(updated);
    }

    /**
     * Disables a hot-loaded plugin: calls onDisable and unregisters routes.
     */
    public synchronized void disablePlugin(String pluginId) {
        PluginRegistration reg = registry.get(pluginId)
                .orElseThrow(() -> new IllegalArgumentException("Plugin not registered: " + pluginId));

        if ("python".equals(reg.manifest().resolvedRuntime())) {
            pythonBridge.callLifecycle(pluginId, "disable");
            pythonProcessManager.stopPlugin(pluginId);
            routeRegistrar.unregisterControllers(pluginId);
            registry.register(reg.withStatus(PluginStatus.DISABLED));
            return;
        }

        try {
            PluginContext context = contextFactory.createContext(reg.plugin());
            reg.plugin().onDisable(context);
        } catch (Exception ex) {
            log.warn("Plugin '{}' onDisable callback failed: {}", pluginId, ex.getMessage());
        }

        routeRegistrar.unregisterControllers(pluginId);

        PluginRegistration updated = reg.withStatus(PluginStatus.DISABLED);
        registry.register(updated);
    }

    // --- Classpath plugin loading (backward compat) ---

    private void loadClasspathPlugin(LmsPlugin plugin) {
        PluginManifest manifest = plugin.getManifest();
        String id = manifest.id();
        log.info("Loading classpath plugin '{}' v{}", id, manifest.version());

        schemaManager.ensureSchema(id);
        schemaManager.runMigrations(id, null);

        boolean isNew = !installedPluginRepository.existsByPluginId(id);
        InstalledPlugin entity = installedPluginRepository.findByPluginId(id)
                .orElseGet(() -> buildNewEntity(manifest));

        entity.setName(manifest.name());
        entity.setVersion(manifest.version());
        entity.setDescription(manifest.description());
        entity.setAuthor(manifest.author());
        entity.setType(manifest.type());
        entity.setPermissions(manifest.permissions());

        if (isNew) {
            entity.setStatus(PluginStatus.ENABLED);
        }
        entity = installedPluginRepository.save(entity);

        PluginContext context = contextFactory.createContext(plugin);

        if (isNew) {
            log.info("Calling onInstall for new classpath plugin '{}'", id);
            plugin.onInstall(context);
        }

        PluginStatus status = entity.getStatus();
        if (status == PluginStatus.ENABLED) {
            log.info("Calling onEnable for classpath plugin '{}'", id);
            plugin.onEnable(context);
        }

        registry.register(new PluginRegistration(plugin, manifest, status));
        log.info("Classpath plugin '{}' loaded with status {}", id, status);
    }

    // --- JAR helpers ---

    private PluginManifest readManifestFromJar(Path jarPath) throws IOException {
        try (JarFile jarFile = new JarFile(jarPath.toFile())) {
            JarEntry manifestEntry = jarFile.getJarEntry("plugin.json");
            if (manifestEntry == null) {
                throw new IllegalArgumentException("JAR does not contain plugin.json at root: " + jarPath);
            }
            try (InputStream is = jarFile.getInputStream(manifestEntry)) {
                return objectMapper.readValue(is, PluginManifest.class);
            }
        }
    }

    private List<Object> scanAndInstantiateControllers(URLClassLoader classLoader, Path jarPath) throws IOException {
        List<Object> controllers = new ArrayList<>();
        try (JarFile jarFile = new JarFile(jarPath.toFile())) {
            Enumeration<JarEntry> entries = jarFile.entries();
            while (entries.hasMoreElements()) {
                JarEntry entry = entries.nextElement();
                String name = entry.getName();
                if (!name.endsWith(".class") || name.contains("$")) {
                    continue;
                }
                String className = name.replace('/', '.').replace(".class", "");
                try {
                    Class<?> clazz = classLoader.loadClass(className);
                    if (clazz.isAnnotationPresent(PluginController.class)) {
                        Object instance = clazz.getDeclaredConstructor().newInstance();
                        controllers.add(instance);
                        log.debug("Instantiated @PluginController: {}", className);
                    }
                } catch (Exception ex) {
                    log.debug("Skipping class '{}': {}", className, ex.getMessage());
                }
            }
        }
        return controllers;
    }

    private InstalledPlugin buildNewEntity(PluginManifest manifest) {
        return InstalledPlugin.builder()
                .pluginId(manifest.id())
                .name(manifest.name())
                .version(manifest.version())
                .description(manifest.description())
                .author(manifest.author())
                .type(manifest.type())
                .permissions(manifest.permissions())
                .status(PluginStatus.ENABLED)
                .installedAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    private static PluginManifest safeManifest(LmsPlugin plugin) {
        try {
            return plugin.getManifest();
        } catch (Exception ex) {
            return null;
        }
    }

    private void registerPythonProxyRoute(String pluginId) {
        try {
            java.lang.reflect.Method proxyMethod = PythonPluginBridge.class.getMethod(
                    "proxy", String.class, jakarta.servlet.http.HttpServletRequest.class);
            // Create a wrapper handler that binds the pluginId
            Object handler = new Object() {
                @org.springframework.web.bind.annotation.RequestMapping("/**")
                public ResponseEntity<byte[]> handle(jakarta.servlet.http.HttpServletRequest request)
                        throws java.io.IOException {
                    return pythonBridge.proxy(pluginId, request);
                }
            };
            java.lang.reflect.Method handleMethod = handler.getClass().getMethod(
                    "handle", jakarta.servlet.http.HttpServletRequest.class);
            routeRegistrar.registerPythonProxy(pluginId, handler, handleMethod);
        } catch (NoSuchMethodException e) {
            log.error("Failed to register proxy route for plugin '{}': {}", pluginId, e.getMessage());
        }
    }

    private Map<String, String> buildPythonEnvVars(InstalledPlugin entity) {
        Map<String, String> env = new HashMap<>();
        env.put("PLUGIN_SCHEMA", schemaManager.toSchemaName(entity.getPluginId()));
        if (entity.getPermissions() != null) {
            env.put("PLUGIN_PERMISSIONS", String.join(",", entity.getPermissions()));
        }
        if (entity.getConfig() != null) {
            try {
                env.put("PLUGIN_CONFIG", objectMapper.writeValueAsString(entity.getConfig()));
            } catch (Exception e) {
                log.warn("Failed to serialize config for plugin '{}': {}", entity.getPluginId(), e.getMessage());
            }
        }
        return env;
    }

    private Map<String, String> buildPythonEnvVars(String pluginId, PluginManifest manifest) {
        Map<String, String> env = new HashMap<>();
        env.put("PLUGIN_SCHEMA", schemaManager.toSchemaName(pluginId));
        if (manifest.permissions() != null) {
            env.put("PLUGIN_PERMISSIONS", String.join(",", manifest.permissions()));
        }
        return env;
    }
}
