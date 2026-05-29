package com.university.lms.course.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.course.common.error.ApiException;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.CourseMemberStatus;
import com.university.lms.course.domain.CourseRole;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.web.RequestUserContext;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CourseAccessServiceTest {

  @Mock private CourseMemberRepository courseMemberRepository;
  @Mock private CourseRepository courseRepository;
  @Mock private RequestUserContext requestUserContext;

  @InjectMocks private CourseAccessService courseAccessService;

  @Test
  void adminCourseAccessUsesExplicitOverrideContext() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    when(requestUserContext.requireUserRole()).thenReturn("ADMIN");
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, userId)).thenReturn(Optional.empty());
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(courseId, CourseStatus.DRAFT)));

    CourseAccessContext context = courseAccessService.requireCourseAccess(courseId, userId);

    assertThat(context.userId()).isEqualTo(userId);
    assertThat(context.globalRole()).isEqualTo("ADMIN");
    assertThat(context.courseRole()).isNull();
    assertThat(context.adminOverride()).isTrue();
    assertThat(context.actionMode()).isEqualTo("ADMIN_OVERRIDE");

    verify(courseMemberRepository).findByCourseIdAndUserId(courseId, userId);
  }

  @Test
  void normalUserRequiresActiveMemberSuccess() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    CourseMember mockMember = member(userId, CourseRole.STUDENT);

    when(courseMemberRepository.findByCourseIdAndUserId(courseId, userId))
        .thenReturn(Optional.of(mockMember));

    CourseMember member = courseAccessService.requireActiveMember(courseId, userId);

    assertThat(member).isNotNull();
    assertThat(member.getUserId()).isEqualTo(userId);
    assertThat(member.getRoleInCourse()).isEqualTo(CourseRole.STUDENT);
  }

  @Test
  void normalUserRequiresActiveMemberNotFound() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    when(courseMemberRepository.findByCourseIdAndUserId(courseId, userId))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> courseAccessService.requireActiveMember(courseId, userId))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("You are not enrolled in this course");
  }

  @Test
  void studentCannotAccessDraftCourse() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    when(courseMemberRepository.findByCourseIdAndUserId(courseId, userId))
        .thenReturn(Optional.of(member(userId, CourseRole.STUDENT)));
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(courseId, CourseStatus.DRAFT)));
    when(requestUserContext.requireUserRole()).thenReturn("USER");

    assertThatThrownBy(() -> courseAccessService.requireCourseAccess(courseId, userId))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("not available");
  }

  @Test
  void studentCanAccessArchivedCourseButCannotMutate() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    when(courseMemberRepository.findByCourseIdAndUserId(courseId, userId))
        .thenReturn(Optional.of(member(userId, CourseRole.STUDENT)));
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(courseId, CourseStatus.ARCHIVED)));
    when(requestUserContext.requireUserRole()).thenReturn("USER");

    CourseAccessContext context = courseAccessService.requireCourseAccess(courseId, userId);
    assertThat(context.courseRole()).isEqualTo(CourseRole.STUDENT);

    assertThatThrownBy(() -> courseAccessService.requireStudentMutation(courseId, userId))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("read-only");
  }

  @Test
  void adminWithoutStudentEnrollmentThrowsRequireStudent() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    when(courseMemberRepository.findByCourseIdAndUserId(courseId, userId))
        .thenReturn(Optional.of(member(userId, CourseRole.TEACHER)));

    assertThatThrownBy(() -> courseAccessService.requireStudent(courseId, userId))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("Student course membership is required");
  }

  @Test
  void adminBypassesRequireTeacher() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    when(requestUserContext.requireUserRole()).thenReturn("ADMIN");

    courseAccessService.requireTeacher(courseId, userId);

    verify(courseMemberRepository, never()).findByCourseIdAndUserId(courseId, userId);
  }

  @Test
  void adminCanTeach() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    when(requestUserContext.requireUserRole()).thenReturn("ADMIN");

    boolean canTeach = courseAccessService.canTeach(courseId, userId);

    assertThat(canTeach).isTrue();
    verify(courseMemberRepository, never()).findByCourseIdAndUserId(courseId, userId);
  }

  @Test
  void globalTeacherWithoutMembershipCannotTeachCourse() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    when(requestUserContext.requireUserRole()).thenReturn("TEACHER");
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, userId))
        .thenReturn(Optional.empty());

    assertThat(courseAccessService.canTeach(courseId, userId)).isFalse();
  }

  @Test
  void teacherAndTaCannotMutateArchivedCourse() {
    UUID courseId = UUID.randomUUID();
    UUID teacherId = UUID.randomUUID();
    UUID taId = UUID.randomUUID();

    when(requestUserContext.requireUserRole()).thenReturn("TEACHER");
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(courseId, CourseStatus.ARCHIVED)));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, teacherId))
        .thenReturn(Optional.of(member(teacherId, CourseRole.TEACHER)));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, taId))
        .thenReturn(Optional.of(member(taId, CourseRole.TA)));

    assertThatThrownBy(() -> courseAccessService.requireTeacherMutation(courseId, teacherId))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("read-only");
    assertThatThrownBy(() -> courseAccessService.requireTeacherMutation(courseId, taId))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("read-only");
  }

  @Test
  void ownerCanMutateArchivedCourse() {
    UUID courseId = UUID.randomUUID();
    UUID ownerId = UUID.randomUUID();

    when(requestUserContext.requireUserRole()).thenReturn("TEACHER");
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, ownerId))
        .thenReturn(Optional.of(member(ownerId, CourseRole.OWNER)));
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(courseId, CourseStatus.ARCHIVED)));

    courseAccessService.requireTeacherMutation(courseId, ownerId);
  }

  @Test
  void adminCanMutateArchivedCourseWithoutMembership() {
    UUID courseId = UUID.randomUUID();
    UUID adminId = UUID.randomUUID();

    when(requestUserContext.requireUserRole()).thenReturn("ADMIN");

    courseAccessService.requireTeacherMutation(courseId, adminId);

    verify(courseMemberRepository, never()).findByCourseIdAndUserId(courseId, adminId);
  }

  @Test
  void ownerCanManageMembers() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    when(requestUserContext.requireUserId()).thenReturn(userId);
    when(requestUserContext.requireUserRole()).thenReturn("TEACHER");
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, userId))
        .thenReturn(Optional.of(member(userId, CourseRole.OWNER)));
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(courseId, CourseStatus.PUBLISHED)));

    courseAccessService.requireCanEnroll(courseId, UUID.randomUUID(), CourseRole.STUDENT);
  }

  private static CourseMember member(UUID userId, CourseRole role) {
    return CourseMember.builder()
        .userId(userId)
        .roleInCourse(role)
        .status(CourseMemberStatus.ACTIVE)
        .build();
  }

  private static Course course(UUID courseId, CourseStatus status) {
    return Course.builder()
        .id(courseId)
        .status(status)
        .build();
  }
}
