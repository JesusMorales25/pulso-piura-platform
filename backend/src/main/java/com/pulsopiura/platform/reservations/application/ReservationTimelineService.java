package com.pulsopiura.platform.reservations.application;

import com.pulsopiura.platform.reservations.application.port.ReservationTimelineQuery;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationTimelineService {
    private final ReservationQueryService reservations;
    private final ReservationTimelineQuery timeline;

    public ReservationTimelineService(
            ReservationQueryService reservations, ReservationTimelineQuery timeline) {
        this.reservations = reservations;
        this.timeline = timeline;
    }

    @Transactional(readOnly = true)
    public List<ReservationTimelineQuery.Event> list(UUID actor, UUID reservation) {
        reservations.get(actor, reservation);
        return timeline.list(reservation);
    }
}
