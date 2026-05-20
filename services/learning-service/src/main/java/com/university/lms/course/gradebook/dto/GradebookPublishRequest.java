package com.university.lms.course.gradebook.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record GradebookPublishRequest(
    @NotEmpty List<UUID> assignmentIds,
    List<UUID> studentIds
) {}
