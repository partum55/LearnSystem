package com.university.lms.course.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.common.error.ApiException;
import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.CourseMemberStatus;
import com.university.lms.course.domain.CourseRole;
import com.university.lms.course.dto.CourseSettingsDto;
import com.university.lms.course.dto.UpdateCourseSettingsRequest;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.web.RequestUserContext;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Unit tests for {@link CourseService}. Access decisions are delegated to the canonical
 * {@link CourseAccessService}; these tests therefore exercise that path through a real
 * CourseAccessService backed by the same mocked repositories plus a mocked
 * {@link RequestUserContext}. Forbidden outcomes now surface as {@link ApiException} (HTTP 403),
 * the canonical exception contract — previously this service threw Spring's AccessDeniedException
 * (also HTTP 403), so the external status code is unchanged.
 */
@ExtendWith(MockitoExtension.class)
class CourseServiceTest {

  @Mock private CourseRepository courseRepository;
  @Mock private CourseMemberRepository courseMemberRepository;
  @Mock private RequestUserContext requestUserContext;

  private CourseService courseService;
  private UUID courseId;
  private UUID ownerId;
  private UUID otherUserId;
  private Course course;

  @BeforeEach
  void setUp() {
    CourseAccessService accessService =
        new CourseAccessService(courseMemberRepository, courseRepository, requestUserContext);
    courseService =
        new CourseService(courseRepository, courseMemberRepository, new CourseMapper(), accessService);
    courseId = UUID.randomUUID();
    ownerId = UUID.randomUUID();
    otherUserId = UUID.randomUUID();
    course = Course.builder()
        .id(courseId)
        .code("CS101")
        .titleUk("Old title")
        .ownerId(ownerId)
        .status(CourseStatus.DRAFT)
        .build();
  }

