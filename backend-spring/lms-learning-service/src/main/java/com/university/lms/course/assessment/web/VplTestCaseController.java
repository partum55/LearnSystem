package com.university.lms.course.assessment.web;

import com.university.lms.course.assessment.dto.VplTestCaseDto;
import com.university.lms.course.assessment.service.VplTestCaseService;
import com.university.lms.common.exception.ResourceNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for VPL test case management.
 */
@RestController
@RequestMapping("/assignments/{assignmentId}/test-cases")
@RequiredArgsConstructor
@Slf4j
public class VplTestCaseController {

    private final VplTestCaseService testCaseService;

    @GetMapping
    public ResponseEntity<List<VplTestCaseDto>> getTestCases(
            @PathVariable UUID assignmentId,
            @RequestAttribute(value = "userRole", required = false) String userRole) {

        boolean isStaff = "TEACHER".equals(userRole) || "TA".equals(userRole) || "SUPERADMIN".equals(userRole);

        List<VplTestCaseDto> testCases = isStaff
                ? testCaseService.getTestCasesForAssignment(assignmentId)
                : testCaseService.getTestCasesForStudent(assignmentId);

        return ResponseEntity.ok(testCases);
    }

    @PostMapping
    public ResponseEntity<VplTestCaseDto> createTestCase(
            @PathVariable UUID assignmentId,
            @Valid @RequestBody VplTestCaseDto dto,
            @RequestAttribute("userRole") String userRole) {

        assertStaff(userRole);
        VplTestCaseDto created = testCaseService.createTestCase(assignmentId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{testId}")
    public ResponseEntity<VplTestCaseDto> updateTestCase(
            @PathVariable UUID assignmentId,
            @PathVariable UUID testId,
            @Valid @RequestBody VplTestCaseDto dto,
            @RequestAttribute("userRole") String userRole) {

        assertStaff(userRole);
        VplTestCaseDto updated = testCaseService.updateTestCase(assignmentId, testId, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{testId}")
    public ResponseEntity<Void> deleteTestCase(
            @PathVariable UUID assignmentId,
            @PathVariable UUID testId,
            @RequestAttribute("userRole") String userRole) {

        assertStaff(userRole);
        testCaseService.deleteTestCase(assignmentId, testId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/reorder")
    public ResponseEntity<Void> reorderTestCases(
            @PathVariable UUID assignmentId,
            @RequestBody List<UUID> orderedIds,
            @RequestAttribute("userRole") String userRole) {

        assertStaff(userRole);
        testCaseService.reorderTestCases(assignmentId, orderedIds);
        return ResponseEntity.noContent().build();
    }

    private void assertStaff(String userRole) {
        if (!"TEACHER".equals(userRole) && !"TA".equals(userRole) && !"SUPERADMIN".equals(userRole)) {
            throw new ResourceNotFoundException("Resource", "access", "denied");
        }
    }
}