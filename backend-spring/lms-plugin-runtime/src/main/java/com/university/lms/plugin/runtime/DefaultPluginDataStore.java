package com.university.lms.plugin.runtime;

import com.university.lms.plugin.api.PluginDataStore;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

/**
 * Default implementation of {@link PluginDataStore} scoped to a single plugin's schema.
 *
 * <p>Each plugin receives its own {@code DefaultPluginDataStore} instance, constructed by
 * {@link DefaultPluginContextFactory} with the plugin's dedicated schema name. The
 * {@link JdbcTemplate} is backed by the shared LMS {@link DataSource}; plugins must qualify
 * all table references with {@link #getSchemaName()} to ensure operations remain within their
 * allocated schema.
 *
 * <p>Example usage within a plugin:
 * <pre>{@code
 * String table = context.dataStore().getSchemaName() + ".my_table";
 * context.dataStore().jdbc().query("SELECT * FROM " + table, ...);
 * }</pre>
 */
public class DefaultPluginDataStore implements PluginDataStore {

    private final JdbcTemplate jdbcTemplate;
    private final String schemaName;

    /**
     * Constructs a data store for the given plugin.
     *
     * @param dataSource the shared LMS data source
     * @param schemaName the PostgreSQL schema allocated to this plugin
     *                   (as produced by {@link PluginSchemaManager#toSchemaName(String)})
     */
    public DefaultPluginDataStore(DataSource dataSource, String schemaName) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
        this.schemaName = schemaName;
    }

    @Override
    public JdbcTemplate jdbc() {
        return jdbcTemplate;
    }

    @Override
    public String getSchemaName() {
        return schemaName;
    }
}
