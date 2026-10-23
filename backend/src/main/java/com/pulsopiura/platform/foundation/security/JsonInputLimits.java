package com.pulsopiura.platform.foundation.security;

import com.fasterxml.jackson.core.StreamReadConstraints;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JsonInputLimits {
    @Bean
    Jackson2ObjectMapperBuilderCustomizer boundedJsonInputs() {
        return builder ->
                builder.postConfigurer(
                        mapper ->
                                mapper.getFactory()
                                        .setStreamReadConstraints(
                                                StreamReadConstraints.builder()
                                                        .maxNestingDepth(64)
                                                        .maxStringLength(16384)
                                                        .maxNameLength(128)
                                                        .maxNumberLength(128)
                                                        .build()));
    }
}
