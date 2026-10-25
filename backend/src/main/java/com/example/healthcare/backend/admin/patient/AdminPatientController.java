package com.example.healthcare.backend.admin.patient;

import java.util.List;
import org.springframework.web.bind.annotation.*;
import com.example.healthcare.backend.common.PageResponse;
import com.example.healthcare.backend.admin.patient.AdminPatientService.*;
import lombok.RequiredArgsConstructor;

/** Admin only: SecurityConfig restricts /api/admin/** to ROLE_ADMIN. */
@RestController
@RequestMapping("/api/admin/patients")
@RequiredArgsConstructor
public class AdminPatientController {

    private final AdminPatientService service;

    @GetMapping
    public PageResponse<AdminPatientDto> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String bloodType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        return service.listPatients(search, status, gender, bloodType, page, size, sortBy, direction);
    }

    @GetMapping("/{id}")
    public AdminPatientDto get(@PathVariable Long id) {
        return service.getPatient(id);
    }

    @PutMapping("/{id}")
    public AdminPatientDto update(@PathVariable Long id, @RequestBody UpdatePatientRequest request) {
        return service.updatePatient(id, request);
    }

    @PatchMapping("/{id}/status")
    public AdminPatientDto updateStatus(
            @PathVariable Long id,
            @RequestParam(required = false) String status,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String newStatus = status != null ? status : (body != null ? body.get("status") : null);
        return service.updateStatus(id, newStatus);
    }

    @GetMapping("/{id}/appointments")
    public List<PatientAppointmentSummary> getAppointments(@PathVariable Long id) {
        return service.getPatientAppointments(id);
    }
}
