package com.university.lms.course.common.api;

public record PaginationDto(
    int page,
    int pageSize,
    long totalItems,
    int totalPages
) {}
