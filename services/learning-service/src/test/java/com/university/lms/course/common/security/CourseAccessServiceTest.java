package com.university.lms.course.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import com.university.lms.course.common.error.ApiException;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.CourseMemberStatus;
import com.university.lms.course.domain.CourseRole;
import com.university.lms.course.repository.CourseMemberRepository;
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
  @Mock private RequestUserContext requestUserContext;

  @InjectMocks private CourseAccessService courseAccessService;

  @Test
  void adminCourseAccessUsesExplicitOverrideContext() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    when(requestUserContext.requireUserRole()).thenReturn("ADMIN");
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, userId)).thenReturn(Optional.empty());

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
    CourseMember mockMember = CourseMember.builder()
        .userId(userId)
        .roleInCourse(CourseRole.STUDENT)
        .status(CourseMemberStatus.ACTIVE)
        .build();

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
  void adminWithoutStudentEnrollmentThrowsRequireStudent() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    CourseMember mockMember = CourseMember.builder()
        .userId(userId)
        .roleInCourse(CourseRole.TEACHER)
        .status(CourseMemberStatus.ACTIVE)
        .build();

    when(courseMemberRepository.findByCourseIdAndUserId(courseId, userId))
        .thenReturn(Optional.of(mockMember));

    assertThatThrownBy(() -> courseAccessService.requireStudent(courseId, userId))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("Student course membership is required");
  }

  @Test
  void adminBypassesRequireTeacher() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    when(requestUserContext.requireUserRole()).thenReturn("ADMIN");

    // Should not throw any exception
    courseAccessService.requireTeacher(courseId, userId);

    verify(courseMemberRepository, never()).findByCourseIdAndUserId(any(), any());
  }

  @Test
  void adminCanTeach() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    when(requestUserContext.requireUserRole()).thenReturn("ADMIN");

    boolean canTeach = courseAccessService.canTeach(courseId, userId);

    assertThat(canTeach).isTrue();
    verify(courseMemberRepository, never()).findByCourseIdAndUserId(any(), any());
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
  void ownerCanManageMembers() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    CourseMember owner = CourseMember.builder()
        .userId(userId)
        .roleInCourse(CourseRole.OWNER)
        .status(CourseMemberStatus.ACTIVE)
        .build();

    when(requestUserContext.requireUserId()).thenReturn(userId);
    when(requestUserContext.requireUserRole()).thenReturn("TEACHER");
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, userId))
        .thenReturn(Optional.of(owner));

    courseAccessService.requireCanEnroll(courseId, UUID.randomUUID(), CourseRole.STUDENT);
  }
}
