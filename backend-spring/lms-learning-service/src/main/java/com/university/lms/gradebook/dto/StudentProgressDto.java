package com.university.lms.gradebook.dto;

public record StudentProgressDto(
    String userId,
    String name,
    double progress,
    double grade,
    String lastActive,
    boolean struggling) {}
