package com.university.lms.gradebook.mapper;

import com.university.lms.gradebook.domain.CourseGradeSummary;
import com.university.lms.gradebook.dto.CourseGradeSummaryDto;
import org.mapstruct.*;

import java.math.BigDecimal;

/**
 * MapStruct mapper for CourseGradeSummary entity and DTOs.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CourseGradeSummaryMapper {

    @Mapping(target = "completionPercentage", expression = "java(calculateCompletionPercentage(summary))")
    @Mapping(target = "studentName", ignore = true)
    @Mapping(target = "studentEmail", ignore = true)
    CourseGradeSummaryDto toDto(CourseGradeSummary summary);

    default BigDecimal calculateCompletionPercentage(CourseGradeSummary summary) {
        if (summary.getAssignmentsTotal() > 0) {
            return BigDecimal.valueOf(summary.getAssignmentsCompleted())
                    .divide(BigDecimal.valueOf(summary.getAssignmentsTotal()), 4, BigDecimal.ROUND_HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, BigDecimal.ROUND_HALF_UP);
        }
        return BigDecimal.ZERO;
    }
}

