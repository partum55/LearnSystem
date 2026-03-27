package com.university.lms.course.assessment.seminar;

import lombok.Data;
import java.util.UUID;

@Data
public class AttendanceEntry {
    private UUID userId;
    private Boolean attended;
    private String notes;
}
