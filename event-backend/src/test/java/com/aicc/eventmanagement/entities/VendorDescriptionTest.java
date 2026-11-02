package com.aicc.eventmanagement.entities;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class VendorDescriptionTest {
    @Test
    void descriptionsDoNotExposeInsurancePersistenceMetadataDuringFlush() {
        Vendor vendor = Vendor.builder().description("AV services\n[insurance-expiry:2029-11-02]").build();
        assertThat(vendor.getDescription()).isEqualTo("AV services");
        vendor.setDescription("\n[insurance-expiry:2029-11-02]");
        assertThat(vendor.getDescription()).isEmpty();
    }
}
