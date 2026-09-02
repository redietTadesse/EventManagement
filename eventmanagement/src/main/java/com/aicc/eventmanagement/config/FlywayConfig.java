package com.aicc.eventmanagement.config;

import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Flyway configuration.
 *
 * Runs {@code repair} before {@code migrate} on every startup, so checksum drift
 * on already-applied migrations (e.g. editing an old migration file during
 * development) no longer prevents the application from starting.
 *
 * Note: {@code repair} only re-aligns the checksum stored in flyway_schema_history
 * with the file on disk — it does NOT re-execute an already-applied migration.
 * Schema changes must always go into a NEW versioned migration (e.g. V2__...sql).
 */
@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> {
            flyway.repair();
            flyway.migrate();
        };
    }
}
