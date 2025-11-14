package com.university.lms.course.web;

import com.university.lms.course.BaseIntegrationTest;
import com.university.lms.course.dto.CourseDto;
import com.university.lms.course.dto.CreateCourseRequest;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.util.CourseTestDataFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for course management.
 */
class CourseIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private CourseRepository courseRepository;

    @AfterEach
    void cleanup() {
        courseRepository.deleteAll();
    }

    @Test
    void createAndRetrieveCourse_ShouldWork() {
        // Given
        CreateCourseRequest request = CourseTestDataFactory.createValidCourseRequest();

        // When - Create course
        ResponseEntity<CourseDto> createResponse = restTemplate.postForEntity(
            "/courses",
            request,
            CourseDto.class
        );

        // Then
        assertThat(createResponse.getStatusCode()).isIn(HttpStatus.CREATED, HttpStatus.OK);
        assertThat(createResponse.getBody()).isNotNull();
        assertThat(createResponse.getBody().getCode()).isEqualTo(request.getCode());

        // When - Retrieve course
        if (createResponse.getBody() != null) {
            ResponseEntity<CourseDto> getResponse = restTemplate.getForEntity(
                "/courses/" + createResponse.getBody().getId(),
                CourseDto.class
            );

            // Then
            assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(getResponse.getBody()).isNotNull();
            assertThat(getResponse.getBody().getId()).isEqualTo(createResponse.getBody().getId());
        }
    }

    @Test
    void searchCourses_ShouldReturnMatchingCourses() {
        // When
        ResponseEntity<String> response = restTemplate.getForEntity(
            "/courses/search?q=programming&page=0&size=20",
            String.class
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
    }
}

