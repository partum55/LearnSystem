package com.university.lms.file.web;

import com.university.lms.course.web.RequestUserContext;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Controller to issue permits (signed URLs or paths) for Supabase Storage uploads.
 */
@RestController
@RequestMapping("/files/permits")
@RequiredArgsConstructor
public class FilePermitController {

    private final RequestUserContext userContext;

    @GetMapping("/upload")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UploadPermit> getUploadPermit(
            @RequestParam String type,
            @RequestParam(required = false) UUID entityId) {

        UUID userId = userContext.requireUserId();
        
        // Logic to decide bucket and path based on type and user permissions
        String bucket = "general";
        String path = String.format("%s/%s/%s", type, userId, UUID.randomUUID());

        if ("submission".equals(type)) {
            bucket = "submissions";
            // Check if user is enrolled in the course of the assignment (entityId)
        }

        return ResponseEntity.ok(UploadPermit.builder()
                .bucket(bucket)
                .path(path)
                .token("supabase-permit-logic-here") // In a real app, this might be a signed URL or custom token
                .build());
    }

    @Data
    @Builder
    public static class UploadPermit {
        private String bucket;
        private String path;
        private String token;
        private String uploadUrl;
    }
}
