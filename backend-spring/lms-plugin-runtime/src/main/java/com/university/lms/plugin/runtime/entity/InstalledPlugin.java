package com.university.lms.plugin.runtime.entity;

import com.university.lms.plugin.api.PluginType;
import com.university.lms.plugin.runtime.PluginStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Persistence record for an installed plugin.
 *
 * <p>One row exists per installed plugin. The {@code status} column drives whether the plugin
 * is activated on startup. The {@code config} JSONB column holds administrator-supplied
 * key-value settings managed through {@link com.university.lms.plugin.runtime.DefaultPluginConfigStore}.
 * The {@code permissions} JSONB column is the snapshot of the manifest's declared scopes
 * at install/update time (informational; the runtime always re-reads from the live manifest).
 */
@Entity
@Table(name = "installed_plugins")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InstalledPlugin {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Unique reverse-domain plugin identifier, e.g. {@code "com.example.plagiarism-checker"}. */
    @Column(name = "plugin_id", unique = true, nullable = false)
    private String pluginId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String version;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private PluginType type;

    private String author;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** Permissions declared in the manifest, stored as a JSONB string array. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> permissions;

    /** Administrator-supplied configuration stored as a JSONB string-to-string map. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, String> config;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private PluginStatus status;

    @Column(name = "installed_at", nullable = false, updatable = false)
    private Instant installedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** UUID of the admin user who first installed this plugin. May be {@code null} for system installs. */
    @Column(name = "installed_by")
    private UUID installedBy;

    /** Filename of the uploaded JAR in the plugin storage directory. {@code null} for classpath plugins. */
    @Column(name = "jar_file_name")
    private String jarFileName;

    /** Plugin runtime type: {@code "java"} or {@code "python"}. Defaults to {@code "java"}. */
    @Column(name = "runtime", length = 20)
    private String runtime;

    /** Port assigned to the Python sidecar process. {@code null} for Java plugins. */
    @Column(name = "process_port")
    private Integer processPort;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (installedAt == null) {
            installedAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
