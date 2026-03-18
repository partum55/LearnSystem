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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
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
    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/course/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'SUPERADMIN', 'TA')")
    public ResponseEntity<List<GradebookEntryDto>> getCourseEntries(
            @PathVariable UUID courseId,
            @RequestAttribute("userId") UUID userId) {
        log.info("Fetching gradebook entries for course: {}", courseId);
        List<GradebookEntryDto> entries = entryService.getEntriesForCourse(courseId, userId)
                .stream()
                .map(entryMapper::toDto)
                .collect(Collectors.toList());
        enrichEntries(entries);
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
        enrichEntries(entries);
        return ResponseEntity.ok(entries);
    }

    @PatchMapping("/{entryId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'SUPERADMIN', 'TA')")
    public ResponseEntity<GradebookEntryDto> updateGrade(
            @PathVariable UUID entryId,
            @Valid @RequestBody UpdateGradeRequest request,
            @RequestAttribute("userId") UUID userId) {

        log.info("Updating grade for entry: {} by user: {}", entryId, userId);
        var updated = entryService.updateEntry(
                entryId,
                request,
                userId
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

    /**
     * Enrich gradebook entry DTOs with student names/emails and assignment titles
     * from the shared database.
     */
    private void enrichEntries(List<GradebookEntryDto> entries) {
        if (entries == null || entries.isEmpty()) return;

        // Collect unique student IDs and assignment IDs
        Set<UUID> studentIds = entries.stream().map(GradebookEntryDto::getStudentId).collect(Collectors.toSet());
        Set<UUID> assignmentIds = entries.stream().map(GradebookEntryDto::getAssignmentId)
                .filter(Objects::nonNull).collect(Collectors.toSet());

        // Batch fetch user info
        Map<UUID, String[]> userMap = new HashMap<>();
        if (!studentIds.isEmpty()) {
            try {
                String placeholders = studentIds.stream().map(id -> "?").collect(Collectors.joining(","));
                String sql = "SELECT id, COALESCE(display_name, CONCAT(first_name, ' ', last_name), email) as name, email "
                        + "FROM users WHERE id IN (" + placeholders + ")";
                jdbcTemplate.query(sql, rs -> {
                    UUID id = UUID.fromString(rs.getString("id"));
                    userMap.put(id, new String[]{rs.getString("name"), rs.getString("email")});
                }, studentIds.toArray());
            } catch (Exception e) {
                log.warn("Failed to fetch user info for gradebook: {}", e.getMessage());
            }
        }

        // Batch fetch assignment titles
        Map<UUID, String> assignmentTitleMap = new HashMap<>();
        if (!assignmentIds.isEmpty()) {
            try {
                String placeholders = assignmentIds.stream().map(id -> "?").collect(Collectors.joining(","));
                String sql = "SELECT id, title FROM assignments WHERE id IN (" + placeholders + ")";
                jdbcTemplate.query(sql, rs -> {
                    UUID id = UUID.fromString(rs.getString("id"));
                    assignmentTitleMap.put(id, rs.getString("title"));
                }, assignmentIds.toArray());
            } catch (Exception e) {
                log.warn("Failed to fetch assignment titles for gradebook: {}", e.getMessage());
            }
        }

        // Apply enrichment
        for (GradebookEntryDto entry : entries) {
            String[] userInfo = userMap.get(entry.getStudentId());
            if (userInfo != null) {
                entry.setStudentName(userInfo[0]);
                entry.setStudentEmail(userInfo[1]);
            } else {
                entry.setStudentName("Unknown");
                entry.setStudentEmail("");
            }

            if (entry.getAssignmentId() != null) {
                entry.setAssignmentTitle(assignmentTitleMap.getOrDefault(entry.getAssignmentId(), "Untitled"));
            }
        }
    }
}
