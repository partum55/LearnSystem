package com.university.lms.gradebook.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.university.lms.course.adminops.service.AdminAuditTrailService;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.gradebook.domain.GradeStatus;
import com.university.lms.gradebook.domain.GradebookEntry;
import com.university.lms.gradebook.dto.UpdateGradeRequest;
import com.university.lms.gradebook.repository.GradebookEntryRepository;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GradebookEntryServiceTest {

  @Mock private GradebookEntryRepository entryRepository;
  @Mock private GradebookSummaryService summaryService;
  @Mock private GradeHistoryService historyService;
  @Mock private AssignmentRepository assignmentRepository;
  @Mock private CourseMemberRepository courseMemberRepository;
  @Mock private AdminAuditTrailService adminAuditTrailService;

  @InjectMocks private GradebookEntryService service;

  @Test
  void updateEntryShouldApplyScoreStatusExcusedAndNotes() {
    UUID entryId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();

    GradebookEntry entry =
        GradebookEntry.builder()
            .id(entryId)
            .courseId(courseId)
            .studentId(studentId)
            .maxScore(new BigDecimal("100"))
            .status(GradeStatus.NOT_SUBMITTED)
            .build();

    when(entryRepository.findById(entryId)).thenReturn(Optional.of(entry));
    when(courseMemberRepository.canUserManageCourse(courseId, userId)).thenReturn(true);
    when(entryRepository.save(any(GradebookEntry.class)))
        .thenAnswer(invocation -> invocation.getArgument(0, GradebookEntry.class));

    UpdateGradeRequest request =
        UpdateGradeRequest.builder()
            .overrideScore(new BigDecimal("91.5"))
            .overrideReason("Manual seminar assessment")
            .status(GradeStatus.GRADED)
            .isExcused(false)
            .notes("Great class participation")
            .build();

    GradebookEntry updated = service.updateEntry(entryId, request, userId);

    assertThat(updated.getOverrideScore()).isEqualByComparingTo("91.5");
    assertThat(updated.getStatus()).isEqualTo(GradeStatus.GRADED);
    assertThat(updated.isExcused()).isFalse();
    assertThat(updated.getNotes()).isEqualTo("Great class participation");
    assertThat(updated.getPercentage()).isEqualByComparingTo("91.50");
    assertThat(updated.getGradedAt()).isNotNull();

    verify(summaryService).recalculateCourseGrade(courseId, studentId);
    verify(historyService).recordChange(any(), any(), any(), eq(userId), eq("Manual seminar assessment"));
    verify(adminAuditTrailService).log(eq(userId), eq("GRADE_UPDATED"), eq("GRADEBOOK_ENTRY"), eq(entryId.toString()), any());
  }

  @Test
  void updateEntryShouldSetExcusedStatusWhenExcusedFlagEnabled() {
    UUID entryId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();

    GradebookEntry entry =
        GradebookEntry.builder()
            .id(entryId)
            .courseId(courseId)
            .studentId(UUID.randomUUID())
            .maxScore(new BigDecimal("100"))
            .status(GradeStatus.NOT_SUBMITTED)
            .build();

    when(entryRepository.findById(entryId)).thenReturn(Optional.of(entry));
    when(courseMemberRepository.canUserManageCourse(courseId, userId)).thenReturn(true);
    when(entryRepository.save(any(GradebookEntry.class)))
        .thenAnswer(invocation -> invocation.getArgument(0, GradebookEntry.class));

    UpdateGradeRequest request = UpdateGradeRequest.builder().isExcused(true).build();

    GradebookEntry updated = service.updateEntry(entryId, request, userId);

    assertThat(updated.isExcused()).isTrue();
    assertThat(updated.getStatus()).isEqualTo(GradeStatus.EXCUSED);
  }
}
