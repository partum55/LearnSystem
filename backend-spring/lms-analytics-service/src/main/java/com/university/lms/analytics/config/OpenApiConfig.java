package com.university.lms.analytics.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "LMS Analytics Service API",
        version = "1.0.0",
        description = "AI-powered analytics API for Learning Management System. " +
                     "Provides course statistics, student progress tracking, and predictive analytics.",
        contact = @Contact(
            name = "LMS Development Team",
            email = "lms@university.com"
        ),
        license = @License(
            name = "MIT License",
            url = "https://opensource.org/licenses/MIT"
        )
    ),
    servers = {
        @Server(
            url = "https://localhost:8088",
            description = "Local Development Server (HTTPS)"
        ),
        @Server(
            url = "http://localhost:8088",
            description = "Local Development Server (HTTP)"
        ),
        @Server(
            url = "https://localhost:8080",
            description = "API Gateway (HTTPS)"
        ),
        @Server(
            url = "http://localhost:8080",
            description = "API Gateway (HTTP)"
        )
    }
)
@SecurityScheme(
    name = "Bearer Authentication",
    type = SecuritySchemeType.HTTP,
    bearerFormat = "JWT",
    scheme = "bearer"
)
public class OpenApiConfig {
}

