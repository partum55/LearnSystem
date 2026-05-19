package com.university.lms.ai.service;

import com.university.lms.ai.domain.entity.PromptTemplate;
import com.university.lms.ai.repository.PromptTemplateRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Service for managing prompt templates. Provides CRUD operations and template interpolation. */
@Service
@RequiredArgsConstructor
@Slf4j
public class PromptRegistryService {

  private final PromptTemplateRepository promptTemplateRepository;

  private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("\\{\\{(\\w+)}}");
  private static final String CACHE_NAME = "prompt-templates";

  /**
   * Get an active template by name.
   *
   * @param name Template name
   * @return Optional template
   */
  @Cacheable(value = CACHE_NAME, key = "#name")
  public Optional<PromptTemplate> getTemplate(String name) {
    log.debug("Loading template: {}", name);
    return promptTemplateRepository.findByNameAndActiveTrue(name);
  }

  /**
   * Get template or throw if not found.
   *
   * @param name Template name
   * @return Template
   * @throws IllegalArgumentException if template not found
   */
  public PromptTemplate getTemplateOrThrow(String name) {
    return getTemplate(name)
        .orElseThrow(() -> new IllegalArgumentException("Template not found: " + name));
  }

  /**
   * Interpolate a template with given variables.
   *
   * @param templateName Template name
   * @param variables Map of variable name to value
   * @return Interpolated user prompt
   */
  public InterpolatedPrompt interpolate(String templateName, Map<String, Object> variables) {
    PromptTemplate template = getTemplateOrThrow(templateName);
    return interpolate(template, variables);
  }

  /**
   * Interpolate a template with given variables.
   *
   * @param template Template to interpolate
   * @param variables Map of variable name to value
   * @return Interpolated prompts
   */
  public InterpolatedPrompt interpolate(PromptTemplate template, Map<String, Object> variables) {
    String systemPrompt = interpolateString(template.getSystemPrompt(), variables);
    String userPrompt = interpolateString(template.getUserPromptTemplate(), variables);

    return new InterpolatedPrompt(
        systemPrompt,
        userPrompt,
        template.getTemperature(),
        template.getMaxTokens(),
        template.getPreferredModel());
  }

  /** Interpolate placeholders in a string. */
  private String interpolateString(String template, Map<String, Object> variables) {
    if (template == null || variables == null) {
      return template;
    }

    Matcher matcher = PLACEHOLDER_PATTERN.matcher(template);
    StringBuilder result = new StringBuilder();

    while (matcher.find()) {
      String key = matcher.group(1);
      Object value = variables.get(key);
      String replacement = value != null ? Matcher.quoteReplacement(value.toString()) : "";
      matcher.appendReplacement(result, replacement);
    }
    matcher.appendTail(result);

    return result.toString();
  }

  /** Get all active templates. */
  @Transactional(readOnly = true)
  public List<PromptTemplate> getAllActiveTemplates() {
    return promptTemplateRepository.findByActiveTrue();
  }

  /** Get templates by category. */
  @Transactional(readOnly = true)
  public List<PromptTemplate> getTemplatesByCategory(String category) {
    return promptTemplateRepository.findByCategoryAndActiveTrue(category);
  }

  /** Create a new template. */
  @Transactional
  @CacheEvict(value = CACHE_NAME, key = "#template.name")
  public PromptTemplate createTemplate(PromptTemplate template) {
    if (promptTemplateRepository.existsByName(template.getName())) {
      throw new IllegalArgumentException("Template already exists: " + template.getName());
    }
    log.info("Creating new template: {}", template.getName());
    return promptTemplateRepository.save(template);
  }

  /** Update an existing template. */
  @Transactional
  @CacheEvict(value = CACHE_NAME, key = "#name")
  public PromptTemplate updateTemplate(String name, PromptTemplate updates) {
    PromptTemplate existing = getTemplateOrThrow(name);

    if (updates.getSystemPrompt() != null) {
      existing.setSystemPrompt(updates.getSystemPrompt());
    }
    if (updates.getUserPromptTemplate() != null) {
      existing.setUserPromptTemplate(updates.getUserPromptTemplate());
    }
    if (updates.getDescription() != null) {
      existing.setDescription(updates.getDescription());
    }
    if (updates.getTemperature() != null) {
      existing.setTemperature(updates.getTemperature());
    }
    if (updates.getMaxTokens() != null) {
      existing.setMaxTokens(updates.getMaxTokens());
    }
    if (updates.getPreferredModel() != null) {
      existing.setPreferredModel(updates.getPreferredModel());
    }
    if (updates.getModifiedBy() != null) {
      existing.setModifiedBy(updates.getModifiedBy());
    }

    log.info("Updated template: {}", name);
    return promptTemplateRepository.save(existing);
  }

  /** Deactivate a template (soft delete). */
  @Transactional
  @CacheEvict(value = CACHE_NAME, key = "#name")
  public void deactivateTemplate(String name) {
    PromptTemplate template = getTemplateOrThrow(name);
    template.setActive(false);
    promptTemplateRepository.save(template);
    log.info("Deactivated template: {}", name);
  }

  /** Get all template names. */
  public List<String> getAllTemplateNames() {
    return promptTemplateRepository.findAllActiveNames();
  }

  /** Result of interpolating a template. */
  public record InterpolatedPrompt(
      String systemPrompt,
      String userPrompt,
      Double temperature,
      Integer maxTokens,
      String preferredModel) {}
}
