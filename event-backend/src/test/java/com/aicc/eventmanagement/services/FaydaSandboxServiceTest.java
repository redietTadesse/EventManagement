package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.exceptions.BusinessException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FaydaSandboxServiceTest {

    @Test
    void authorizationEncodesTheCallbackAndBindsTheEncryptedAttemptToTheVendor() {
        var service = new FaydaSandboxService(new ObjectMapper());
        ReflectionTestUtils.setField(service, "clientId", "sandbox-client");
        ReflectionTestUtils.setField(service, "privateJwk", "configured");
        ReflectionTestUtils.setField(service, "redirectUri", "http://localhost:3000/callback");
        ReflectionTestUtils.setField(service, "issuer", "https://esignet.ida.fayda.et");
        ReflectionTestUtils.setField(service, "jwksUri", "https://esignet.ida.fayda.et/.well-known/jwks.json");
        ReflectionTestUtils.setField(service, "acrValues", "mosip:idp:acr:generated-code");

        var attempt = service.begin("vendor-a");

        assertThat(attempt.authorizationUrl()).startsWith("https://esignet.ida.fayda.et/authorize?")
                .contains("redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback",
                        "scope=openid", "state=" + attempt.state(), "code_challenge_method=S256");
        assertThat(attempt.ticket().split("\\.", -1)).hasSize(5);
        assertThatThrownBy(() -> service.verify("vendor-b", "code", attempt.state(), attempt.ticket()))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.verify("vendor-a", "code", "wrong-state", attempt.ticket()))
                .isInstanceOf(BusinessException.class);
    }
}

