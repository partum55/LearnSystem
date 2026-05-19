package com.university.lms.submission.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class SupabaseSubmissionRequest {
    @NotNull
    private UUID assignmentId;
    private String content;
    private List<SupabaseFileMetadata> files;

    @Data
    public static class SupabaseFileMetadata {
        private String bucket;
        private String path;
        private String fileName;
        private Long fileSize;
        private String contentType;
    }
}
