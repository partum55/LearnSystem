package com.university.lms.course.content.service;

import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.content.domain.EditorMedia;
import com.university.lms.course.content.dto.EditorMediaDto;
import com.university.lms.course.content.repository.EditorMediaRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashSet;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** Stores and validates editor-uploaded files (image/pdf) on local disk. */
@Service
@Slf4j
@RequiredArgsConstructor
public class EditorMediaStorageService {

  private final EditorMediaRepository editorMediaRepository;

  @Value("${editor.media.storage.path:/tmp/lms-editor-media}")
  private String storagePath;

  @Value("${editor.media.max-file-size-bytes:10485760}")
  private long maxFileSizeBytes;

  @Value(
      "${editor.media.allowed-mime-types:image/png,image/jpeg,image/gif,image/webp,application/pdf}")
  private String allowedMimeTypes;

  @Value("${editor.media.allowed-extensions:png,jpg,jpeg,gif,webp,pdf}")
  private String allowedExtensions;

  @Transactional
  public EditorMediaDto store(MultipartFile file, UUID uploadedBy) {
    if (file == null || file.isEmpty()) {
      throw new ValidationException("file", "Uploaded file is empty");
    }

    if (file.getSize() > maxFileSizeBytes) {
      throw new ValidationException("file", "File exceeds max allowed size");
    }

    String originalFilename = sanitizeFilename(file.getOriginalFilename());
    String extension = extractExtension(originalFilename);
    Set<String> extensionAllowlist = parseAllowlist(allowedExtensions);
    if (!extensionAllowlist.contains(extension)) {
      throw new ValidationException("file", "File extension is not allowed");
    }

    String resolvedMimeType =
        resolveMimeType(file, originalFilename)
            .orElseThrow(() -> new ValidationException("file", "Unable to determine file content type"));
    Set<String> mimeAllowlist = parseAllowlist(allowedMimeTypes);
    if (!mimeAllowlist.contains(resolvedMimeType.toLowerCase(Locale.ROOT))) {
      throw new ValidationException("file", "File MIME type is not allowed");
    }

    Path rootPath = Paths.get(storagePath).toAbsolutePath().normalize();
    String storedFilename = UUID.randomUUID() + "." + extension;
    Path target = rootPath.resolve(storedFilename).normalize();
    if (!target.startsWith(rootPath)) {
      throw new ValidationException("file", "Invalid file path");
    }

    try {
      Files.createDirectories(rootPath);
      Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
    } catch (IOException ex) {
      log.error("Failed to store editor media file", ex);
      throw new RuntimeException("Failed to persist uploaded editor media", ex);
    }

    EditorMedia media =
        editorMediaRepository.save(
            EditorMedia.builder()
                .storedFilename(storedFilename)
                .originalFilename(originalFilename)
                .storagePath(target.toString())
                .contentType(resolvedMimeType)
                .fileSize(file.getSize())
                .uploadedBy(uploadedBy)
                .build());

    return toDto(media);
  }

  @Transactional(readOnly = true)
  public StoredMediaFile load(UUID mediaId) {
    EditorMedia media =
        editorMediaRepository
            .findById(mediaId)
            .orElseThrow(() -> new ResourceNotFoundException("EditorMedia", "id", mediaId));

    Path path = Paths.get(media.getStoragePath()).toAbsolutePath().normalize();
    Resource resource = new PathResource(path);
    if (!resource.exists() || !resource.isReadable()) {
      throw new ResourceNotFoundException("Editor media file content not found");
    }

    MediaType mediaType =
        MediaTypeFactory.getMediaType(media.getOriginalFilename())
            .orElse(MediaType.APPLICATION_OCTET_STREAM);

    return new StoredMediaFile(resource, mediaType, media.getOriginalFilename());
  }

  private EditorMediaDto toDto(EditorMedia media) {
    return EditorMediaDto.builder()
        .id(media.getId())
        .url("/api/editor/media/" + media.getId())
        .fileName(media.getOriginalFilename())
        .contentType(media.getContentType())
        .size(media.getFileSize())
        .createdAt(media.getCreatedAt())
        .build();
  }

  private Optional<String> resolveMimeType(MultipartFile file, String originalFilename) {
    if (file.getContentType() != null && !file.getContentType().isBlank()) {
      return Optional.of(file.getContentType().toLowerCase(Locale.ROOT));
    }
    return MediaTypeFactory.getMediaType(originalFilename)
        .map(MediaType::toString)
        .map(type -> type.toLowerCase(Locale.ROOT));
  }

  private Set<String> parseAllowlist(String raw) {
    Set<String> values = new HashSet<>();
    for (String value : raw.split(",")) {
      String normalized = value.trim().toLowerCase(Locale.ROOT);
      if (!normalized.isBlank()) {
        values.add(normalized);
      }
    }
    return values;
  }

  private String sanitizeFilename(String filename) {
    if (filename == null || filename.isBlank()) {
      return "file.bin";
    }

    String sanitized =
        filename.replace("\\", "_").replace("/", "_").replace("..", "_").trim();
    return sanitized.isBlank() ? "file.bin" : sanitized;
  }

  private String extractExtension(String filename) {
    int dot = filename.lastIndexOf('.');
    if (dot <= 0 || dot >= filename.length() - 1) {
      throw new ValidationException("file", "File extension is required");
    }
    return filename.substring(dot + 1).toLowerCase(Locale.ROOT);
  }

  public record StoredMediaFile(Resource resource, MediaType mediaType, String fileName) {}
}
