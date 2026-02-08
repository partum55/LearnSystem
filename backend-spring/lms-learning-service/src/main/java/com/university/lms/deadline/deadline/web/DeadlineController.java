package com.university.lms.deadline.deadline.web;

import com.university.lms.deadline.deadline.dto.CreateDeadlineRequest;
import com.university.lms.deadline.deadline.dto.DeadlineDto;
import com.university.lms.deadline.deadline.service.DeadlineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/deadlines")
@RequiredArgsConstructor
public class DeadlineController {

    private final DeadlineService deadlineService;

    @GetMapping("/group/{studentGroupId}")
    public List<DeadlineDto> getDeadlinesForGroup(
            @PathVariable Long studentGroupId,
            @RequestParam(required = false) OffsetDateTime from,
            @RequestParam(required = false) OffsetDateTime to) {
        OffsetDateTime start = from != null ? from : OffsetDateTime.now();
        OffsetDateTime end = to != null ? to : start.plusDays(30);
        return deadlineService.getDeadlinesForGroup(studentGroupId, start, end);
    }

    @GetMapping("/{id}")
    public DeadlineDto getDeadline(@PathVariable Long id) {
        return deadlineService.getDeadline(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'SUPERADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public DeadlineDto createDeadline(@Valid @RequestBody CreateDeadlineRequest request) {
        return deadlineService.createDeadline(request);
    }
}
