package com.university.lms.ai.service;

import com.university.lms.ai.domain.CourseTemplate;
import com.university.lms.ai.dto.CourseGenerationRequest;
import com.university.lms.ai.dto.GeneratedCourseResponse;
import com.university.lms.ai.repository.CourseTemplateRepository;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Service for managing course templates */
@Service
@RequiredArgsConstructor
@Slf4j
public class TemplateService {

  private final CourseTemplateRepository templateRepository;
  private final CourseGenerationService courseGenerationService;

  /** Get all public templates */
  public List<CourseTemplate> getAllPublicTemplates() {
    return templateRepository.findByIsPublicTrueAndIsActiveTrue();
  }

  /** Get templates by category */
  public List<CourseTemplate> getTemplatesByCategory(String category) {
    return templateRepository.findByCategoryAndIsPublicTrueAndIsActiveTrue(category);
  }

  /** Get popular templates */
  public List<CourseTemplate> getPopularTemplates() {
    return templateRepository.findPopularTemplates();
  }

  /** Get template by ID */
  public CourseTemplate getTemplateById(UUID templateId) {
    return templateRepository
        .findById(templateId)
        .orElseThrow(() -> new IllegalArgumentException("Template not found: " + templateId));
  }

  /** Create new template */
  @Transactional
  public CourseTemplate createTemplate(CourseTemplate template) {
    log.info("Creating new template: {}", template.getName());
    return templateRepository.save(template);
  }

  /** Update template */
  @Transactional
  public CourseTemplate updateTemplate(UUID templateId, CourseTemplate template) {
    CourseTemplate existing = getTemplateById(templateId);

    existing.setName(template.getName());
    existing.setDescription(template.getDescription());
    existing.setCategory(template.getCategory());
    existing.setPromptTemplate(template.getPromptTemplate());
    existing.setVariables(template.getVariables());
    existing.setDefaultOptions(template.getDefaultOptions());
    existing.setIsPublic(template.getIsPublic());
    existing.setIsActive(template.getIsActive());

    return templateRepository.save(existing);
  }

  /** Generate course from template */
  @Transactional
  public GeneratedCourseResponse generateFromTemplate(
      UUID templateId, Map<String, String> variableValues) {

    CourseTemplate template = getTemplateById(templateId);
    Map<String, String> safeVariables =
        variableValues == null ? Collections.emptyMap() : variableValues;
    Map<String, String> defaultOptions =
        template.getDefaultOptions() == null
            ? Collections.emptyMap()
            : template.getDefaultOptions();

    // Fill template with variables
    String prompt = fillTemplate(template.getPromptTemplate(), safeVariables);

    // Build request with template defaults
    CourseGenerationRequest request =
        CourseGenerationRequest.builder()
            .prompt(prompt)
            .language(defaultOptions.getOrDefault("language", "uk"))
            .includeModules(
                Boolean.parseBoolean(defaultOptions.getOrDefault("includeModules", "true")))
            .includeAssignments(
                Boolean.parseBoolean(defaultOptions.getOrDefault("includeAssignments", "false")))
            .includeQuizzes(
                Boolean.parseBoolean(defaultOptions.getOrDefault("includeQuizzes", "false")))
            .academicYear(defaultOptions.get("academicYear"))
            .build();

    // Generate course
    GeneratedCourseResponse response = courseGenerationService.generateCourse(request);

    // Increment usage count
    template.incrementUsage();
    templateRepository.save(template);

    log.info(
        "Generated course from template: {} (usage: {})",
        template.getName(),
        template.getUsageCount());

    return response;
  }

  /** Fill template with variable values */
  private String fillTemplate(String template, Map<String, String> values) {
    if (template == null || template.isBlank() || values == null || values.isEmpty()) {
      return template;
    }

    String result = template;

    for (Map.Entry<String, String> entry : values.entrySet()) {
      String placeholder = "{{" + entry.getKey() + "}}";
      String replacement = entry.getValue() == null ? "" : entry.getValue();
      result = result.replace(placeholder, replacement);
    }

    return result;
  }

  /** Delete template */
  @Transactional
  public void deleteTemplate(UUID templateId) {
    CourseTemplate template = getTemplateById(templateId);
    template.setIsActive(false);
    templateRepository.save(template);
    log.info("Deactivated template: {}", template.getName());
  }

