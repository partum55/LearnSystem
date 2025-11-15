package com.university.lms.assessment.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.assessment.dto.QuizDto;
import com.university.lms.assessment.service.QuizService;
import com.university.lms.assessment.util.AssessmentTestDataFactory;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.common.security.JwtService;
import com.university.lms.common.security.JwtTokenBlacklistService;
import com.university.lms.common.security.SecurityAuditLogger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for QuizController.
 */
@WebMvcTest(controllers = QuizController.class)
class QuizControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private QuizService quizService;

    // Mock security dependencies required by JWT filter to load context
    @MockBean
    private JwtService jwtService;

    @MockBean
    private JwtTokenBlacklistService jwtTokenBlacklistService;

    @MockBean
    private SecurityAuditLogger securityAuditLogger;

    // Mock JPA mapping context required by JPA auditing to avoid metamodel errors in slice tests
    @MockBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    // Optional auditor aware to satisfy auditing if needed
    @MockBean
    private AuditorAware<UUID> auditorAware;

    @Test
    @WithMockUser
    void getQuiz_WhenExists_ShouldReturnQuiz() throws Exception {
        // Given
        UUID quizId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        QuizDto quizDto = AssessmentTestDataFactory.createQuizDto(quizId, courseId, "Test Quiz");

        when(quizService.getQuizById(quizId)).thenReturn(quizDto);

        // When & Then
        mockMvc.perform(get("/quizzes/{id}", quizId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(quizId.toString()))
            .andExpect(jsonPath("$.title").value("Test Quiz"));
    }

    @Test
    @WithMockUser
    void getQuizzesByCourse_ShouldReturnPagedQuizzes() throws Exception {
        // Given
        UUID courseId = UUID.randomUUID();
        PageResponse<QuizDto> pageResponse = PageResponse.<QuizDto>builder()
            .content(Collections.emptyList())
            .pageNumber(0)
            .pageSize(20)
            .totalElements(0)
            .totalPages(0)
            .first(true)
            .last(true)
            .build();

        when(quizService.getQuizzesByCourse(eq(courseId), any(Pageable.class)))
            .thenReturn(pageResponse);

        // When & Then
        mockMvc.perform(get("/quizzes/course/{courseId}", courseId)
                .param("page", "0")
                .param("size", "20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.pageNumber").value(0));
    }

    @Test
    @WithMockUser(roles = "TEACHER")
    void createQuiz_WithValidData_ShouldReturnCreatedQuiz() throws Exception {
        // Given
        UUID courseId = UUID.randomUUID();
        UUID quizId = UUID.randomUUID();
        String title = "New Quiz";

        QuizDto quizDto = AssessmentTestDataFactory.createQuizDto(quizId, courseId, title);

        when(quizService.createQuiz(eq(courseId), eq(title), any(), any(UUID.class)))
            .thenReturn(quizDto);

        // When & Then
        mockMvc.perform(post("/quizzes")
                .param("courseId", courseId.toString())
                .param("title", title))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(quizId.toString()))
            .andExpect(jsonPath("$.title").value(title));
    }

    @Test
    @WithMockUser(roles = "TEACHER")
    void updateQuiz_WithValidData_ShouldReturnUpdatedQuiz() throws Exception {
        // Given
        UUID quizId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        QuizDto updateDto = AssessmentTestDataFactory.createQuizDto(quizId, courseId, "Updated Quiz");

        when(quizService.updateQuiz(eq(quizId), any(QuizDto.class), any(UUID.class)))
            .thenReturn(updateDto);

        // When & Then
        mockMvc.perform(put("/quizzes/{id}", quizId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDto)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(quizId.toString()))
            .andExpect(jsonPath("$.title").value("Updated Quiz"));
    }

    @Test
    @WithMockUser(roles = "TEACHER")
    void deleteQuiz_ShouldReturnNoContent() throws Exception {
        // Given
        UUID quizId = UUID.randomUUID();

        // When & Then
        mockMvc.perform(delete("/quizzes/{id}", quizId))
            .andExpect(status().isNoContent());
    }

    @Test
    void getQuiz_WhenNotAuthenticated_ShouldReturnUnauthorized() throws Exception {
        // Given
        UUID quizId = UUID.randomUUID();

        // When & Then
        mockMvc.perform(get("/quizzes/{id}", quizId))
            .andExpect(status().isUnauthorized());
    }
}
