package com.university.lms.course.submissions.dto;

import com.university.lms.course.assignments.dto.AssignmentDetailDto;
import com.university.lms.course.assignments.dto.GradePreviewDto;
import java.util.Map;
import java.util.UUID;

public record SubmissionReviewDto(
    UUID submissionId,
    StudentDto student,
    AssignmentDetailDto assignment,
    Map<String, Object> content,
    GradePreviewDto gradeDraft,
    GradePreviewDto publishedGrade,
    Map<String, UUID> navigation
) {
  public record StudentDto(UUID id, String name, String email) {}
}
