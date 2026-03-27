package com.university.lms.course.assessment.dto;

import com.university.lms.course.assessment.domain.VplTestCase;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VplTestCaseDto {

    private UUID id;
    private String name;
    private String input;
    private String expectedOutput;
    private String checkMode;
    private String testCode;
    private Boolean hidden;
    private Boolean required;
    private Integer weight;
    private Integer position;

    public static VplTestCaseDto fullView(VplTestCase entity) {
        return VplTestCaseDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .input(entity.getInput())
                .expectedOutput(entity.getExpectedOutput())
                .checkMode(entity.getCheckMode())
                .testCode(entity.getTestCode())
                .hidden(entity.getHidden())
                .required(entity.getRequired())
                .weight(entity.getWeight())
                .position(entity.getPosition())
                .build();
    }

    public static VplTestCaseDto hiddenView(VplTestCase entity) {
        return VplTestCaseDto.builder()
                .id(entity.getId())
                .name(Boolean.TRUE.equals(entity.getHidden()) ? "Hidden test" : entity.getName())
                .hidden(entity.getHidden())
                .required(entity.getRequired())
                .weight(entity.getWeight())
                .position(entity.getPosition())
                .build();
    }
}
