package com.university.lms.course.service;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.content.domain.ModulePage;
import com.university.lms.course.content.domain.PagePublishedDocument;
import com.university.lms.course.content.repository.ModulePageRepository;
import com.university.lms.course.content.repository.PagePublishedDocumentRepository;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseArchiveSnapshot;
import com.university.lms.course.domain.Module;
import com.university.lms.course.domain.Resource;
import com.university.lms.course.dto.CourseArchiveSnapshotDto;
import com.university.lms.course.repository.CourseArchiveSnapshotRepository;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.repository.ModuleRepository;
import com.university.lms.course.repository.ResourceRepository;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Service for immutable archived-course snapshots. */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CourseArchiveService {

  private static final String ROLE_SUPERADMIN = "SUPERADMIN";

  private final CourseRepository courseRepository;
  private final CourseMemberRepository courseMemberRepository;
  private final CourseArchiveSnapshotRepository courseArchiveSnapshotRepository;
  private final ModuleRepository moduleRepository;
  private final ResourceRepository resourceRepository;
  private final ModulePageRepository modulePageRepository;
  private final PagePublishedDocumentRepository pagePublishedDocumentRepository;
  private final AssignmentRepository assignmentRepository;

  /** Returns latest archive snapshot available to the requester. */
  public CourseArchiveSnapshotDto getLatestSnapshot(UUID courseId, UUID userId, String userRole) {
    Course course = findCourse(courseId);
    if (!canAccessArchive(course, userId, userRole)) {
      throw new ValidationException("User does not have permission to access course archive");
    }
    CourseArchiveSnapshot snapshot =
        courseArchiveSnapshotRepository
            .findTopByCourseIdOrderByVersionDesc(courseId)
            .orElseThrow(
                () -> new ResourceNotFoundException("CourseArchiveSnapshot", "courseId", courseId));
    return toDto(snapshot);
  }

  /**
   * Creates the first snapshot for the course if one does not yet exist. Intended to be called
   * when course transitions to ARCHIVED.
   */
  @Transactional
  public CourseArchiveSnapshotDto createSnapshotIfMissing(
      UUID courseId, UUID actorId, String actorRole) {
    Course course = findCourse(courseId);
    if (!canUserManageCourse(course, actorId, actorRole)) {
      throw new ValidationException("User does not have permission to archive this course");
    }
    if (course.getStatus() != CourseStatus.ARCHIVED) {
      throw new ValidationException("Course must be archived before creating a snapshot");
    }

    Optional<CourseArchiveSnapshot> existing =
        courseArchiveSnapshotRepository.findTopByCourseIdOrderByVersionDesc(courseId);
    if (existing.isPresent()) {
      return toDto(existing.get());
    }

    int nextVersion = courseArchiveSnapshotRepository.findMaxVersionByCourseId(courseId) + 1;
    Map<String, Object> payload = buildSnapshotPayload(course);
    CourseArchiveSnapshot snapshot =
        CourseArchiveSnapshot.builder()
            .courseId(courseId)
            .version(nextVersion)
            .createdBy(actorId)
            .payload(payload)
            .build();
    CourseArchiveSnapshot saved = courseArchiveSnapshotRepository.save(snapshot);
    log.info("Created archive snapshot version {} for course {}", saved.getVersion(), courseId);
    return toDto(saved);
  }

  private CourseArchiveSnapshotDto toDto(CourseArchiveSnapshot snapshot) {
    return CourseArchiveSnapshotDto.builder()
        .snapshotId(snapshot.getId())
        .courseId(snapshot.getCourseId())
        .version(snapshot.getVersion())
        .createdBy(snapshot.getCreatedBy())
        .createdAt(snapshot.getCreatedAt())
        .payload(snapshot.getPayload())
        .build();
  }

  private Map<String, Object> buildSnapshotPayload(Course course) {
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("capturedAt", java.time.LocalDateTime.now().toString());

    Map<String, Object> courseData = new LinkedHashMap<>();
    courseData.put("id", asString(course.getId()));
    courseData.put("code", course.getCode());
    courseData.put("titleUk", course.getTitleUk());
    courseData.put("titleEn", course.getTitleEn());
    courseData.put("descriptionUk", course.getDescriptionUk());
    courseData.put("descriptionEn", course.getDescriptionEn());
    courseData.put("syllabus", course.getSyllabus());
    courseData.put("academicYear", course.getAcademicYear());
    courseData.put("thumbnailUrl", course.getThumbnailUrl());
    courseData.put("themeColor", course.getThemeColor());
    payload.put("course", courseData);

    List<Map<String, Object>> modulePayload = new ArrayList<>();
    for (Module module : moduleRepository.findPublishedModulesByCourse(course.getId())) {
      Map<String, Object> moduleData = new LinkedHashMap<>();
      moduleData.put("moduleId", asString(module.getId()));
      moduleData.put("title", module.getTitle());
      moduleData.put("description", module.getDescription());
      moduleData.put("position", module.getPosition());
      moduleData.put("contentMeta", module.getContentMeta());

      List<Map<String, Object>> resourcesPayload = new ArrayList<>();
      for (Resource resource : resourceRepository.findByModuleIdOrderByPositionAsc(module.getId())) {
        Map<String, Object> resourceData = new LinkedHashMap<>();
        resourceData.put("resourceId", asString(resource.getId()));
        resourceData.put("title", resource.getTitle());
        resourceData.put("description", resource.getDescription());
        resourceData.put("resourceType", resource.getResourceType());
        resourceData.put("fileUrl", resource.getFileUrl());
        resourceData.put("externalUrl", resource.getExternalUrl());
        resourceData.put("fileSize", resource.getFileSize());
        resourceData.put("mimeType", resource.getMimeType());
        resourceData.put("position", resource.getPosition());
        resourceData.put("isDownloadable", resource.getIsDownloadable());
        resourceData.put("textContent", resource.getTextContent());
        resourceData.put("metadata", resource.getMetadata());
        resourcesPayload.add(resourceData);
      }
      moduleData.put("resources", resourcesPayload);

      List<ModulePage> pages =
          modulePageRepository.findByModuleIdAndIsPublishedTrueOrderByParentPageIdAscPositionAsc(
              module.getId());
      Map<UUID, PagePublishedDocument> docsByPageId = new HashMap<>();
      if (!pages.isEmpty()) {
        List<UUID> pageIds = pages.stream().map(ModulePage::getId).toList();
        for (PagePublishedDocument publishedDoc :
            pagePublishedDocumentRepository.findAllById(pageIds)) {
          docsByPageId.put(publishedDoc.getPageId(), publishedDoc);
        }
      }
      List<Map<String, Object>> pagesPayload = new ArrayList<>();
      for (ModulePage page : pages) {
        PagePublishedDocument publishedDoc = docsByPageId.get(page.getId());
        if (publishedDoc == null) {
          continue;
        }
        Map<String, Object> pageData = new LinkedHashMap<>();
        pageData.put("pageId", asString(page.getId()));
        pageData.put(
            "parentPageId",
            page.getParentPage() != null ? asString(page.getParentPage().getId()) : null);
        pageData.put("title", page.getTitle());
        pageData.put("slug", page.getSlug());
        pageData.put("position", page.getPosition());
        pageData.put("schemaVersion", publishedDoc.getSchemaVersion());
        pageData.put("publishedAt", asString(publishedDoc.getPublishedAt()));
        pageData.put("publishedBy", asString(publishedDoc.getPublishedBy()));
        pageData.put("document", publishedDoc.getDocJson());
        pagesPayload.add(pageData);
      }
      moduleData.put("pages", pagesPayload);
      modulePayload.add(moduleData);
    }
    payload.put("modules", modulePayload);

    List<Map<String, Object>> assignmentPayload = new ArrayList<>();
    for (Assignment assignment : assignmentRepository.findPublishedByCourse(course.getId())) {
      Map<String, Object> assignmentData = new LinkedHashMap<>();
      assignmentData.put("assignmentId", asString(assignment.getId()));
      assignmentData.put("moduleId", asString(assignment.getModuleId()));
      assignmentData.put("position", assignment.getPosition());
      assignmentData.put("assignmentType", assignment.getAssignmentType());
      assignmentData.put("title", assignment.getTitle());
      assignmentData.put("description", assignment.getDescription());
      assignmentData.put("descriptionFormat", assignment.getDescriptionFormat());
      assignmentData.put("instructions", assignment.getInstructions());
      assignmentData.put("instructionsFormat", assignment.getInstructionsFormat());
      assignmentData.put("maxPoints", asString(assignment.getMaxPoints()));
      assignmentData.put("dueDate", asString(assignment.getDueDate()));
      assignmentData.put("availableFrom", asString(assignment.getAvailableFrom()));
      assignmentData.put("availableUntil", asString(assignment.getAvailableUntil()));
      assignmentData.put("allowLateSubmission", assignment.getAllowLateSubmission());
      assignmentData.put("latePenaltyPercent", asString(assignment.getLatePenaltyPercent()));
      assignmentData.put("submissionTypes", assignment.getSubmissionTypes());
      assignmentData.put("allowedFileTypes", assignment.getAllowedFileTypes());
      assignmentData.put("rubric", assignment.getRubric());
      assignmentPayload.add(assignmentData);
    }
    payload.put("assignments", assignmentPayload);

    return payload;
  }

  private Course findCourse(UUID courseId) {
    return courseRepository
        .findById(courseId)
        .orElseThrow(() -> new ResourceNotFoundException("Course", "id", courseId));
  }

  private boolean canAccessArchive(Course course, UUID userId, String userRole) {
    if (isSuperAdmin(userRole) || course.getOwnerId().equals(userId)) {
      return true;
    }
    if (courseMemberRepository.canUserManageCourse(course.getId(), userId)) {
      return true;
    }
    return courseMemberRepository.existsByCourseIdAndUserId(course.getId(), userId);
  }

  private boolean canUserManageCourse(Course course, UUID userId, String userRole) {
    if (isSuperAdmin(userRole) || course.getOwnerId().equals(userId)) {
      return true;
    }
    return courseMemberRepository.canUserManageCourse(course.getId(), userId);
  }

  private boolean isSuperAdmin(String userRole) {
    return ROLE_SUPERADMIN.equalsIgnoreCase(userRole);
  }

  private String asString(Object value) {
    return value == null ? null : value.toString();
  }
}
