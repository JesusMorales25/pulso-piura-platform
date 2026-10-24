package com.pulsopiura.platform.payments.infrastructure.storage;

import static org.assertj.core.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulsopiura.platform.payments.application.port.PaymentProofStorage;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class PaymentProofStorageSelectionTest {
    private final ApplicationContextRunner runner =
            new ApplicationContextRunner()
                    .withBean(ObjectMapper.class, ObjectMapper::new)
                    .withUserConfiguration(
                            FileSystemPaymentProofStorage.class, SupabasePaymentProofStorage.class);

    @Test
    void defaultsToFileSystemOnly() {
        runner.run(
                context -> {
                    assertThat(context).hasSingleBean(PaymentProofStorage.class);
                    assertThat(context.getBean(PaymentProofStorage.class))
                            .isInstanceOf(FileSystemPaymentProofStorage.class);
                });
    }

    @Test
    void supabaseExcludesFileSystem() {
        runner.withPropertyValues(
                        "app.payments.proof-storage=supabase",
                        "app.payments.supabase.url=https://example.supabase.co",
                        "app.payments.supabase.secret-key=sb_secret_test")
                .run(
                        context -> {
                            assertThat(context).hasSingleBean(PaymentProofStorage.class);
                            assertThat(context.getBean(PaymentProofStorage.class))
                                    .isInstanceOf(SupabasePaymentProofStorage.class);
                        });
    }

    @Test
    void missingSecretFailsStartup() {
        runner.withPropertyValues(
                        "app.payments.proof-storage=supabase",
                        "app.payments.supabase.url=https://example.supabase.co")
                .run(context -> assertThat(context).hasFailed());
    }
}
