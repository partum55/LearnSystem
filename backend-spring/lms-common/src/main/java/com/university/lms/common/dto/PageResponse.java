package com.university.lms.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Generic paginated response wrapper.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {
    private List<T> content;
    private int pageNumber;
    private int pageSize;
    private long totalElements;
    private int totalPages;
    private boolean first;
    private boolean last;

    public static <T> PageResponse<T> of(List<T> content, int page, int size, long totalElements) {
        long safeTotalElements = Math.max(totalElements, 0);
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        List<T> safeContent = content == null ? List.of() : List.copyOf(content);
        long totalPagesLong = (safeTotalElements + safeSize - 1) / safeSize;
        int totalPages = totalPagesLong > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) totalPagesLong;

        PageResponse<T> response = new PageResponse<>();
        response.setContent(safeContent);
        response.setPageNumber(safePage);
        response.setPageSize(safeSize);
        response.setTotalElements(safeTotalElements);
        response.setTotalPages(totalPages);
        response.setFirst(safePage == 0);
        response.setLast(totalPages == 0 || safePage >= totalPages - 1);
        return response;
    }
}
