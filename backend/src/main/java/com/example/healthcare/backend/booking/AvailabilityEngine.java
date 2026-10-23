package com.example.healthcare.backend.booking;

import java.time.*;
import java.util.*;
import com.example.healthcare.backend.doctor.ShiftType;

/** Half-open intervals; Monday=0 in the existing JPA/SQL Server weekly template. */
public final class AvailabilityEngine {
    public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private AvailabilityEngine() {}
    public record Interval(LocalTime start, LocalTime end, ShiftType type) {}
    public static boolean overlaps(LocalTime start, LocalTime end, LocalTime otherStart, LocalTime otherEnd) {
        return start.isBefore(otherEnd) && otherStart.isBefore(end);
    }
    public static boolean covered(LocalTime start, LocalTime end, List<Interval> intervals) {
        if (!end.isAfter(start)) return false;
        if (intervals.stream().anyMatch(i -> i.type() != ShiftType.WORK
                && overlaps(start, end, i.start(), i.end()))) return false;
        LocalTime cursor = start;
        for (Interval work : intervals.stream().filter(i -> i.type() == ShiftType.WORK)
                .sorted(Comparator.comparing(Interval::start)).toList()) {
            if (work.start().isAfter(cursor)) break;
            if (work.end().isAfter(cursor)) cursor = work.end();
            if (!cursor.isBefore(end)) return true;
        }
        return false;
    }
    public static List<BookingDtos.Slot> slots(LocalDate date, List<Interval> intervals,
            List<Appointment> appointments, Long excludeId, Clock clock) {
        List<BookingDtos.Slot> result = new ArrayList<>();
        // Last valid start is 23:00. Existing shifts cannot cross midnight or end at 24:00.
        for (int minute = 0; minute <= 1380; minute += 30) {
            LocalTime start = LocalTime.of(minute / 60, minute % 60), end = start.plusMinutes(30);
            if (!date.atTime(start).atZone(ZONE).toInstant().isAfter(clock.instant())) continue;
            if (!covered(start, end, intervals)) continue;
            if (appointments.stream().anyMatch(a -> !Objects.equals(excludeId, a.getId())
                    && a.getStatus().reservesSlot() && overlaps(start, end, a.getStartTime(), a.getEndTime()))) continue;
            result.add(new BookingDtos.Slot(date, start, end, date.atTime(start).atZone(ZONE).toOffsetDateTime(),
                date.atTime(end).atZone(ZONE).toOffsetDateTime()));
        }
        return List.copyOf(result);
    }
}
