package com.university.lms.course.adminops.web;

import com.university.lms.common.dto.PageResponse;
import com.university.lms.course.adminops.dto.SisAuditLogEntryDto;
import com.university.lms.course.adminops.dto.SisBulkEnrollmentActionRequest;
import com.university.lms.course.adminops.dto.SisBulkEnrollmentActionResponse;
import com.university.lms.course.adminops.dto.SisEnrollmentGroupApplyRequest;
import com.university.lms.course.adminops.dto.SisEnrollmentGroupApplyResponse;
import com.university.lms.course.adminops.dto.SisImportApplyResponse;
import com.university.lms.course.adminops.dto.SisImportPreviewResponse;
import com.university.lms.course.adminops.dto.SisImportRunResponse;
import com.university.lms.course.adminops.service.SisAdminOpsService;
import com.university.lms.course.web.RequestUserContext;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** SUPERADMIN SIS operations: preview/apply/rollback + audit + bulk enrollment actions. */
@RestController
@RequestMapping("/admin/course-management/sis")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('SUPERADMIN')")
public class SisAdminOpsController {

  private final SisAdminOpsService sisAdminOpsService;
  private final RequestUserContext requestUserContext;

  @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<SisImportPreviewResponse> preview(
      @RequestParam String semesterCode,
      @RequestParam("studentsFile") MultipartFile studentsFile,
      @RequestParam("coursesFile") MultipartFile coursesFile,
      @RequestParam("groupCourseMapFile") MultipartFile groupCourseMapFile,
      @RequestParam(value = "currentEnrollmentsFile", required = false)
          MultipartFile currentEnrollmentsFile) {

    UUID actorId = requestUserContext.requireUserId();
    SisImportPreviewResponse response =
        sisAdminOpsService.previewImport(
            semesterCode,
            studentsFile,
            coursesFile,
            groupCourseMapFile,
            currentEnrollmentsFile,
            actorId);
    return ResponseEntity.ok(response);
  }

  @PostMapping("/apply/{importId}")
  public ResponseEntity<SisImportApplyResponse> apply(@PathVariable UUID importId) {
    UUID actorId = requestUserContext.requireUserId();
    return ResponseEntity.ok(sisAdminOpsService.applyImport(importId, actorId));
  }

  @PostMapping("/rollback/{importId}")
  public ResponseEntity<SisImportApplyResponse> rollback(@PathVariable UUID importId) {
    UUID actorId = requestUserContext.requireUserId();
    return ResponseEntity.ok(sisAdminOpsService.rollbackImport(importId, actorId));
  }

  @GetMapping("/imports/{importId}")
  public ResponseEntity<SisImportRunResponse> getImport(@PathVariable UUID importId) {
    return ResponseEntity.ok(sisAdminOpsService.getImportRun(importId));
  }

  @GetMapping("/imports")
  public ResponseEntity<PageResponse<SisImportRunResponse>> listImports(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 100)));
    return ResponseEntity.ok(sisAdminOpsService.listImportRuns(pageable));
  }

  @GetMapping("/audit-log")
  public ResponseEntity<PageResponse<SisAuditLogEntryDto>> auditLog(
      @RequestParam(required = false) UUID importId,
      @RequestParam(required = false) String action,
      @RequestParam(required = false) String entityType,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "30") int size) {

    Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 100)));
    return ResponseEntity.ok(sisAdminOpsService.getAuditLogs(importId, action, entityType, pageable));
  }

  @PostMapping("/enrollment-groups/apply")
  public ResponseEntity<SisEnrollmentGroupApplyResponse> applyEnrollmentGroup(
      @Valid @RequestBody SisEnrollmentGroupApplyRequest request) {
    UUID actorId = requestUserContext.requireUserId();
    return ResponseEntity.ok(sisAdminOpsService.applyEnrollmentGroup(request, actorId));
  }

  @PostMapping("/bulk-actions/enrollments")
  public ResponseEntity<SisBulkEnrollmentActionResponse> bulkEnrollments(
      @Valid @RequestBody SisBulkEnrollmentActionRequest request) {
    UUID actorId = requestUserContext.requireUserId();
    return ResponseEntity.ok(sisAdminOpsService.executeBulkEnrollmentAction(request, actorId));
  }
}
