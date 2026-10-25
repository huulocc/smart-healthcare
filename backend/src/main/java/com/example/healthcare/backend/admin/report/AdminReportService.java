package com.example.healthcare.backend.admin.report;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.healthcare.backend.booking.Appointment;
import com.example.healthcare.backend.booking.AppointmentRepository;
import com.example.healthcare.backend.booking.AppointmentStatus;
import com.example.healthcare.backend.booking.Patient;
import com.example.healthcare.backend.booking.PatientRepository;
import com.example.healthcare.backend.department.Department;
import com.example.healthcare.backend.department.DepartmentRepository;
import com.example.healthcare.backend.doctor.Doctor;
import com.example.healthcare.backend.doctor.DoctorRepository;
import com.example.healthcare.backend.user.Role;
import com.example.healthcare.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminReportService {

    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final DepartmentRepository departmentRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    public record ReportSummary(
            long totalAppointments,
            long completedAppointments,
            long cancelledAppointments,
            long confirmedAppointments,
            double completionRatePercent,
            double cancellationRatePercent,
            long totalDoctors,
            long totalPatients,
            long newPatientsInPeriod
    ) {}

    public record TrendPoint(
            String date,
            long total,
            long completed,
            long cancelled,
            long confirmed,
            long noShow
    ) {}

    public record DepartmentStats(
            Long departmentId,
            String departmentName,
            long appointmentCount,
            double percentage
    ) {}

    public record DoctorPerformance(
            Long doctorId,
            String doctorName,
            String specialty,
            String departmentName,
            long totalAppointments,
            long completedAppointments,
            double completionRatePercent
    ) {}

    public record PatientGrowthPoint(String date, long count) {}

    @Transactional(readOnly = true)
    public ReportSummary getSummary(LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : LocalDate.now(VN_ZONE).minusDays(30);
        LocalDate end = to != null ? to : LocalDate.now(VN_ZONE);

        List<Appointment> appts = appointmentRepository.findAll(
                (root, q, cb) -> cb.between(root.get("appointmentDate"), start, end)
        );

        long total = appts.size();
        long completed = appts.stream().filter(a -> a.getStatus() == AppointmentStatus.COMPLETED).count();
        long cancelled = appts.stream().filter(a -> a.getStatus() == AppointmentStatus.CANCELLED).count();
        long confirmed = appts.stream().filter(a -> a.getStatus() == AppointmentStatus.CONFIRMED).count();

        double compRate = total > 0 ? ((double) completed / total) * 100.0 : 0.0;
        double cancRate = total > 0 ? ((double) cancelled / total) * 100.0 : 0.0;

        long doctors = doctorRepository.count();
        long patients = patientRepository.count();

        Instant startInst = start.atStartOfDay(VN_ZONE).toInstant();
        Instant endInst = end.plusDays(1).atStartOfDay(VN_ZONE).toInstant();
        long newPatients = patientRepository.count(
                (root, q, cb) -> cb.between(root.get("createdAt"), startInst, endInst)
        );

        return new ReportSummary(
                total,
                completed,
                cancelled,
                confirmed,
                Math.round(compRate * 10.0) / 10.0,
                Math.round(cancRate * 10.0) / 10.0,
                doctors,
                patients,
                newPatients
        );
    }

    @Transactional(readOnly = true)
    public List<TrendPoint> getAppointmentsTrend(LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : LocalDate.now(VN_ZONE).minusDays(30);
        LocalDate end = to != null ? to : LocalDate.now(VN_ZONE);

        List<Appointment> appts = appointmentRepository.findAll(
                (root, q, cb) -> cb.between(root.get("appointmentDate"), start, end)
        );

        Map<LocalDate, List<Appointment>> byDate = new TreeMap<>();
        LocalDate curr = start;
        while (!curr.isAfter(end)) {
            byDate.put(curr, new ArrayList<>());
            curr = curr.plusDays(1);
        }

        for (Appointment a : appts) {
            LocalDate d = a.getAppointmentDate();
            if (byDate.containsKey(d)) {
                byDate.get(d).add(a);
            }
        }

        DateTimeFormatter df = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        List<TrendPoint> result = new ArrayList<>();
        for (Map.Entry<LocalDate, List<Appointment>> entry : byDate.entrySet()) {
            List<Appointment> list = entry.getValue();
            long total = list.size();
            long completed = list.stream().filter(a -> a.getStatus() == AppointmentStatus.COMPLETED).count();
            long cancelled = list.stream().filter(a -> a.getStatus() == AppointmentStatus.CANCELLED).count();
            long confirmed = list.stream().filter(a -> a.getStatus() == AppointmentStatus.CONFIRMED).count();
            long noShow = list.stream().filter(a -> a.getStatus() == AppointmentStatus.NO_SHOW).count();

            result.add(new TrendPoint(entry.getKey().format(df), total, completed, cancelled, confirmed, noShow));
        }

        return result;
    }

    @Transactional(readOnly = true)
    public List<DepartmentStats> getDepartmentBreakdown(LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : LocalDate.now(VN_ZONE).minusDays(30);
        LocalDate end = to != null ? to : LocalDate.now(VN_ZONE);

        List<Appointment> appts = appointmentRepository.findAll(
                (root, q, cb) -> cb.between(root.get("appointmentDate"), start, end)
        );

        long totalAppts = appts.size();
        Map<Long, Long> countsByDept = new HashMap<>();
        for (Appointment a : appts) {
            if (a.getDoctor() != null && a.getDoctor().getDepartment() != null) {
                Long deptId = a.getDoctor().getDepartment().getId();
                countsByDept.merge(deptId, 1L, Long::sum);
            }
        }

        List<Department> departments = departmentRepository.findAll();
        List<DepartmentStats> result = new ArrayList<>();
        for (Department d : departments) {
            long count = countsByDept.getOrDefault(d.getId(), 0L);
            double pct = totalAppts > 0 ? ((double) count / totalAppts) * 100.0 : 0.0;
            result.add(new DepartmentStats(d.getId(), d.getName(), count, Math.round(pct * 10.0) / 10.0));
        }

        result.sort((a, b) -> Long.compare(b.appointmentCount(), a.appointmentCount()));
        return result;
    }

    @Transactional(readOnly = true)
    public List<DoctorPerformance> getDoctorPerformance(LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : LocalDate.now(VN_ZONE).minusDays(30);
        LocalDate end = to != null ? to : LocalDate.now(VN_ZONE);

        List<Appointment> appts = appointmentRepository.findAll(
                (root, q, cb) -> cb.between(root.get("appointmentDate"), start, end)
        );

        Map<Long, List<Appointment>> byDoctor = new HashMap<>();
        for (Appointment a : appts) {
            if (a.getDoctor() != null) {
                byDoctor.computeIfAbsent(a.getDoctor().getId(), k -> new ArrayList<>()).add(a);
            }
        }

        List<Doctor> doctors = doctorRepository.findAll();
        List<DoctorPerformance> result = new ArrayList<>();
        for (Doctor d : doctors) {
            List<Appointment> list = byDoctor.getOrDefault(d.getId(), Collections.emptyList());
            long total = list.size();
            long completed = list.stream().filter(a -> a.getStatus() == AppointmentStatus.COMPLETED).count();
            double compRate = total > 0 ? ((double) completed / total) * 100.0 : 0.0;

            String name = d.getUser() != null ? d.getUser().getFullName() : "Dr. " + d.getDoctorCode();
            String deptName = d.getDepartment() != null ? d.getDepartment().getName() : "General";

            result.add(new DoctorPerformance(
                    d.getId(),
                    name,
                    d.getSpecialty(),
                    deptName,
                    total,
                    completed,
                    Math.round(compRate * 10.0) / 10.0
            ));
        }

        result.sort((a, b) -> Long.compare(b.totalAppointments(), a.totalAppointments()));
        return result;
    }

    @Transactional(readOnly = true)
    public List<PatientGrowthPoint> getPatientGrowth(LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : LocalDate.now(VN_ZONE).minusDays(30);
        LocalDate end = to != null ? to : LocalDate.now(VN_ZONE);

        Instant startInst = start.atStartOfDay(VN_ZONE).toInstant();
        Instant endInst = end.plusDays(1).atStartOfDay(VN_ZONE).toInstant();

        List<Patient> patients = patientRepository.findAll(
                (root, q, cb) -> cb.between(root.get("createdAt"), startInst, endInst)
        );

        DateTimeFormatter df = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Map<String, Long> byDate = new TreeMap<>();
        LocalDate curr = start;
        while (!curr.isAfter(end)) {
            byDate.put(curr.format(df), 0L);
            curr = curr.plusDays(1);
        }

        for (Patient p : patients) {
            LocalDate d = p.getCreatedAt().atZone(VN_ZONE).toLocalDate();
            String s = d.format(df);
            if (byDate.containsKey(s)) {
                byDate.merge(s, 1L, Long::sum);
            }
        }

        List<PatientGrowthPoint> list = new ArrayList<>();
        for (Map.Entry<String, Long> e : byDate.entrySet()) {
            list.add(new PatientGrowthPoint(e.getKey(), e.getValue()));
        }
        return list;
    }
}
