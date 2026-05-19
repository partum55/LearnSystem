package com.university.lms.ai.web;

import com.university.lms.ai.dto.WidgetGenerationRequest;
import com.university.lms.ai.dto.WidgetGenerationResponse;
import com.university.lms.ai.service.WidgetGenerationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/v1/ai/widget")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('TEACHER','TA','SUPERADMIN')")
public class WidgetGenerationController {

    private final WidgetGenerationService widgetGenerationService;

    @PostMapping("/generate")
    public ResponseEntity<WidgetGenerationResponse> generateWidget(
            @Valid @RequestBody WidgetGenerationRequest request,
            HttpServletRequest httpRequest) {
        UUID userId = (UUID) httpRequest.getAttribute("userId");
        String apiKey = (String) httpRequest.getAttribute("userApiKey");

        log.info("Widget generation request from user {}: {}", userId,
                request.prompt().length() > 80 ? request.prompt().substring(0, 80) + "..." : request.prompt());

        WidgetGenerationResponse response = widgetGenerationService.generateWidget(request, apiKey);
        return ResponseEntity.ok(response);
    }
}
