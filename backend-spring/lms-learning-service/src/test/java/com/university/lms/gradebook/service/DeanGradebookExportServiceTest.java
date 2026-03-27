package com.university.lms.gradebook.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.university.lms.course.adminops.service.AdminAuditTrailService;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.domain.Course;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.gradebook.domain.GradebookEntry;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;

@ExtendWith(MockitoExtension.class)
class DeanGradebookExportServiceTest {

  @Mock private CourseRepository courseRepository;
  @Mock private AssignmentRepository assignmentRepository;
  @Mock private GradebookEntryService gradebookEntryService;
  @Mock private JdbcTemplate jdbcTemplate;
  @Mock private AdminAuditTrailService adminAuditTrailService;
  @Mock private CourseMemberRepository courseMemberRepository;

  @InjectMocks private DeanGradebookExportService service;

  @Test
  void export_nonMember_throwsAccessDenied() {
    UUID courseId = UUID.randomUUID();
    UUID actorId = UUID.randomUUID();

    Course course = Course.builder().id(courseId).code("CS101").build();
    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMemberRepository.canUserManageCourse(courseId, actorId)).thenReturn(false);

    assertThatThrownBy(() -> service.export(courseId, "2024-1", null, actorId, "TEACHER"))
        .isInstanceOf(AccessDeniedException.class);
  }

  @Test
  void export_courseMember_succeeds() {
    UUID courseId = UUID.randomUUID();
    UUID actorId = UUID.randomUUID();

    Course course = Course.builder().id(courseId).code("CS101").titleEn("Intro CS").build();
    Assignment assignment = Assignment.builder()
        .id(UUID.randomUUID())
        .courseId(courseId)
        .title("HW1")
        .maxPoints(new BigDecimal("100"))
        .build();

    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMemberRepository.canUserManageCourse(courseId, actorId)).thenReturn(true);
    when(assignmentRepository.findByCourseIdOrderByDueDateAsc(courseId)).thenReturn(List.of(assignment));
    when(gradebookEntryService.getEntriesForCourse(courseId, actorId)).thenReturn(List.of());

    DeanGradebookExportService.DeanGradebookFile result =
        service.export(courseId, "2024-1", null, actorId, "TEACHER");

    assertThat(result.filename()).contains("cs101");
    assertThat(result.content()).isNotEmpty();
  }

  @Test
  void export_superadmin_bypassesCheck() {
    UUID courseId = UUID.randomUUID();
    UUID actorId = UUID.randomUUID();

    Course course = Course.builder().id(courseId).code("CS101").titleEn("Intro CS").build();
    Assignment assignment = Assignment.builder()
        .id(UUID.randomUUID())
        .courseId(courseId)
        .title("HW1")
        .maxPoints(new BigDecimal("100"))
        .build();

    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(assignmentRepository.findByCourseIdOrderByDueDateAsc(courseId)).thenReturn(List.of(assignment));
    when(gradebookEntryService.getEntriesForCourse(courseId, actorId)).thenReturn(List.of());

    DeanGradebookExportService.DeanGradebookFile result =
        service.export(courseId, "2024-1", null, actorId, "SUPERADMIN");

    assertThat(result.filename()).contains("cs101");
  }
}
