package com.university.lms.plugin.api;

import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Provides a plugin with isolated, schema-scoped JDBC access.
 *
 * <p>Each plugin is allocated a dedicated PostgreSQL schema (named after the plugin id, with
 * dots replaced by underscores). All DDL and DML for plugin-owned tables must target this
 * schema. The runtime creates the schema on install and drops it on uninstall.
 *
 * <p>Plugins should run their own Flyway migrations at {@link LmsPlugin#onInstall} or
 * {@link LmsPlugin#onEnable} time, using {@link #jdbc()} and qualifying table names with
 * {@link #getSchemaName()}.
 */
public interface PluginDataStore {

    /**
     * Returns a {@link JdbcTemplate} pre-configured with the shared LMS {@code DataSource}.
     * Always qualify table names with {@link #getSchemaName()} to avoid collisions.
     */
    JdbcTemplate jdbc();

    /**
     * Returns the PostgreSQL schema name allocated to this plugin
     * (e.g. {@code "com_example_plagiarism_checker"}).
     */
    String getSchemaName();
}
