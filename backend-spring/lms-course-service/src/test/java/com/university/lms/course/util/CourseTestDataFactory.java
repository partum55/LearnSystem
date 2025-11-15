package com.university.lms.course.util;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.domain.CourseVisibility;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.Module;
import com.university.lms.course.dto.CreateCourseRequest;
import com.university.lms.course.dto.CreateModuleRequest;
import com.university.lms.course.dto.CourseDto;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Factory for creating test data for courses.
 */
public class CourseTestDataFactory {

    public static CreateCourseRequest createValidCourseRequest() {
        return CreateCourseRequest.builder()
                .code("CS101")
                .titleUk("Основи програмування")
                .titleEn("Introduction to Programming")
                .descriptionUk("Базовий курс програмування")
                .descriptionEn("Basic programming course")
                .visibility(CourseVisibility.PUBLIC)
                .startDate(LocalDate.now().plusDays(7))
                .endDate(LocalDate.now().plusMonths(3))
                .academicYear("2025-2026")
                .build();
    }

    public static CreateCourseRequest createCourseRequest(String code, String titleEn) {
        return CreateCourseRequest.builder()
                .code(code)
                .titleUk(titleEn)
                .titleEn(titleEn)
                .descriptionEn("Test course description")
                .visibility(CourseVisibility.PUBLIC)
                .startDate(LocalDate.now().plusDays(1))
                .endDate(LocalDate.now().plusMonths(3))
                .build();
    }

    public static CourseDto createCourseDto(UUID id, String code, String title, UUID ownerId) {
        return CourseDto.builder()
                .id(id)
                .code(code)
                .titleEn(title)
                .titleUk(title)
                .ownerId(ownerId)
                .visibility(CourseVisibility.PUBLIC)
                .status(CourseStatus.DRAFT)
                .currentEnrollment(0)
                .build();
    }

    public static Course createCourse(UUID ownerId) {
        Course course = new Course();
        course.setId(UUID.randomUUID());
        course.setCode("CS101");
        course.setTitleEn("Test Course");
        course.setTitleUk("Тестовий курс");
        course.setDescriptionEn("Test Description");
        course.setOwnerId(ownerId);
        course.setVisibility(CourseVisibility.PUBLIC);
        course.setStatus(CourseStatus.DRAFT);
        course.setStartDate(LocalDate.now().plusDays(7));
        course.setEndDate(LocalDate.now().plusMonths(3));
        return course;
    }

    public static CreateModuleRequest createValidModuleRequest() {
        return CreateModuleRequest.builder()
                .title("Module 1")
                .description("Module description")
                .position(1)
                .isPublished(true)
                .build();
    }

    public static Module createModule(UUID courseId, int orderIndex) {
        Module module = new Module();
        module.setId(UUID.randomUUID());
        Course courseRef = new Course();
        courseRef.setId(courseId);
        module.setCourse(courseRef);
        module.setTitle("Module " + orderIndex);
        module.setPosition(orderIndex);
        return module;
    }
}
