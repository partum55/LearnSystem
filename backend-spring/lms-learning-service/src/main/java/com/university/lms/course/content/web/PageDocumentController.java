package com.university.lms.course.content.web;

import com.university.lms.course.content.dto.CanonicalDocumentDto;
import com.university.lms.course.content.dto.ModulePageDto;
import com.university.lms.course.content.dto.TocItemDto;
import com.university.lms.course.content.dto.UpsertCanonicalDocumentRequest;
import com.university.lms.course.content.service.ModulePageService;
import com.university.lms.course.web.RequestUserContext;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** REST endpoints for canonical page documents and publishing workflow. */
@RestController
@RequestMapping("/pages")
@RequiredArgsConstructor
public class PageDocumentController {

  private final ModulePageService modulePageService;
  private final RequestUserContext requestUserContext;

  @GetMapping("/{pageId}/document")
  public ResponseEntity<CanonicalDocumentDto> getDocument(@PathVariable UUID pageId) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();

    return ResponseEntity.ok(modulePageService.getPageDocument(pageId, userId, userRole));
  }

  @PutMapping("/{pageId}/document")
  public ResponseEntity<CanonicalDocumentDto> upsertDocument(
      @PathVariable UUID pageId, @Valid @RequestBody UpsertCanonicalDocumentRequest request) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();

    return ResponseEntity.ok(modulePageService.upsertPageDocument(pageId, request, userId, userRole));
  }

  @PostMapping("/{pageId}/publish")
  public ResponseEntity<ModulePageDto> publishPage(@PathVariable UUID pageId) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();

    return ResponseEntity.ok(modulePageService.publishPage(pageId, userId, userRole));
  }

  @PostMapping("/{pageId}/unpublish")
  public ResponseEntity<ModulePageDto> unpublishPage(@PathVariable UUID pageId) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();

    return ResponseEntity.ok(modulePageService.unpublishPage(pageId, userId, userRole));
  }

  @GetMapping("/{pageId}/toc")
  public ResponseEntity<List<TocItemDto>> getToc(@PathVariable UUID pageId) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();

    return ResponseEntity.ok(modulePageService.generateToc(pageId, userId, userRole));
  }
}
