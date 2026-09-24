package com.example.healthcare.backend.doctor.dto;

/** The stat tiles above the doctors table, plus the badge on the pending requests list. */
public record DoctorStatsResponse(long total, long active, long available, long onLeave, long pendingRequests) {
}
