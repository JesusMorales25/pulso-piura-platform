package com.pulsopiura.platform.profiles.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.profiles.infrastructure.persistence.*;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class LegalAcceptanceTest {
    @Test
    void rejectsInventedOrPartialVersionsWithoutSavingConsent() {
        var profiles = mock(PlayerProfileRepository.class);
        var consents = mock(UserConsentRepository.class);
        var id = UUID.randomUUID();
        when(profiles.findById(id)).thenReturn(Optional.of(PlayerProfileEntity.pending(id)));
        var service = new PlayerProfileService(profiles, consents);
        assertThatThrownBy(
                        () ->
                                service.update(
                                        id,
                                        null,
                                        null,
                                        "PRIVATE",
                                        null,
                                        null,
                                        "invented",
                                        "invented"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                        () ->
                                service.update(
                                        id,
                                        null,
                                        null,
                                        "PRIVATE",
                                        null,
                                        null,
                                        LegalDocuments.CURRENT_VERSION,
                                        ""))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(consents);
    }

    @Test
    void storesCurrentVersionsEvenWhenAnOlderAcceptanceExists() {
        var profiles = mock(PlayerProfileRepository.class);
        var consents = mock(UserConsentRepository.class);
        var id = UUID.randomUUID();
        when(profiles.findById(id)).thenReturn(Optional.of(PlayerProfileEntity.pending(id)));
        when(consents.existsByUserId(id)).thenReturn(true);
        var result =
                new PlayerProfileService(profiles, consents)
                        .update(
                                id,
                                null,
                                null,
                                "PRIVATE",
                                null,
                                null,
                                LegalDocuments.CURRENT_VERSION,
                                LegalDocuments.CURRENT_VERSION);
        verify(consents).save(any(UserConsentEntity.class));
        org.assertj.core.api.Assertions.assertThat(result.onboardingStatus()).isEqualTo("COMPLETE");
        org.assertj.core.api.Assertions.assertThat(result.homeDistrictCode()).isNull();
    }
}
