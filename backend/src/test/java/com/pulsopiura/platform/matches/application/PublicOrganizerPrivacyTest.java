package com.pulsopiura.platform.matches.application;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PublicOrganizerPrivacyTest {
    @Test
    void privateParticipantOnlyOrMissingProfileDoesNotPublishIdentity() {
        for (var visibility : new String[] {"PRIVATE", "PARTICIPANTS", null}) {
            var publicView =
                    MatchDetailMetadataService.publicOrganizer(
                            "Nombre reservado",
                            "https://photo.example.test/person.jpg",
                            visibility);
            assertThat(publicView.displayName()).isEqualTo("Organizador");
            assertThat(publicView.avatarUrl()).isNull();
        }
    }

    @Test
    void publicProfileExplicitlyAllowsPublicOrganizerPresentation() {
        var publicView =
                MatchDetailMetadataService.publicOrganizer(
                        "Nombre público", "https://photo.example.test/person.jpg", "PUBLIC");
        assertThat(publicView.displayName()).isEqualTo("Nombre público");
        assertThat(publicView.avatarUrl()).isEqualTo("https://photo.example.test/person.jpg");
    }
}
