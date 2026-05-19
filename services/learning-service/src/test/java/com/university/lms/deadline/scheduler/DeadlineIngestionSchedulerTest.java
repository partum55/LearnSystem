package com.university.lms.deadline.scheduler;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.course.domain.Course;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.deadline.deadline.service.DeadlineIngestionService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class DeadlineIngestionSchedulerTest {

  @Mock private DeadlineIngestionService ingestionService;
  @Mock private CourseRepository courseRepository;

  @InjectMocks private DeadlineIngestionScheduler scheduler;

  @Test
  void ingestDeadlinesShouldProcessAllActiveCoursesAcrossPages() {
    UUID firstCourseId = UUID.randomUUID();
    UUID secondCourseId = UUID.randomUUID();
    UUID thirdCourseId = UUID.randomUUID();

    Page<Course> firstPage =
        new PageImpl<>(
            List.of(courseWithId(firstCourseId), courseWithId(secondCourseId)),
            PageRequest.of(0, 2),
            3);
    Page<Course> secondPage =
        new PageImpl<>(
            List.of(courseWithId(thirdCourseId)),
            PageRequest.of(1, 2),
            3);

    when(courseRepository.findActiveCourses(eq(CourseStatus.PUBLISHED), any(Pageable.class)))
        .thenReturn(firstPage, secondPage);

    scheduler.ingestDeadlines();

    verify(ingestionService).ingestFromCourse(firstCourseId);
    verify(ingestionService).ingestFromCourse(secondCourseId);
    verify(ingestionService).ingestFromCourse(thirdCourseId);
    verify(courseRepository, times(2))
        .findActiveCourses(eq(CourseStatus.PUBLISHED), any(Pageable.class));
  }

  @Test
  void ingestDeadlinesShouldSkipWhenNoActiveCourses() {
    when(courseRepository.findActiveCourses(eq(CourseStatus.PUBLISHED), any(Pageable.class)))
        .thenReturn(Page.<Course>empty(PageRequest.of(0, DeadlineIngestionScheduler.COURSE_PAGE_SIZE)));

    scheduler.ingestDeadlines();

    verifyNoInteractions(ingestionService);
  }

  private static Course courseWithId(UUID courseId) {
    return Course.builder().id(courseId).build();
  }
}
