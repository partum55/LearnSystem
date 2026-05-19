package com.university.lms.gradebook.web;

import com.university.lms.common.dto.GradeDto;
import com.university.lms.gradebook.domain.GradebookEntry;
import com.university.lms.gradebook.service.GradebookEntryService;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Analytics-focused gradebook endpoints used by analytics-service. */
@RestController
@RequestMapping("/gradebook")
@RequiredArgsConstructor
@Slf4j
public class GradebookAnalyticsController {

  private final GradebookEntryService entryService;

  @GetMapping("/grades")
  @PreAuthorize("hasAnyRole('TEACHER', 'SUPERADMIN', 'TA')")
  public ResponseEntity<List<GradeDto>> getGradesByCourseAndStudent(
      @RequestParam("courseId") String courseId, @RequestParam("studentId") UUID studentId) {
    UUID parsedCourseId;
    try {
      parsedCourseId = UUID.fromString(courseId);
    } catch (IllegalArgumentException ex) {
      return ResponseEntity.badRequest().build();
    }
    log.debug(
        "Fetching analytics grades for course {} and student {}", parsedCourseId, studentId);

    List<GradeDto> grades =
        entryService.getEntriesForStudent(parsedCourseId, studentId).stream()
            .filter(entry -> entry.getFinalScore() != null)
            .map(this::toGradeDto)
            .collect(Collectors.toList());

    return ResponseEntity.ok(grades);
  }

  private GradeDto toGradeDto(GradebookEntry entry) {
    Long legacyId = Math.abs(entry.getId().getMostSignificantBits());
    String assignmentId = entry.getAssignmentId() != null ? entry.getAssignmentId().toString() : null;

    return new GradeDto(
        legacyId,
        entry.getStudentId().toString(),
        entry.getCourseId().toString(),
        assignmentId,
        entry.getFinalScore());
  }
}
