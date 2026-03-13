package com.university.lms.plugin.runtime.repository;

import com.university.lms.plugin.runtime.entity.PluginEventLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link PluginEventLog} entries.
 */
@Repository
public interface PluginEventLogRepository extends JpaRepository<PluginEventLog, UUID> {

    /**
     * Returns all log entries for a given plugin, most recent first.
     *
     * @param pluginId the plugin identifier
     * @param pageable pagination parameters
     * @return page of log entries
     */
    Page<PluginEventLog> findByPluginIdOrderByOccurredAtDesc(String pluginId, Pageable pageable);

    /**
     * Returns all log entries for a plugin since a specific timestamp, ordered by time ascending.
     *
     * @param pluginId  the plugin identifier
     * @param since     inclusive lower bound timestamp
     * @return ordered list of log entries
     */
    List<PluginEventLog> findByPluginIdAndOccurredAtAfterOrderByOccurredAtAsc(
            String pluginId, Instant since);

    /**
     * Deletes all log entries older than {@code before} for housekeeping purposes.
     *
     * @param before exclusive upper bound; entries with {@code occurredAt < before} are deleted
     * @return number of deleted rows
     */
    long deleteByOccurredAtBefore(Instant before);
}
