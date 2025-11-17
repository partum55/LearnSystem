package com.university.lms.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseStatsDto {
    private int totalStudents;
    private int activeStudents;
    private double averageGrade;
    private double completionRate;
    private int lateSubmissions;
    private int pendingGrading;
}

