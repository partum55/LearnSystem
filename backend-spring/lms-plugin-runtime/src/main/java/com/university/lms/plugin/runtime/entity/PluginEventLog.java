package com.university.lms.plugin.runtime.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Audit log entry for plugin lifecycle and event-dispatch events.
 *
 * <p>The runtime writes a row here for each significant plugin lifecycle transition
 * (install, enable, disable, uninstall, error) and optionally for domain event deliveries.
 * This table supports the admin plugin management UI's activity feed.
 *
 * <p>Table: {@code plugin_events_log}.
 */
@Entity
@Table(
        name = "plugin_events_log",
        indexes = {
                @Index(name = "idx_pel_plugin_id", columnList = "plugin_id"),
                @Index(name = "idx_pel_occurred_at", columnList = "occurred_at")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PluginEventLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * Identifier of the plugin that generated this log entry
     * (matches {@link InstalledPlugin#getPluginId()}).
     */
    @Column(name = "plugin_id", nullable = false)
    private String pluginId;

    /**
     * Short label for the event type, e.g. {@code "LIFECYCLE_ENABLE"},
     * {@code "LIFECYCLE_ERROR"}, or {@code "EVENT_DELIVERED"}.
     */
    @Column(name = "event_type", nullable = false, length = 64)
    private String eventType;

    /**
     * Human-readable summary of what occurred, suitable for display in the admin UI.
     */
    @Column(columnDefinition = "TEXT")
    private String message;

    /**
     * Optional structured payload (stack traces, event data, etc.) stored as JSONB.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> details;

    /** UTC timestamp when this log entry was created. */
    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    /** Optional: the admin user who triggered this event (e.g. manual enable/disable). */
    @Column(name = "triggered_by")
    private UUID triggeredBy;

    @PrePersist
    void prePersist() {
        if (occurredAt == null) {
            occurredAt = Instant.now();
        }
    }
}
