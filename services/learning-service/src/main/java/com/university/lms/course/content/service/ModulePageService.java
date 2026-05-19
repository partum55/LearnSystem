package com.university.lms.course.content.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.content.domain.ModulePage;
import com.university.lms.course.content.domain.PageDocument;
import com.university.lms.course.content.domain.PagePublishedDocument;
import com.university.lms.course.content.dto.*;
import com.university.lms.course.content.repository.ModulePageRepository;
import com.university.lms.course.content.repository.PageDocumentRepository;
import com.university.lms.course.content.repository.PagePublishedDocumentRepository;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.Module;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.ModuleRepository;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Service for module page trees and canonical block-editor documents. */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ModulePageService {

  private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

  private final ModulePageRepository modulePageRepository;
  private final PageDocumentRepository pageDocumentRepository;
  private final PagePublishedDocumentRepository pagePublishedDocumentRepository;
  private final ModuleRepository moduleRepository;
  private final CourseMemberRepository courseMemberRepository;
  private final DocumentValidationService documentValidationService;
  private final DocumentNormalizationService documentNormalizationService;
  private final PageDocumentIndexingService pageDocumentIndexingService;
  private final ObjectMapper objectMapper;

  public List<ModulePageDto> getModulePages(
      UUID courseId, UUID moduleId, UUID userId, String userRole) {
    Module module = findModuleForCourse(courseId, moduleId);
    boolean canManage = canManageCourse(module.getCourse(), userId, userRole);
    ensureCourseVisibility(module.getCourse(), userId, userRole);

    List<ModulePage> pages =
        canManage
            ? modulePageRepository.findByModuleIdOrderByParentPageIdAscPositionAsc(moduleId)
            : modulePageRepository.findByModuleIdAndIsPublishedTrueOrderByParentPageIdAscPositionAsc(
                moduleId);

    return pages.stream().map(this::toDto).toList();
  }

  public ModulePageDto getModulePage(
      UUID courseId, UUID moduleId, UUID pageId, UUID userId, String userRole) {
    Module module = findModuleForCourse(courseId, moduleId);
    ModulePage page = findPageById(pageId);

    if (!page.getModule().getId().equals(module.getId())) {
      throw new ValidationException("Page does not belong to the specified module");
    }

    boolean canManage = canManageCourse(module.getCourse(), userId, userRole);
    ensureCourseVisibility(module.getCourse(), userId, userRole);

    if (!canManage && !Boolean.TRUE.equals(page.getIsPublished())) {
      throw new ValidationException("Page is not published");
    }

    return toDto(page);
  }

  @Transactional
  @CacheEvict(value = "modules", allEntries = true)
  public ModulePageDto createModulePage(
      UUID courseId,
      UUID moduleId,
      CreateModulePageRequest request,
      UUID userId,
      String userRole) {
    Module module = findModuleForCourse(courseId, moduleId);
    ensureManageAccess(module.getCourse(), userId, userRole);

    ModulePage parent = validateParentPage(moduleId, request.getParentPageId(), null);
    int position = resolvePosition(moduleId, request.getParentPageId(), request.getPosition());
    String initialSlug =
        request.getSlug() != null && !request.getSlug().isBlank()
            ? request.getSlug()
            : request.getTitle();
    String uniqueSlug = resolveUniqueSlug(moduleId, initialSlug, null);

    ModulePage page =
        ModulePage.builder()
            .module(module)
            .parentPage(parent)
            .title(request.getTitle().trim())
            .slug(uniqueSlug)
            .position(position)
            .createdBy(userId)
            .updatedBy(userId)
            .build();

    ModulePage saved = modulePageRepository.save(page);

    CanonicalDocumentDto initialDoc = CanonicalDocumentDto.empty(saved.getId(), saved.getTitle());
    upsertPageDocumentInternal(saved, initialDoc.getDocument(), initialDoc.getSchemaVersion(), userId);

    log.info("Created module page {} for module {}", saved.getId(), moduleId);
    return toDto(saved);
  }

  @Transactional
  @CacheEvict(value = "modules", allEntries = true)
  public ModulePageDto updateModulePage(
      UUID courseId,
      UUID moduleId,
      UUID pageId,
      UpdateModulePageRequest request,
      UUID userId,
      String userRole) {
    Module module = findModuleForCourse(courseId, moduleId);
    ensureManageAccess(module.getCourse(), userId, userRole);

    ModulePage page = findPageById(pageId);
    if (!page.getModule().getId().equals(moduleId)) {
      throw new ValidationException("Page does not belong to the specified module");
    }

    if (request.getTitle() != null && !request.getTitle().isBlank()) {
      page.setTitle(request.getTitle().trim());
    }

    if (request.getSlug() != null && !request.getSlug().isBlank()) {
      page.setSlug(resolveUniqueSlug(moduleId, request.getSlug(), page.getId()));
    }

    if (request.getParentPageId() != null) {
      page.setParentPage(validateParentPage(moduleId, request.getParentPageId(), pageId));
    }

    if (request.getPosition() != null) {
      page.setPosition(request.getPosition());
    }

    page.setUpdatedBy(userId);
    ModulePage saved = modulePageRepository.save(page);
    return toDto(saved);
  }

  @Transactional
  @CacheEvict(value = "modules", allEntries = true)
  public void deleteModulePage(
      UUID courseId, UUID moduleId, UUID pageId, UUID userId, String userRole) {
    Module module = findModuleForCourse(courseId, moduleId);
    ensureManageAccess(module.getCourse(), userId, userRole);

    ModulePage page = findPageById(pageId);
    if (!page.getModule().getId().equals(moduleId)) {
      throw new ValidationException("Page does not belong to the specified module");
    }

    modulePageRepository.delete(page);
  }

  public CanonicalDocumentDto getPageDocument(UUID pageId, UUID userId, String userRole) {
    ModulePage page = findPageById(pageId);
    Course course = page.getModule().getCourse();

    boolean canManage = canManageCourse(course, userId, userRole);
    ensureCourseVisibility(course, userId, userRole);

    if (!canManage && !Boolean.TRUE.equals(page.getIsPublished())) {
      throw new ValidationException("Page is not published");
    }

    if (canManage) {
      Optional<PageDocument> draftDoc = pageDocumentRepository.findById(pageId);
      if (draftDoc.isPresent()) {
        return toDocumentDto(pageId, draftDoc.get().getDocJson(), draftDoc.get().getSchemaVersion(), draftDoc.get().getDocHash(), draftDoc.get().getUpdatedAt(), false);
      }
    }

    Optional<PagePublishedDocument> publishedDoc = pagePublishedDocumentRepository.findById(pageId);
    if (publishedDoc.isPresent()) {
      PagePublishedDocument value = publishedDoc.get();
      return toDocumentDto(
          pageId,
          value.getDocJson(),
          value.getSchemaVersion(),
          value.getDocHash(),
          value.getPublishedAt(),
          true);
    }

    return CanonicalDocumentDto.empty(pageId, page.getTitle());
  }

  @Transactional
  public CanonicalDocumentDto upsertPageDocument(
      UUID pageId,
      UpsertCanonicalDocumentRequest request,
      UUID userId,
      String userRole) {
    ModulePage page = findPageById(pageId);
    ensureManageAccess(page.getModule().getCourse(), userId, userRole);

    return upsertPageDocumentInternal(page, request.getDocument(), request.getSchemaVersion(), userId);
  }

  @Transactional
  public ModulePageDto publishPage(UUID pageId, UUID userId, String userRole) {
    ModulePage page = findPageById(pageId);
    ensurePublishAccess(page.getModule().getCourse(), userId, userRole);

    PageDocument draftDoc =
        pageDocumentRepository
            .findById(pageId)
            .orElseThrow(
                () ->
                    new ValidationException(
                        "Cannot publish page without a saved draft document"));

    PagePublishedDocument published =
        pagePublishedDocumentRepository
            .findById(pageId)
            .orElseGet(
                () ->
                    PagePublishedDocument.builder()
                        .pageId(page.getId())
                        .page(page)
                        .build());

    published.setDocJson(new HashMap<>(draftDoc.getDocJson()));
    published.setSchemaVersion(draftDoc.getSchemaVersion());
    published.setDocHash(draftDoc.getDocHash());
    published.setPublishedBy(userId);
    pagePublishedDocumentRepository.save(published);

    page.setIsPublished(true);
    page.setHasUnpublishedChanges(false);
    page.setUpdatedBy(userId);

    return toDto(modulePageRepository.save(page));
  }

  @Transactional
  public ModulePageDto unpublishPage(UUID pageId, UUID userId, String userRole) {
    ModulePage page = findPageById(pageId);
    ensurePublishAccess(page.getModule().getCourse(), userId, userRole);

    page.setIsPublished(false);
    page.setHasUnpublishedChanges(false);
    page.setUpdatedBy(userId);

    return toDto(modulePageRepository.save(page));
  }

  public List<TocItemDto> generateToc(UUID pageId, UUID userId, String userRole) {
    CanonicalDocumentDto document = getPageDocument(pageId, userId, userRole);
    List<TocItemDto> items = new ArrayList<>();
    AtomicInteger anchorCounter = new AtomicInteger(0);

    collectHeadings(document.getDocument(), items, anchorCounter);
    return items;
  }

  private CanonicalDocumentDto upsertPageDocumentInternal(
      ModulePage page, JsonNode document, Integer schemaVersion, UUID userId) {
    JsonNode normalizedDocument = documentNormalizationService.normalize(document);
    documentValidationService.validate(normalizedDocument, EditorMode.FULL);
    Map<String, Object> payload = toMap(normalizedDocument);
    String hash = computeHash(normalizedDocument);

    PageDocument draft =
        pageDocumentRepository
            .findById(page.getId())
            .orElseGet(
                () ->
                    PageDocument.builder()
                        .pageId(page.getId())
                        .page(page)
                        .build());

    draft.setDocJson(payload);
    draft.setSchemaVersion(schemaVersion == null ? 1 : schemaVersion);
    draft.setDocHash(hash);
    PageDocument saved = pageDocumentRepository.save(draft);

    page.setUpdatedBy(userId);
    if (Boolean.TRUE.equals(page.getIsPublished())) {
      page.setHasUnpublishedChanges(true);
    }
    modulePageRepository.save(page);
    pageDocumentIndexingService.reindex(page, payload);

    return toDocumentDto(
        page.getId(),
        saved.getDocJson(),
        saved.getSchemaVersion(),
        saved.getDocHash(),
        saved.getUpdatedAt(),
        false);
  }

  private Module findModuleForCourse(UUID courseId, UUID moduleId) {
    Module module =
        moduleRepository
            .findById(moduleId)
            .orElseThrow(() -> new ResourceNotFoundException("Module", "id", moduleId));

    if (!module.getCourse().getId().equals(courseId)) {
      throw new ValidationException("Module does not belong to the specified course");
    }

    return module;
  }

  private ModulePage validateParentPage(UUID moduleId, UUID parentPageId, UUID currentPageId) {
    if (parentPageId == null) {
      return null;
    }

    if (currentPageId != null && currentPageId.equals(parentPageId)) {
      throw new ValidationException("Page cannot be its own parent");
    }

    ModulePage parent =
        modulePageRepository
            .findByIdAndModuleId(parentPageId, moduleId)
            .orElseThrow(() -> new ValidationException("Parent page not found in this module"));

    if (currentPageId != null && createsCycle(currentPageId, parent)) {
      throw new ValidationException("Parent page selection would create a cycle");
    }

    return parent;
  }

  private boolean createsCycle(UUID currentPageId, ModulePage candidateParent) {
    ModulePage cursor = candidateParent;
    while (cursor != null) {
      if (currentPageId.equals(cursor.getId())) {
        return true;
      }
      cursor = cursor.getParentPage();
    }
    return false;
  }

  private int resolvePosition(UUID moduleId, UUID parentPageId, Integer requestedPosition) {
    if (requestedPosition != null) {
      return requestedPosition;
    }

    Integer maxPosition = modulePageRepository.findMaxPositionByModuleAndParent(moduleId, parentPageId);
    return (maxPosition == null ? -1 : maxPosition) + 1;
  }

  private String resolveUniqueSlug(UUID moduleId, String source, UUID pageIdToIgnore) {
    String base = slugify(source);
    String candidate = base;
    int suffix = 1;

    while (true) {
      Optional<ModulePage> existing = modulePageRepository.findByModuleIdAndSlug(moduleId, candidate);
      if (existing.isEmpty() || (pageIdToIgnore != null && existing.get().getId().equals(pageIdToIgnore))) {
        return candidate;
      }
      suffix += 1;
      candidate = base + "-" + suffix;
    }
  }

  private String slugify(String value) {
    if (value == null || value.isBlank()) {
      return "page";
    }

    String normalized = Normalizer.normalize(value, Normalizer.Form.NFD);
    String ascii = normalized.replaceAll("\\p{M}+", "");
    String slug = ascii.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-");
    slug = slug.replaceAll("(^-+|-+$)", "");
    return slug.isBlank() ? "page" : slug;
  }

  private boolean canManageCourse(Course course, UUID userId, String userRole) {
    if (isSuperAdmin(userRole) || course.getOwnerId().equals(userId)) {
      return true;
    }
    return courseMemberRepository.canUserManageCourse(course.getId(), userId);
  }

  private void ensureManageAccess(Course course, UUID userId, String userRole) {
    if (!canManageCourse(course, userId, userRole)) {
      throw new ValidationException("You don't have permission to manage module pages");
    }
  }

  private void ensurePublishAccess(Course course, UUID userId, String userRole) {
    if (isSuperAdmin(userRole) || course.getOwnerId().equals(userId)) {
      return;
    }

    Optional<CourseMember> member = courseMemberRepository.findByCourseIdAndUserId(course.getId(), userId);
    boolean isTeacher = member.map(CourseMember::getRoleInCourse).map(role -> "TEACHER".equalsIgnoreCase(role)).orElse(false);

    if (!isTeacher) {
      throw new ValidationException("Only teachers can publish or unpublish pages");
    }
  }

  private void ensureCourseVisibility(Course course, UUID userId, String userRole) {
    if (canManageCourse(course, userId, userRole)) {
      return;
    }

    if (!courseMemberRepository.existsByCourseIdAndUserId(course.getId(), userId)) {
      throw new ValidationException("User does not have access to this course");
    }
  }

  private boolean isSuperAdmin(String userRole) {
    return "SUPERADMIN".equalsIgnoreCase(userRole);
  }

  private ModulePage findPageById(UUID pageId) {
    return modulePageRepository
        .findById(pageId)
        .orElseThrow(() -> new ResourceNotFoundException("ModulePage", "id", pageId));
  }

  private ModulePageDto toDto(ModulePage page) {
    return ModulePageDto.builder()
        .id(page.getId())
        .moduleId(page.getModule().getId())
        .parentPageId(page.getParentPage() == null ? null : page.getParentPage().getId())
        .title(page.getTitle())
        .slug(page.getSlug())
        .position(page.getPosition())
        .isPublished(page.getIsPublished())
        .hasUnpublishedChanges(page.getHasUnpublishedChanges())
        .createdBy(page.getCreatedBy())
        .updatedBy(page.getUpdatedBy())
        .createdAt(page.getCreatedAt())
        .updatedAt(page.getUpdatedAt())
        .build();
  }

  private CanonicalDocumentDto toDocumentDto(
      UUID ownerId,
      Map<String, Object> document,
      Integer schemaVersion,
      String documentHash,
      LocalDateTime updatedAt,
      boolean publishedSnapshot) {
    return CanonicalDocumentDto.builder()
        .ownerId(ownerId)
        .schemaVersion(schemaVersion)
        .documentHash(documentHash)
        .document(objectMapper.valueToTree(document))
        .updatedAt(updatedAt)
        .publishedSnapshot(publishedSnapshot)
        .build();
  }

  private Map<String, Object> toMap(JsonNode node) {
    return objectMapper.convertValue(node, MAP_TYPE);
  }

  private String computeHash(JsonNode document) {
    try {
      byte[] bytes = objectMapper.writeValueAsBytes(document);
      byte[] hash = MessageDigest.getInstance("SHA-256").digest(bytes);
      return HexFormat.of().formatHex(hash);
    } catch (Exception ex) {
      throw new ValidationException("Failed to compute document hash");
    }
  }

  private void collectHeadings(JsonNode node, List<TocItemDto> items, AtomicInteger anchorCounter) {
    if (!node.isObject()) {
      return;
    }

    if ("heading".equals(node.path("type").asText(""))) {
      int level = node.path("attrs").path("level").asInt(1);
      String text = extractText(node).trim();
      if (!text.isBlank()) {
        String anchor = slugify(text) + "-" + anchorCounter.incrementAndGet();
        items.add(TocItemDto.builder().level(level).text(text).anchor(anchor).build());
      }
    }

    JsonNode content = node.path("content");
    if (content.isArray()) {
      for (JsonNode child : content) {
        collectHeadings(child, items, anchorCounter);
      }
    }
  }

  private String extractText(JsonNode node) {
    if (node.has("text")) {
      return node.path("text").asText("");
    }

    StringBuilder result = new StringBuilder();
    JsonNode content = node.path("content");
    if (content.isArray()) {
      for (JsonNode child : content) {
        result.append(extractText(child));
      }
    }
    return result.toString();
  }
}
