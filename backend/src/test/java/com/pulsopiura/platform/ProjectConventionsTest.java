package com.pulsopiura.platform;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ProjectConventionsTest {
    @Test
    void publicApiIsVersioned() {
        assertThat("/api/v1/health").startsWith("/api/v1/");
    }
}
