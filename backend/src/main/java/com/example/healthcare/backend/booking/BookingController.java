package com.example.healthcare.backend.booking;

import static com.example.healthcare.backend.booking.BookingDtos.*;
import java.time.LocalDate;
import java.util.Map;
import com.example.healthcare.backend.auth.AuthenticatedUser;
import com.example.healthcare.backend.common.*;
import com.example.healthcare.backend.user.Role;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController @RequiredArgsConstructor
@RequestMapping({"/api/appointments", "/api/doctor/appointments", "/api/admin/appointments"})
public class BookingController {
    private final BookingService service;
    private static AuthenticatedUser scoped(AuthenticatedUser user, HttpServletRequest request) {
        if (user == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "Please log in");
        String path = request.getRequestURI().substring(request.getContextPath().length());
        Role required = path.startsWith("/api/admin/") ? Role.ADMIN
            : path.startsWith("/api/doctor/") ? Role.DOCTOR : Role.PATIENT;
        if (user.role() != required) throw new ApiException(HttpStatus.FORBIDDEN, "This endpoint is not available for your role");
        return user;
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Confirmation create(@AuthenticationPrincipal AuthenticatedUser user, HttpServletRequest http,
            @RequestHeader(value = "Idempotency-Key", required = false) String key, @Valid @RequestBody CreateRequest request) {
        return service.create(scoped(user, http), key, request);
    }
    @GetMapping
    public PageResponse<Confirmation> list(@AuthenticationPrincipal AuthenticatedUser user, HttpServletRequest http,
            @RequestParam(required = false) AppointmentStatus status, @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to, @RequestParam(defaultValue = "ALL") View view,
            @RequestParam(required = false) Long patientId, @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) Long departmentId, @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return service.list(scoped(user, http), status, from, to, view, patientId, doctorId, departmentId, search, page, size);
    }
    @GetMapping("/{id}")
    public Confirmation details(@AuthenticationPrincipal AuthenticatedUser user, HttpServletRequest http, @PathVariable Long id) {
        return service.details(scoped(user, http), id);
    }
    @GetMapping("/{id}/history")
    public PageResponse<History> history(@AuthenticationPrincipal AuthenticatedUser user, HttpServletRequest http,
            @PathVariable Long id, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return service.historyList(scoped(user, http), id, page, size);
    }
    @PostMapping("/{id}/cancel")
    public Confirmation cancel(@AuthenticationPrincipal AuthenticatedUser user, HttpServletRequest http,
            @PathVariable Long id, @Valid @RequestBody CancelRequest request) {
        return service.cancel(scoped(user, http), id, request);
    }
    @PostMapping("/{id}/reschedule")
    public Confirmation reschedule(@AuthenticationPrincipal AuthenticatedUser user, HttpServletRequest http,
            @PathVariable Long id, @Valid @RequestBody RescheduleRequest request) {
        return service.reschedule(scoped(user, http), id, request);
    }
    @PatchMapping("/{id}/status")
    public Confirmation status(@AuthenticationPrincipal AuthenticatedUser user, HttpServletRequest http,
            @PathVariable Long id, @Valid @RequestBody StatusRequest request) {
        return service.transition(scoped(user, http), id, request);
    }
    @PatchMapping("/{id}/notes")
    public Confirmation notes(@AuthenticationPrincipal AuthenticatedUser user, HttpServletRequest http,
            @PathVariable Long id, @Valid @RequestBody NotesRequest request) {
        return service.notes(scoped(user, http), id, request);
    }
    @GetMapping("/statistics")
    public Map<AppointmentStatus, Long> stats(@AuthenticationPrincipal AuthenticatedUser user, HttpServletRequest http) {
        return service.statistics(scoped(user, http));
    }
}
