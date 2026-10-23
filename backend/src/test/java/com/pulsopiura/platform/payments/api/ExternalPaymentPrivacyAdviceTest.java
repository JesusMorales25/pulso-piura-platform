package com.pulsopiura.platform.payments.api;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class ExternalPaymentPrivacyAdviceTest {
    @Test
    void privateMetadataResponsesMustNotEnterBrowserOrSharedCaches() {
        var advice = new ExternalPaymentPrivacyAdvice();
        var response =
                new org.springframework.http.server.ServletServerHttpResponse(
                        new org.springframework.mock.web.MockHttpServletResponse());
        var body = java.util.Map.of("phone", "999888777");
        assertSame(body, advice.beforeBodyWrite(body, null, null, null, null, response));
        assertEquals("no-store", response.getHeaders().getFirst("Cache-Control"));
    }
}
