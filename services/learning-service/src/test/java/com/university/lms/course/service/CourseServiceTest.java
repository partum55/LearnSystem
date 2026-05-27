package com.university.lms.course.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.domain.CourseVisibility;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.CourseMemberStatus;
import com.university.lms.course.domain.CourseRole;
import com.university.lms.course.dto.CourseSettingsDto;
import com.university.lms.course.dto.UpdateCourseSettingsRequest;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

@ExtendWith(MockitoExtension.class)
class CourseServiceTest {

  @Mock private CourseRepository courseRepository;
  @Mock private CourseMemberRepository courseMemberRepository;

  private CourseService courseService;
  private UUID courseId;
  private UUID ownerId;
  private UUID otherUserId;
  private Course course;

  @BeforeEach
  void setUp() {
    courseService = new CourseService(courseRepository, courseMemberRepository, new CourseMapper());
    courseId = UUID.randomUUID();
    ownerId = UUID.randomUUID();
    otherUserId = UUID.randomUUID();
    course = Course.builder()
        .id(courseId)
        .code("CS101")
        .titleUk("Old title")
        .ownerId(ownerId)
        .status(CourseStatus.DRAFT)
        .visibility(CourseVisibility.PRIVATE)
        .build();
  }

  @Test
  void adminCanUpdateAnyCourseSettings() {
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
    assertThat(settings.getStatus()).isEqualTo(CourseStatus.PUBLISHED);
  }

  @Test
  void ownerCanUpdateOwnCourseSettings() {
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
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, otherUserId))
        .thenReturn(Optional.of(member(otherUserId, CourseRole.OWNER, CourseMemberStatus.DROPPED)));

    assertThatThrownBy(() -> courseService.getCourseSettings(courseId, otherUserId, "TEACHER"))
        .isInstanceOf(AccessDeniedException.class);
  }

  @Test
  void archiveRequiresOwnerOrAdmin() {
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, otherUserId))
        .thenReturn(Optional.of(member(otherUserId, CourseRole.TEACHER)));

    assertThatThrownBy(() -> courseService.archiveCourse(courseId, otherUserId, "TEACHER"))
        .isInstanceOf(AccessDeniedException.class);

    verify(courseRepository, never()).save(any(Course.class));
  }

  @Test
  void deleteSoftArchivesForOwner() {
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, ownerId))
        .thenReturn(Optional.of(member(ownerId, CourseRole.OWNER)));
    when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> invocation.getArgument(0));

    courseService.deleteCourse(courseId, ownerId, "TEACHER");

    assertThat(course.getStatus()).isEqualTo(CourseStatus.ARCHIVED);
    verify(courseRepository, never()).delete(any(Course.class));
  }

  @Test
  void codeMustBeUniqueWhenChanged() {
    Course otherCourse = Course.builder()
        .id(UUID.randomUUID())
        .code("CS102")
        .titleUk("Other")
        .ownerId(UUID.randomUUID())
        .build();
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

  private void assertForbiddenForRole(CourseRole role) {
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, otherUserId))
        .thenReturn(Optional.of(member(otherUserId, role)));

    assertThatThrownBy(() -> courseService.updateCourseSettings(
        courseId,
        settingsRequest("CS102", "Blocked"),
        otherUserId,
        "TEACHER"))
        .isInstanceOf(AccessDeniedException.class);
  }

  private UpdateCourseSettingsRequest settingsRequest(String code, String title) {
    return UpdateCourseSettingsRequest.builder()
        .code(code)
        .titleUk(title)
        .descriptionUk("Description")
        .syllabus("Syllabus")
        .visibility(CourseVisibility.PUBLIC)
        .status(CourseStatus.PUBLISHED)
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
