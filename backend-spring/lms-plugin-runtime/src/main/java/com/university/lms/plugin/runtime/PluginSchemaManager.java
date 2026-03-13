package com.university.lms.plugin.runtime;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

/**
 * Manages the per-plugin PostgreSQL schemas and Flyway migration lifecycle.
 *
 * <p>Each plugin is allocated a dedicated schema named {@code plugin_<sanitised_id>}.
 * This provides isolation between plugin-owned tables and the core LMS tables, and
 * between different plugins. The schema is created on first install and dropped on uninstall.
 *
 * <p>Migration scripts placed by the plugin at the {@code migrationsLocation} classpath
 * path are applied against the plugin's own schema using a dedicated Flyway instance
 * configured with {@code defaultSchema} set to the plugin schema.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PluginSchemaManager {

    private final DataSource dataSource;

    /**
     * Creates the plugin's schema if it does not already exist.
     *
     * <p>The operation is idempotent — calling it multiple times for the same plugin id
     * is safe.
     *
     * @param pluginId the plugin's unique identifier
     */
    public void ensureSchema(String pluginId) {
        String schema = toSchemaName(pluginId);
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE SCHEMA IF NOT EXISTS \"" + schema + "\"");
            log.info("Ensured schema '{}' for plugin '{}'", schema, pluginId);
        } catch (Exception ex) {
            throw new PluginSchemaException(
                    "Failed to create schema '%s' for plugin '%s'".formatted(schema, pluginId), ex);
        }
    }

    /**
     * Drops the plugin's schema and all its objects unconditionally.
     *
     * <p>Called by the runtime when a plugin is permanently uninstalled.
     *
     * @param pluginId the plugin's unique identifier
     */
    public void dropSchema(String pluginId) {
        String schema = toSchemaName(pluginId);
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute("DROP SCHEMA IF EXISTS \"" + schema + "\" CASCADE");
            log.info("Dropped schema '{}' for plugin '{}'", schema, pluginId);
        } catch (Exception ex) {
            throw new PluginSchemaException(
                    "Failed to drop schema '%s' for plugin '%s'".formatted(schema, pluginId), ex);
        }
    }

    /**
     * Applies Flyway migrations from {@code migrationsLocation} within the plugin's schema.
     *
     * <p>A fresh {@link Flyway} instance is created for each call, scoped to the plugin's
     * schema so migration history tables ({@code flyway_schema_history}) are stored per-plugin
     * and do not pollute the default LMS schema.
     *
     * @param pluginId           the plugin's unique identifier
     * @param migrationsLocation classpath location of migration SQL files,
     *                           e.g. {@code "classpath:db/plugin/my-plugin"}
     */
    public void runMigrations(String pluginId, String migrationsLocation) {
        if (migrationsLocation == null || migrationsLocation.isBlank()) {
            log.debug("No migrations location declared for plugin '{}'; skipping Flyway", pluginId);
            return;
        }
        String schema = toSchemaName(pluginId);
        log.info("Running Flyway migrations for plugin '{}' from '{}'", pluginId, migrationsLocation);
        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .schemas(schema)
                .defaultSchema(schema)
                .locations(migrationsLocation)
                .table("flyway_schema_history")
                .baselineOnMigrate(true)
                .load();
        flyway.migrate();
        log.info("Flyway migration complete for plugin '{}'", pluginId);
    }

    /**
     * Converts a plugin id to a safe PostgreSQL schema name.
     *
     * <p>All characters other than ASCII letters, digits, and underscores are replaced with
     * underscores, and the result is prefixed with {@code plugin_}. The maximum PostgreSQL
     * identifier length of 63 bytes is not enforced here; plugin ids should be kept
     * reasonably short.
     *
     * @param pluginId the raw plugin identifier
     * @return the sanitised schema name
     */
    public String toSchemaName(String pluginId) {
        return "plugin_" + pluginId.replaceAll("[^a-zA-Z0-9]", "_");
    }

    /**
     * Unchecked exception wrapping JDBC errors from schema DDL operations.
     */
    public static class PluginSchemaException extends RuntimeException {
        public PluginSchemaException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
