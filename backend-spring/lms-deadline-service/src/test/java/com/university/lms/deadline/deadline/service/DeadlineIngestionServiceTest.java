package com.university.lms.deadline.deadline.service;

import com.university.lms.deadline.deadline.entity.Deadline;
import com.university.lms.deadline.deadline.entity.DeadlineType;
import com.university.lms.deadline.deadline.repository.DeadlineRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeadlineIngestionServiceTest {

    @Mock
    private DeadlineRepository deadlineRepository;

    @InjectMocks
    private DeadlineIngestionService ingestionService;

    @Test
    void ingest_shouldApplyDefaultEffort_whenNotProvided() {
        Deadline deadline = Deadline.builder()
                .courseId(1L)
                .studentGroupId(1L)
                .title("Test Quiz")
                .type(DeadlineType.QUIZ)
                .dueAt(OffsetDateTime.now().plusDays(7))
                .build();

        when(deadlineRepository.save(any(Deadline.class))).thenReturn(deadline);

        Deadline result = ingestionService.ingest(deadline);

        assertThat(result.getEstimatedEffort()).isEqualTo(30);
        verify(deadlineRepository, times(1)).save(any(Deadline.class));
    }

    @Test
    void ingest_shouldPreserveProvidedEffort() {
        Deadline deadline = Deadline.builder()
                .courseId(1L)
                .studentGroupId(1L)
                .title("Custom Assignment")
                .type(DeadlineType.ASSIGNMENT)
                .estimatedEffort(90)
                .dueAt(OffsetDateTime.now().plusDays(7))
                .build();

        when(deadlineRepository.save(any(Deadline.class))).thenReturn(deadline);

        Deadline result = ingestionService.ingest(deadline);

        assertThat(result.getEstimatedEffort()).isEqualTo(90);
        verify(deadlineRepository, times(1)).save(any(Deadline.class));
    }
}

