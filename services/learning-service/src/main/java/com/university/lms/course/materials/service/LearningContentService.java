package com.university.lms.course.materials.service;

import com.university.lms.course.common.error.ApiException;
import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.domain.Module;
import com.university.lms.course.materials.dto.LearningItemDto;
import com.university.lms.course.materials.dto.LearningItemRequest;
import com.university.lms.course.materials.dto.LessonBlockDto;
import com.university.lms.course.materials.dto.LessonBlockReorderRequest;
import com.university.lms.course.materials.dto.LessonBlockRequest;
import com.university.lms.course.materials.dto.LessonDetailDto;
import com.university.lms.course.materials.entity.LearningItem;
import com.university.lms.course.materials.entity.LearningItemStatus;
import com.university.lms.course.materials.entity.LearningItemType;
import com.university.lms.course.materials.entity.LessonBlock;
import com.university.lms.course.materials.entity.LessonBlockType;
import com.university.lms.course.materials.mapper.LearningItemMapper;
import com.university.lms.course.materials.mapper.LessonBlockMapper;
import com.university.lms.course.materials.repository.LearningItemRepository;
import com.university.lms.course.materials.repository.LessonBlockRepository;
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
  private final LessonBlockRepository lessonBlockRepository;
  private final CourseAccessService accessService;
  private final LearningItemMapper learningItemMapper;
  private final LessonBlockMapper lessonBlockMapper;

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
  public List<LessonBlockDto> listLessonBlocks(UUID learningItemId, UUID userId) {
    LearningItem lesson = requireReadableLesson(learningItemId, userId);
    return lessonBlockRepository.findByLearningItemIdOrderByPositionAsc(lesson.getId())
        .stream()
        .map(lessonBlockMapper::toDto)
        .toList();
  }

  @Transactional
  public LearningItemDto createLearningItem(
      UUID courseId,
      UUID moduleId,
      UUID userId,
      LearningItemRequest request) {
    accessService.requireTeacher(courseId, userId);
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
        .content(contentFor(type, request))
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
    accessService.requireTeacher(courseId, userId);

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
    Map<String, Object> content = contentFor(item.getType(), request, item.getContent(), false);
    Map<String, Object> settings = settingsFor(item.getType(), request, item.getSettings());
    validateItemContent(item.getType(), content);
    item.setContent(content);
    item.setSettings(settings);
    return learningItemMapper.toDto(learningItemRepository.save(item));
  }

  @Transactional
  public void archiveLearningItem(UUID learningItemId, UUID userId) {
    LearningItem item = learningItemRepository.findById(learningItemId)
        .orElseThrow(() -> ApiException.notFound("Learning item"));
    accessService.requireTeacher(item.getModule().getCourse().getId(), userId);
    if (item.getStatus() != LearningItemStatus.ARCHIVED) {
      item.setStatus(LearningItemStatus.ARCHIVED);
      learningItemRepository.save(item);
    }
  }

  @Transactional
  public LessonBlockDto createLessonBlock(UUID learningItemId, UUID userId, LessonBlockRequest request) {
    LearningItem lesson = requireWritableLesson(learningItemId, userId);
    LessonBlockType type = request.type();
    if (type == null) {
      throw ApiException.badRequest("INVALID_LESSON_BLOCK_TYPE", "Lesson block type is required");
    }
    LessonBlock block = LessonBlock.builder()
        .learningItem(lesson)
        .type(type)
        .title(trimToNull(request.title()))
        .content(contentForBlock(type, request))
        .contentFormat(contentFormat(request.contentFormat()))
        .position(request.order() == null
            ? lessonBlockRepository.findMaxPositionByLearningItem(learningItemId) + 1
            : request.order())
        .settings(blockSettings(type, request))
        .build();
    validateBlock(block);
    return lessonBlockMapper.toDto(lessonBlockRepository.save(block));
  }

  @Transactional
  public LessonBlockDto updateLessonBlock(
      UUID learningItemId,
      UUID blockId,
      UUID userId,
      LessonBlockRequest request) {
    requireWritableLesson(learningItemId, userId);
    LessonBlock block = lessonBlockRepository.findByIdAndLearningItemId(blockId, learningItemId)
        .orElseThrow(() -> ApiException.notFound("Lesson block"));
    LessonBlockType previousType = block.getType();
    LessonBlockType type = request.type() == null ? previousType : request.type();
    block.setType(type);
    if (request.title() != null) {
      block.setTitle(trimToNull(request.title()));
    }
    if (request.content() != null) {
      block.setContent(type == LessonBlockType.VIDEO ? request.content() : contentForBlock(type, request));
    }
    if (request.contentFormat() != null) {
      block.setContentFormat(contentFormat(request.contentFormat()));
    }
    if (request.order() != null) {
      block.setPosition(request.order());
    }
    if (request.settings() != null || request.url() != null || type != previousType) {
      block.setSettings(blockSettings(type, request, block.getSettings()));
    }
    validateBlock(block);
    return lessonBlockMapper.toDto(lessonBlockRepository.save(block));
  }

  @Transactional
  public void deleteLessonBlock(UUID learningItemId, UUID blockId, UUID userId) {
    requireWritableLesson(learningItemId, userId);
    LessonBlock block = lessonBlockRepository.findByIdAndLearningItemId(blockId, learningItemId)
        .orElseThrow(() -> ApiException.notFound("Lesson block"));
    lessonBlockRepository.delete(block);
  }

  @Transactional
  public LessonDetailDto reorderLessonBlocks(
      UUID learningItemId,
      UUID userId,
      LessonBlockReorderRequest request) {
    LearningItem lesson = requireWritableLesson(learningItemId, userId);
    List<LessonBlock> existing = lessonBlockRepository.findByLearningItemIdOrderByPositionAsc(learningItemId);
    Map<UUID, LessonBlock> byId = existing.stream()
        .collect(java.util.stream.Collectors.toMap(LessonBlock::getId, block -> block));
    Set<UUID> requestedIds = new HashSet<>();
    for (LessonBlockReorderRequest.LessonBlockPositionDto position : request.blocks()) {
      LessonBlock block = byId.get(position.id());
      if (block == null) {
        throw ApiException.badRequest(
            "LESSON_BLOCK_MISMATCH", "One or more blocks do not belong to the lesson");
      }
      if (!requestedIds.add(position.id())) {
        throw ApiException.badRequest("DUPLICATE_LESSON_BLOCK", "Duplicate lesson block in reorder request");
      }
      block.setPosition(position.order());
    }
    lessonBlockRepository.saveAll(existing);
    return toLessonDetail(lesson);
  }

  private LessonDetailDto toLessonDetail(LearningItem lesson) {
    List<LessonBlockDto> blocks = lessonBlockRepository.findByLearningItemIdOrderByPositionAsc(lesson.getId())
        .stream()
        .map(lessonBlockMapper::toDto)
        .toList();
    return new LessonDetailDto(
        lesson.getId(),
        lesson.getModule().getId(),
        lesson.getTitle(),
        lesson.getDescription(),
        lesson.getPosition() == null ? 0 : lesson.getPosition(),
        lesson.getStatus(),
        blocks);
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
    accessService.requireTeacher(item.getModule().getCourse().getId(), userId);
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

  private String contentForBlock(LessonBlockType type, LessonBlockRequest request) {
    if (type == LessonBlockType.VIDEO) {
      requireText(request.url(), "url", "Video lesson block requires a URL");
      requireHttpUrl(request.url(), "url");
      return request.content();
    }
    requireText(request.content(), "content", type == LessonBlockType.TEXT
        ? "Text lesson block requires content"
        : "Inline quiz question block requires question content");
    return request.content();
  }

  private Map<String, Object> blockSettings(LessonBlockType type, LessonBlockRequest request) {
    return blockSettings(type, request, Map.of());
  }

  private Map<String, Object> blockSettings(
      LessonBlockType type,
      LessonBlockRequest request,
      Map<String, Object> current) {
    Map<String, Object> settings = new HashMap<>(current == null ? Map.of() : current);
    if (request.settings() != null) {
      settings.putAll(request.settings());
    }
    if (type == LessonBlockType.VIDEO && request.url() != null) {
      requireHttpUrl(request.url(), "url");
      settings.put("url", request.url());
      settings.putIfAbsent("provider", inferVideoProvider(request.url()));
    } else if (type != LessonBlockType.VIDEO) {
      settings.remove("url");
      settings.remove("provider");
    }
    return settings;
  }

  private void validateBlock(LessonBlock block) {
    if (block.getType() == LessonBlockType.VIDEO) {
      requireText(asString(block.getSettings().get("url")), "url", "Video lesson block requires a URL");
      return;
    }
    requireText(block.getContent(), "content", block.getType() == LessonBlockType.TEXT
        ? "Text lesson block requires content"
        : "Inline quiz question block requires question content");
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
