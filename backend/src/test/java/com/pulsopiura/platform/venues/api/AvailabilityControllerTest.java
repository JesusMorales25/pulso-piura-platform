package com.pulsopiura.platform.venues.api;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.pulsopiura.platform.identity.application.CurrentUser;
import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.shared.api.ApiExceptionHandler;
import com.pulsopiura.platform.venues.application.AvailabilityService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AvailabilityControllerTest {
    @Test
    void editEndpointAcceptsCompleteFormAndExplainsInvalidInput() throws Exception {
        var users = mock(CurrentUserService.class);
        var availability = mock(AvailabilityService.class);
        var user = mock(CurrentUser.class);
        var actor = UUID.randomUUID();
        when(user.id()).thenReturn(actor);
        when(users.provision(any())).thenReturn(user);
        var mvc =
                MockMvcBuilders.standaloneSetup(new AvailabilityController(users, availability))
                        .setCustomArgumentResolvers(
                                new org.springframework.security.web.method.annotation
                                        .AuthenticationPrincipalArgumentResolver())
                        .setControllerAdvice(new ApiExceptionHandler())
                        .build();
        var path =
                "/api/v1/organizations/"
                        + UUID.randomUUID()
                        + "/spaces/"
                        + UUID.randomUUID()
                        + "/availability-rules/"
                        + UUID.randomUUID()
                        + "?version=0";
        mvc.perform(
                        put(path)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                {"dayOfWeek":1,"startLocalTime":"08:00","endLocalTime":"23:00","slotMinutes":60,"priceMinor":12499,"validFrom":"2026-10-03","validTo":"2026-10-17"}
                """))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isOk());
        verify(availability)
                .updateRule(
                        eq(actor),
                        any(),
                        any(),
                        any(),
                        eq(1),
                        any(),
                        any(),
                        eq(60),
                        eq(12499L),
                        any(),
                        any(),
                        eq(0L));
        mvc.perform(
                        put(path)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"startLocalTime\":\"incorrecto\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(
                        jsonPath("$.detail")
                                .value("Revisa las fechas, horas y números del formulario."));
    }
}
