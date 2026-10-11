package com.example.healthcare.backend.doctor.dto;

import java.util.List;

/** One row of the schedule board: a doctor and their whole week, Monday first. */
public record DoctorWeekResponse(DoctorResponse doctor, List<ScheduleSlotResponse> slots) {
}
