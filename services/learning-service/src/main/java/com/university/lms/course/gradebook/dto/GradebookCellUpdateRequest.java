package com.university.lms.course.gradebook.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record GradebookCellUpdateRequest(
    @NotEmpty List<@Valid CellUpdate> cells
) {
  public record CellUpdate(
      @NotNull UUID studentId,
      @NotNull UUID assignmentId,
      @NotNull @DecimalMin("0.0") BigDecimal points,
      String comment
  ) {}
}
