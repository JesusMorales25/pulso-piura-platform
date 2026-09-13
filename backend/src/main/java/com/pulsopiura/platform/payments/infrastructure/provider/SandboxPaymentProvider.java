package com.pulsopiura.platform.payments.infrastructure.provider;

import com.pulsopiura.platform.payments.application.port.PaymentProviderPort;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class SandboxPaymentProvider implements PaymentProviderPort {
    private final boolean enabled;

    public SandboxPaymentProvider(@Value("${app.payments.mode:disabled}") String mode) {
        enabled = "simulation".equals(mode);
    }

    public boolean simulationEnabled() {
        return enabled;
    }

    public String simulateConfirmedPayment(UUID orderId) {
        if (!enabled)
            throw new IllegalStateException(
                    "Los cobros reales están deshabilitados. El modo de pruebas no está activo.");
        return "SIM-" + orderId;
    }
}
