package com.pulsopiura.platform.media.api;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.pulsopiura.platform.foundation.security.*;
import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.media.application.VisualAssetService;
import com.pulsopiura.platform.venues.api.SpacePhotoController;
import com.pulsopiura.platform.venues.application.SpacePhotoService;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest({VisualAssetController.class, SpacePhotoController.class})
@Import(SecurityConfig.class)
class MediaAuthorizationTest {
    @Autowired MockMvc mvc;
    @MockitoBean VisualAssetService assets;
    @MockitoBean SpacePhotoService photos;
    @MockitoBean CurrentUserService users;
    @MockitoBean OidcRoleClaims roles;
    @MockitoBean SharedWriteRateLimit rate;
    @MockitoBean JwtDecoder decoder;

    @Test
    void publicListsNeedNoTokenAndAdminListRequiresRole() throws Exception {
        when(assets.list()).thenReturn(List.of());
        mvc.perform(get("/api/v1/public/visual-assets")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/public/spaces/" + UUID.randomUUID() + "/photos"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/platform/visual-assets")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/platform/visual-assets").with(jwt()))
                .andExpect(status().isForbidden());
        verifyNoInteractions(users);
    }

    @Test
    void ownerRouteAlwaysRequiresAuthentication() throws Exception {
        mvc.perform(
                        get(
                                "/api/v1/organizations/"
                                        + UUID.randomUUID()
                                        + "/spaces/"
                                        + UUID.randomUUID()
                                        + "/photos"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(photos, users);
    }

    @Test
    void suspendedPlatformAdminCannotAccessAssets() throws Exception {
        when(users.provision(any()))
                .thenThrow(
                        new org.springframework.security.access.AccessDeniedException(
                                "Cuenta no activa"));
        mvc.perform(
                        get("/api/v1/platform/visual-assets")
                                .with(
                                        jwt().authorities(
                                                        new SimpleGrantedAuthority(
                                                                "ROLE_PLATFORM_ADMIN"))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(assets);
    }
}
