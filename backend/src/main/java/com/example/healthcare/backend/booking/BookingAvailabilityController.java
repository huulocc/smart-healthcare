package com.example.healthcare.backend.booking;

import static com.example.healthcare.backend.booking.BookingDtos.*;
import java.time.LocalDate;
import java.util.List;
import com.example.healthcare.backend.auth.AuthenticatedUser;
import com.example.healthcare.backend.common.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController @RequiredArgsConstructor
public class BookingAvailabilityController {
    private final BookingService service;
    @GetMapping("/api/booking/doctors")
    public PageResponse<DoctorInfo> doctors(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(required = false) Long departmentId, @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return service.doctorList(user, departmentId, search, page, size);
    }
    @GetMapping("/api/booking/doctors/{id}")
    public DoctorInfo doctor(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        return service.doctorDetails(user, id);
    }
    @GetMapping("/api/booking/doctors/{id}/availability")
    public AvailabilityResponse availability(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id,
            @RequestParam(required = false) LocalDate from, @RequestParam(required = false) LocalDate to) {
        return service.availability(user, id, from, to);
    }
    @GetMapping({"/api/doctor/availability-exceptions", "/api/admin/doctors/{doctorId}/availability-exceptions"})
    public List<ExceptionResponse> exceptions(@AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable(required = false) Long doctorId, @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        return service.exceptionList(user, doctorId, from, to);
    }
    @PostMapping({"/api/doctor/availability-exceptions", "/api/admin/doctors/{doctorId}/availability-exceptions"})
    @ResponseStatus(HttpStatus.CREATED)
    public ExceptionResponse addException(@AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable(required = false) Long doctorId, @Valid @RequestBody ExceptionRequest request) {
        return service.addException(user, doctorId, request);
    }
    @DeleteMapping({"/api/doctor/availability-exceptions/{id}", "/api/admin/availability-exceptions/{id}"})
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteException(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        service.deleteException(user, id);
    }
}
