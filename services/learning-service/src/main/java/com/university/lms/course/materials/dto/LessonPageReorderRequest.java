package com.university.lms.course.materials.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.List;
import java.util.UUID;

public record LessonPageReorderRequest(
    @NotEmpty List<@Valid LessonPagePositionDto> pages
) {
  public record LessonPagePositionDto(
      @NotNull UUID id,
      @NotNull @PositiveOrZero Integer order
  ) {}
}
