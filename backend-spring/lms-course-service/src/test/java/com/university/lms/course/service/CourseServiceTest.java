package com.university.lms.course.service;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.domain.CourseVisibility;
import com.university.lms.course.domain.Course;
import com.university.lms.course.dto.CreateCourseRequest;
import com.university.lms.course.dto.CourseDto;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.util.CourseTestDataFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for CourseService.
 */
@ExtendWith(MockitoExtension.class)
class CourseServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @InjectMocks
    private CourseService courseService;

    @Test
    void createCourse_WithValidData_ShouldSaveAndReturnCourse() {
        // Given
        UUID ownerId = UUID.randomUUID();
        CreateCourseRequest request = CourseTestDataFactory.createValidCourseRequest();
        Course savedCourse = CourseTestDataFactory.createCourse(ownerId);
        savedCourse.setCode(request.getCode());

        when(courseRepository.existsByCode(request.getCode())).thenReturn(false);
        when(courseRepository.save(any(Course.class))).thenReturn(savedCourse);

        // When
        CourseDto result = courseService.createCourse(request, ownerId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getCode()).isEqualTo(request.getCode());
        assertThat(result.getOwnerId()).isEqualTo(ownerId);

        verify(courseRepository).existsByCode(request.getCode());
        verify(courseRepository).save(any(Course.class));
    }

    @Test
    void createCourse_WithDuplicateCode_ShouldThrowException() {
        // Given
        UUID ownerId = UUID.randomUUID();
        CreateCourseRequest request = CourseTestDataFactory.createValidCourseRequest();

        when(courseRepository.existsByCode(request.getCode())).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> courseService.createCourse(request, ownerId))
            .isInstanceOf(RuntimeException.class);

        verify(courseRepository).existsByCode(request.getCode());
        verify(courseRepository, never()).save(any(Course.class));
    }

    @Test
    void getCourseById_WhenExists_ShouldReturnCourse() {
        // Given
        UUID courseId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        Course course = CourseTestDataFactory.createCourse(ownerId);
        course.setId(courseId);

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));

        // When
        CourseDto result = courseService.getCourseById(courseId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(courseId);
        assertThat(result.getOwnerId()).isEqualTo(ownerId);

        verify(courseRepository).findById(courseId);
    }

    @Test
    void getCourseById_WhenNotExists_ShouldThrowException() {
        // Given
        UUID courseId = UUID.randomUUID();
        when(courseRepository.findById(courseId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> courseService.getCourseById(courseId))
            .isInstanceOf(RuntimeException.class);

        verify(courseRepository).findById(courseId);
    }

    @Test
    void getAllCourses_ShouldReturnPagedCourses() {
        // Given
        Pageable pageable = PageRequest.of(0, 20);
        Page<Course> coursePage = new PageImpl<>(Collections.emptyList(), pageable, 0);

        when(courseRepository.findAll(pageable)).thenReturn(coursePage);

        // When
        var result = courseService.getAllCourses(pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEmpty();
        assertThat(result.getPage()).isEqualTo(0);

        verify(courseRepository).findAll(pageable);
    }

    @Test
    void updateCourse_WhenOwnerMatches_ShouldUpdateAndReturn() {
        // Given
        UUID courseId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        Course existingCourse = CourseTestDataFactory.createCourse(ownerId);
        existingCourse.setId(courseId);

        CreateCourseRequest updateRequest = CourseTestDataFactory.createCourseRequest("CS102", "Advanced Programming");

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(existingCourse));
        when(courseRepository.save(any(Course.class))).thenReturn(existingCourse);

        // When
        CourseDto result = courseService.updateCourse(courseId, updateRequest, ownerId);

        // Then
        assertThat(result).isNotNull();
        verify(courseRepository).findById(courseId);
        verify(courseRepository).save(any(Course.class));
    }

    @Test
    void deleteCourse_WhenOwnerMatches_ShouldDeleteCourse() {
        // Given
        UUID courseId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        Course course = CourseTestDataFactory.createCourse(ownerId);
        course.setId(courseId);

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
        doNothing().when(courseRepository).delete(course);

        // When
        courseService.deleteCourse(courseId, ownerId);

        // Then
        verify(courseRepository).findById(courseId);
        verify(courseRepository).delete(course);
    }
}

