package com.university.lms.gradebook.event;

import com.university.lms.gradebook.domain.GradeStatus;
import com.university.lms.gradebook.domain.GradebookEntry;
import com.university.lms.gradebook.repository.GradebookEntryRepository;
import com.university.lms.gradebook.service.GradebookSummaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Event listener for gradebook-related events.
 * Handles automatic gradebook entry creation and updates.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GradebookEventListener {

    private final GradebookEntryRepository entryRepository;
    private final GradebookSummaryService summaryService;

    @EventListener
    @Async
    @Transactional
    public void handleSubmissionGraded(SubmissionGradedEvent event) {
        log.info("Processing SubmissionGradedEvent for submission: {}", event.getSubmissionId());

        Optional<GradebookEntry> existingEntry = entryRepository
                .findByCourseIdAndStudentId(event.getCourseId(), event.getStudentId())
                .stream()
                .filter(e -> e.getAssignmentId().equals(event.getAssignmentId()))
                .findFirst();

        GradebookEntry entry;
        if (existingEntry.isPresent()) {
            entry = existingEntry.get();
            log.debug("Updating existing gradebook entry: {}", entry.getId());
        } else {
            entry = GradebookEntry.builder()
                    .courseId(event.getCourseId())
                    .studentId(event.getStudentId())
                    .assignmentId(event.getAssignmentId())
                    .submissionId(event.getSubmissionId())
                    .build();
            log.debug("Creating new gradebook entry for student: {}", event.getStudentId());
        }

        entry.setScore(event.getGrade());
        entry.setStatus(GradeStatus.GRADED);
        entry.setLate(event.isLate());
        entry.setGradedAt(LocalDateTime.now());
        entry.setSubmissionId(event.getSubmissionId());

        entryRepository.save(entry);

        // Trigger summary recalculation
        summaryService.recalculateCourseGrade(event.getCourseId(), event.getStudentId());

        log.info("Gradebook entry updated and summary recalculated for student: {}", event.getStudentId());
    }
}

