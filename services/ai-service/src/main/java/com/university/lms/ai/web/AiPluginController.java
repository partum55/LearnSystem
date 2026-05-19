package com.university.lms.ai.web;

import com.university.lms.ai.dto.plugin.*;
import com.university.lms.ai.service.PluginAutoConfigService;
import com.university.lms.ai.service.PluginDiagnosticsService;
import com.university.lms.ai.service.PluginGenerationService;
import com.university.lms.ai.service.PluginInstallClient;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/ai/plugins")
@RequiredArgsConstructor
@Slf4j
public class AiPluginController {

    private final PluginGenerationService pluginGenerationService;
    private final PluginInstallClient pluginInstallClient;
    private final PluginDiagnosticsService diagnosticsService;
    private final PluginAutoConfigService autoConfigService;

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('TEACHER','SUPERADMIN')")
    public ResponseEntity<PluginGenerationResponse> generatePlugin(
            @RequestBody PluginGenerationRequest request) {
        log.info("Plugin generation request: {}", request.pluginName());
        PluginGenerationResponse response = pluginGenerationService.generate(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/generate-and-install")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<PluginGenerateAndInstallResponse> generateAndInstall(
            @RequestBody PluginGenerationRequest request,
            HttpServletRequest httpRequest) {
        log.info("Plugin generate-and-install request: {}", request.pluginName());

        PluginGenerationResponse generated = pluginGenerationService.generate(request);

        String token = extractToken(httpRequest);

        boolean installed = false;
        String installMessage;
        try {
            pluginInstallClient.installGeneratedPlugin(
                    generated.pluginId(),
                    generated.pluginJson(),
                    generated.mainPy(),
                    generated.requirementsTxt(),
                    token
            );
            installed = true;
            installMessage = "Plugin installed successfully";
        } catch (Exception e) {
            installMessage = "Generation succeeded but installation failed: " + e.getMessage();
            log.warn("Plugin installation failed after generation: {}", e.getMessage());
        }

        return ResponseEntity.ok(new PluginGenerateAndInstallResponse(
                generated.pluginId(),
                generated.pluginName(),
                generated.pluginJson(),
                generated.mainPy(),
                generated.requirementsTxt(),
                installed,
                installMessage
        ));
    }

    @PostMapping("/{pluginId}/diagnose")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<PluginDiagnosisResponse> diagnosePlugin(
            @PathVariable String pluginId,
            @RequestBody PluginDiagnosisRequest request,
            HttpServletRequest httpRequest) {
        log.info("Plugin diagnosis request for '{}'", pluginId);
        String token = extractToken(httpRequest);
        PluginDiagnosisResponse response = diagnosticsService.diagnose(pluginId, request, token);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{pluginId}/suggest-config")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<PluginConfigSuggestionResponse> suggestConfig(
            @PathVariable String pluginId,
            @RequestBody PluginConfigSuggestionRequest request,
            HttpServletRequest httpRequest) {
        log.info("Plugin config suggestion request for '{}'", pluginId);
        String token = extractToken(httpRequest);
        PluginConfigSuggestionResponse response = autoConfigService.suggestConfig(pluginId, request, token);
        return ResponseEntity.ok(response);
    }

    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        return authHeader != null && authHeader.startsWith("Bearer ")
                ? authHeader.substring(7) : "";
    }
}
