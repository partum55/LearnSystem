package com.university.lms.gradebook.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.gradebook.domain.CourseGradeSummary;
import com.university.lms.gradebook.repository.CourseGradeSummaryRepository;
import com.university.lms.gradebook.repository.GradebookEntryRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GradebookSummaryServiceTest {

  @Mock private CourseGradeSummaryRepository summaryRepository;
  @Mock private GradebookEntryRepository entryRepository;
  @Mock private CourseMemberRepository courseMemberRepository;

  @InjectMocks private GradebookSummaryService summaryService;

  @Test
  void recalculateCourseGradesShouldProcessOnlyActiveStudents() {
    UUID courseId = UUID.randomUUID();
    UUID activeStudentOne = UUID.randomUUID();
    UUID droppedStudent = UUID.randomUUID();
    UUID activeStudentTwo = UUID.randomUUID();

    when(courseMemberRepository.findByCourseIdAndRoleInCourse(courseId, "STUDENT"))
        .thenReturn(
            List.of(
                studentMember(activeStudentOne, "active"),
                studentMember(droppedStudent, "dropped"),
                studentMember(activeStudentTwo, "active")));
    when(summaryRepository.findByCourseIdAndStudentId(eq(courseId), any(UUID.class)))
        .thenReturn(Optional.empty());
    when(entryRepository.findByCourseIdAndStudentId(eq(courseId), any(UUID.class)))
        .thenReturn(List.of());

    int recalculated = summaryService.recalculateCourseGrades(courseId);

    assertThat(recalculated).isEqualTo(2);
    verify(entryRepository).findByCourseIdAndStudentId(courseId, activeStudentOne);
    verify(entryRepository).findByCourseIdAndStudentId(courseId, activeStudentTwo);
    verify(entryRepository, never()).findByCourseIdAndStudentId(courseId, droppedStudent);
    verify(summaryRepository, times(2)).save(any(CourseGradeSummary.class));
  }

  @Test
  void recalculateCourseGradesShouldReturnZeroWhenNoActiveStudents() {
    UUID courseId = UUID.randomUUID();

    when(courseMemberRepository.findByCourseIdAndRoleInCourse(courseId, "STUDENT"))
        .thenReturn(List.of(studentMember(UUID.randomUUID(), "completed")));

    int recalculated = summaryService.recalculateCourseGrades(courseId);

    assertThat(recalculated).isZero();
    verifyNoInteractions(entryRepository);
    verifyNoInteractions(summaryRepository);
  }

  private static CourseMember studentMember(UUID userId, String enrollmentStatus) {
    return CourseMember.builder()
        .userId(userId)
        .roleInCourse("STUDENT")
        .enrollmentStatus(enrollmentStatus)
        .build();
  }
}
