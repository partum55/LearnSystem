package com.university.lms.deadline.calendar.web;

import com.university.lms.deadline.calendar.dto.CalendarDayDto;
import com.university.lms.deadline.calendar.ics.IcsExporter;
import com.university.lms.deadline.calendar.service.CalendarService;
import com.university.lms.deadline.conflict.dto.ConflictDto;
import com.university.lms.deadline.deadline.repository.DeadlineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private final CalendarService calendarService;
    private final DeadlineRepository deadlineRepository;
    private final IcsExporter icsExporter;

    @GetMapping("/student/{studentGroupId}/month")
    public List<CalendarDayDto> getMonth(
            @PathVariable Long studentGroupId,
            @RequestParam int year,
            @RequestParam int month) {
        return calendarService.getStudentMonth(studentGroupId, YearMonth.of(year, month));
    }

    @GetMapping("/student/{studentGroupId}/conflicts")
    public List<ConflictDto> getConflicts(@PathVariable Long studentGroupId) {
        return calendarService.getConflicts(studentGroupId);
    }

    @GetMapping("/student/{studentGroupId}/ics")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','SUPERADMIN')")
    public ResponseEntity<byte[]> downloadIcs(@PathVariable Long studentGroupId) {
        var bytes = icsExporter.export(deadlineRepository.findByStudentGroupId(studentGroupId));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=calendar-" + studentGroupId + ".ics")
                .contentType(MediaType.parseMediaType("text/calendar"))
                .body(bytes);
    }

    @GetMapping("/student/{studentGroupId}/subscribe")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','SUPERADMIN')")
    public ResponseEntity<byte[]> subscribeIcs(@PathVariable Long studentGroupId) {
        var bytes = icsExporter.export(deadlineRepository.findByStudentGroupId(studentGroupId));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/calendar"))
                .body(bytes);
    }
}
