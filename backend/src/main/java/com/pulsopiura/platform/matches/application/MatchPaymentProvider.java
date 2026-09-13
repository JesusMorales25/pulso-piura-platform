package com.pulsopiura.platform.matches.application;

import java.util.UUID;

public interface MatchPaymentProvider {
    boolean simulationEnabled();

    String simulateConfirmedPayment(UUID orderId);
}
