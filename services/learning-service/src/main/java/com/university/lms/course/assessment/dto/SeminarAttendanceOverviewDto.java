package com.university.lms.course.assessment.dto;

import java.util.List;

public record SeminarAttendanceOverviewDto(
    SeminarAttendanceSessionDto activeSession,
    int checkedInCount,
    List<SeminarAttendanceRecordDto> records
) {}