  /** Initialize default templates */
  @Transactional
  public void initializeDefaultTemplates() {
    if (templateRepository.count() > 0) {
      log.info("Templates already exist, skipping initialization");
      return;
    }

    log.info("Initializing default templates...");

    // Programming Course Template
    CourseTemplate programmingTemplate =
        CourseTemplate.builder()
            .name("Курс програмування")
            .description("Шаблон для створення курсів з програмування")
            .category("programming")
            .promptTemplate(
                "Створи курс з програмування мовою {{language}}. "
                    + "Рівень складності: {{level}}. "
                    + "Тривалість: {{duration}} тижнів. "
                    + "Включи модулі про: базовий синтаксис, структури даних, ООП, "
                    + "алгоритми та практичні проекти.")
            .variables(
                Map.of(
                    "language", "Python",
                    "level", "початковий",
                    "duration", "12"))
            .defaultOptions(
                Map.of(
                    "language", "uk",
                    "includeModules", "true",
                    "includeAssignments", "true",
                    "includeQuizzes", "true"))
            .isPublic(true)
            .isActive(true)
            .build();

    // Math Course Template
    CourseTemplate mathTemplate =
        CourseTemplate.builder()
            .name("Математичний курс")
            .description("Шаблон для математичних курсів")
            .category("math")
            .promptTemplate(
                "Створи математичний курс на тему: {{topic}}. "
                    + "Рівень: {{level}}. "
                    + "Включи теоретичні матеріали, приклади розв'язання задач та "
                    + "практичні завдання для самостійної роботи.")
            .variables(
                Map.of(
                    "topic", "Лінійна алгебра",
                    "level", "університетський"))
            .defaultOptions(
                Map.of(
                    "language", "uk",
                    "includeModules", "true",
                    "includeAssignments", "true",
                    "includeQuizzes", "true"))
            .isPublic(true)
            .isActive(true)
            .build();

    // Language Course Template
    CourseTemplate languageTemplate =
        CourseTemplate.builder()
            .name("Курс іноземної мови")
            .description("Шаблон для курсів вивчення мов")
            .category("languages")
            .promptTemplate(
                "Створи курс для вивчення мови: {{language}}. "
                    + "Рівень: {{level}} (A1, A2, B1, B2, C1, C2). "
                    + "Включи модулі про граматику, лексику, аудіювання, читання та розмову. "
                    + "Додай діалоги та вправи для практики.")
            .variables(
                Map.of(
                    "language", "англійська",
                    "level", "B1"))
            .defaultOptions(
                Map.of(
                    "language", "uk",
                    "includeModules", "true",
                    "includeAssignments", "true",
                    "includeQuizzes", "true"))
            .isPublic(true)
            .isActive(true)
            .build();

    // Science Course Template
    CourseTemplate scienceTemplate =
        CourseTemplate.builder()
            .name("Науковий курс")
            .description("Шаблон для природничих наук")
            .category("science")
            .promptTemplate(
                "Створи курс з {{subject}}. "
                    + "Тема: {{topic}}. "
                    + "Включи лекційні матеріали, лабораторні роботи, "
                    + "експерименти та контрольні питання.")
            .variables(
                Map.of(
                    "subject", "фізика",
                    "topic", "Механіка та термодинаміка"))
            .defaultOptions(
                Map.of(
                    "language", "uk",
                    "includeModules", "true",
                    "includeAssignments", "true",
                    "includeQuizzes", "false"))
            .isPublic(true)
            .isActive(true)
            .build();

    // Business Course Template
    CourseTemplate businessTemplate =
        CourseTemplate.builder()
            .name("Бізнес курс")
            .description("Шаблон для бізнес та економічних курсів")
            .category("business")
            .promptTemplate(
                "Створи курс з {{subject}}. "
                    + "Фокус на: {{focus}}. "
                    + "Включи case studies, практичні вправи та "
                    + "аналіз реальних бізнес-ситуацій.")
            .variables(
                Map.of(
                    "subject", "менеджмент",
                    "focus", "стратегічне планування"))
            .defaultOptions(
                Map.of(
                    "language", "uk",
                    "includeModules", "true",
                    "includeAssignments", "true",
                    "includeQuizzes", "false"))
            .isPublic(true)
            .isActive(true)
            .build();

    templateRepository.saveAll(
        List.of(
            programmingTemplate,
            mathTemplate,
            languageTemplate,
            scienceTemplate,
            businessTemplate));

    log.info("Successfully initialized {} default templates", 5);
  }
}
