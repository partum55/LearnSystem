package com.university.lms.course.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * DTO for Resource entity responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResourceDto implements Serializable {

    private static final long serialVersionUID = 1L;

    private UUID id;
    private UUID moduleId;
    private String title;
    private String description;
    private String resourceType;
    private String fileUrl;
    private String externalUrl;
    private Long fileSize;
    private String mimeType;
    private Integer position;
    private Boolean isDownloadable;
    private String textContent;
    private Map<String, Object> metadata;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
