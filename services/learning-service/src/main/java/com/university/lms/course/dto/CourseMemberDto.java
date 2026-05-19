package com.university.lms.course.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for CourseMember entity responses. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseMemberDto implements Serializable {

  private static final long serialVersionUID = 1L;

  private UUID id;
  private UUID courseId;
  private String courseCode;
  private String courseTitle;

  private UUID userId;
  private String userName;
  private String userEmail;

  private String roleInCourse;
  private UUID addedBy;

  @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
  private LocalDateTime addedAt;

  @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
  private LocalDateTime updatedAt;

  private String enrollmentStatus;

  @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
  private LocalDateTime completionDate;

  private BigDecimal finalGrade;
}
