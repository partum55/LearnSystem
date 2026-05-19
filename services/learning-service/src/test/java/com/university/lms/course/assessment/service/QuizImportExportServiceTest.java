package com.university.lms.course.assessment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.course.assessment.domain.Quiz;
import com.university.lms.course.assessment.dto.QuizDto;
import com.university.lms.course.assessment.dto.QuizImportRequest;
import com.university.lms.course.assessment.repository.QuizRepository;
import com.university.lms.course.repository.CourseMemberRepository;
import java.util.HashSet;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

@ExtendWith(MockitoExtension.class)
class QuizImportExportServiceTest {

  @Mock private QuizRepository quizRepository;
  @Mock private QuestionService questionService;
  @Mock private QuizService quizService;
  @Mock private QuizSectionService quizSectionService;
  @Mock private QuestionVersionService questionVersionService;
  @Mock private ObjectMapper objectMapper;
  @Mock private CourseMemberRepository courseMemberRepository;

  @InjectMocks private QuizImportExportService service;

  @Test
  void exportQuizAsJson_nonMember_throwsAccessDenied() {
    UUID quizId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    Quiz quiz = Quiz.builder().id(quizId).courseId(courseId).quizQuestions(new HashSet<>()).build();
    when(quizRepository.findById(quizId)).thenReturn(Optional.of(quiz));
    when(courseMemberRepository.canUserManageCourse(courseId, userId)).thenReturn(false);

    assertThatThrownBy(() -> service.exportQuizAsJson(quizId, userId, "TEACHER"))
        .isInstanceOf(AccessDeniedException.class);
  }

  @Test
  void exportQuizAsJson_courseMember_succeeds() {
    UUID quizId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    Quiz quiz = Quiz.builder().id(quizId).courseId(courseId).quizQuestions(new HashSet<>()).build();
    when(quizRepository.findById(quizId)).thenReturn(Optional.of(quiz));
    when(courseMemberRepository.canUserManageCourse(courseId, userId)).thenReturn(true);
    when(quizService.getQuizById(quizId)).thenReturn(QuizDto.builder().id(quizId).build());
    when(quizSectionService.getSections(any(), any())).thenReturn(java.util.List.of());

    var result = service.exportQuizAsJson(quizId, userId, "TEACHER");

    assertThat(result).containsKey("quiz");
  }

  @Test
  void exportQuizAsJson_superadmin_bypassesCheck() {
    UUID quizId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    Quiz quiz = Quiz.builder().id(quizId).courseId(courseId).quizQuestions(new HashSet<>()).build();
    when(quizRepository.findById(quizId)).thenReturn(Optional.of(quiz));
    when(quizService.getQuizById(quizId)).thenReturn(QuizDto.builder().id(quizId).build());
    when(quizSectionService.getSections(any(), any())).thenReturn(java.util.List.of());

    var result = service.exportQuizAsJson(quizId, userId, "SUPERADMIN");

    assertThat(result).containsKey("quiz");
  }

  @Test
  void importFromJson_nonMember_throwsAccessDenied() {
    UUID courseId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    QuizImportRequest request = QuizImportRequest.builder()
        .courseId(courseId)
        .title("Test Quiz")
        .build();

    when(courseMemberRepository.canUserManageCourse(courseId, userId)).thenReturn(false);

    assertThatThrownBy(() -> service.importFromJson(request, userId, "TEACHER"))
        .isInstanceOf(AccessDeniedException.class);
  }
}
