package com.university.lms.course.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.Module;
import com.university.lms.course.dto.CoursePublishChecklistDto;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.repository.ModuleRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CoursePublishChecklistServiceTest {

  @Mock private CourseRepository courseRepository;
  @Mock private CourseMemberRepository courseMemberRepository;
  @Mock private ModuleRepository moduleRepository;
  @Mock private AssignmentRepository assignmentRepository;

  private CoursePublishChecklistService service;

  @BeforeEach
  void setUp() {
    service =
        new CoursePublishChecklistService(
            courseRepository, courseMemberRepository, moduleRepository, assignmentRepository);
  }

  @Test
  void evaluateReturnsReadyWhenRequiredChecksPass() {
    UUID courseId = UUID.randomUUID();
    UUID ownerId = UUID.randomUUID();
    Course course = Course.builder().id(courseId).ownerId(ownerId).syllabus("Syllabus text").build();

    Module module = Module.builder().id(UUID.randomUUID()).course(course).title("Intro").build();
    Assignment assignment =
        Assignment.builder()
            .id(UUID.randomUUID())
            .courseId(courseId)
            .assignmentType("TEXT")
            .title("Essay")
            .description("Write essay")
            .isPublished(true)
            .dueDate(LocalDateTime.now().plusDays(7))
            .createdBy(ownerId)
            .build();

    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(moduleRepository.findByCourseIdOrderByPositionAsc(courseId)).thenReturn(List.of(module));
    when(assignmentRepository.findByCourseId(courseId)).thenReturn(List.of(assignment));

    CoursePublishChecklistDto checklist = service.evaluate(courseId, ownerId, "TEACHER");

    assertTrue(checklist.isReadyToPublish());
  }

  @Test
  void evaluateReturnsNotReadyWhenChecklistHasFailures() {
    UUID courseId = UUID.randomUUID();
    UUID ownerId = UUID.randomUUID();
    Course course = Course.builder().id(courseId).ownerId(ownerId).syllabus(" ").build();

    Assignment assignment =
        Assignment.builder()
            .id(UUID.randomUUID())
            .courseId(courseId)
            .assignmentType("TEXT")
            .title("Essay")
            .description("Write essay")
            .isPublished(true)
            .createdBy(ownerId)
            .build();

    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(moduleRepository.findByCourseIdOrderByPositionAsc(courseId)).thenReturn(List.of());
    when(assignmentRepository.findByCourseId(courseId)).thenReturn(List.of(assignment));

    CoursePublishChecklistDto checklist = service.evaluate(courseId, ownerId, "TEACHER");

    assertFalse(checklist.isReadyToPublish());
  }

  @Test
  void evaluateThrowsWhenUserCannotManageCourse() {
    UUID courseId = UUID.randomUUID();
    UUID ownerId = UUID.randomUUID();
    UUID strangerId = UUID.randomUUID();
    Course course = Course.builder().id(courseId).ownerId(ownerId).syllabus("Syllabus").build();

    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMemberRepository.canUserManageCourse(courseId, strangerId)).thenReturn(false);

    assertThrows(ValidationException.class, () -> service.evaluate(courseId, strangerId, "TEACHER"));
  }
}
