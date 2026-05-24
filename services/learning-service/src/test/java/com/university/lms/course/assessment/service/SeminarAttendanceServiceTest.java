package com.university.lms.course.assessment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.university.lms.course.assessment.domain.*;
import com.university.lms.course.assessment.dto.*;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.assessment.repository.SeminarAttendanceRecordRepository;
import com.university.lms.course.assessment.repository.SeminarAttendanceSessionRepository;
import com.university.lms.course.common.error.ApiException;
import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.gradebook.service.UserProfileClient;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SeminarAttendanceServiceTest {

  @Mock private SeminarAttendanceSessionRepository sessionRepository;
  @Mock private SeminarAttendanceRecordRepository recordRepository;
  @Mock private AssignmentRepository assignmentRepository;
  @Mock private CourseAccessService courseAccessService;
  @Mock private UserProfileClient userProfileClient;

  @InjectMocks private SeminarAttendanceService service;

  private UUID assignmentId;
  private UUID courseId;
  private UUID userId;
  private Assignment assignment;

  @BeforeEach
  void setUp() {
    assignmentId = UUID.randomUUID();
    courseId = UUID.randomUUID();
    userId = UUID.randomUUID();

    assignment = new Assignment();
    assignment.setId(assignmentId);
    assignment.setCourseId(courseId);
    assignment.setAssignmentType(AssignmentType.SEMINAR);
  }

  @Test
  void createSession_success() {
    when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));
    when(sessionRepository.save(any(SeminarAttendanceSession.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    SeminarAttendanceSessionDto dto = service.createSession(assignmentId, userId);

    verify(courseAccessService).requireTeacher(courseId, userId);
    assertThat(dto).isNotNull();
    assertThat(dto.assignmentId()).isEqualTo(assignmentId);
    assertThat(dto.createdBy()).isEqualTo(userId);
    assertThat(dto.status()).isEqualTo(SeminarAttendanceSessionStatus.ACTIVE);
    assertThat(dto.rawToken()).isNotBlank();
  }

  @Test
  void createSession_notSeminar_throwsError() {
    assignment.setAssignmentType(AssignmentType.QUIZ);
    when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));

    assertThatThrownBy(() -> service.createSession(assignmentId, userId))
        .isInstanceOf(ApiException.class)
        .hasFieldOrPropertyWithValue("code", "INVALID_ASSIGNMENT_TYPE");
  }
}
