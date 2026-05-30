package com.university.lms.course.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Request body for admin course owner reassignment. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReassignOwnerRequest {

  @NotNull(message = "New owner id is required")
  private UUID newOwnerId;
}
