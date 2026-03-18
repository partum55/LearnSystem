package com.university.lms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyllabusResponse {
    private List<SyllabusPage> pages;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SyllabusPage {
        private String id;
        private String title;
        private String icon;
        private String content; // markdown
    }
}
