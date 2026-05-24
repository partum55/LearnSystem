package com.university.lms.course.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentGroupMemberDto implements Serializable {
  private static final long serialVersionUID = 1L;

  private UUID id;
  private UUID groupId;
  private UUID userId;
  private String userName;
  private String userEmail;
  private LocalDateTime createdAt;
}
