package com.university.lms.gradebook.service;

import com.university.lms.course.adminops.service.AdminAuditTrailService;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.gradebook.domain.GradeStatus;
import com.university.lms.gradebook.domain.GradebookEntry;
import com.university.lms.gradebook.repository.GradebookEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GradebookEntryService {

    private final GradebookEntryRepository entryRepository;
    private final GradebookSummaryService summaryService;
    private final GradeHistoryService historyService;
    private final AssignmentRepository assignmentRepository;
    private final CourseMemberRepository courseMemberRepository;
    private final AdminAuditTrailService adminAuditTrailService;

    /**
     * Get all gradebook entries for a course.
     * Auto-initializes missing entries for all (student × assignment) pairs.
     */
    @Transactional
    public List<GradebookEntry> getEntriesForCourse(UUID courseId) {
        List<GradebookEntry> existing = entryRepository.findAllByCourseId(courseId);

        // Get all assignments and students for this course
        List<Assignment> assignments = assignmentRepository.findByCourseIdOrderByDueDateAsc(courseId);
        List<UUID> studentIds = courseMemberRepository.findStudentIdsByCourseId(courseId);

        if (assignments.isEmpty() || studentIds.isEmpty()) {
            return existing;
        }

        // Build set of existing (student, assignment) pairs
        Set<String> existingKeys = existing.stream()
                .map(e -> e.getStudentId() + ":" + e.getAssignmentId())
                .collect(Collectors.toSet());

        // Create missing entries
        List<GradebookEntry> newEntries = new ArrayList<>();
        for (UUID studentId : studentIds) {
            for (Assignment assignment : assignments) {
                String key = studentId + ":" + assignment.getId();
                if (!existingKeys.contains(key)) {
                    GradebookEntry entry = GradebookEntry.builder()
                            .courseId(courseId)
                            .studentId(studentId)
                            .assignmentId(assignment.getId())
                            .maxScore(assignment.getMaxPoints())
                            .status(GradeStatus.NOT_SUBMITTED)
                            .build();
                    newEntries.add(entry);
                }
            }
        }

        if (!newEntries.isEmpty()) {
            log.info("Auto-initializing {} gradebook entries for course {}", newEntries.size(), courseId);
            List<GradebookEntry> saved = entryRepository.saveAll(newEntries);
            existing.addAll(saved);
        }

        return existing;
    }

    public List<GradebookEntry> getEntriesForStudent(UUID courseId, UUID studentId) {
        return entryRepository.findByCourseIdAndStudentId(courseId, studentId);
    }

    @Transactional
    public GradebookEntry updateScore(UUID entryId, BigDecimal score, UUID overrideBy, String reason) {
        GradebookEntry entry = entryRepository.findById(entryId)
                .orElseThrow(() -> new IllegalArgumentException("Gradebook entry not found"));

        BigDecimal oldScore = entry.getFinalScore();
        entry.setOverrideScore(score);
        entry.setOverrideBy(overrideBy);
        entry.setOverrideAt(LocalDateTime.now());
        entry.setOverrideReason(reason);
        entry.setStatus(GradeStatus.GRADED);
        entry.calculatePercentage();

        GradebookEntry saved = entryRepository.save(entry);
        summaryService.recalculateCourseGrade(entry.getCourseId(), entry.getStudentId());
        historyService.recordChange(saved, oldScore, saved.getFinalScore(), overrideBy, reason);

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("courseId", saved.getCourseId().toString());
        details.put("studentId", saved.getStudentId().toString());
        details.put("assignmentId", saved.getAssignmentId() == null ? null : saved.getAssignmentId().toString());
        details.put("entryId", saved.getId().toString());
        details.put("oldScore", oldScore == null ? null : oldScore.toPlainString());
        details.put("newScore", saved.getFinalScore() == null ? null : saved.getFinalScore().toPlainString());
        details.put("overrideReason", reason);
        details.put("status", saved.getStatus() == null ? null : saved.getStatus().name());
        adminAuditTrailService.log(
                overrideBy,
                "GRADE_UPDATED",
                "GRADEBOOK_ENTRY",
                saved.getId().toString(),
                details);

        return saved;
    }
}
