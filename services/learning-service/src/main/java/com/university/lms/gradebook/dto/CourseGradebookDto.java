package com.university.lms.gradebook.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * DTO for course gradebook overview (teacher view).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseGradebookDto {

    private UUID courseId;
    private String courseCode;
    private String courseTitle;
    private List<AssignmentInfo> assignments;
    private List<StudentGradeRow> students;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignmentInfo {
        private UUID id;
        private String title;
        private BigDecimal maxPoints;
        private String dueDate;
        private UUID categoryId;
        private String categoryName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentGradeRow {
        private UUID studentId;
        private String studentName;
        private String studentEmail;
        private CourseGradeSummaryDto summary;
        private java.util.Map<UUID, GradeInfo> grades; // assignmentId -> grade

        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class GradeInfo {
            private BigDecimal score;
            private BigDecimal maxScore;
            private BigDecimal percentage;
            private String status;
            private boolean isLate;
            private boolean isExcused;
        }
    }
}

