package com.example.healthcare.backend.doctor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.example.healthcare.backend.booking.Appointment;
import com.example.healthcare.backend.booking.AppointmentRepository;
import com.example.healthcare.backend.booking.AppointmentStatus;
import com.example.healthcare.backend.booking.Patient;
import com.example.healthcare.backend.booking.PatientRepository;
import com.example.healthcare.backend.department.Department;
import com.example.healthcare.backend.support.AdminApiTestSupport;
import com.example.healthcare.backend.user.Role;
import com.example.healthcare.backend.user.User;
import com.jayway.jsonpath.JsonPath;

public class DoctorManagementIntegrationTest extends AdminApiTestSupport {

    @Autowired
    private DoctorScheduleRepository scheduleRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    /** Helper to create an active doctor user with login capability and return their auth token */
    private record DoctorLogin(Doctor doctor, String token) {}

    private DoctorLogin createDoctorWithLogin(String fullName, Department dept) throws Exception {
        String email = uniqueEmail();
        User user = new User();
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPhone("090" + (int)(Math.random() * 9000000 + 1000000));
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setRole(Role.DOCTOR);
        user.setEmailVerified(true);
        userRepository.save(user);

        Doctor doc = new Doctor();
        doc.setUser(user);
        doc.setDoctorCode("DR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        doc.setDepartment(dept);
        doc.setSpecialty("Cardiology");
        doc.setExperienceYears(8);
        doc.setAvailability(Availability.AVAILABLE);
        doc.setStatus(DoctorStatus.ACTIVE);
        doc.setBiography("Dedicated cardiology specialist with 8 years of clinical practice.");
        doc.setExpertise("Cardiology, Echocardiogram, Heart Health");
        doc.setLanguages("English, Vietnamese");
        doc.setAvatarUrl("/images/doctor_1.jpg");
        doctorRepository.save(doc);

        String token = tokenOf(login(email, PASSWORD));
        return new DoctorLogin(doc, token);
    }

    // -------------------------------------------------------------
    // 1. Authorization checks
    // -------------------------------------------------------------

    @Test
    @DisplayName("Doctor endpoints reject anonymous requests with 401")
    void doctorEndpointsRejectAnonymous() throws Exception {
        get("/api/doctor/me", null).andExpect(status().isUnauthorized());
        get("/api/doctor/appointments", null).andExpect(status().isUnauthorized());
        get("/api/doctor/appointments/statistics", null).andExpect(status().isUnauthorized());
        get("/api/doctor/schedules", null).andExpect(status().isUnauthorized());
        get("/api/doctor/availability-exceptions", null).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Doctor endpoints reject regular patient tokens with 403")
    void doctorEndpointsRejectPatientRole() throws Exception {
        String patientToken = registerAndLogin(uniqueEmail());
        get("/api/doctor/me", patientToken).andExpect(status().isForbidden());
        get("/api/doctor/appointments", patientToken).andExpect(status().isForbidden());
        get("/api/doctor/appointments/statistics", patientToken).andExpect(status().isForbidden());
        get("/api/doctor/schedules", patientToken).andExpect(status().isForbidden());
        get("/api/doctor/availability-exceptions", patientToken).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Doctor endpoints reject admin tokens on self-service operations with 403")
    void doctorMeRejectsAdminToken() throws Exception {
        // Admin has ROLE_ADMIN, not ROLE_DOCTOR
        get("/api/doctor/me", admin).andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------
    // 2. Doctor Identity Resolution & Zero Appointments
    // -------------------------------------------------------------

    @Test
    @DisplayName("GET /api/doctor/me returns real identity matching authenticated doctor, even with identical names")
    void doctorMeResolvesCorrectIdentity() throws Exception {
        Department dept = department("Cardiology");

        // Two doctors with the EXACT SAME full name
        DoctorLogin d1 = createDoctorWithLogin("Dr. Nguyen Van A", dept);
        DoctorLogin d2 = createDoctorWithLogin("Dr. Nguyen Van A", dept);

        assertThat(d1.doctor().getId()).isNotEqualTo(d2.doctor().getId());

        // Doctor 1 calls /me -> receives Doctor 1's ID and DoctorCode
        get("/api/doctor/me", d1.token())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(d1.doctor().getId()))
                .andExpect(jsonPath("$.doctorCode").value(d1.doctor().getDoctorCode()))
                .andExpect(jsonPath("$.fullName").value("Dr. Nguyen Van A"))
                .andExpect(jsonPath("$.specialty").value("Cardiology"))
                .andExpect(jsonPath("$.biography").value("Dedicated cardiology specialist with 8 years of clinical practice."))
                .andExpect(jsonPath("$.expertise").value("Cardiology, Echocardiogram, Heart Health"))
                .andExpect(jsonPath("$.languages").value("English, Vietnamese"));

        // Doctor 2 calls /me -> receives Doctor 2's ID and DoctorCode
        get("/api/doctor/me", d2.token())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(d2.doctor().getId()))
                .andExpect(jsonPath("$.doctorCode").value(d2.doctor().getDoctorCode()));
    }

    @Test
    @DisplayName("Doctor with zero appointments can access dashboard and statistics cleanly")
    void doctorWithZeroAppointments() throws Exception {
        Department dept = department("Pediatrics");
        DoctorLogin d = createDoctorWithLogin("Dr. Zero Appointments", dept);

        // Appointments list is empty
        get("/api/doctor/appointments", d.token())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)))
                .andExpect(jsonPath("$.totalElements").value(0));