  @Test
  void adminCanUpdateAnyCourseSettings() {
    when(requestUserContext.requireUserRole()).thenReturn("ADMIN");
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseRepository.findByCode("CS102")).thenReturn(Optional.empty());
    when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> invocation.getArgument(0));

    CourseSettingsDto settings = courseService.updateCourseSettings(
        courseId,
        settingsRequest("CS102", "New title"),
        otherUserId,
        "ADMIN");

    assertThat(settings.getCode()).isEqualTo("CS102");
    assertThat(settings.getTitleUk()).isEqualTo("New title");
    assertThat(settings.getStatus()).isEqualTo(CourseStatus.DRAFT);
  }

  @Test
  void ownerCanUpdateOwnCourseSettings() {
    when(requestUserContext.requireUserRole()).thenReturn("TEACHER");
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, ownerId))
        .thenReturn(Optional.of(member(ownerId, CourseRole.OWNER)));
    when(courseRepository.findByCode("CS102")).thenReturn(Optional.empty());
    when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> invocation.getArgument(0));

    CourseSettingsDto settings = courseService.updateCourseSettings(
        courseId,
        settingsRequest("CS102", "Owner title"),
        ownerId,
        "TEACHER");

    assertThat(settings.getTitleUk()).isEqualTo("Owner title");
  }

  @Test
  void teacherNonOwnerGetsForbidden() {
    assertForbiddenForRole(CourseRole.TEACHER);
  }

  @Test
  void taGetsForbidden() {
    assertForbiddenForRole(CourseRole.TA);
  }

  @Test
  void studentGetsForbidden() {
    assertForbiddenForRole(CourseRole.STUDENT);
  }

  @Test
  void ownerCannotManageOtherCourse() {
    when(requestUserContext.requireUserRole()).thenReturn("TEACHER");
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, otherUserId))
        .thenReturn(Optional.of(member(otherUserId, CourseRole.OWNER, CourseMemberStatus.DROPPED)));

    assertThatThrownBy(() -> courseService.getCourseSettings(courseId, otherUserId, "TEACHER"))
        .isInstanceOf(ApiException.class);
  }

  @Test
  void archiveRequiresOwnerOrAdmin() {
    when(requestUserContext.requireUserRole()).thenReturn("TEACHER");
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, otherUserId))
        .thenReturn(Optional.of(member(otherUserId, CourseRole.TEACHER)));

    assertThatThrownBy(() -> courseService.archiveCourse(courseId, otherUserId, "TEACHER"))
        .isInstanceOf(ApiException.class);

    verify(courseRepository, never()).save(any(Course.class));
  }

  @Test
  void deleteRemovesEmptyDraftForOwner() {
    // course in @BeforeEach is DRAFT
    when(requestUserContext.requireUserRole()).thenReturn("TEACHER");
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, ownerId))
        .thenReturn(Optional.of(member(ownerId, CourseRole.OWNER)));
    when(courseMemberRepository.countActiveStudents(courseId)).thenReturn(0L);

    courseService.deleteCourse(courseId, ownerId, "TEACHER");

    verify(courseRepository).delete(course);
    verify(courseRepository, never()).save(any(Course.class));
  }

  @Test
  void deleteRejectsPublishedCourse() {
    Course published = Course.builder().id(courseId).code("CS101").titleUk("T")
        .ownerId(ownerId).status(CourseStatus.PUBLISHED).build();
    when(requestUserContext.requireUserRole()).thenReturn("TEACHER");
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(published));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, ownerId))
        .thenReturn(Optional.of(member(ownerId, CourseRole.OWNER)));

    assertThatThrownBy(() -> courseService.deleteCourse(courseId, ownerId, "TEACHER"))
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("Archive");

    verify(courseRepository, never()).delete(any(Course.class));
  }

  @Test
  void deleteRejectsDraftWithEnrolledStudents() {
    when(requestUserContext.requireUserRole()).thenReturn("TEACHER");
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, ownerId))
        .thenReturn(Optional.of(member(ownerId, CourseRole.OWNER)));
    when(courseMemberRepository.countActiveStudents(courseId)).thenReturn(3L);

    assertThatThrownBy(() -> courseService.deleteCourse(courseId, ownerId, "TEACHER"))
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("enrolled students");

    verify(courseRepository, never()).delete(any(Course.class));
  }

  @Test
  void deleteUserDataArchivesOwnedCoursesInsteadOfDeleting() {
    Course owned = Course.builder().id(courseId).code("CS101").titleUk("T")
        .ownerId(ownerId).status(CourseStatus.PUBLISHED).build();
    when(courseRepository.findByOwnerId(ownerId)).thenReturn(java.util.List.of(owned));

    courseService.deleteUserData(ownerId);

    assertThat(owned.getStatus()).isEqualTo(CourseStatus.ARCHIVED);
    verify(courseRepository).saveAll(java.util.List.of(owned));
    verify(courseRepository, never()).delete(any(Course.class));
    verify(courseMemberRepository).deleteByUserId(ownerId);
  }

  @Test
  void createCourseDefaultsToDraft() {
    when(courseRepository.existsByCode("CS102")).thenReturn(false);
    when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> {
      Course saved = invocation.getArgument(0);
      saved.setId(courseId);
      return saved;
    });

    var created = courseService.createCourse(
        com.university.lms.course.dto.CreateCourseRequest.builder()
            .code("CS102")
            .titleUk("Draft course")
            .build(),
        ownerId,
        "TEACHER");

    assertThat(created.getStatus()).isEqualTo(CourseStatus.DRAFT);
    verify(courseMemberRepository).save(any(CourseMember.class));
  }

  @Test
  void codeMustBeUniqueWhenChanged() {
    Course otherCourse = Course.builder()
        .id(UUID.randomUUID())
        .code("CS102")
        .titleUk("Other")
        .ownerId(UUID.randomUUID())
        .build();
    when(requestUserContext.requireUserRole()).thenReturn("TEACHER");
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, ownerId))
        .thenReturn(Optional.of(member(ownerId, CourseRole.OWNER)));
    when(courseRepository.findByCode("CS102")).thenReturn(Optional.of(otherCourse));

    assertThatThrownBy(() -> courseService.updateCourseSettings(
        courseId,
        settingsRequest("CS102", "New title"),
        ownerId,
        "TEACHER"))
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("already exists");
  }

  @Test
  void nonEnrolledStudentGetsForbiddenFromGetCourseById() {
    Course published = Course.builder().id(courseId).code("CS101").titleUk("T")
        .ownerId(ownerId).status(CourseStatus.PUBLISHED).build();
    when(requestUserContext.requireUserRole()).thenReturn("USER");
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(published));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, otherUserId))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> courseService.getCourseById(courseId, otherUserId, "USER"))
        .isInstanceOf(ApiException.class);
  }

  @Test
  void enrolledStudentCanGetPublishedCourseById() {
    Course published = Course.builder().id(courseId).code("CS101").titleUk("T")
        .ownerId(ownerId).status(CourseStatus.PUBLISHED).build();
    when(requestUserContext.requireUserRole()).thenReturn("USER");
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(published));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, otherUserId))
        .thenReturn(Optional.of(member(otherUserId, CourseRole.STUDENT)));

    var dto = courseService.getCourseById(courseId, otherUserId, "USER");

    assertThat(dto).isNotNull();
  }

  @Test
  void enrolledStudentCannotGetDraftCourseById() {
    // course in @BeforeEach is DRAFT
    when(requestUserContext.requireUserRole()).thenReturn("USER");
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, otherUserId))
        .thenReturn(Optional.of(member(otherUserId, CourseRole.STUDENT)));

    assertThatThrownBy(() -> courseService.getCourseById(courseId, otherUserId, "USER"))
        .isInstanceOf(ApiException.class);
  }

  private void assertForbiddenForRole(CourseRole role) {
    when(requestUserContext.requireUserRole()).thenReturn("TEACHER");
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, otherUserId))
        .thenReturn(Optional.of(member(otherUserId, role)));

    assertThatThrownBy(() -> courseService.updateCourseSettings(
        courseId,
        settingsRequest("CS102", "Blocked"),
        otherUserId,
        "TEACHER"))
        .isInstanceOf(ApiException.class);
  }

  private UpdateCourseSettingsRequest settingsRequest(String code, String title) {
    return UpdateCourseSettingsRequest.builder()
        .code(code)
        .titleUk(title)
        .descriptionUk("Description")
        .syllabus("Syllabus")
        .build();
  }

  private CourseMember member(UUID userId, CourseRole role) {
    return member(userId, role, CourseMemberStatus.ACTIVE);
  }

  private CourseMember member(UUID userId, CourseRole role, CourseMemberStatus status) {
    return CourseMember.builder()
        .course(course)
        .userId(userId)
        .roleInCourse(role)
        .status(status)
        .build();
  }
}
