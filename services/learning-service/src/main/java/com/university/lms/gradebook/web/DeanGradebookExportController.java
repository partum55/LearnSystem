package com.university.lms.gradebook.web;

import com.university.lms.course.web.RequestUserContext;
import com.university.lms.gradebook.service.DeanGradebookExportService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Exports dean-office formatted gradebook statement as XLSX. */
@RestController
@RequestMapping("/admin/course-management/gradebook/export")
@RequiredArgsConstructor
@Slf4j
public class DeanGradebookExportController {

  private static final String XLSX_MEDIA_TYPE =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  private final DeanGradebookExportService deanGradebookExportService;
  private final RequestUserContext requestUserContext;

  @GetMapping(value = "/dean", produces = XLSX_MEDIA_TYPE)
  @PreAuthorize("hasAnyRole('SUPERADMIN','TEACHER','TA')")
  public ResponseEntity<byte[]> exportDeanGradebook(
      @RequestParam UUID courseId,
      @RequestParam(required = false) String semester,
      @RequestParam(name = "group", required = false) String groupCode) {

    UUID actorId = requestUserContext.requireUserId();
    String actorRole = requestUserContext.requireUserRole();
    DeanGradebookExportService.DeanGradebookFile exported =
        deanGradebookExportService.export(courseId, semester, groupCode, actorId, actorRole);

    return ResponseEntity.ok()
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"" + exported.filename() + "\"")
        .contentType(MediaType.parseMediaType(XLSX_MEDIA_TYPE))
        .contentLength(exported.content().length)
        .body(exported.content());
  }
}
