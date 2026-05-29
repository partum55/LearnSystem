package com.university.lms.course.courses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.assignments.service.CanonicalAssignmentMapper;
import com.university.lms.course.common.error.ApiException;
import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.domain.Course;
import com.university.lms.course.dto.CourseDto;
import com.university.lms.course.materials.service.LearningContentService;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.repository.ModuleRepository;
import com.university.lms.course.service.CourseMapper;
import com.university.lms.gradebook.repository.GradebookEntryRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CanonicalCourseServiceTest {

  @Mock private CourseRepository courseRepository;
  @Mock private CourseMemberRepository courseMemberRepository;
  @Mock private ModuleRepository moduleRepository;
  @Mock private AssignmentRepository assignmentRepository;
  @Mock private GradebookEntryRepository gradebookEntryRepository;
  @Mock private LearningContentService learningContentService;
  @Mock private CanonicalAssignmentMapper assignmentMapper;
  @Mock private CourseAccessService accessService;
  @Mock private CourseMapper courseMapper;

  @InjectMocks private CanonicalCourseService service;

  @Test
  void getCourse_delegatesAccessCheckAndReturnsDto() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    Course course = Course.builder().id(courseId).status(CourseStatus.PUBLISHED).build();
    CourseDto expected = new CourseDto();

    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    when(courseMapper.toDto(course)).thenReturn(expected);

    CourseDto result = service.getCourse(courseId, userId);

    assertThat(result).isEqualTo(expected);
    verify(accessService).requireCourseAccess(courseId, userId);
  }

  @Test
  void getCourse_propagatesForbiddenWhenAccessDenied() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    doThrow(ApiException.forbidden("not enrolled"))
        .when(accessService).requireCourseAccess(courseId, userId);

    assertThatThrownBy(() -> service.getCourse(courseId, userId))
        .isInstanceOf(ApiException.class);
    verify(courseRepository, never()).findById(any());
  }

  @Test
  void getCourse_throwsNotFoundWhenCourseAbsent() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    when(courseRepository.findById(courseId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.getCourse(courseId, userId))
        .isInstanceOf(ApiException.class);
  }
}
