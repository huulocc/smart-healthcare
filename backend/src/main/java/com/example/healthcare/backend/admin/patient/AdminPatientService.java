package com.example.healthcare.backend.admin.patient;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.healthcare.backend.booking.Appointment;
import com.example.healthcare.backend.booking.AppointmentRepository;
import com.example.healthcare.backend.booking.Patient;
import com.example.healthcare.backend.booking.PatientRepository;
import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.common.PageResponse;
import com.example.healthcare.backend.user.User;
import com.example.healthcare.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminPatientService {

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;

    public record AdminPatientDto(
            Long id,
            Long userId,
            String patientCode,
            String fullName,
            String email,
            String phone,
            LocalDate dob,
            String address,
            String gender,
            String bloodType,
            String emergencyContactName,
            String emergencyContactPhone,
            String insuranceNumber,
            String status,
            Instant createdAt,
            Instant updatedAt,
            long appointmentCount
    ) {
        public static AdminPatientDto from(Patient p, long appointmentCount) {
            User u = p.getUser();
            return new AdminPatientDto(
                    p.getId(),
                    u != null ? u.getId() : null,
                    p.getPatientCode(),
                    u != null ? u.getFullName() : "",
                    u != null ? u.getEmail() : "",
                    u != null ? u.getPhone() : "",
                    u != null ? u.getDob() : null,
                    u != null ? u.getAddress() : null,
                    p.getGender(),
                    p.getBloodType(),
                    p.getEmergencyContactName(),
                    p.getEmergencyContactPhone(),
                    p.getInsuranceNumber(),
                    p.getStatus(),
                    p.getCreatedAt(),
                    p.getUpdatedAt(),
                    appointmentCount
            );
        }
    }

    public record UpdatePatientRequest(
            String fullName,
            String phone,
            LocalDate dob,
            String address,
            String gender,
            String bloodType,
            String emergencyContactName,
            String emergencyContactPhone,
            String insuranceNumber,
            String status
    ) {}

    public record PatientAppointmentSummary(
            Long id,
            String appointmentCode,
            String doctorName,
            String departmentName,
            LocalDate appointmentDate,
            String startTime,
            String endTime,
            String status,
            String reason
    ) {
        public static PatientAppointmentSummary from(Appointment a) {
            return new PatientAppointmentSummary(
                    a.getId(),
                    a.getAppointmentCode(),
                    a.getDoctor() != null && a.getDoctor().getUser() != null ? a.getDoctor().getUser().getFullName() : "Doctor",
                    a.getDoctor() != null && a.getDoctor().getDepartment() != null ? a.getDoctor().getDepartment().getName() : "General",
                    a.getAppointmentDate(),
                    a.getStartTime() != null ? a.getStartTime().toString() : "",
                    a.getEndTime() != null ? a.getEndTime().toString() : "",
                    a.getStatus() != null ? a.getStatus().name() : "",
                    a.getReason()
            );
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminPatientDto> listPatients(
            String search,
            String status,
            String gender,
            String bloodType,
            int page,
            int size,
            String sortBy,
            String direction
    ) {
        Sort sort = Sort.by("asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC,
                sortBy != null && !sortBy.isBlank() ? sortBy : "createdAt");
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100), sort);

        Page<Patient> p = patientRepository.findAll((root, query, cb) -> {
            var predicates = cb.conjunction();
            var userJoin = root.join("user");

            if (search != null && !search.isBlank()) {
                String term = "%" + search.trim().toLowerCase() + "%";
                predicates = cb.and(predicates, cb.or(
                        cb.like(cb.lower(root.get("patientCode")), term),
                        cb.like(cb.lower(userJoin.get("fullName")), term),
                        cb.like(cb.lower(userJoin.get("email")), term),
                        cb.like(cb.lower(userJoin.get("phone")), term),
                        cb.like(cb.lower(root.get("insuranceNumber")), term)
                ));
            }
            if (status != null && !status.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("status"), status.trim().toUpperCase()));
            }
            if (gender != null && !gender.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("gender"), gender.trim()));
            }
            if (bloodType != null && !bloodType.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("bloodType"), bloodType.trim().toUpperCase()));
            }
            return predicates;
        }, pageable);

        List<AdminPatientDto> items = p.getContent().stream().map(pt -> {
            long apptCount = appointmentRepository.count((root, q, cb) -> cb.equal(root.get("patient").get("id"), pt.getId()));
            return AdminPatientDto.from(pt, apptCount);
        }).toList();

        return new PageResponse<>(items, p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }

    @Transactional(readOnly = true)
    public AdminPatientDto getPatient(Long id) {
        Patient pt = patientRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Patient not found"));
        long apptCount = appointmentRepository.count((root, q, cb) -> cb.equal(root.get("patient").get("id"), pt.getId()));
        return AdminPatientDto.from(pt, apptCount);
    }

    @Transactional
    public AdminPatientDto updatePatient(Long id, UpdatePatientRequest req) {
        Patient pt = patientRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Patient not found"));

        if (req.gender() != null) pt.setGender(req.gender().trim());
        if (req.bloodType() != null) pt.setBloodType(req.bloodType().trim().toUpperCase());
        if (req.emergencyContactName() != null) pt.setEmergencyContactName(req.emergencyContactName().trim());
        if (req.emergencyContactPhone() != null) pt.setEmergencyContactPhone(req.emergencyContactPhone().trim());
        if (req.insuranceNumber() != null) pt.setInsuranceNumber(req.insuranceNumber().trim());
        if (req.status() != null && !req.status().isBlank()) {
            String st = req.status().trim().toUpperCase();
            if ("ACTIVE".equals(st) || "INACTIVE".equals(st)) {
                pt.setStatus(st);
            }
        }

        User u = pt.getUser();
        if (u != null) {
            if (req.fullName() != null && !req.fullName().isBlank()) u.setFullName(req.fullName().trim());
            if (req.phone() != null && !req.phone().isBlank()) u.setPhone(req.phone().trim());
            if (req.dob() != null) u.setDob(req.dob());
            if (req.address() != null) u.setAddress(req.address().trim());
            userRepository.save(u);
        }

        Patient saved = patientRepository.save(pt);
        long apptCount = appointmentRepository.count((root, q, cb) -> cb.equal(root.get("patient").get("id"), saved.getId()));
        return AdminPatientDto.from(saved, apptCount);
    }

    @Transactional
    public AdminPatientDto updateStatus(Long id, String status) {
        Patient pt = patientRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Patient not found"));

        if (status == null || status.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Status is required");
        }
        String st = status.trim().toUpperCase();
        if (!"ACTIVE".equals(st) && !"INACTIVE".equals(st)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Status must be ACTIVE or INACTIVE");
        }

        pt.setStatus(st);
        Patient saved = patientRepository.save(pt);
        long apptCount = appointmentRepository.count((root, q, cb) -> cb.equal(root.get("patient").get("id"), saved.getId()));
        return AdminPatientDto.from(saved, apptCount);
    }

    @Transactional(readOnly = true)
    public List<PatientAppointmentSummary> getPatientAppointments(Long patientId) {
        if (!patientRepository.existsById(patientId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Patient not found");
        }
        Page<Appointment> page = appointmentRepository.findAll(
                (root, q, cb) -> cb.equal(root.get("patient").get("id"), patientId),
                PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "appointmentDate", "startTime"))
        );
        return page.getContent().stream().map(PatientAppointmentSummary::from).toList();
    }
}
