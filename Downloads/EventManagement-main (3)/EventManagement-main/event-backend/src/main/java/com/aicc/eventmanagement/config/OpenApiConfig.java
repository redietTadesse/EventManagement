package com.aicc.eventmanagement.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .servers(List.of(new Server().url(baseUrl).description("Development Server")))
                .info(new Info()
                        .title("AICC Event Management API")
                        .version("1.0.0")
                        .description("""
                                # AICC Event Management System
                                This API powers the event management and vendor coordination system for AICC.

                                ## Features
                                - Submit and manage event inquiries
                                - Convert inquiries to events
                                - Automatic checklist generation
                                - Vendor assignment and conflict detection
                                - Workflow-driven state management
                                """)
                        .contact(new Contact()
                                .name("Development Team")
                                .email("dev@aicc.et")
                                .url("https://aicc.et"))
                        .license(new License()
                                .name("Proprietary")
                                .url("https://aicc.et")));
    }
}