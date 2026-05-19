package com.university.lms.ai.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentDataDto {
  private String studentId;
  private List<Double> grades;
  private double progress;
}
