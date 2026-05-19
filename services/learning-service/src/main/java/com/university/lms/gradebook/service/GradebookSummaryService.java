package com.university.lms.gradebook.service;

import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.gradebook.domain.CourseGradeSummary;
import com.university.lms.gradebook.domain.GradebookEntry;
import com.university.lms.gradebook.repository.CourseGradeSummaryRepository;
import com.university.lms.gradebook.repository.GradebookEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GradebookSummaryService {

    private static final String STUDENT_ROLE = "STUDENT";

    private final CourseGradeSummaryRepository summaryRepository;
    private final GradebookEntryRepository entryRepository;
    private final CourseMemberRepository courseMemberRepository;

    @Transactional
    public int recalculateCourseGrades(UUID courseId) {
        List<UUID> activeStudentIds = courseMemberRepository
                .findByCourseIdAndRoleInCourse(courseId, STUDENT_ROLE)
                .stream()
                .filter(member -> member.isActive())
                .map(member -> member.getUserId())
                .filter(Objects::nonNull)
                .toList();

        for (UUID studentId : activeStudentIds) {
            recalculateCourseGrade(courseId, studentId);
        }

        return activeStudentIds.size();
    }

    @Transactional
    public void recalculateCourseGrade(UUID courseId, UUID studentId) {
        CourseGradeSummary summary = summaryRepository
                .findByCourseIdAndStudentId(courseId, studentId)
                .orElseGet(() -> CourseGradeSummary.builder()
                        .courseId(courseId)
                        .studentId(studentId)
                        .totalPointsEarned(BigDecimal.ZERO)
                        .totalPointsPossible(BigDecimal.ZERO)
                        .assignmentsCompleted(0)
                        .assignmentsTotal(0)
                        .categoryGrades(new HashMap<>())
                        .finalized(false)
                        .build());

        List<GradebookEntry> entries = entryRepository.findByCourseIdAndStudentId(courseId, studentId);

        BigDecimal totalEarned = BigDecimal.ZERO;
        BigDecimal totalPossible = BigDecimal.ZERO;
        int completed = 0;

        Map<String, Object> categoryGrades = new HashMap<>();

        for (GradebookEntry entry : entries) {
            if (entry.getFinalScore() != null) {
                totalEarned = totalEarned.add(entry.getFinalScore());
                totalPossible = totalPossible.add(entry.getMaxScore());
                completed++;
            }
        }

        summary.setTotalPointsEarned(totalEarned);
        summary.setTotalPointsPossible(totalPossible);
        summary.setAssignmentsCompleted(completed);
        summary.setAssignmentsTotal(entries.size());
        summary.setCategoryGrades(categoryGrades);

        if (totalPossible.compareTo(BigDecimal.ZERO) > 0) {
            summary.setCurrentGrade(totalEarned.divide(totalPossible, 4, BigDecimal.ROUND_HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, BigDecimal.ROUND_HALF_UP));
        } else {
            summary.setCurrentGrade(null);
        }

        summary.setLetterGrade(calculateLetterGrade(summary.getCurrentGrade()));
        summaryRepository.save(summary);
    }

    private String calculateLetterGrade(BigDecimal currentGrade) {
        if (currentGrade == null) {
            return "";
        }

        double grade = currentGrade.doubleValue();
        if (grade >= 90) return "A";
        if (grade >= 80) return "B";
        if (grade >= 70) return "C";
        if (grade >= 60) return "D";
        return "F";
    }
}
