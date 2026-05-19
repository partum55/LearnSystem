package com.university.lms.course.service;

import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.domain.Announcement;
import com.university.lms.course.domain.Course;
import com.university.lms.course.dto.AnnouncementDto;
import com.university.lms.course.dto.CreateAnnouncementRequest;
import com.university.lms.course.dto.UpdateAnnouncementRequest;
import com.university.lms.course.repository.AnnouncementRepository;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Service for managing course announcements. */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnnouncementService {

  private static final String ROLE_SUPERADMIN = "SUPERADMIN";

  private final AnnouncementRepository announcementRepository;
  private final CourseRepository courseRepository;
  private final CourseMemberRepository courseMemberRepository;

  public List<AnnouncementDto> getAnnouncements(UUID courseId, UUID userId, String userRole) {
    Course course = findCourseById(courseId);
    ensureViewAccess(course, userId, userRole);

    return announcementRepository.findByCourseIdOrderByIsPinnedDescCreatedAtDesc(courseId).stream()
        .map(this::toDto)
        .toList();
  }

  public AnnouncementDto getAnnouncement(
      UUID courseId, UUID announcementId, UUID userId, String userRole) {
    Course course = findCourseById(courseId);
    ensureViewAccess(course, userId, userRole);

    Announcement announcement = findAnnouncementById(courseId, announcementId);
    return toDto(announcement);
  }

  @Transactional
  public AnnouncementDto createAnnouncement(
      UUID courseId, CreateAnnouncementRequest request, UUID userId, String userRole) {
    Course course = findCourseById(courseId);
    ensureManageAccess(course, userId, userRole);

    Announcement announcement =
        Announcement.builder()
            .course(course)
            .title(normalizeRequiredText(request.getTitle(), "Title"))
            .content(normalizeRequiredText(request.getContent(), "Content"))
            .isPinned(Boolean.TRUE.equals(request.getIsPinned()))
            .createdBy(userId)
            .updatedBy(userId)
            .build();

    Announcement saved = announcementRepository.save(announcement);
    log.info("Announcement created: {} for course {}", saved.getId(), courseId);
    return toDto(saved);
  }

  @Transactional
  public AnnouncementDto updateAnnouncement(
      UUID courseId,
      UUID announcementId,
      UpdateAnnouncementRequest request,
      UUID userId,
      String userRole) {
    Course course = findCourseById(courseId);
    ensureManageAccess(course, userId, userRole);

    Announcement announcement = findAnnouncementById(courseId, announcementId);

    if (request.getTitle() != null) {
      announcement.setTitle(normalizeRequiredText(request.getTitle(), "Title"));
    }
    if (request.getContent() != null) {
      announcement.setContent(normalizeRequiredText(request.getContent(), "Content"));
    }
    if (request.getIsPinned() != null) {
      announcement.setIsPinned(request.getIsPinned());
    }
    announcement.setUpdatedBy(userId);

    Announcement saved = announcementRepository.save(announcement);
    log.info("Announcement updated: {} for course {}", announcementId, courseId);
    return toDto(saved);
  }

  @Transactional
  public void deleteAnnouncement(UUID courseId, UUID announcementId, UUID userId, String userRole) {
    Course course = findCourseById(courseId);
    ensureManageAccess(course, userId, userRole);

    Announcement announcement = findAnnouncementById(courseId, announcementId);
    announcementRepository.delete(announcement);
    log.info("Announcement deleted: {} for course {}", announcementId, courseId);
  }

  private Course findCourseById(UUID courseId) {
    return courseRepository
        .findById(courseId)
        .orElseThrow(() -> new ResourceNotFoundException("Course", "id", courseId));
  }

  private Announcement findAnnouncementById(UUID courseId, UUID announcementId) {
    return announcementRepository
        .findByIdAndCourseId(announcementId, courseId)
        .orElseThrow(() -> new ResourceNotFoundException("Announcement", "id", announcementId));
  }

  private void ensureViewAccess(Course course, UUID userId, String userRole) {
    if (isSuperAdmin(userRole)) {
      return;
    }
    if (course.getOwnerId().equals(userId)) {
      return;
    }
    if (courseMemberRepository.canUserManageCourse(course.getId(), userId)) {
      return;
    }
    if (courseMemberRepository.existsByCourseIdAndUserId(course.getId(), userId)) {
      return;
    }
    throw new ValidationException("User does not have access to this course");
  }

  private void ensureManageAccess(Course course, UUID userId, String userRole) {
    if (isSuperAdmin(userRole)) {
      return;
    }
    if (course.getOwnerId().equals(userId)) {
      return;
    }
    if (courseMemberRepository.canUserManageCourse(course.getId(), userId)) {
      return;
    }
    throw new ValidationException("User does not have permission to manage announcements");
  }

  private boolean isSuperAdmin(String userRole) {
    return userRole != null && ROLE_SUPERADMIN.equalsIgnoreCase(userRole);
  }

  private String normalizeRequiredText(String value, String field) {
    if (value == null) {
      throw new ValidationException(field + " is required");
    }
    String normalized = value.trim();
    if (normalized.isBlank()) {
      throw new ValidationException(field + " is required");
    }
    return normalized;
  }

  private AnnouncementDto toDto(Announcement announcement) {
    return AnnouncementDto.builder()
        .id(announcement.getId())
        .courseId(announcement.getCourse().getId())
        .title(announcement.getTitle())
        .content(announcement.getContent())
        .isPinned(announcement.getIsPinned())
        .createdBy(announcement.getCreatedBy())
        .updatedBy(announcement.getUpdatedBy())
        .createdAt(announcement.getCreatedAt())
        .updatedAt(announcement.getUpdatedAt())
        .build();
  }
}
