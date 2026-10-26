package com.example.healthcare.backend.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.example.healthcare.backend.admin.ai.AiUsageEventRepository;
import com.example.healthcare.backend.admin.notification.AdminNotification;
import com.example.healthcare.backend.admin.notification.AdminNotificationRepository;
import com.example.healthcare.backend.admin.settings.SystemSetting;
import com.example.healthcare.backend.admin.settings.SystemSettingRepository;
import com.example.healthcare.backend.booking.Patient;
import com.example.healthcare.backend.booking.PatientRepository;
import com.example.healthcare.backend.support.ApiTestSupport;
import com.example.healthcare.backend.user.Role;
import com.example.healthcare.backend.user.User;
import com.example.healthcare.backend.user.UserRepository;
import com.jayway.jsonpath.JsonPath;

public class AdminFeaturesApiTest extends ApiTestSupport {

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private SystemSettingRepository settingRepository;

    @Autowired
    private AdminNotificationRepository notificationRepository;

    @Autowired
    private AiUsageEventRepository aiUsageRepository;

    // -------------------------------------------------------------
    // 1. Authorization checks
    // -------------------------------------------------------------

    @Test
    @DisplayName("Admin endpoints reject anonymous requests with 401")
    void adminEndpointsRejectAnonymous() throws Exception {
        get("/api/admin/dashboard", null).andExpect(status().isUnauthorized());
        get("/api/admin/patients", null).andExpect(status().isUnauthorized());
        get("/api/admin/users", null).andExpect(status().isUnauthorized());
        get("/api/admin/reports/summary", null).andExpect(status().isUnauthorized());
        get("/api/admin/settings", null).andExpect(status().isUnauthorized());
        get("/api/admin/notifications", null).andExpect(status().isUnauthorized());
        get("/api/admin/ai-usage/stats", null).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Admin endpoints reject regular patient tokens with 403")
    void adminEndpointsRejectPatientRole() throws Exception {
        String patientToken = registerAndLogin(uniqueEmail());
        get("/api/admin/dashboard", patientToken).andExpect(status().isForbidden());
        get("/api/admin/patients", patientToken).andExpect(status().isForbidden());
        get("/api/admin/users", patientToken).andExpect(status().isForbidden());
        get("/api/admin/reports/summary", patientToken).andExpect(status().isForbidden());
        get("/api/admin/settings", patientToken).andExpect(status().isForbidden());
        get("/api/admin/notifications", patientToken).andExpect(status().isForbidden());
        get("/api/admin/ai-usage/stats", patientToken).andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------
    // 2. Dashboard
    // -------------------------------------------------------------

    @Test
    @DisplayName("Admin dashboard endpoint returns aggregated metrics")
    void dashboardReturnsAggregatedMetrics() throws Exception {
        String adminToken = adminToken();
        get("/api/admin/dashboard", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers").isNumber())
                .andExpect(jsonPath("$.totalPatients").isNumber())
                .andExpect(jsonPath("$.totalDoctors").isNumber())
                .andExpect(jsonPath("$.totalAppointments").isNumber())
                .andExpect(jsonPath("$.appointmentsByStatus").isMap())
                .andExpect(jsonPath("$.last7DaysTrend").isArray())
                .andExpect(jsonPath("$.recentAppointments").isArray())
                .andExpect(jsonPath("$.aiSummary").isMap());
    }

    // -------------------------------------------------------------
    // 3. Patients
    // -------------------------------------------------------------

    @Test
    @DisplayName("Admin can list and view patient details")
    void listAndViewPatients() throws Exception {
        String adminToken = adminToken();

        // Create a patient record
        String pEmail = uniqueEmail();
        User u = new User();
        u.setFullName("Nguyen Van A");
        u.setEmail(pEmail);
        u.setPhone("0987654321");
        u.setAddress("123 Vo Van Ngan");
        u.setPasswordHash(passwordEncoder.encode(PASSWORD));
        u.setRole(Role.PATIENT);
        u.setEmailVerified(true);
        u.setStatus("ACTIVE");
        userRepository.save(u);

        Patient p = new Patient();
        p.setUser(u);
        p.setPatientCode("PT-TEST01");
        p.setGender("MALE");
        p.setBloodType("O+");
        p.setEmergencyContactName("Nguyen Van B");
        p.setEmergencyContactPhone("0912345678");
        p.setInsuranceNumber("BHYT12345");
        p.setStatus("ACTIVE");
        Patient saved = patientRepository.save(p);

        // List
        get("/api/admin/patients?search=Nguyen", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)));

        // Get single
        get("/api/admin/patients/" + saved.getId(), adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Nguyen Van A"))
                .andExpect(jsonPath("$.bloodType").value("O+"))
                .andExpect(jsonPath("$.insuranceNumber").value("BHYT12345"));

        // Update
        putJson("/api/admin/patients/" + saved.getId(), """
                {
                    "fullName": "Nguyen Van A Updated",
                    "phone": "0987654322",
                    "bloodType": "A+",
                    "gender": "MALE",
                    "address": "456 Le Van Viet"
                }
                """, adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Nguyen Van A Updated"))
                .andExpect(jsonPath("$.bloodType").value("A+"))
                .andExpect(jsonPath("$.address").value("456 Le Van Viet"));

        // Toggle status
        patchJson("/api/admin/patients/" + saved.getId() + "/status", """
                {"status": "INACTIVE"}
                """, adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INACTIVE"));
    }

    // -------------------------------------------------------------
    // 4. Users & Roles & Safeguards
    // -------------------------------------------------------------

    @Test
    @DisplayName("Admin can create, update and manage user accounts with safeguards")
    void manageUsersAndSafeguards() throws Exception {
        String adminToken = adminToken();

        // 1. Create a user
        String newUserEmail = uniqueEmail();
        String createRes = postJson("/api/admin/users", """
                {
                    "fullName": "Staff Doctor",
                    "email": "%s",
                    "phone": "0911223344",
                    "password": "Password123!",
                    "role": "DOCTOR",
                    "status": "ACTIVE"
                }
                """.formatted(newUserEmail), adminToken)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(newUserEmail))
                .andExpect(jsonPath("$.role").value("DOCTOR"))
                .andReturn().getResponse().getContentAsString();

        Number newUserId = JsonPath.read(createRes, "$.id");

        // 2. Update user
        putJson("/api/admin/users/" + newUserId, """
                {
                    "fullName": "Staff Doctor Updated",
                    "phone": "0911223399",
                    "emailVerified": true
                }
                """, adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Staff Doctor Updated"))
                .andExpect(jsonPath("$.emailVerified").value(true));

        // 3. Change role to PATIENT
        patchJson("/api/admin/users/" + newUserId + "/role", """
                {"role": "PATIENT"}
                """, adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("PATIENT"));

        // 4. Deactivate account
        patchJson("/api/admin/users/" + newUserId + "/status", """
                {"status": "INACTIVE"}
                """, adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INACTIVE"));

        // 5. Inactive account cannot log in
        login(newUserEmail, "Password123!")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("deactivated")));
    }

    // -------------------------------------------------------------
    // 5. Reports & Analytics
    // -------------------------------------------------------------

    @Test
    @DisplayName("Admin can view report summaries, trends, and breakdown")
    void viewReports() throws Exception {
        String adminToken = adminToken();

        get("/api/admin/reports/summary", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAppointments").isNumber())
                .andExpect(jsonPath("$.completionRatePercent").isNumber())
                .andExpect(jsonPath("$.totalPatients").isNumber());

        get("/api/admin/reports/appointments-trend", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        get("/api/admin/reports/departments", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        get("/api/admin/reports/doctors", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        get("/api/admin/reports/patient-growth", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // -------------------------------------------------------------
    // 6. Settings
    // -------------------------------------------------------------

    @Test
    @DisplayName("Admin can read and update persistent system settings")
    void manageSystemSettings() throws Exception {
        String adminToken = adminToken();

        // Seed a setting
        SystemSetting s = new SystemSetting();
        s.setKey("test.clinic.name");
        s.setValue("Smart Healthcare Center");
        s.setCategory("CLINIC");
        s.setDescription("Clinic display name");
        settingRepository.save(s);

        // Read
        get("/api/admin/settings", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[?(@.key == 'test.clinic.name')].value").value("Smart Healthcare Center"))
                .andExpect(jsonPath("$[?(@.key == 'test.clinic.name')].settingValue").value("Smart Healthcare Center"));

        // Update
        putJson("/api/admin/settings", """
                {
                    "test.clinic.name": "Smart Healthcare Main Clinic"
                }
                """, adminToken)
                .andExpect(status().isOk());

        SystemSetting updated = settingRepository.findById("test.clinic.name").orElseThrow();
        assertThat(updated.getValue()).isEqualTo("Smart Healthcare Main Clinic");
    }

    // -------------------------------------------------------------
    // 7. Notifications
    // -------------------------------------------------------------

    @Test
    @DisplayName("Admin can list notifications, check unread count, and mark read")
    void manageAdminNotifications() throws Exception {
        String adminToken = adminToken();

        // Seed notification
        AdminNotification notif = new AdminNotification();
        notif.setTitle("Test Alert");
        notif.setMessage("Doctor requested approval");
        notif.setType("WARNING");
        notif.setRead(false);
        notif.setLinkPath("/admin/doctor-requests");
        AdminNotification saved = notificationRepository.save(notif);

        // Unread count
        get("/api/admin/notifications/unread-count", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)));

        // List
        get("/api/admin/notifications", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        // Mark single read
        patchJson("/api/admin/notifications/" + saved.getId() + "/read", "{}", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isRead").value(true));

        // Mark all read
        postJson("/api/admin/notifications/mark-all-read", "{}", adminToken)
                .andExpect(status().isOk());

        get("/api/admin/notifications/unread-count", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0));
    }

    // -------------------------------------------------------------
    // 8. AI Usage & Telemetry
    // -------------------------------------------------------------

    @Test
    @DisplayName("AI telemetry is recorded publicly and stats viewed by Admin")
    void aiTelemetryAndStats() throws Exception {
        String adminToken = adminToken();

        // 1. Record telemetry via public endpoint (permitAll)
        postJson("/api/ai/telemetry", """
                {
                    "traceId": "trace-test-01",
                    "feature": "medical_rag",
                    "model": "gemini-2.5-flash",
                    "provider": "google",
                    "promptTokens": 150,
                    "completionTokens": 50,
                    "latencyMs": 420,
                    "status": "SUCCESS"
                }
                """, null)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.model").value("gemini-2.5-flash"))
                .andExpect(jsonPath("$.totalTokens").value(200));

        // 2. Admin queries stats
        get("/api/admin/ai-usage/stats", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRequests").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.avgLatencyMs").isNumber())
                .andExpect(jsonPath("$.modelBreakdown").isArray())
                .andExpect(jsonPath("$.providerBreakdown").isArray());

        // 3. Admin queries event logs
        get("/api/admin/ai-usage/events", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)));
    }
}
