package com.university.lms.deadline.calendar.dto;

import com.university.lms.deadline.deadline.dto.DeadlineDto;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.util.List;

@Value
@Builder
public class CalendarDayDto {
    LocalDate date;
    Integer workloadMinutes;
    Boolean isOverloaded;
    List<DeadlineDto> deadlines;
}

