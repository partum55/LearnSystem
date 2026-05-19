package com.university.lms.submission.service;

import com.university.lms.common.exception.ValidationException;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.UUID;

/**
 * Stores uploaded submission files on local disk.
 */
@Service
@Slf4j
public class SubmissionFileStorageService {

    private final Path rootPath;

    public SubmissionFileStorageService(@Value("${submission.storage.path:/tmp/lms-submissions}") String storagePath) {
        this.rootPath = Paths.get(storagePath).toAbsolutePath().normalize();
    }

    public StoredFile store(UUID submissionId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("file", "Uploaded file is empty");
        }

        String originalFilename = sanitizeFilename(file.getOriginalFilename());
        String storedFilename = UUID.randomUUID() + "_" + originalFilename;

        try {
            Path submissionDir = rootPath.resolve(submissionId.toString());
            Files.createDirectories(submissionDir);

            Path storedPath = submissionDir.resolve(storedFilename).normalize();
            if (!storedPath.startsWith(submissionDir)) {
                throw new ValidationException("file", "Invalid file path");
            }

            Files.copy(file.getInputStream(), storedPath, StandardCopyOption.REPLACE_EXISTING);
            return new StoredFile(
                    originalFilename,
                    "/submissions/" + submissionId + "/files/" + storedFilename,
                    storedPath.toString(),
                    Objects.requireNonNullElse(file.getContentType(), "application/octet-stream"),
                    file.getSize(),
                    storedFilename
            );
        } catch (IOException ex) {
            log.error("Failed to store submission file", ex);
            throw new RuntimeException("Failed to store uploaded file", ex);
        }
    }

    public Path resolve(String relativePath) {
        Path resolved = rootPath.resolve(relativePath).normalize();
        if (!resolved.startsWith(rootPath)) {
            throw new ValidationException("file", "Invalid file path");
        }
        return resolved;
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "file.bin";
        }

        String sanitized = filename
                .replace("\\", "_")
                .replace("/", "_")
                .replace("..", "_")
                .trim();

        if (sanitized.isBlank()) {
            return "file.bin";
        }
        return sanitized;
    }

    @Getter
    public static class StoredFile {
        private final String originalFilename;
        private final String publicUrl;
        private final String storagePath;
        private final String contentType;
        private final long size;
        private final String storedFilename;

        public StoredFile(String originalFilename,
                          String publicUrl,
                          String storagePath,
                          String contentType,
                          long size,
                          String storedFilename) {
            this.originalFilename = originalFilename;
            this.publicUrl = publicUrl;
            this.storagePath = storagePath;
            this.contentType = contentType;
            this.size = size;
            this.storedFilename = storedFilename;
        }
    }
}
