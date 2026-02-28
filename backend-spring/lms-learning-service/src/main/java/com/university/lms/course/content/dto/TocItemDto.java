package com.university.lms.course.content.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Heading item in the generated table of contents. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TocItemDto {

  private Integer level;
  private String text;
  private String anchor;
}
