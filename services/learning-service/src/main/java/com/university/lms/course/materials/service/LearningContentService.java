package com.university.lms.course.materials.service;

import com.university.lms.course.common.error.ApiException;
import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.domain.Module;
import com.university.lms.course.materials.dto.LearningItemDto;
import com.university.lms.course.materials.dto.LearningItemRequest;
import com.university.lms.course.materials.dto.LessonPageDto;
import com.university.lms.course.materials.dto.LessonPageReorderRequest;
import com.university.lms.course.materials.dto.LessonPageRequest;
import com.university.lms.course.materials.dto.LessonDetailDto;
import com.university.lms.course.materials.entity.LearningItem;
import com.university.lms.course.materials.entity.LearningItemStatus;
import com.university.lms.course.materials.entity.LearningItemType;
import com.university.lms.course.materials.entity.LessonPage;
import com.university.lms.course.materials.entity.LessonPageType;
import com.university.lms.course.materials.mapper.LearningItemMapper;
import com.university.lms.course.materials.mapper.LessonPageMapper;
import com.university.lms.course.materials.repository.LearningItemRepository;
import com.university.lms.course.materials.repository.LessonPageRepository;
import com.university.lms.course.repository.ModuleRepository;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class LearningContentService {
  private final ModuleRepository moduleRepository;
  private final LearningItemRepository learningItemRepository;
  private final LessonPageRepository lessonPageRepository;
  private final CourseAccessService accessService;
  private final LearningItemMapper learningItemMapper;
  private final LessonPageMapper lessonPageMapper;

  @Transactional(readOnly = true)
  public List<LearningItemDto> listModuleLearningItems(UUID courseId, UUID moduleId, UUID userId) {
    requireModuleInCourse(courseId, moduleId);
    accessService.requireCourseAccess(courseId, userId);
    boolean canTeach = accessService.canTeach(courseId, userId);
    return learningItemRepository.findByModuleIdOrderByPositionAsc(moduleId).stream()
        .filter(item -> item.getStatus() != LearningItemStatus.ARCHIVED)
        .filter(item -> canTeach || item.isVisible())
        .map(learningItemMapper::toDto)
        .toList();
  }

  @Transactional(readOnly = true)
  public LearningItemDto getLearningItem(UUID learningItemId, UUID userId) {
    LearningItem item = requireReadableItem(learningItemId, userId);
    return learningItemMapper.toDto(item);
  }

  @Transactional(readOnly = true)
  public List<LessonPageDto> listLessonPages(UUID learningItemId, UUID userId) {
    LearningItem lesson = requireReadableLesson(learningItemId, userId);
    return lessonPageRepository.findByLearningItemIdOrderByPositionAsc(lesson.getId())
        .stream()
        .map(lessonPageMapper::toDto)
        .toList();
  }

  @Transactional
  public LearningItemDto createLearningItem(
      UUID courseId,
      UUID moduleId,
      UUID userId,
      LearningItemRequest request) {
    accessService.requireTeacherMutation(courseId, userId);
    Module module = requireModuleInCourse(courseId, moduleId);
    LearningItemType type = request.type();
    if (type == null) {
      throw ApiException.badRequest("INVALID_LEARNING_ITEM_TYPE", "Learning item type is required");
    }
    requireText(request.title(), "title", "Learning item title is required");

    LearningItem item = LearningItem.builder()
        .module(module)
        .type(type)
        .title(request.title().trim())
        .description(request.description())
        .position(request.order() == null
            ? learningItemRepository.findMaxPositionByModule(moduleId) + 1
            : request.order())
        .status(LearningItemStatus.fromVisible(request.visible()))
        .contentJson(contentFor(type, request))
        .settings(settingsFor(type, request))
        .build();
    return learningItemMapper.toDto(learningItemRepository.save(item));
  }

  @Transactional
  public LearningItemDto updateLearningItem(UUID learningItemId, UUID userId, LearningItemRequest request) {
    LearningItem item = learningItemRepository.findById(learningItemId)
        .orElseThrow(() -> ApiException.notFound("Learning item"));
    if (item.getStatus() == LearningItemStatus.ARCHIVED) {
      throw ApiException.notFound("Learning item");
    }
    UUID courseId = item.getModule().getCourse().getId();
    accessService.requireTeacherMutation(courseId, userId);

    if (request.type() != null) {
      if (request.type() != item.getType()) {
        throw ApiException.conflict(
            "LEARNING_ITEM_TYPE_IMMUTABLE",
            "Learning item type cannot be changed after creation");
      }
    }
    if (request.title() != null) {
      requireText(request.title(), "title", "Learning item title is required");
      item.setTitle(request.title().trim());
    }
    if (request.description() != null) {
      item.setDescription(request.description());
    }
    if (request.order() != null) {
      item.setPosition(request.order());
    }
    if (request.visible() != null) {
      item.setStatus(LearningItemStatus.fromVisible(request.visible()));
    }
    Map<String, Object> content = contentFor(item.getType(), request, item.getContentJson(), false);
    Map<String, Object> settings = settingsFor(item.getType(), request, item.getSettings());
    validateItemContent(item.getType(), content);
    item.setContentJson(content);
    item.setSettings(settings);
    return learningItemMapper.toDto(learningItemRepository.save(item));
  }

  @Transactional
  public void archiveLearningItem(UUID learningItemId, UUID userId) {
    LearningItem item = learningItemRepository.findById(learningItemId)
        .orElseThrow(() -> ApiException.notFound("Learning item"));
    accessService.requireTeacherMutation(item.getModule().getCourse().getId(), userId);
    if (item.getStatus() != LearningItemStatus.ARCHIVED) {
      item.setStatus(LearningItemStatus.ARCHIVED);
      learningItemRepository.save(item);
    }
  }

  @Transactional
  public LessonPageDto createLessonPage(UUID learningItemId, UUID userId, LessonPageRequest request) {
    LearningItem lesson = requireWritableLesson(learningItemId, userId);
    LessonPageType type = request.type();
    if (type == null) {
      throw ApiException.badRequest("INVALID_LESSON_PAGE_TYPE", "Lesson page type is required");
    }
    LessonPage page = LessonPage.builder()
        .learningItem(lesson)
        .type(type)
        .title(trimToNull(request.title()))
        .content(contentForPage(type, request))
        .contentFormat(contentFormat(request.contentFormat()))
        .position(request.order() == null
            ? lessonPageRepository.findMaxPositionByLearningItem(learningItemId) + 1
            : request.order())
        .settings(pageSettings(type, request))
        .build();
    validatePage(page);
    return lessonPageMapper.toDto(lessonPageRepository.save(page));
  }

  @Transactional
  public LessonPageDto updateLessonPage(
      UUID learningItemId,
      UUID pageId,
      UUID userId,
      LessonPageRequest request) {
    requireWritableLesson(learningItemId, userId);
    LessonPage page = lessonPageRepository.findByIdAndLearningItemId(pageId, learningItemId)
        .orElseThrow(() -> ApiException.notFound("Lesson page"));
    LessonPageType previousType = page.getType();
    LessonPageType type = request.type() == null ? previousType : request.type();
    page.setType(type);
    if (request.title() != null) {
      page.setTitle(trimToNull(request.title()));
    }
    if (request.content() != null) {
      page.setContent(type == LessonPageType.VIDEO ? request.content() : contentForPage(type, request));
    }
    if (request.contentFormat() != null) {
      page.setContentFormat(contentFormat(request.contentFormat()));
    }
    if (request.order() != null) {
      page.setPosition(request.order());
    }
    if (request.settings() != null || request.url() != null || type != previousType) {
      page.setSettings(pageSettings(type, request, page.getSettings()));
    }
    validatePage(page);
    return lessonPageMapper.toDto(lessonPageRepository.save(page));
  }

  @Transactional
  public void deleteLessonPage(UUID learningItemId, UUID pageId, UUID userId) {
    requireWritableLesson(learningItemId, userId);
    LessonPage page = lessonPageRepository.findByIdAndLearningItemId(pageId, learningItemId)
        .orElseThrow(() -> ApiException.notFound("Lesson page"));
    lessonPageRepository.delete(page);
  }

  @Transactional
  public LessonDetailDto reorderLessonPages(
      UUID learningItemId,
      UUID userId,
      LessonPageReorderRequest request) {
    LearningItem lesson = requireWritableLesson(learningItemId, userId);
    List<LessonPage> existing = lessonPageRepository.findByLearningItemIdOrderByPositionAsc(learningItemId);
    Map<UUID, LessonPage> byId = existing.stream()
        .collect(java.util.stream.Collectors.toMap(LessonPage::getId, page -> page));
    Set<UUID> requestedIds = new HashSet<>();
    for (LessonPageReorderRequest.LessonPagePositionDto position : request.pages()) {
      LessonPage page = byId.get(position.id());
      if (page == null) {
        throw ApiException.badRequest(
            "LESSON_PAGE_MISMATCH", "One or more pages do not belong to the lesson");
      }
      if (!requestedIds.add(position.id())) {
        throw ApiException.badRequest("DUPLICATE_LESSON_PAGE", "Duplicate lesson page in reorder request");
      }
      page.setPosition(position.order());
    }
    lessonPageRepository.saveAll(existing);
    return toLessonDetail(lesson);
  }

  private LessonDetailDto toLessonDetail(LearningItem lesson) {
    List<LessonPageDto> pages = lessonPageRepository.findByLearningItemIdOrderByPositionAsc(lesson.getId())
        .stream()
        .map(lessonPageMapper::toDto)
        .toList();
    return new LessonDetailDto(
        lesson.getId(),
        lesson.getModule().getId(),
        lesson.getTitle(),
        lesson.getDescription(),
        lesson.getPosition() == null ? 0 : lesson.getPosition(),
        lesson.getStatus(),
        pages);
  }

  private LearningItem requireReadableItem(UUID itemId, UUID userId) {
    LearningItem item = learningItemRepository.findById(itemId)
        .orElseThrow(() -> ApiException.notFound("Learning item"));
    UUID courseId = item.getModule().getCourse().getId();
    accessService.requireCourseAccess(courseId, userId);
    if (item.getStatus() == LearningItemStatus.ARCHIVED) {
      throw ApiException.notFound("Learning item");
    }
    if (!item.isVisible() && !accessService.canTeach(courseId, userId)) {
      throw ApiException.forbidden("This learning item is not visible");
    }
    return item;
  }

  private LearningItem requireReadableLesson(UUID learningItemId, UUID userId) {
    LearningItem item = requireReadableItem(learningItemId, userId);
    if (!item.isLesson()) {
      throw ApiException.badRequest("NOT_A_LESSON", "Learning item is not a lesson");
    }
    return item;
  }

  private LearningItem requireWritableLesson(UUID learningItemId, UUID userId) {
    LearningItem item = learningItemRepository.findById(learningItemId)
        .orElseThrow(() -> ApiException.notFound("Learning item"));
    if (item.getStatus() == LearningItemStatus.ARCHIVED) {
      throw ApiException.notFound("Learning item");
    }
    if (!item.isLesson()) {
      throw ApiException.badRequest("NOT_A_LESSON", "Learning item is not a lesson");
    }
    accessService.requireTeacherMutation(item.getModule().getCourse().getId(), userId);
    return item;
  }

  private Module requireModuleInCourse(UUID courseId, UUID moduleId) {
    Module module = moduleRepository.findById(moduleId)
        .orElseThrow(() -> ApiException.notFound("Module"));
    if (!module.getCourse().getId().equals(courseId)) {
      throw ApiException.badRequest("MODULE_COURSE_MISMATCH", "Module does not belong to the course");
    }
    return module;
  }

  private Map<String, Object> contentFor(LearningItemType type, LearningItemRequest request) {
    Map<String, Object> content = contentFor(type, request, Map.of(), true);
    validateItemContent(type, content);
    return content;
  }

  private Map<String, Object> contentFor(
      LearningItemType type,
      LearningItemRequest request,
      Map<String, Object> current,
      boolean creating) {
    Map<String, Object> content = new HashMap<>(current == null ? Map.of() : current);
    switch (type) {
      case PDF, PRESENTATION, FILE -> {
        if (request.url() != null) {
          content.put("url", request.url());
        } else if (creating) {
          content.remove("url");
        }
        if (request.downloadable() != null) {
          content.put("downloadable", request.downloadable());
        }
      }
      case LINK, VIDEO -> {
        if (request.url() != null) {
          requireHttpUrl(request.url(), "url");
          content.put("url", request.url());
        } else if (creating) {
          content.remove("url");
        }
      }
      case RTE -> {
        if (request.textContent() != null) {
          content.put("textContent", request.textContent());
        } else if (creating) {
          content.remove("textContent");
        }
      }
      case LESSON -> {
        if (request.settings() != null && request.settings().containsKey("estimatedMinutes")) {
          content.put("estimatedMinutes", request.settings().get("estimatedMinutes"));
        }
      }
    }
    return content;
  }

  private Map<String, Object> settingsFor(LearningItemType type, LearningItemRequest request) {
    Map<String, Object> settings = settingsFor(type, request, Map.of());
    validateItemContent(type, contentFor(type, request, Map.of(), true));
    return settings;
  }

  private Map<String, Object> settingsFor(
      LearningItemType type,
      LearningItemRequest request,
      Map<String, Object> current) {
    Map<String, Object> settings = new HashMap<>(current == null ? Map.of() : current);
    if (request.settings() != null) {
      settings.putAll(request.settings());
    }
    if (type == LearningItemType.VIDEO && request.url() != null) {
      settings.putIfAbsent("provider", inferVideoProvider(request.url()));
    }
    return settings;
  }

  private void validateItemContent(LearningItemType type, Map<String, Object> content) {
    switch (type) {
      case PDF -> requireText(asString(content.get("url")), "url", "PDF learning item requires a file or URL reference");
      case PRESENTATION -> requireText(asString(content.get("url")), "url", "Presentation learning item requires a file or URL reference");
      case LINK -> requireText(asString(content.get("url")), "url", "Link learning item requires a URL");
      case VIDEO -> requireText(asString(content.get("url")), "url", "Video learning item requires a URL");
      case FILE -> requireText(asString(content.get("url")), "url", "File learning item requires a file reference");
      case RTE -> requireText(asString(content.get("textContent")), "textContent", "RTE learning item requires content");
      case LESSON -> {
        // Lessons may start empty and gain blocks later.
      }
    }
  }

  private String contentForPage(LessonPageType type, LessonPageRequest request) {
    if (type == LessonPageType.VIDEO) {
      requireText(request.url(), "url", "Video lesson page requires a URL");
      requireHttpUrl(request.url(), "url");
      return request.content();
    }
    requireText(request.content(), "content", type == LessonPageType.TEXT
        ? "Text lesson page requires content"
        : "Inline quiz question page requires question content");
    return request.content();
  }

  private Map<String, Object> pageSettings(LessonPageType type, LessonPageRequest request) {
    return pageSettings(type, request, Map.of());
  }

  private Map<String, Object> pageSettings(
      LessonPageType type,
      LessonPageRequest request,
      Map<String, Object> current) {
    Map<String, Object> settings = new HashMap<>(current == null ? Map.of() : current);
    if (request.settings() != null) {
      settings.putAll(request.settings());
    }
    if (type == LessonPageType.VIDEO && request.url() != null) {
      requireHttpUrl(request.url(), "url");
      settings.put("url", request.url());
      settings.putIfAbsent("provider", inferVideoProvider(request.url()));
    } else if (type != LessonPageType.VIDEO) {
      settings.remove("url");
      settings.remove("provider");
    }
    return settings;
  }

  private void validatePage(LessonPage page) {
    if (page.getType() == LessonPageType.VIDEO) {
      requireText(asString(page.getSettings().get("url")), "url", "Video lesson page requires a URL");
      return;
    }
    requireText(page.getContent(), "content", page.getType() == LessonPageType.TEXT
        ? "Text lesson page requires content"
        : "Inline quiz question page requires question content");
  }

  private String contentFormat(String value) {
    if (!StringUtils.hasText(value)) {
      return "RICH";
    }
    String normalized = value.trim().toUpperCase(java.util.Locale.ROOT);
    if (!List.of("PLAIN", "MARKDOWN", "HTML", "RICH").contains(normalized)) {
      throw ApiException.badRequest("INVALID_CONTENT_FORMAT", "Unsupported content format: " + value);
    }
    return normalized;
  }

  private String inferVideoProvider(String url) {
    String lower = url.toLowerCase(java.util.Locale.ROOT);
    if (lower.contains("youtube.com") || lower.contains("youtu.be")) {
      return "youtube";
    }
    return "external";
  }

  private void requireHttpUrl(String value, String field) {
    requireText(value, field, field + " is required");
    try {
      URI uri = new URI(value);
      if (!List.of("http", "https").contains(uri.getScheme())) {
        throw ApiException.badRequest("INVALID_URL", field + " must be an http(s) URL");
      }
    } catch (URISyntaxException ex) {
      throw ApiException.badRequest("INVALID_URL", field + " must be a valid URL");
    }
  }

  private void requireText(String value, String field, String message) {
    if (!StringUtils.hasText(value)) {
      throw ApiException.badRequest("VALIDATION_ERROR", field + ": " + message);
    }
  }

  private String trimToNull(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    return value.trim();
  }

  private String asString(Object value) {
    return Objects.toString(value, null);
  }
}
