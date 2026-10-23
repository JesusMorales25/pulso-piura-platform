package com.pulsopiura.platform.foundation.security;

import static org.assertj.core.api.Assertions.*;

import com.fasterxml.jackson.core.exc.StreamConstraintsException;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

class JsonInputLimitsTest {
    @Test
    void normalProfileParsesButOversizedTextFailsBeforeBinding() throws Exception {
        var builder = new Jackson2ObjectMapperBuilder();
        new JsonInputLimits().boundedJsonInputs().customize(builder);
        var mapper = builder.build();
        assertThat(mapper.readTree("{\"bio\":\"Jugador\"}").get("bio").asText())
                .isEqualTo("Jugador");
        assertThatThrownBy(() -> mapper.readTree("{\"bio\":\"" + "x".repeat(20000) + "\"}"))
                .isInstanceOf(StreamConstraintsException.class);
    }
}
