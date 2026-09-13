package com.pulsopiura.platform.payments.application.port;

import java.util.UUID;

/** Real collection stays disabled until an authenticated provider is contracted. */
public interface PaymentProviderPort {
    boolean simulationEnabled();

    String simulateConfirmedPayment(UUID orderId);
}
