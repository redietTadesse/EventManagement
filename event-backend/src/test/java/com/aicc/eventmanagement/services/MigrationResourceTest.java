package com.aicc.eventmanagement.services;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import java.util.HashMap;
import static org.assertj.core.api.Assertions.assertThat;

class MigrationResourceTest {
    @Test
    void everyDatabaseMigrationHasAUniqueVersion() throws Exception {
        var scripts = new PathMatchingResourcePatternResolver().getResources("classpath*:db/migration/V*__*.sql");
        assertThat(scripts).isNotEmpty();
        var versions = new HashMap<String, String>();
        for (var script : scripts) {
            String filename = script.getFilename();
            String version = filename.substring(1, filename.indexOf("__"));
            assertThat(versions.putIfAbsent(version, filename))
                    .as("Duplicate migration version %s in %s", version, filename).isNull();
        }
    }
}
