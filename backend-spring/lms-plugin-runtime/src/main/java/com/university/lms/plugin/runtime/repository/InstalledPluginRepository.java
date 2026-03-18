package com.university.lms.plugin.runtime.repository;

import com.university.lms.plugin.runtime.PluginStatus;
import com.university.lms.plugin.runtime.entity.InstalledPlugin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link InstalledPlugin} entities.
 */
@Repository
public interface InstalledPluginRepository extends JpaRepository<InstalledPlugin, UUID> {

    /**
     * Looks up a plugin record by its unique plugin identifier.
     *
     * @param pluginId the reverse-domain plugin id
     * @return the entity, or {@link Optional#empty()} if not installed
     */
    Optional<InstalledPlugin> findByPluginId(String pluginId);

    /**
     * Returns {@code true} if a row with the given plugin id exists.
     *
     * @param pluginId the reverse-domain plugin id
     */
    boolean existsByPluginId(String pluginId);

    /**
     * Returns all installed plugins with the given lifecycle status.
     *
     * @param status the target status
     */
    List<InstalledPlugin> findByStatus(PluginStatus status);

    /**
     * Returns all installed plugins with the given runtime type.
     *
     * @param runtime the runtime type (e.g. "java" or "python")
     */
    List<InstalledPlugin> findByRuntime(String runtime);
}
