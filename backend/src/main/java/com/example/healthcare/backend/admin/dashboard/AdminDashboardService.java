package com.example.healthcare.backend.admin.dashboard;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.healthcare.backend.admin.ai.GoogleAiUsageDto;
import com.example.healthcare.backend.admin.ai.GoogleAiUsageService;
import com.example.healthcare.backend.booking.Appointment;
import com.example.healthcare.backend.booking.AppointmentRepository;
import com.example.healthcare.backend.booking.AppointmentStatus;
import com.example.healthcare.backend.booking.PatientRepository;
import com.example.healthcare.backend.doctor.DoctorRepository;
import com.example.healthcare.backend.doctor.DoctorStatus;
import com.example.healthcare.backend.user.Role;
import com.example.healthcare.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final GoogleAiUsageService googleAiUsageService;

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    public record AppointmentSummaryItem(
            Long id,
            String patientName,
            String doctorName,
            String departmentName,
            String date,
            String time,
            String status
    ) {
        public static AppointmentSummaryItem from(Appointment a) {
            String pName = a.getAttendeeName() != null && !a.getAttendeeName().isBlank()
                    ? a.getAttendeeName()
                    : (a.getPatient() != null && a.getPatient().getUser() != null ? a.getPatient().getUser().getFullName() : "Patient");
            String dName = a.getDoctor() != null && a.getDoctor().getUser() != null ? a.getDoctor().getUser().getFullName() : "Doctor";
            String deptName = a.getDoctor() != null && a.getDoctor().getDepartment() != null ? a.getDoctor().getDepartment().getName() : "General";
            return new AppointmentSummaryItem(
                    a.getId(),
                    pName,
                    dName,
                    deptName,
                    a.getAppointmentDate() != null ? a.getAppointmentDate().toString() : "",
                    a.getStartTime() != null ? a.getStartTime().toString() : "",
                    a.getStatus() != null ? a.getStatus().name() : ""
            );
        }
    }

    public record DailyTrend(String dayName, String date, long count) {}

    public record AiSummary(
            Long totalRequests,
            String requestsStatus,
            BigDecimal estimatedCost,
            String costStatus,
            Double avgLatencyMs,
            String latencyStatus,
            Double failureRatePercent,
            String failureStatus,
            String refusalStatus
    ) {
        public AiSummary(long totalRequests, BigDecimal estimatedCost, double avgLatencyMs, double failureRatePercent) {
            this(totalRequests, "AVAILABLE", estimatedCost, "AVAILABLE", avgLatencyMs, "AVAILABLE", failureRatePercent, "AVAILABLE", "UNAVAILABLE");
        }
    }

    public record AdminDashboardData(
            long totalUsers,
            long totalPatients,
            long totalDoctors,
            long activeDoctors,
            long totalAppointments,
            long todayAppointments,
            long upcomingAppointments,
            Map<String, Long> appointmentsByStatus,
            List<DailyTrend> last7DaysTrend,
            List<AppointmentSummaryItem> recentAppointments,
            AiSummary aiSummary
    ) {}

    @Transactional(readOnly = true)
    public AdminDashboardData getDashboardData() {
        LocalDate today = LocalDate.now(VN_ZONE);
        long totalUsers = userRepository.count();
        long totalPatients = patientRepository.count();
        long totalDoctors = doctorRepository.count();
        long activeDoctors = doctorRepository.countByStatus(DoctorStatus.ACTIVE);

        long totalAppointments = appointmentRepository.count();
        long todayAppointments = appointmentRepository.count(
                (root, q, cb) -> cb.equal(root.get("appointmentDate"), today)
        );
        long upcomingAppointments = appointmentRepository.count(
                (root, q, cb) -> cb.and(
                        cb.greaterThanOrEqualTo(root.get("appointmentDate"), today),
                        cb.equal(root.get("status"), AppointmentStatus.CONFIRMED)
                )
        );

        Map<String, Long> statusMap = new LinkedHashMap<>();
        for (AppointmentStatus s : AppointmentStatus.values()) {
            statusMap.put(s.name(), 0L);
        }
        List<Object[]> rawCounts = appointmentRepository.statusCounts();
        for (Object[] row : rawCounts) {
            AppointmentStatus s = (AppointmentStatus) row[0];
            long cnt = ((Number) row[1]).longValue();
            if (s != null) {
                statusMap.put(s.name(), cnt);
            }
        }

        // 7-day trend
        LocalDate sevenDaysAgo = today.minusDays(6);
        List<Appointment> recentAppts = appointmentRepository.findAll(
                (root, q, cb) -> cb.between(root.get("appointmentDate"), sevenDaysAgo, today)
        );

        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("EEE", Locale.ENGLISH);

        Map<LocalDate, Long> trendMap = new LinkedHashMap<>();
        LocalDate cur = sevenDaysAgo;
        while (!cur.isAfter(today)) {
            trendMap.put(cur, 0L);
            cur = cur.plusDays(1);
        }
        for (Appointment a : recentAppts) {
            if (trendMap.containsKey(a.getAppointmentDate())) {
                trendMap.merge(a.getAppointmentDate(), 1L, Long::sum);
            }
        }

        List<DailyTrend> trendList = new ArrayList<>();
        for (Map.Entry<LocalDate, Long> e : trendMap.entrySet()) {
            trendList.add(new DailyTrend(e.getKey().format(dayFmt), e.getKey().format(dateFmt), e.getValue()));
        }

        // Recent 5 appointments
        var paged = appointmentRepository.findAll(
                (root, q, cb) -> cb.conjunction(),
                PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "appointmentDate", "startTime"))
        );
        List<AppointmentSummaryItem> recentList = paged.getContent().stream()
                .map(AppointmentSummaryItem::from)
                .toList();

        // AI Summary from authoritative Google Cloud APIs (no SQL Server fallback)
        GoogleAiUsageDto.GoogleAiUsageResponse googleUsage = googleAiUsageService.getGoogleAiUsage(false, null, null);
        Long totalRequests = googleUsage.usage() != null ? googleUsage.usage().totalRequests() : null;
        String reqStatus = googleUsage.usage() != null ? googleUsage.usage().requestsStatus() : "UNAVAILABLE";

        BigDecimal billedCost = googleUsage.billing() != null ? googleUsage.billing().actualCost() : null;
        String costStatus = googleUsage.billing() != null ? googleUsage.billing().status() : "NOT_CONFIGURED";

        Double avgLatency = googleUsage.usage() != null ? googleUsage.usage().avgLatencyMs() : null;
        String latencyStatus = googleUsage.usage() != null ? googleUsage.usage().latencyStatus() : "UNAVAILABLE";

        Double failureRate = null;
        if (totalRequests != null && totalRequests > 0 && googleUsage.usage().errorCount() != null) {
            failureRate = Math.round((googleUsage.usage().errorCount() * 1000.0) / totalRequests) / 10.0;
        } else if (totalRequests != null && totalRequests == 0) {
            failureRate = 0.0;
        }
        String failureStatus = reqStatus;
        String refusalStatus = "UNSUPPORTED"; // Refusal is not tracked by Google Cloud Monitoring

        AiSummary aiSummary = new AiSummary(
                totalRequests,
                reqStatus,
                billedCost,
                costStatus,
                avgLatency,
                latencyStatus,
                failureRate,
                failureStatus,
                refusalStatus
        );

        return new AdminDashboardData(
                totalUsers,
                totalPatients,
                totalDoctors,
                activeDoctors,
                totalAppointments,
                todayAppointments,
                upcomingAppointments,
                statusMap,
                trendList,
                recentList,
                aiSummary
        );
    }
}