        // Statistics returns all zeroes
        get("/api/doctor/appointments/statistics", d.token())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.CONFIRMED").value(0))
                .andExpect(jsonPath("$.COMPLETED").value(0))
                .andExpect(jsonPath("$.CANCELLED").value(0));
    }

    // -------------------------------------------------------------
    // 3. Public Profile Updates
    // -------------------------------------------------------------

    @Test
    @DisplayName("PATCH /api/doctor/me/public-profile updates biography, expertise, languages in database")
    void updateDoctorPublicProfile() throws Exception {
        Department dept = department("Dermatology");
        DoctorLogin d = createDoctorWithLogin("Dr. Skin Care", dept);

        patchJson("/api/doctor/me/public-profile", """
                {
                    "biography": "Updated clinical background in medical and cosmetic dermatology.",
                    "expertise": "Acne Therapy, Skin Cancer Screening",
                    "languages": "English, Vietnamese, French",
                    "avatarUrl": "/images/doctor_2.jpg"
                }
                """, d.token())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.biography").value("Updated clinical background in medical and cosmetic dermatology."))
                .andExpect(jsonPath("$.expertise").value("Acne Therapy, Skin Cancer Screening"))
                .andExpect(jsonPath("$.languages").value("English, Vietnamese, French"))
                .andExpect(jsonPath("$.avatarUrl").value("/images/doctor_2.jpg"));

        // Verify entity persisted in database
        Doctor updated = doctorRepository.findById(d.doctor().getId()).orElseThrow();
        assertThat(updated.getBiography()).isEqualTo("Updated clinical background in medical and cosmetic dermatology.");
        assertThat(updated.getExpertise()).isEqualTo("Acne Therapy, Skin Cancer Screening");
        assertThat(updated.getLanguages()).isEqualTo("English, Vietnamese, French");
        assertThat(updated.getAvatarUrl()).isEqualTo("/images/doctor_2.jpg");
    }

    // -------------------------------------------------------------
    // 4. Doctor Weekly Schedules
    // -------------------------------------------------------------

    @Test
    @DisplayName("GET /api/doctor/schedules returns recurring weekly shifts for authenticated doctor")
    void getDoctorWeeklySchedules() throws Exception {
        Department dept = department("Orthopedics");
        DoctorLogin d = createDoctorWithLogin("Dr. Bone Surgeon", dept);

        DoctorSchedule shift1 = new DoctorSchedule();
        shift1.setDoctor(d.doctor());
        shift1.setDayOfWeek(DayOfWeek.MONDAY);
        shift1.setStartTime(LocalTime.of(8, 0));
        shift1.setEndTime(LocalTime.of(12, 0));
        shift1.setShiftType(ShiftType.WORK);
        scheduleRepository.save(shift1);

        DoctorSchedule shift2 = new DoctorSchedule();
        shift2.setDoctor(d.doctor());
        shift2.setDayOfWeek(DayOfWeek.MONDAY);
        shift2.setStartTime(LocalTime.of(13, 0));
        shift2.setEndTime(LocalTime.of(17, 0));
        shift2.setShiftType(ShiftType.WORK);
        scheduleRepository.save(shift2);

        get("/api/doctor/schedules", d.token())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].dayOfWeek").value("MONDAY"))
                .andExpect(jsonPath("$[0].startTime").value("08:00:00"))
                .andExpect(jsonPath("$[1].startTime").value("13:00:00"));
    }

    // -------------------------------------------------------------
    // 5. Doctor Appointments & IDOR Protection
    // -------------------------------------------------------------

    @Test
    @DisplayName("Doctor can only view and manage their own appointments, never another doctor's")
    void doctorCannotAccessAnotherDoctorsAppointments() throws Exception {
        Department dept = department("General");
        DoctorLogin d1 = createDoctorWithLogin("Dr. One", dept);
        DoctorLogin d2 = createDoctorWithLogin("Dr. Two", dept);

        // Create a patient
        String patientEmail = uniqueEmail();
        registerAndLogin(patientEmail);
        User patientUser = userRepository.findByEmail(patientEmail).orElseThrow();
        Patient patient = new Patient();
        patient.setUser(patientUser);
        patient.setPatientCode("PAT-TEST");
        patient.setPatientCode("PAT-TEST");
        patient.setStatus("ACTIVE");
        patientRepository.save(patient);

        // Create appointment assigned to Doctor 1
        Appointment app1 = new Appointment();
        app1.setAppointmentCode("APT-DOC1");
        app1.setDoctor(d1.doctor());
        app1.setPatient(patient);
        app1.setAppointmentDate(LocalDate.now().plusDays(2));
        app1.setStartTime(LocalTime.of(10, 0));
        app1.setEndTime(LocalTime.of(10, 30));
        app1.setStatus(AppointmentStatus.CONFIRMED);
        app1.setBookingFor("myself");
        app1.setAttendeeName(patientUser.getFullName());
        app1.setAttendeeEmail(patientUser.getEmail());
        app1.setAttendeePhone(patientUser.getPhone());
        app1.setAttendeeDob(LocalDate.of(1995, 5, 20));
        app1.setReason("Chest discomfort examination");
        appointmentRepository.save(app1);

        // 1. Doctor 1 lists appointments -> sees appointment 1
        get("/api/doctor/appointments", d1.token())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].appointmentCode").value("APT-DOC1"));

        // 2. Doctor 2 lists appointments -> does NOT see appointment 1
        get("/api/doctor/appointments", d2.token())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));

        // 3. Doctor 1 can view details
        get("/api/doctor/appointments/" + app1.getId(), d1.token())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.appointmentCode").value("APT-DOC1"));

        // 4. Doctor 2 attempts to view Doctor 1's appointment -> rejected with 404 (IDOR protected)
        get("/api/doctor/appointments/" + app1.getId(), d2.token())
                .andExpect(status().isNotFound());

        // 5. Doctor 1 can view appointment history
        get("/api/doctor/appointments/" + app1.getId() + "/history", d1.token())
                .andExpect(status().isOk());

        // 6. Doctor 2 attempts to view appointment history -> rejected with 404
        get("/api/doctor/appointments/" + app1.getId() + "/history", d2.token())
                .andExpect(status().isNotFound());
    }

    // -------------------------------------------------------------
    // 6. Doctor Availability Exceptions
    // -------------------------------------------------------------

    @Test
    @DisplayName("Doctor can add, list, and delete dated availability exceptions")
    void manageAvailabilityExceptions() throws Exception {
        Department dept = department("Neurology");
        DoctorLogin d = createDoctorWithLogin("Dr. Brain Specialist", dept);

        LocalDate targetDate = LocalDate.now().plusDays(3);

        // 1. Add BREAK exception
        String resp = postJson("/api/doctor/availability-exceptions", """
                {
                    "date": "%s",
                    "startTime": "12:00",
                    "endTime": "13:00",
                    "shiftType": "BREAK"
                }
                """.formatted(targetDate), d.token())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.shiftType").value("BREAK"))
                .andReturn().getResponse().getContentAsString();

        Number exceptionId = JsonPath.read(resp, "$.id");

        // 2. List exceptions
        get("/api/doctor/availability-exceptions?from=" + targetDate + "&to=" + targetDate, d.token())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].shiftType").value("BREAK"));

        // 3. Delete exception
        delete("/api/doctor/availability-exceptions/" + exceptionId, d.token())
                .andExpect(status().isNoContent());

        // 4. Verify removed
        get("/api/doctor/availability-exceptions?from=" + targetDate + "&to=" + targetDate, d.token())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }
}
