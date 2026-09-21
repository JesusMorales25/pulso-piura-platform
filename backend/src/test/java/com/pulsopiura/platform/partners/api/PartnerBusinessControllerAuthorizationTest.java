package com.pulsopiura.platform.partners.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

class PartnerBusinessControllerAuthorizationTest {
    @Test
    void everyAdministrativeOperationRequiresPlatformAdministratorRole() {
        assertPlatformAdminOnly(method("all"));
        assertPlatformAdminOnly(
                method(
                        "create",
                        org.springframework.security.oauth2.jwt.Jwt.class,
                        PartnerBusinessController.BusinessRequest.class));
        assertPlatformAdminOnly(
                method(
                        "update",
                        org.springframework.security.oauth2.jwt.Jwt.class,
                        java.util.UUID.class,
                        PartnerBusinessController.BusinessRequest.class));
        assertPlatformAdminOnly(
                method(
                        "updateImage",
                        org.springframework.security.oauth2.jwt.Jwt.class,
                        java.util.UUID.class,
                        org.springframework.web.multipart.MultipartFile.class));
    }

    @Test
    void publicDirectoryDoesNotRequireAnAdministrativeRole() {
        assertThat(method("published").getAnnotation(PreAuthorize.class)).isNull();
        assertThat(method("image", java.util.UUID.class).getAnnotation(PreAuthorize.class))
                .isNull();
    }

    private Method method(String name, Class<?>... parameterTypes) {
        try {
            return PartnerBusinessController.class.getDeclaredMethod(name, parameterTypes);
        } catch (NoSuchMethodException exception) {
            throw new AssertionError(exception);
        }
    }

    private void assertPlatformAdminOnly(Method method) {
        assertThat(method.getAnnotation(PreAuthorize.class))
                .isNotNull()
                .extracting(PreAuthorize::value)
                .isEqualTo("hasRole('PLATFORM_ADMIN')");
    }
}
