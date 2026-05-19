package com.university.lms.course.adminops.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SisImportRowErrorDto {
  private String file;
  private Integer row;
  private String field;
  private String code;
  private String message;
}
