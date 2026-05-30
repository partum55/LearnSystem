package com.university.lms.course.courses.service;

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
import com.university.lms.course.gradebook.service.UserProfileClient;
import com.university.lms.course.gradebook.service.UserProfileClient.UserProfile;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.service.CourseMapper;
import com.university.lms.course.web.RequestUserContext;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Unit tests for {@link CourseOwnerService}. Authorization is exercised through a real
 * {@link CourseAccessService} backed by a mocked {@link RequestUserContext}; cross-service user
 * eligibility is mocked via {@link UserProfileClient}. The tests assert the non-destructive
 * contract: no course/member deletes, status preserved, exactly one active OWNER.
 */
@ExtendWith(MockitoExtension.class)
class CourseOwnerServiceTest {

  @Mock private CourseRepository courseRepository;
  @Mock private CourseMemberRepository courseMemberRepository;
  @Mock private RequestUserContext requestUserContext;
  @Mock private UserProfileClient userProfileClient;

  private CourseOwnerService service;
  private UUID courseId;
  private UUID oldOwnerId;
  private UUID newOwnerId;
  private UUID adminId;
  private Course course;

  @BeforeEach
  void setUp() {
    CourseAccessService accessService =
        new CourseAccessService(courseMemberRepository, courseRepository, requestUserContext);
    service =
        new CourseOwnerService(
            courseRepository,
            courseMemberRepository,
            accessService,
            userProfileClient,
            requestUserContext,
            new CourseMapper());
    courseId = UUID.randomUUID();
    oldOwnerId = UUID.randomUUID();
    newOwnerId = UUID.randomUUID();
    adminId = UUID.randomUUID();
    // Orphaned/archived course is the common reassignment case.
    course =
        Course.builder()
            .id(courseId)
            .code("CS101")
            .titleUk("Course")
            .ownerId(oldOwnerId)
            .status(CourseStatus.ARCHIVED)
            .build();
  }

  private UserProfile profile(String role) {
    return new UserProfile(newOwnerId, "New Owner", "owner@example.com", null, role);
  }

  private CourseMember member(UUID userId, CourseRole role, CourseMemberStatus status) {
    return CourseMember.builder()
        .id(UUID.randomUUID())
        .course(course)
        .userId(userId)
        .roleInCourse(role)
        .status(status)
        .build();
  }

  @Test
  void adminReassignsToExistingMemberPromotesAndDemotes() {
    when(requestUserContext.requireUserRole()).thenReturn("ADMIN");
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(userProfileClient.findProfile(newOwnerId)).thenReturn(Optional.of(profile("TEACHER")));
    CourseMember staleOwner = member(oldOwnerId, CourseRole.OWNER, CourseMemberStatus.ACTIVE);
    CourseMember existingNewOwner = member(newOwnerId, CourseRole.TEACHER, CourseMemberStatus.ACTIVE);
    when(courseMemberRepository.findByCourseIdAndRoleInCourse(courseId, CourseRole.OWNER))
        .thenReturn(List.of(staleOwner));
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, newOwnerId))
        .thenReturn(Optional.of(existingNewOwner));
    when(courseMemberRepository.save(any(CourseMember.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(courseRepository.save(any(Course.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    var dto = service.reassignOwner(courseId, newOwnerId);

    assertThat(dto.getOwnerId()).isEqualTo(newOwnerId);
    // Course status must be preserved (no auto-publish of an archived course).
    assertThat(course.getStatus()).isEqualTo(CourseStatus.ARCHIVED);
    // Exactly one active OWNER: new owner promoted, prior owner demoted to TEACHER (still active).
    assertThat(existingNewOwner.getRoleInCourse()).isEqualTo(CourseRole.OWNER);
    assertThat(existingNewOwner.getStatus()).isEqualTo(CourseMemberStatus.ACTIVE);
    assertThat(staleOwner.getRoleInCourse()).isEqualTo(CourseRole.TEACHER);
    assertThat(staleOwner.isActive()).isTrue();
    // Non-destructive: nothing is deleted.
    verify(courseRepository, never()).delete(any(Course.class));
    verify(courseMemberRepository, never()).delete(any(CourseMember.class));
    verify(courseMemberRepository, never()).deleteByCourseIdAndUserId(any(), any());
  }

  @Test
  void adminReassignsToBrandNewUserCreatesActiveOwnerMembership() {
    when(requestUserContext.requireUserRole()).thenReturn("ADMIN");
    when(requestUserContext.requireUserId()).thenReturn(adminId);
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(userProfileClient.findProfile(newOwnerId)).thenReturn(Optional.of(profile("TEACHER")));
    // Orphaned course: no current OWNER membership at all.
    when(courseMemberRepository.findByCourseIdAndRoleInCourse(courseId, CourseRole.OWNER))
        .thenReturn(List.of());
    when(courseMemberRepository.findByCourseIdAndUserId(courseId, newOwnerId))
        .thenReturn(Optional.empty());
    when(courseMemberRepository.save(any(CourseMember.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(courseRepository.save(any(Course.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    var dto = service.reassignOwner(courseId, newOwnerId);

    assertThat(dto.getOwnerId()).isEqualTo(newOwnerId);
    org.mockito.ArgumentCaptor<CourseMember> captor =
        org.mockito.ArgumentCaptor.forClass(CourseMember.class);
    verify(courseMemberRepository).save(captor.capture());
    CourseMember created = captor.getValue();
    assertThat(created.getUserId()).isEqualTo(newOwnerId);
    assertThat(created.getRoleInCourse()).isEqualTo(CourseRole.OWNER);
    assertThat(created.getStatus()).isEqualTo(CourseMemberStatus.ACTIVE);
    assertThat(created.getAddedBy()).isEqualTo(adminId);
    verify(courseRepository, never()).delete(any(Course.class));
  }

  @Test
  void nonAdminIsRejected() {
    when(requestUserContext.requireUserRole()).thenReturn("TEACHER");

    assertThatThrownBy(() -> service.reassignOwner(courseId, newOwnerId))
        .isInstanceOf(ApiException.class);

    verify(courseRepository, never()).save(any(Course.class));
    verify(courseMemberRepository, never()).save(any(CourseMember.class));
  }

  @Test
  void missingCourseIsNotFound() {
    when(requestUserContext.requireUserRole()).thenReturn("ADMIN");
    when(courseRepository.findById(courseId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.reassignOwner(courseId, newOwnerId))
        .isInstanceOf(ApiException.class);
  }

  @Test
  void nonExistentNewOwnerIsRejected() {
    when(requestUserContext.requireUserRole()).thenReturn("ADMIN");
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(userProfileClient.findProfile(newOwnerId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.reassignOwner(courseId, newOwnerId))
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("does not exist");

    verify(courseRepository, never()).save(any(Course.class));
  }

  @Test
  void ineligibleNewOwnerRoleIsRejected() {
    when(requestUserContext.requireUserRole()).thenReturn("ADMIN");
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(userProfileClient.findProfile(newOwnerId)).thenReturn(Optional.of(profile("STUDENT")));

    assertThatThrownBy(() -> service.reassignOwner(courseId, newOwnerId))
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("TEACHER or ADMIN");

    verify(courseRepository, never()).save(any(Course.class));
    verify(courseMemberRepository, never()).save(any(CourseMember.class));
  }
}
