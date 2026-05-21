package com.university.lms.course.materials.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.List;
import java.util.UUID;

public record LessonBlockReorderRequest(
    @NotEmpty List<@Valid LessonBlockPositionDto> blocks
) {
  public record LessonBlockPositionDto(
      @NotNull UUID id,
      @PositiveOrZero int order
  ) {}
}
