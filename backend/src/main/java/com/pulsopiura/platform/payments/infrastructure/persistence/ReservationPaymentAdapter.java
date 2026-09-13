package com.pulsopiura.platform.payments.infrastructure.persistence;

import com.pulsopiura.platform.reservations.application.port.ReservationPaymentQuery;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class ReservationPaymentAdapter implements ReservationPaymentQuery {
    private final PaymentOrderRepository orders;

    public ReservationPaymentAdapter(PaymentOrderRepository orders) {
        this.orders = orders;
    }

    public long paidMinor(UUID reservationId) {
        return orders.sumPaid(reservationId);
    }
}
