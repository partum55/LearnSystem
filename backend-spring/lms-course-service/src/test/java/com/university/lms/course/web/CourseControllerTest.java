package com.university.lms.course.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.domain.CourseVisibility;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.course.dto.CourseDto;
import com.university.lms.course.dto.CreateCourseRequest;
import com.university.lms.course.service.CourseService;
import com.university.lms.course.service.EnrollmentService;
import com.university.lms.course.util.CourseTestDataFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for CourseController.
 */
@WebMvcTest(CourseController.class)
class CourseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CourseService courseService;

    @MockBean
    private EnrollmentService enrollmentService;

    @Test
    @WithMockUser
    void getAllCourses_ShouldReturnPagedCourses() throws Exception {
        // Given
        PageResponse<CourseDto> pageResponse = new PageResponse<>(
            Collections.emptyList(), 0, 20, 0, 0
        );
        when(courseService.getAllCourses(any(Pageable.class))).thenReturn(pageResponse);

        // When & Then
        mockMvc.perform(get("/courses")
                .param("page", "0")
                .param("size", "20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.page").value(0))
            .andExpect(jsonPath("$.size").value(20));
    }

    @Test
    @WithMockUser
    void getCourseById_WhenExists_ShouldReturnCourse() throws Exception {
        // Given
        UUID courseId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        CourseDto courseDto = CourseTestDataFactory.createCourseDto(
            courseId, "CS101", "Test Course", ownerId
        );
        when(courseService.getCourseById(courseId)).thenReturn(courseDto);

        // When & Then
        mockMvc.perform(get("/courses/{id}", courseId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(courseId.toString()))
            .andExpect(jsonPath("$.code").value("CS101"))
            .andExpect(jsonPath("$.titleEn").value("Test Course"));
    }

    @Test
    @WithMockUser(roles = "TEACHER")
    void createCourse_WithValidData_ShouldReturnCreatedCourse() throws Exception {
        // Given
        CreateCourseRequest request = CourseTestDataFactory.createValidCourseRequest();
        UUID courseId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();

        CourseDto courseDto = CourseTestDataFactory.createCourseDto(
            courseId, request.getCode(), request.getTitleEn(), ownerId
        );

        when(courseService.createCourse(any(CreateCourseRequest.class), any(UUID.class)))
            .thenReturn(courseDto);

        // When & Then
        mockMvc.perform(post("/courses")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.code").value(request.getCode()))
            .andExpect(jsonPath("$.titleEn").value(request.getTitleEn()));
    }

    @Test
    @WithMockUser
    void createCourse_WithInvalidCode_ShouldReturnBadRequest() throws Exception {
        // Given
        CreateCourseRequest request = CourseTestDataFactory.createValidCourseRequest();
        request.setCode("invalid code"); // Spaces not allowed

        // When & Then
        mockMvc.perform(post("/courses")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void createCourse_WithMissingTitle_ShouldReturnBadRequest() throws Exception {
        // Given
        CreateCourseRequest request = CourseTestDataFactory.createValidCourseRequest();
        request.setTitleUk(null);

        // When & Then
        mockMvc.perform(post("/courses")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void searchCourses_WithQuery_ShouldReturnMatchingCourses() throws Exception {
        // Given
        PageResponse<CourseDto> pageResponse = new PageResponse<>(
            Collections.emptyList(), 0, 20, 0, 0
        );
        when(courseService.searchCourses(eq("programming"), any(Pageable.class)))
            .thenReturn(pageResponse);

        // When & Then
        mockMvc.perform(get("/courses/search")
                .param("q", "programming")
                .param("page", "0")
                .param("size", "20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @WithMockUser(roles = "TEACHER")
    void updateCourse_WithValidData_ShouldReturnUpdatedCourse() throws Exception {
        // Given
        UUID courseId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        CreateCourseRequest updateRequest = CourseTestDataFactory.createValidCourseRequest();

        CourseDto updatedCourse = CourseTestDataFactory.createCourseDto(
            courseId, updateRequest.getCode(), updateRequest.getTitleEn(), ownerId
        );

        when(courseService.updateCourse(eq(courseId), any(CreateCourseRequest.class), any(UUID.class)))
            .thenReturn(updatedCourse);

        // When & Then
        mockMvc.perform(put("/courses/{id}", courseId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(courseId.toString()));
    }

    @Test
    @WithMockUser(roles = "TEACHER")
    void deleteCourse_ShouldReturnNoContent() throws Exception {
        // Given
        UUID courseId = UUID.randomUUID();

        // When & Then
        mockMvc.perform(delete("/courses/{id}", courseId))
            .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    void getPublishedCourses_ShouldReturnPublishedOnly() throws Exception {
        // Given
        PageResponse<CourseDto> pageResponse = new PageResponse<>(
            Collections.emptyList(), 0, 20, 0, 0
        );
        when(courseService.getActiveCourses(any(Pageable.class))).thenReturn(pageResponse);

        // When & Then
        mockMvc.perform(get("/courses/published")
                .param("page", "0")
                .param("size", "20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray());
    }
}

