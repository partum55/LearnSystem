package com.university.lms.course.adminops.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.domain.CourseVisibility;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.adminops.domain.SisImportRun;
import com.university.lms.course.adminops.dto.SisImportApplyResponse;
import com.university.lms.course.adminops.repository.SisAuditLogRepository;
import com.university.lms.course.adminops.repository.SisImportRunRepository;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.repository.ModuleRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class SisAdminOpsServiceTest {

  @Mock private SisImportRunRepository sisImportRunRepository;
  @Mock private SisAuditLogRepository sisAuditLogRepository;
  @Mock private CourseRepository courseRepository;
  @Mock private CourseMemberRepository courseMemberRepository;
  @Mock private ModuleRepository moduleRepository;
  @Mock private JdbcTemplate jdbcTemplate;
  @Spy private ObjectMapper objectMapper = new ObjectMapper();

  @InjectMocks private SisAdminOpsService sisAdminOpsService;

  @Test
  void applyImportShouldCreateCourseAndEnrollmentAndMarkRunApplied() {
    UUID importId = UUID.randomUUID();
    UUID actorId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    UUID createdCourseId = UUID.randomUUID();
    UUID createdEnrollmentId = UUID.randomUUID();

    SisImportRun run =
        SisImportRun.builder()
            .id(importId)
            .semesterCode("2026-Spring")
            .status("PREVIEW_READY")
            .requestedBy(actorId)
            .valid(true)
            .changeSet(
                List.of(
                    Map.of(
                        "operation",
                        "COURSE_CREATE",
                        "courseCode",
                        "CS101",
                        "title",
                        "Intro CS",
                        "semesterCode",
                        "2026-Spring",
                        "isActive",
                        true),
                    Map.of(
                        "operation",
                        "ENROLLMENT_CREATE",
                        "courseCode",
                        "CS101",
                        "userId",
                        userId.toString(),
                        "role",
                        "STUDENT",
                        "enrollmentStatus",
                        "active",
                        "source",
                        "GROUP_MAP")))
            .build();

    when(sisImportRunRepository.findById(importId)).thenReturn(Optional.of(run));
    when(courseRepository.findByCodeIn(any())).thenReturn(List.of());
    when(courseRepository.save(any(Course.class)))
        .thenAnswer(
            invocation -> {
              Course course = invocation.getArgument(0, Course.class);
              course.setId(createdCourseId);
              return course;
            });
    when(courseMemberRepository.existsByCourseIdAndUserId(createdCourseId, userId)).thenReturn(false);
    when(courseMemberRepository.save(any(CourseMember.class)))
        .thenAnswer(
            invocation -> {
              CourseMember member = invocation.getArgument(0, CourseMember.class);
              member.setId(createdEnrollmentId);
              return member;
            });
    when(sisImportRunRepository.save(any(SisImportRun.class)))
        .thenAnswer(invocation -> invocation.getArgument(0, SisImportRun.class));

    SisImportApplyResponse response = sisAdminOpsService.applyImport(importId, actorId);

    assertThat(response.getStatus()).isEqualTo("APPLIED");
    assertThat(response.getCreatedCourses()).isEqualTo(1);
    assertThat(response.getCreatedEnrollments()).isEqualTo(1);
    assertThat(response.getSkippedEnrollments()).isZero();
    assertThat(response.getRollbackExpiresAt()).isNotNull();

    assertThat(run.getStatus()).isEqualTo("APPLIED");
    assertThat(run.getAppliedAt()).isNotNull();
    assertThat(run.getRollbackExpiresAt()).isNotNull();
    assertThat(run.getApplyReport())
        .containsEntry("createdCourses", 1)
        .containsEntry("createdEnrollments", 1)
        .containsEntry("skippedEnrollments", 0);

    verify(courseRepository).save(any(Course.class));
    verify(courseMemberRepository).save(any(CourseMember.class));
    verify(sisAuditLogRepository, times(3)).save(any());
  }

  @Test
  void applyImportShouldRejectInvalidPreview() {
    UUID importId = UUID.randomUUID();
    UUID actorId = UUID.randomUUID();
    SisImportRun run =
        SisImportRun.builder()
            .id(importId)
            .semesterCode("2026-Spring")
            .status("PREVIEW_FAILED")
            .requestedBy(actorId)
            .valid(false)
            .changeSet(List.of())
            .build();

    when(sisImportRunRepository.findById(importId)).thenReturn(Optional.of(run));

    assertThatThrownBy(() -> sisAdminOpsService.applyImport(importId, actorId))
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("cannot be applied");

    verify(courseRepository, never()).save(any(Course.class));
    verify(courseMemberRepository, never()).save(any(CourseMember.class));
    verify(sisImportRunRepository, never()).save(any(SisImportRun.class));
  }

  @Test
  void rollbackImportShouldDeleteCreatedEntitiesAndMarkRunRolledBack() {
    UUID importId = UUID.randomUUID();
    UUID actorId = UUID.randomUUID();
    UUID enrollmentId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();

    SisImportRun run =
        SisImportRun.builder()
            .id(importId)
            .semesterCode("2026-Spring")
            .status("APPLIED")
            .requestedBy(actorId)
            .valid(true)
            .rollbackExpiresAt(LocalDateTime.now().plusHours(1))
            .applyReport(
                Map.of(
                    "createdEnrollmentIds",
                    List.of(enrollmentId.toString()),
                    "createdCourseIds",
                    List.of(courseId.toString())))
            .build();

    Course createdCourse =
        Course.builder()
            .id(courseId)
            .code("CS101")
            .titleUk("Intro CS")
            .titleEn("Intro CS")
            .descriptionUk("Imported")
            .descriptionEn("Imported")
            .ownerId(actorId)
            .visibility(CourseVisibility.PRIVATE)
            .status(CourseStatus.PUBLISHED)
            .isPublished(true)
            .build();

    when(sisImportRunRepository.findById(importId)).thenReturn(Optional.of(run));
    when(courseMemberRepository.existsById(enrollmentId)).thenReturn(true);
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(createdCourse));
    when(courseMemberRepository.countByCourseId(courseId)).thenReturn(0L);
    when(moduleRepository.countByCourseId(courseId)).thenReturn(0L);
    when(sisImportRunRepository.save(any(SisImportRun.class)))
        .thenAnswer(invocation -> invocation.getArgument(0, SisImportRun.class));

    SisImportApplyResponse response = sisAdminOpsService.rollbackImport(importId, actorId);

    assertThat(response.getStatus()).isEqualTo("ROLLED_BACK");
    assertThat(response.getCreatedEnrollments()).isEqualTo(1);
    assertThat(response.getCreatedCourses()).isEqualTo(1);

    assertThat(run.getStatus()).isEqualTo("ROLLED_BACK");
    assertThat(run.getRolledBackAt()).isNotNull();

    verify(courseMemberRepository).deleteById(enrollmentId);
    verify(courseRepository).delete(createdCourse);
    verify(sisAuditLogRepository).save(any());
  }

  @Test
  void rollbackImportShouldRejectExpiredRollbackWindow() {
    UUID importId = UUID.randomUUID();
    UUID actorId = UUID.randomUUID();

    SisImportRun run =
        SisImportRun.builder()
            .id(importId)
            .semesterCode("2026-Spring")
            .status("APPLIED")
            .requestedBy(actorId)
            .valid(true)
            .rollbackExpiresAt(LocalDateTime.now().minusMinutes(1))
            .applyReport(Map.of())
            .build();

    when(sisImportRunRepository.findById(importId)).thenReturn(Optional.of(run));

    assertThatThrownBy(() -> sisAdminOpsService.rollbackImport(importId, actorId))
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("Rollback window expired");

    verify(courseMemberRepository, never()).deleteById(any(UUID.class));
    verify(courseRepository, never()).delete(any(Course.class));
    verify(sisImportRunRepository, never()).save(any(SisImportRun.class));
  }
}
