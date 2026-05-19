package com.university.lms.deadline.deadline.web;

import com.university.lms.deadline.deadline.dto.CreateDeadlineRequest;
import com.university.lms.deadline.deadline.dto.DeadlineDto;
import com.university.lms.deadline.deadline.service.DeadlineService;
import com.university.lms.deadline.web.support.RequestThrottleGuard;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/deadlines")
@RequiredArgsConstructor
public class DeadlineController {

    private final DeadlineService deadlineService;
    private final RequestThrottleGuard requestThrottleGuard;

    @GetMapping("/group/{studentGroupId}")
    public ResponseEntity<List<DeadlineDto>> getDeadlinesForGroup(
            @PathVariable Long studentGroupId,
            HttpServletRequest request,
            @RequestParam(required = false) OffsetDateTime from,
            @RequestParam(required = false) OffsetDateTime to) {
        if (requestThrottleGuard.isThrottled(request, "deadlines:group:" + studentGroupId, 700)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header("Retry-After", "1")
                    .cacheControl(CacheControl.noStore())
                    .body(List.of());
        }

        OffsetDateTime start = from != null ? from : OffsetDateTime.now();
        OffsetDateTime end = to != null ? to : start.plusDays(30);
        List<DeadlineDto> deadlines = deadlineService.getDeadlinesForGroup(studentGroupId, start, end);
        String etag = "\"" + Integer.toHexString(deadlines.hashCode()) + "\"";

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(20, TimeUnit.SECONDS).cachePrivate().mustRevalidate())
                .eTag(etag)
                .body(deadlines);
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
