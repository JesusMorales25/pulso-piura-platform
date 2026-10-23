package com.pulsopiura.platform.payments.api;

import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/** Receipt metadata and receiver account details are private just like image responses. */
@RestControllerAdvice(
        assignableTypes = {
            ExternalPaymentController.class,
            OrganizationExternalPaymentController.class
        })
public class ExternalPaymentPrivacyAdvice implements ResponseBodyAdvice<Object> {
    @Override
    public boolean supports(
            MethodParameter type, Class<? extends HttpMessageConverter<?>> converter) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(
            Object body,
            MethodParameter type,
            MediaType contentType,
            Class<? extends HttpMessageConverter<?>> converter,
            ServerHttpRequest request,
            ServerHttpResponse response) {
        response.getHeaders().setCacheControl("no-store");
        return body;
    }
}
