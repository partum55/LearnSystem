package com.university.lms.course.adminops.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SisEnrollmentGroupApplyRequest {

  @NotNull private UUID importId;

  @NotBlank private String groupCode;
}
