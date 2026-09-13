package com.pulsopiura.platform.payments.infrastructure.provider;

import com.pulsopiura.platform.matches.application.MatchPaymentProvider;
import com.pulsopiura.platform.payments.application.port.PaymentProviderPort;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class MatchPaymentProviderAdapter implements MatchPaymentProvider {
    private final PaymentProviderPort provider;

    public MatchPaymentProviderAdapter(PaymentProviderPort provider) {
        this.provider = provider;
    }

    @Override
    public boolean simulationEnabled() {
        return provider.simulationEnabled();
    }

    @Override
    public String simulateConfirmedPayment(UUID orderId) {
        return provider.simulateConfirmedPayment(orderId);
    }
}
