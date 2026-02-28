package com.university.lms.course.service;

import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.Module;
import com.university.lms.course.dto.CoursePublishChecklistDto;
import com.university.lms.course.dto.CoursePublishChecklistItemDto;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.repository.ModuleRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Computes publish pre-flight checklist for courses. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CoursePublishChecklistService {

  private final CourseRepository courseRepository;
  private final CourseMemberRepository courseMemberRepository;
  private final ModuleRepository moduleRepository;
  private final AssignmentRepository assignmentRepository;

  public CoursePublishChecklistDto evaluate(UUID courseId, UUID userId, String userRole) {
    Course course = findCourseById(courseId);
    ensureManageAccess(course, userId, userRole);

    List<CoursePublishChecklistItemDto> items = new ArrayList<>();

    boolean syllabusPresent = course.getSyllabus() != null && !course.getSyllabus().isBlank();
    items.add(
        CoursePublishChecklistItemDto.builder()
            .key("syllabus")
            .label("Syllabus is filled")
            .required(true)
            .passed(syllabusPresent)
            .details(
                syllabusPresent
                    ? "Syllabus is present"
                    : "Add course syllabus before publishing")
            .build());

    List<Module> modules = moduleRepository.findByCourseIdOrderByPositionAsc(courseId);
    boolean hasModules = !modules.isEmpty();
    items.add(
        CoursePublishChecklistItemDto.builder()
            .key("modules")
            .label("At least one module exists")
            .required(true)
            .passed(hasModules)
            .details(hasModules ? "Modules: " + modules.size() : "Create at least one module")
            .build());

    List<Assignment> assignments = assignmentRepository.findByCourseId(courseId);
    List<Assignment> publishedAssignments =
        assignments.stream().filter(assignment -> Boolean.TRUE.equals(assignment.getIsPublished())).toList();
    long missingDeadlineCount =
        publishedAssignments.stream().filter(assignment -> assignment.getDueDate() == null).count();
    boolean deadlinesValid = missingDeadlineCount == 0;
    String deadlineDetails;
    if (publishedAssignments.isEmpty()) {
      deadlineDetails = "No published assignments yet";
    } else if (deadlinesValid) {
      deadlineDetails = "Deadlines set for all published assignments";
    } else {
      deadlineDetails =
          "Published assignments without due date: " + missingDeadlineCount;
    }
    items.add(
        CoursePublishChecklistItemDto.builder()
            .key("deadlines")
            .label("Published assignments have deadlines")
            .required(true)
            .passed(deadlinesValid)
            .details(deadlineDetails)
            .build());

    boolean ready =
        items.stream().filter(CoursePublishChecklistItemDto::isRequired).allMatch(CoursePublishChecklistItemDto::isPassed);

    return CoursePublishChecklistDto.builder()
        .courseId(courseId)
        .readyToPublish(ready)
        .items(items)
        .build();
  }

  private Course findCourseById(UUID id) {
    return courseRepository
        .findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Course", "id", id));
  }

  private void ensureManageAccess(Course course, UUID userId, String userRole) {
    if (isSuperAdmin(userRole)) {
      return;
    }
    if (course.getOwnerId().equals(userId)) {
      return;
    }
    if (courseMemberRepository.canUserManageCourse(course.getId(), userId)) {
      return;
    }
    throw new ValidationException("User does not have permission to manage this course");
  }

  private boolean isSuperAdmin(String userRole) {
    return "SUPERADMIN".equalsIgnoreCase(userRole);
  }
}
