package com.university.lms.gradebook.service;

import com.university.lms.gradebook.domain.GradeStatus;
import com.university.lms.gradebook.domain.GradebookEntry;
import com.university.lms.gradebook.repository.GradebookEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GradebookEntryServiceTest {

    @Mock
    private GradebookEntryRepository entryRepository;

    @Mock
    private GradebookSummaryService summaryService;

    @Mock
    private GradeHistoryService historyService;

    @InjectMocks
    private GradebookEntryService entryService;

    private UUID courseId;
    private UUID studentId;
    private UUID entryId;
    private GradebookEntry mockEntry;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        studentId = UUID.randomUUID();
        entryId = UUID.randomUUID();

        mockEntry = GradebookEntry.builder()
                .id(entryId)
                .courseId(courseId)
                .studentId(studentId)
                .assignmentId(UUID.randomUUID())
                .score(BigDecimal.valueOf(85))
                .maxScore(BigDecimal.valueOf(100))
                .status(GradeStatus.GRADED)
                .build();
    }

    @Test
    void getEntriesForCourse_ShouldReturnEntries() {
        // Given
        when(entryRepository.findAllByCourseId(courseId)).thenReturn(List.of(mockEntry));

        // When
        List<GradebookEntry> result = entryService.getEntriesForCourse(courseId);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCourseId()).isEqualTo(courseId);
        verify(entryRepository).findAllByCourseId(courseId);
    }

    @Test
    void getEntriesForStudent_ShouldReturnStudentEntries() {
        // Given
        when(entryRepository.findByCourseIdAndStudentId(courseId, studentId))
                .thenReturn(List.of(mockEntry));

        // When
        List<GradebookEntry> result = entryService.getEntriesForStudent(courseId, studentId);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStudentId()).isEqualTo(studentId);
        verify(entryRepository).findByCourseIdAndStudentId(courseId, studentId);
    }

    @Test
    void updateScore_ShouldUpdateEntryAndRecalculateSummary() {
        // Given
        BigDecimal newScore = BigDecimal.valueOf(90);
        UUID overrideBy = UUID.randomUUID();
        String reason = "Grade adjustment";

        when(entryRepository.findById(entryId)).thenReturn(Optional.of(mockEntry));
        when(entryRepository.save(any(GradebookEntry.class))).thenReturn(mockEntry);

        // When
        GradebookEntry result = entryService.updateScore(entryId, newScore, overrideBy, reason);

        // Then
        assertThat(result).isNotNull();
        verify(entryRepository).findById(entryId);
        verify(entryRepository).save(any(GradebookEntry.class));
        verify(summaryService).recalculateCourseGrade(courseId, studentId);
        verify(historyService).recordChange(any(), any(), any(), eq(overrideBy), eq(reason));
    }

    @Test
    void updateScore_EntryNotFound_ShouldThrowException() {
        // Given
        when(entryRepository.findById(entryId)).thenReturn(Optional.empty());

        // When/Then
        assertThatThrownBy(() -> entryService.updateScore(entryId, BigDecimal.TEN, UUID.randomUUID(), "reason"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Gradebook entry not found");
    }
}

