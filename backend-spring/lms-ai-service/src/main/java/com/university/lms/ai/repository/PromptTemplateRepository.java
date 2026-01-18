package com.university.lms.ai.repository;

import com.university.lms.ai.domain.entity.PromptTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for PromptTemplate entity.
 */
@Repository
public interface PromptTemplateRepository extends JpaRepository<PromptTemplate, String> {

    /**
     * Find an active template by name.
     */
    Optional<PromptTemplate> findByNameAndActiveTrue(String name);

    /**
     * Find all active templates.
     */
    List<PromptTemplate> findByActiveTrue();

    /**
     * Find all templates by category.
     */
    List<PromptTemplate> findByCategoryAndActiveTrue(String category);

    /**
     * Check if a template with the given name exists.
     */
    boolean existsByName(String name);

    /**
     * Find a template by name (regardless of active status).
     */
    Optional<PromptTemplate> findByName(String name);

    /**
     * Find all template names.
     */
    @Query("SELECT p.name FROM PromptTemplate p WHERE p.active = true")
    List<String> findAllActiveNames();

    /**
     * Find templates matching a name pattern.
     */
    @Query("SELECT p FROM PromptTemplate p WHERE p.active = true AND p.name LIKE :pattern")
    List<PromptTemplate> findByNamePattern(String pattern);
}

