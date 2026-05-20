package com.university.lms.course.materials.service;

import com.university.lms.course.common.error.ApiException;
import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.domain.Module;
import com.university.lms.course.domain.Resource;
import com.university.lms.course.lesson.Lesson;
import com.university.lms.course.lesson.LessonRepository;
import com.university.lms.course.lesson.LessonStep;
import com.university.lms.course.lesson.LessonStepRepository;
import com.university.lms.course.materials.dto.LearningItemDto;
import com.university.lms.course.materials.dto.LearningMaterialRequest;
import com.university.lms.course.materials.dto.LessonBlockDto;
import com.university.lms.course.materials.dto.LessonDetailDto;
import com.university.lms.course.repository.ModuleRepository;
import com.university.lms.course.repository.ResourceRepository;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LearningContentService {
  private final ResourceRepository resourceRepository;
  private final ModuleRepository moduleRepository;
  private final LessonRepository lessonRepository;
  private final LessonStepRepository lessonStepRepository;
  private final CourseAccessService accessService;

  @Transactional(readOnly = true)
  public List<LearningItemDto> listModuleLearningItems(UUID courseId, UUID moduleId, UUID userId) {
    Module module = requireModuleInCourse(courseId, moduleId);
    accessService.requireActiveMember(courseId, userId);
    List<LearningItemDto> resources = resourceRepository.findByModuleIdOrderByPositionAsc(moduleId)
        .stream()
        .map(this::toDto)
        .toList();
    List<LearningItemDto> lessons = lessonRepository.findByModuleIdOrderByPositionAsc(module.getId())
        .stream()
        .map(this::lessonItem)
        .toList();
    return java.util.stream.Stream.concat(resources.stream(), lessons.stream())
        .sorted(Comparator.comparingInt(LearningItemDto::order))
        .toList();
  }

  @Transactional(readOnly = true)
  public LearningItemDto getMaterial(UUID materialId, UUID userId) {
    Resource resource = resourceRepository.findById(materialId)
        .orElseThrow(() -> ApiException.notFound("Learning material"));
    accessService.requireActiveMember(resource.getModule().getCourse().getId(), userId);
    return toDto(resource);
  }

  @Transactional(readOnly = true)
  public LessonDetailDto getLesson(UUID lessonId, UUID userId) {
    Lesson lesson = lessonRepository.findById(lessonId)
        .orElseThrow(() -> ApiException.notFound("Lesson"));
    Module module = moduleRepository.findById(lesson.getModuleId())
        .orElseThrow(() -> ApiException.notFound("Module"));
    accessService.requireActiveMember(module.getCourse().getId(), userId);
    return toLessonDetail(lesson);
  }

  @Transactional
  public LearningItemDto createMaterial(
      UUID courseId,
      UUID moduleId,
      UUID userId,
      LearningMaterialRequest request) {
    accessService.requireTeacher(courseId, userId);
    Module module = requireModuleInCourse(courseId, moduleId);
    String legacyType = LearningItemTypeMapper.toLegacy(request.type());
    if ("LESSON".equals(legacyType)) {
      Lesson lesson = Lesson.builder()
          .moduleId(module.getId())
          .title(request.title())
          .summary(request.description())
          .position(request.order() == null ? nextLessonPosition(moduleId) : request.order())
          .isPublished(Boolean.TRUE.equals(request.visible()))
          .build();
      return lessonItem(lessonRepository.save(lesson));
    }
    Resource resource = Resource.builder()
        .module(module)
        .title(request.title())
        .description(request.description())
        .resourceType(legacyType)
        .position(request.order() == null ? resourceRepository.findMaxPositionByModule(moduleId) + 1 : request.order())
        .externalUrl(request.url())
        .fileUrl(isFileType(request.type()) ? request.url() : null)
        .textContent(request.textContent())
        .isDownloadable(request.downloadable() == null || request.downloadable())
        .metadata(request.settings() == null ? new HashMap<>() : new HashMap<>(request.settings()))
        .build();
    return toDto(resourceRepository.save(resource));
  }

  @Transactional
  public LearningItemDto updateMaterial(UUID materialId, UUID userId, LearningMaterialRequest request) {
    Resource resource = resourceRepository.findById(materialId)
        .orElseThrow(() -> ApiException.notFound("Learning material"));
    UUID courseId = resource.getModule().getCourse().getId();
    accessService.requireTeacher(courseId, userId);
    resource.setTitle(request.title());
    resource.setDescription(request.description());
    if (request.order() != null) {
      resource.setPosition(request.order());
    }
    if (request.type() != null) {
      resource.setResourceType(LearningItemTypeMapper.toLegacy(request.type()));
    }
    resource.setExternalUrl(request.url());
    resource.setFileUrl(isFileType(request.type()) ? request.url() : null);
    resource.setTextContent(request.textContent());
    if (request.downloadable() != null) {
      resource.setIsDownloadable(request.downloadable());
    }
    if (request.settings() != null) {
      resource.setMetadata(new HashMap<>(request.settings()));
    }
    return toDto(resourceRepository.save(resource));
  }

  @Transactional
  public void deleteMaterial(UUID materialId, UUID userId) {
    Resource resource = resourceRepository.findById(materialId)
        .orElseThrow(() -> ApiException.notFound("Learning material"));
    accessService.requireTeacher(resource.getModule().getCourse().getId(), userId);
    resourceRepository.delete(resource);
  }

  public LearningItemDto toDto(Resource resource) {
    Map<String, Object> settings = new HashMap<>();
    settings.put("url", resource.getResourceUrl());
    settings.put("fileSize", resource.getFileSize());
    settings.put("mimeType", resource.getMimeType());
    settings.put("downloadable", Boolean.TRUE.equals(resource.getIsDownloadable()));
    if (resource.getTextContent() != null) {
      settings.put("content", resource.getTextContent());
    }
    if (resource.getMetadata() != null) {
      settings.putAll(resource.getMetadata());
    }
    return new LearningItemDto(
        resource.getId(),
        resource.getModule().getId(),
        LearningItemTypeMapper.toCanonical(resource.getResourceType()),
        resource.getTitle(),
        resource.getDescription(),
        resource.getPosition() == null ? 0 : resource.getPosition(),
        "visible",
        settings);
  }

  public LearningItemDto lessonItem(Lesson lesson) {
    return new LearningItemDto(
        lesson.getId(),
        lesson.getModuleId(),
        "lesson",
        lesson.getTitle(),
        lesson.getSummary(),
        lesson.getPosition() == null ? 0 : lesson.getPosition(),
        Boolean.TRUE.equals(lesson.getIsPublished()) ? "visible" : "hidden",
        Map.of("lessonId", lesson.getId()));
  }

  private LessonDetailDto toLessonDetail(Lesson lesson) {
    List<LessonBlockDto> blocks = lessonStepRepository.findByLessonIdOrderByPositionAsc(lesson.getId())
        .stream()
        .map(this::toLessonBlock)
        .toList();
    return new LessonDetailDto(
        lesson.getId(),
        lesson.getModuleId(),
        lesson.getTitle(),
        lesson.getSummary(),
        lesson.getPosition() == null ? 0 : lesson.getPosition(),
        Boolean.TRUE.equals(lesson.getIsPublished()) ? "visible" : "hidden",
        blocks);
  }

  private LessonBlockDto toLessonBlock(LessonStep step) {
    String type = "QUIZ".equalsIgnoreCase(step.getBlockType()) ? "inline_quiz_question" : "text";
    Map<String, Object> settings = new HashMap<>();
    settings.put("questions", step.getQuestions() == null ? List.of() : step.getQuestions());
    return new LessonBlockDto(
        step.getId(),
        type,
        step.getPosition() == null ? 0 : step.getPosition(),
        step.getTitle(),
        step.getContent(),
        step.getContentFormat(),
        settings);
  }

  private Module requireModuleInCourse(UUID courseId, UUID moduleId) {
    Module module = moduleRepository.findById(moduleId)
        .orElseThrow(() -> ApiException.notFound("Module"));
    if (!module.getCourse().getId().equals(courseId)) {
      throw ApiException.badRequest("MODULE_COURSE_MISMATCH", "Module does not belong to the course");
    }
    return module;
  }

  private boolean isFileType(String type) {
    return type != null && List.of("pdf", "file").contains(type.toLowerCase());
  }

  private int nextLessonPosition(UUID moduleId) {
    return lessonRepository.findByModuleIdOrderByPositionAsc(moduleId).stream()
        .map(Lesson::getPosition)
        .filter(java.util.Objects::nonNull)
        .max(Integer::compareTo)
        .orElse(0) + 1;
  }
}
