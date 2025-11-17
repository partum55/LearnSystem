package com.university.lms.analytics.service;

import com.university.lms.analytics.dto.*;
import com.university.lms.analytics.feign.*;
import com.university.lms.common.dto.GradeDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final CourseServiceClient courseServiceClient;
    private final UserServiceClient userServiceClient;
    private final GradebookServiceClient gradebookServiceClient;
    private final AssessmentServiceClient assessmentServiceClient;
    private final AIServiceClient aiServiceClient;

    public CourseStatsDto getCourseStats(String courseId) {
        List<Long> studentIds = courseServiceClient.getStudentIdsByCourseId(courseId);
        if (studentIds.isEmpty()) {
            return new CourseStatsDto(0, 0, 0, 0, 0, 0);
        }

        List<GradeDto> allGrades = studentIds.parallelStream()
                .flatMap(studentId -> gradebookServiceClient.getGradesByCourseAndStudent(courseId, studentId).stream())
                .collect(Collectors.toList());

        double averageGrade = allGrades.stream()
                .mapToDouble(grade -> grade.getScore().doubleValue())
                .average()
                .orElse(0.0);

        long activeStudents = studentIds.stream().distinct().count();

        // Completion rate and other stats need more logic
        return new CourseStatsDto(studentIds.size(), (int) activeStudents, averageGrade, 0, 0, 0);
    }

    public List<StudentProgressDto> getStudentProgress(String courseId) {
        List<Long> studentIds = courseServiceClient.getStudentIdsByCourseId(courseId);
        var assessments = assessmentServiceClient.getAssessmentsByCourseId(courseId);

        List<StudentDataDto> studentData = studentIds.parallelStream().map(studentId -> {
            var grades = gradebookServiceClient.getGradesByCourseAndStudent(courseId, studentId);
            List<Double> gradeScores = grades.stream().map(g -> g.getScore().doubleValue()).collect(Collectors.toList());
            long completedAssignments = grades.size();
            double totalAssignments = assessments.size();
            double progress = (totalAssignments > 0) ? (completedAssignments / totalAssignments) * 100 : 0;
            return new StudentDataDto(studentId.toString(), gradeScores, progress);
        }).collect(Collectors.toList());

        PredictionResponseDto predictions = aiServiceClient.getStudentPredictions(new PredictionRequestDto(studentData));

        return studentIds.parallelStream().map(studentId -> {
            var user = userServiceClient.getUserById(studentId);
            var grades = gradebookServiceClient.getGradesByCourseAndStudent(courseId, studentId);

            long completedAssignments = grades.size();
            double totalAssignments = assessments.size();
            double progress = (totalAssignments > 0) ? (completedAssignments / totalAssignments) * 100 : 0;

            double averageGrade = grades.stream()
                    .mapToDouble(grade -> grade.getScore().doubleValue())
                    .average()
                    .orElse(0.0);

            boolean isStruggling = predictions.getPredictions().stream()
                    .filter(p -> p.getStudentId().equals(studentId.toString()))
                    .findFirst()
                    .map(p -> p.getPredictedGrade() < 60)
                    .orElse(false);

            return new StudentProgressDto(
                    user.getId().toString(),
                    user.getFirstName() + " " + user.getLastName(),
                    progress,
                    averageGrade,
                    "N/A", // Last active needs more logic
                    isStruggling
            );
        }).collect(Collectors.toList());
    }
}

