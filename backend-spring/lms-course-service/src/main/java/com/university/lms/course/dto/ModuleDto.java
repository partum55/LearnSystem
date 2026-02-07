package com.university.lms.course.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * DTO for Module entity responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModuleDto implements Serializable {

    private static final long serialVersionUID = 1L;

    private UUID id;
    private UUID courseId;
    private String title;
    private String description;
    private Integer position;
    private Map<String, Object> contentMeta;
    private Boolean isPublished;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime publishDate;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    private List<ResourceDto> resources;
    private Integer resourceCount;
    private Boolean isAvailable;
}
