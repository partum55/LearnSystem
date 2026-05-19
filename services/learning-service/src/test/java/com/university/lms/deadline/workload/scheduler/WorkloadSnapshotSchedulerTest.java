package com.university.lms.deadline.workload.scheduler;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.university.lms.deadline.deadline.repository.DeadlineRepository;
import com.university.lms.deadline.workload.service.WorkloadEngineService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WorkloadSnapshotSchedulerTest {

  @Mock private DeadlineRepository deadlineRepository;
  @Mock private WorkloadEngineService workloadEngineService;

  @InjectMocks private WorkloadSnapshotScheduler scheduler;

  @Test
  void recomputeWorkloadsShouldProcessEveryStudentGroup() {
    when(deadlineRepository.findDistinctStudentGroupIds()).thenReturn(List.of(100L, 101L));

    scheduler.recomputeWorkloads();

    verify(workloadEngineService).recomputeForGroup(100L);
    verify(workloadEngineService).recomputeForGroup(101L);
  }

  @Test
  void recomputeWorkloadsShouldContinueWhenOneGroupFails() {
    when(deadlineRepository.findDistinctStudentGroupIds()).thenReturn(List.of(5L, 6L));
    doThrow(new RuntimeException("boom")).when(workloadEngineService).recomputeForGroup(5L);

    scheduler.recomputeWorkloads();

    verify(workloadEngineService).recomputeForGroup(5L);
    verify(workloadEngineService).recomputeForGroup(6L);
  }

  @Test
  void recomputeWorkloadsShouldSkipWhenNoStudentGroupsFound() {
    when(deadlineRepository.findDistinctStudentGroupIds()).thenReturn(List.of());

    scheduler.recomputeWorkloads();

    verifyNoInteractions(workloadEngineService);
  }
}
