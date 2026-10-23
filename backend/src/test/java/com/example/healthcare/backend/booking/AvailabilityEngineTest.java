package com.example.healthcare.backend.booking;

import static org.junit.jupiter.api.Assertions.*;
import static com.example.healthcare.backend.doctor.ShiftType.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class AvailabilityEngineTest {
    private final LocalDate date = LocalDate.of(2026, 10, 22);
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-21T17:00:00Z"), ZoneOffset.UTC);
    private AvailabilityEngine.Interval interval(String start, String end, com.example.healthcare.backend.doctor.ShiftType type) {
        return new AvailabilityEngine.Interval(LocalTime.parse(start), LocalTime.parse(end), type);
    }
    @Test void breaksAndLeaveOverrideWorkAndTouchingIntervalsDoNotOverlap() {
        var slots = AvailabilityEngine.slots(date, List.of(interval("08:00", "12:00", WORK),
            interval("09:00", "09:30", BREAK), interval("10:00", "11:00", LEAVE)), List.of(), null, clock);
        assertEquals(List.of("08:00", "08:30", "09:30", "11:00", "11:30"), slots.stream().map(s -> s.startTime().toString()).toList());
    }
    @Test void oddShiftBoundariesRoundInwardAndAdjacentWorkCanCoverOneSlot() {
        var slots = AvailabilityEngine.slots(date, List.of(interval("08:10", "09:10", WORK)), List.of(), null, clock);
        assertEquals(List.of(LocalTime.of(8, 30)), slots.stream().map(BookingDtos.Slot::startTime).toList());
        assertTrue(AvailabilityEngine.covered(LocalTime.of(8, 0), LocalTime.of(8, 30),
            List.of(interval("08:00", "08:15", WORK), interval("08:15", "08:30", WORK))));
    }
    @Test void timezoneMidnightAndExactlyNowAreHandledInVietnam() {
        var slots = AvailabilityEngine.slots(date, List.of(interval("00:00", "01:00", WORK)), List.of(), null, clock);
        assertEquals(1, slots.size()); assertEquals(LocalTime.of(0, 30), slots.getFirst().startTime());
        assertEquals(ZoneOffset.ofHours(7), slots.getFirst().startsAt().getOffset());
        assertEquals(Instant.parse("2026-10-21T17:30:00Z"), slots.getFirst().startsAt().toInstant());
    }
    @Test void cancelledSlotsAreReleasedAndAllOtherStatusesOccupyIntervals() {
        Appointment a = new Appointment(); a.setId(7L); a.setStartTime(LocalTime.of(8, 15)); a.setEndTime(LocalTime.of(8, 45));
        for (AppointmentStatus status : AppointmentStatus.values()) {
            a.setStatus(status);
            assertEquals(status == AppointmentStatus.CANCELLED ? 2 : 0,
                AvailabilityEngine.slots(date, List.of(interval("08:00", "09:00", WORK)), List.of(a), null, clock).size());
            assertEquals(2, AvailabilityEngine.slots(date, List.of(interval("08:00", "09:00", WORK)), List.of(a), 7L, clock).size());
        }
    }
    @Test void noWorkAndGapsAndMidnightWrapCannotGenerateSlots() {
        assertFalse(AvailabilityEngine.covered(LocalTime.of(8, 0), LocalTime.of(8, 30),
            List.of(interval("08:00", "08:10", WORK), interval("08:20", "08:30", WORK))));
        assertTrue(AvailabilityEngine.slots(date, List.of(), List.of(), null, clock).isEmpty());
        assertFalse(AvailabilityEngine.covered(LocalTime.of(23, 30), LocalTime.MIDNIGHT, List.of(interval("23:00", "23:59", WORK))));
    }
    @Test void lifecycleRejectsTerminalChangesAndSkippingConsultation() {
        assertTrue(AppointmentStatus.CONFIRMED.canTransitionTo(AppointmentStatus.IN_PROGRESS));
        assertTrue(AppointmentStatus.IN_PROGRESS.canTransitionTo(AppointmentStatus.COMPLETED));
        assertFalse(AppointmentStatus.CONFIRMED.canTransitionTo(AppointmentStatus.COMPLETED));
        for (AppointmentStatus terminal : List.of(AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW))
            for (AppointmentStatus target : AppointmentStatus.values()) assertFalse(terminal.canTransitionTo(target));
    }
}
