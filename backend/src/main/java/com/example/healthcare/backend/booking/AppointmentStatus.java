package com.example.healthcare.backend.booking;

public enum AppointmentStatus {
    PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW;

    public boolean reservesSlot() { return this != CANCELLED; }
    public boolean mutable() { return this == PENDING || this == CONFIRMED || this == IN_PROGRESS; }
    public boolean canTransitionTo(AppointmentStatus next) {
        return (this == PENDING && (next == CONFIRMED || next == CANCELLED))
            || (this == CONFIRMED && (next == IN_PROGRESS || next == CANCELLED || next == NO_SHOW))
            || (this == IN_PROGRESS && next == COMPLETED);
    }
}
