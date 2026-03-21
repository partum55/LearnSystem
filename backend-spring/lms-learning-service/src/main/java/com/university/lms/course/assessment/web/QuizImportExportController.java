package com.university.lms.course.assessment.web;

import com.university.lms.course.assessment.dto.QuizDto;
import com.university.lms.course.assessment.dto.QuizImportRequest;
import com.university.lms.course.assessment.service.QuizImportExportService;
import com.university.lms.course.web.RequestUserContext;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.multipart.MultipartFile;

/** REST endpoints for quiz import/export in JSON and CSV formats. */
@RestController
@RequestMapping("/quizzes")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('TEACHER','TA','SUPERADMIN')")
public class QuizImportExportController {

  private final QuizImportExportService quizImportExportService;
  private final RequestUserContext requestUserContext;

  @GetMapping("/{quizId}/export/json")
  public ResponseEntity<Map<String, Object>> exportJson(@PathVariable UUID quizId) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    return ResponseEntity.ok(quizImportExportService.exportQuizAsJson(quizId, userId, userRole));
  }

  @GetMapping("/{quizId}/export/csv")
  public ResponseEntity<String> exportCsv(@PathVariable UUID quizId) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    String csv = quizImportExportService.exportQuizAsCsv(quizId, userId, userRole);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=quiz-" + quizId + ".csv")
        .contentType(MediaType.TEXT_PLAIN)
        .body(csv);
  }

  @PostMapping("/import/json")
  public ResponseEntity<QuizDto> importJson(@Valid @RequestBody QuizImportRequest request) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    return ResponseEntity.ok(quizImportExportService.importFromJson(request, userId, userRole));
  }

  @PostMapping(value = "/import/csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<QuizDto> importCsv(
      @RequestParam UUID courseId,
      @RequestParam String title,
      @RequestPart MultipartFile file) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    return ResponseEntity.ok(quizImportExportService.importFromCsv(courseId, title, file, userId, userRole));
  }

  @PostMapping(value = "/import/excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<QuizDto> importExcel(
      @RequestParam UUID courseId,
      @RequestParam String title,
      @RequestPart MultipartFile file) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    return ResponseEntity.ok(quizImportExportService.importFromExcel(courseId, title, file, userId, userRole));
  }

  @PostMapping(value = "/import/word", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<QuizDto> importWord(
      @RequestParam UUID courseId,
      @RequestParam String title,
      @RequestPart MultipartFile file) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    return ResponseEntity.ok(quizImportExportService.importFromWord(courseId, title, file, userId, userRole));
  }
}
