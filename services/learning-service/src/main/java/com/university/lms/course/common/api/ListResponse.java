package com.university.lms.course.common.api;

import java.util.List;
import org.springframework.data.domain.Page;

public record ListResponse<T>(
    List<T> items,
    PaginationDto pagination
) {
  public static <T> ListResponse<T> of(Page<T> page) {
    return new ListResponse<>(
        page.getContent(),
        new PaginationDto(
            page.getNumber() + 1,
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()));
  }

  public static <T> ListResponse<T> of(List<T> items) {
    return new ListResponse<>(
        items,
        new PaginationDto(1, items.size(), items.size(), items.isEmpty() ? 0 : 1));
  }
}
