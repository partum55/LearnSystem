package com.university.lms.gradebook.web;

import com.university.lms.common.dto.PageResponse;
import com.university.lms.gradebook.dto.GradebookEntryDto;
import com.university.lms.gradebook.dto.GradeHistoryDto;
import com.university.lms.gradebook.dto.UpdateGradeRequest;
import com.university.lms.gradebook.mapper.GradeHistoryMapper;
import com.university.lms.gradebook.mapper.GradebookEntryMapper;
import com.university.lms.gradebook.service.GradeHistoryService;
import com.university.lms.gradebook.service.GradebookEntryService;
import com.university.lms.gradebook.service.GradebookSummaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * REST controller for gradebook entries.
 */
@RestController
@RequestMapping("/gradebook/entries")
@RequiredArgsConstructor
@Slf4j
public class GradebookEntryController {

    private final GradebookEntryService entryService;
    private final GradeHistoryService historyService;
    private final GradebookSummaryService summaryService;
    private final GradebookEntryMapper entryMapper;
    private final GradeHistoryMapper historyMapper;

    @GetMapping("/course/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'SUPERADMIN', 'TA')")
    public ResponseEntity<List<GradebookEntryDto>> getCourseEntries(@PathVariable UUID courseId) {
        log.info("Fetching gradebook entries for course: {}", courseId);
        List<GradebookEntryDto> entries = entryService.getEntriesForCourse(courseId)
                .stream()
                .map(entryMapper::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(entries);
    }

    @GetMapping("/course/{courseId}/student/{studentId}")
    public ResponseEntity<List<GradebookEntryDto>> getStudentEntries(
            @PathVariable UUID courseId,
            @PathVariable UUID studentId,
            @RequestAttribute("userId") UUID requestingUserId,
            @RequestAttribute("userRole") String userRole) {

        // Students can only see their own entries
        if (!"TEACHER".equals(userRole) && !"SUPERADMIN".equals(userRole) && !"TA".equals(userRole)) {
            if (!studentId.equals(requestingUserId)) {
                return ResponseEntity.status(403).build();
            }
        }

        log.info("Fetching gradebook entries for course: {} student: {}", courseId, studentId);
        List<GradebookEntryDto> entries = entryService.getEntriesForStudent(courseId, studentId)
                .stream()
                .map(entryMapper::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(entries);
    }

    @PatchMapping("/{entryId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'SUPERADMIN', 'TA')")
    public ResponseEntity<GradebookEntryDto> updateGrade(
            @PathVariable UUID entryId,
            @Valid @RequestBody UpdateGradeRequest request,
            @RequestAttribute("userId") UUID userId) {

        log.info("Updating grade for entry: {} by user: {}", entryId, userId);
        var updated = entryService.updateScore(
                entryId,
                request.getOverrideScore(),
                userId,
                request.getOverrideReason()
        );

        return ResponseEntity.ok(entryMapper.toDto(updated));
    }

    @GetMapping("/{entryId}/history")
    @PreAuthorize("hasAnyRole('TEACHER', 'SUPERADMIN', 'TA')")
    public ResponseEntity<List<GradeHistoryDto>> getGradeHistory(@PathVariable UUID entryId) {
        log.info("Fetching grade history for entry: {}", entryId);
        List<GradeHistoryDto> history = historyService.getHistoryForEntry(entryId)
                .stream()
                .map(historyMapper::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(history);
    }
}
