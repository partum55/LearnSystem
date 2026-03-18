package com.university.lms.course.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

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
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AnnouncementServiceTest {

  @Mock private AnnouncementRepository announcementRepository;
  @Mock private CourseRepository courseRepository;
  @Mock private CourseMemberRepository courseMemberRepository;

  private AnnouncementService service;

  @BeforeEach
  void setUp() {
    service = new AnnouncementService(announcementRepository, courseRepository, courseMemberRepository);
  }

  @Test
  void getAnnouncementsReturnsListForEnrolledStudent() {
    UUID courseId = UUID.randomUUID();
    UUID ownerId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    Course course = Course.builder().id(courseId).ownerId(ownerId).build();

    Announcement pinned =
        Announcement.builder()
            .id(UUID.randomUUID())
            .course(course)
            .title("Pinned")
            .content("Important")
            .isPinned(true)
            .createdBy(ownerId)
            .build();
    Announcement regular =
        Announcement.builder()
            .id(UUID.randomUUID())
            .course(course)
            .title("Regular")
            .content("FYI")
            .isPinned(false)
            .createdBy(ownerId)
            .build();

    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMemberRepository.canUserManageCourse(courseId, studentId)).thenReturn(false);
    when(courseMemberRepository.existsByCourseIdAndUserId(courseId, studentId)).thenReturn(true);
    when(announcementRepository.findByCourseIdOrderByIsPinnedDescCreatedAtDesc(courseId))
        .thenReturn(List.of(pinned, regular));

    List<AnnouncementDto> items = service.getAnnouncements(courseId, studentId, "STUDENT");

    assertEquals(2, items.size());
    assertEquals("Pinned", items.getFirst().getTitle());
    assertFalse(Boolean.TRUE.equals(items.get(1).getIsPinned()));
  }

  @Test
  void createAnnouncementThrowsForStudentWithoutManageAccess() {
    UUID courseId = UUID.randomUUID();
    UUID ownerId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    Course course = Course.builder().id(courseId).ownerId(ownerId).build();

    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMemberRepository.canUserManageCourse(courseId, studentId)).thenReturn(false);

    CreateAnnouncementRequest request =
        CreateAnnouncementRequest.builder()
            .title("Update")
            .content("New schedule")
            .isPinned(false)
            .build();

    assertThrows(
        ValidationException.class,
        () -> service.createAnnouncement(courseId, request, studentId, "STUDENT"));
  }

  @Test
  void createAnnouncementAllowsSuperAdmin() {
    UUID courseId = UUID.randomUUID();
    UUID ownerId = UUID.randomUUID();
    UUID superAdminId = UUID.randomUUID();
    Course course = Course.builder().id(courseId).ownerId(ownerId).build();

    Announcement persisted =
        Announcement.builder()
            .id(UUID.randomUUID())
            .course(course)
            .title("System notice")
            .content("Maintenance window")
            .isPinned(true)
            .createdBy(superAdminId)
            .updatedBy(superAdminId)
            .build();

    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(announcementRepository.save(org.mockito.ArgumentMatchers.any(Announcement.class)))
        .thenReturn(persisted);

    CreateAnnouncementRequest request =
        CreateAnnouncementRequest.builder()
            .title("System notice")
            .content("Maintenance window")
            .isPinned(true)
            .build();

    AnnouncementDto dto = service.createAnnouncement(courseId, request, superAdminId, "SUPERADMIN");

    assertEquals("System notice", dto.getTitle());
    assertEquals(true, dto.getIsPinned());
  }

  @Test
  void updateAnnouncementRejectsBlankTitle() {
    UUID courseId = UUID.randomUUID();
    UUID ownerId = UUID.randomUUID();
    UUID announcementId = UUID.randomUUID();
    Course course = Course.builder().id(courseId).ownerId(ownerId).build();
    Announcement announcement =
        Announcement.builder()
            .id(announcementId)
            .course(course)
            .title("Old")
            .content("Body")
            .isPinned(false)
            .createdBy(ownerId)
            .build();

    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(announcementRepository.findByIdAndCourseId(announcementId, courseId))
        .thenReturn(Optional.of(announcement));

    UpdateAnnouncementRequest request =
        UpdateAnnouncementRequest.builder().title("   ").content("Updated").build();

    assertThrows(
        ValidationException.class,
        () -> service.updateAnnouncement(courseId, announcementId, request, ownerId, "TEACHER"));
  }
}
