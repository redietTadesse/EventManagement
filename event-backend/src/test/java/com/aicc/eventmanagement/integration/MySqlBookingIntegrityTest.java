package com.aicc.eventmanagement.integration;

import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** Reuses the HTTP lifecycle scenarios against an explicitly disposable MySQL schema. */
@EnabledIfEnvironmentVariable(named = "AICC_TEST_MYSQL_URL", matches = ".+")
class MySqlBookingIntegrityTest extends EventLifecycleApiIntegrationTest {
    @DynamicPropertySource
    static void mysql(DynamicPropertyRegistry properties) {
        String url = System.getenv("AICC_TEST_MYSQL_URL");
        if (url == null || !url.matches("jdbc:mysql://(?:localhost|127\\.0\\.0\\.1):3306/aicc_validation_[a-f0-9]{8}")) {
            throw new IllegalArgumentException("MySQL tests require a disposable local aicc_validation_<8 hex> database");
        }
        properties.add("spring.datasource.url", () -> url);
        properties.add("spring.datasource.username", () -> System.getenv("AICC_TEST_DB_USER"));
        properties.add("spring.datasource.password", () -> System.getenv("AICC_TEST_DB_PASSWORD"));
        properties.add("spring.datasource.driver-class-name", () -> "com.mysql.cj.jdbc.Driver");
        properties.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.MySQLDialect");
        properties.add("spring.flyway.enabled", () -> "true");
        properties.add("spring.flyway.validate-on-migrate", () -> "true");
        properties.add("spring.jpa.hibernate.ddl-auto", () -> "none");
    }
}
