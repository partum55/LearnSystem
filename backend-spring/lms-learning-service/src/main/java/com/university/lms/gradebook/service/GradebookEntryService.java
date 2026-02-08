package com.university.lms.gradebook.service;

import com.university.lms.gradebook.domain.GradeStatus;
import com.university.lms.gradebook.domain.GradebookEntry;
import com.university.lms.gradebook.repository.GradebookEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class GradebookEntryService {

    private final GradebookEntryRepository entryRepository;
    private final GradebookSummaryService summaryService;
    private final GradeHistoryService historyService;

    public List<GradebookEntry> getEntriesForCourse(UUID courseId) {
        return entryRepository.findAllByCourseId(courseId);
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
        return saved;
    }
}
