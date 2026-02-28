package com.university.lms.course.content.web;

import com.university.lms.course.content.dto.EditorMediaDto;
import com.university.lms.course.content.service.EditorMediaStorageService;
import com.university.lms.course.web.RequestUserContext;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/** Endpoints for editor image/pdf uploads and retrieval. */
@RestController
@RequestMapping("/editor/media")
@RequiredArgsConstructor
public class EditorMediaController {

  private final EditorMediaStorageService editorMediaStorageService;
  private final RequestUserContext requestUserContext;

  @PostMapping(consumes = "multipart/form-data")
  public ResponseEntity<EditorMediaDto> upload(@RequestPart("file") MultipartFile file) {
    UUID userId = requestUserContext.requireUserId();
    EditorMediaDto media = editorMediaStorageService.store(file, userId);
    return ResponseEntity.ok(media);
  }

  @GetMapping("/{mediaId}")
  public ResponseEntity<?> download(@PathVariable UUID mediaId) {
    requestUserContext.requireUserId();
    EditorMediaStorageService.StoredMediaFile media = editorMediaStorageService.load(mediaId);

    ContentDisposition disposition =
        ContentDisposition.inline().filename(media.fileName(), StandardCharsets.UTF_8).build();

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
        .contentType(media.mediaType())
        .body(media.resource());
  }
}
