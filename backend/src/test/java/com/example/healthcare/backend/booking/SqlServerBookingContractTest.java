package com.example.healthcare.backend.booking;

import static org.junit.jupiter.api.Assertions.*;
import java.sql.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/** Runs against a pre-provisioned isolated SQL Server DB; never silently substitutes H2. */
@SpringBootTest @ActiveProfiles("test")
@EnabledIfSystemProperty(named = "booking.sqlserver", matches = "true")
class SqlServerBookingContractTest {
    @Autowired DataSource source;
    @Test void actualSqlServerAndFilteredUniqueIndexesArePresent() throws Exception {
        try (Connection c = source.getConnection(); Statement s = c.createStatement()) {
            assertEquals("Microsoft SQL Server", c.getMetaData().getDatabaseProductName());
            assertTrue(c.getCatalog().startsWith("SmartHealthcareBookingTest_"), "Use an isolated booking test database");
            try (ResultSet r = s.executeQuery("select count(*) from sys.indexes where object_id=object_id('dbo.appointments') and name in ('ux_booking_doctor_live_slot','ux_booking_patient_live_slot') and is_unique=1 and has_filter=1")) {
                assertTrue(r.next()); assertEquals(2, r.getInt(1));
            }
            try (ResultSet r = s.executeQuery("select count(*) from sys.key_constraints where parent_object_id=object_id('dbo.appointments') and name in ('uk_appointments_doctor_slot','uk_appointments_patient_slot')")) {
                assertTrue(r.next()); assertEquals(0, r.getInt(1));
            }
        }
    }
    @Test void statusConstraintAndCaseSensitiveIdempotencyAreInstalled() throws Exception {
        try (Connection c = source.getConnection(); Statement s = c.createStatement()) {
            try (ResultSet r = s.executeQuery("select definition, is_disabled, is_not_trusted from sys.check_constraints where parent_object_id=object_id('dbo.appointments') and name='ck_booking_appointment_status'")) {
                assertTrue(r.next()); assertTrue(r.getString(1).contains("IN_PROGRESS")); assertFalse(r.getBoolean(2)); assertFalse(r.getBoolean(3));
            }
            try (ResultSet r = s.executeQuery("select collation_name from sys.columns where object_id=object_id('dbo.booking_request_keys') and name='request_key'")) {
                assertTrue(r.next()); assertEquals("Latin1_General_100_BIN2", r.getString(1));
            }
        }
    }
    @Test void databaseRejectsDuplicateLiveSlotsButRetainsAllHistory() throws Exception {
        try (Connection c = source.getConnection(); Statement s = c.createStatement()) {
            c.setAutoCommit(false);
            try {
                String columns = "patient_id,doctor_id,appointment_date,start_time,end_time,reason,status,created_at,updated_at";
                // BookingFlowTest creates rows first in the normal verification runner.
                try (ResultSet r = s.executeQuery("select count(*) from dbo.appointments where status='CONFIRMED'")) {
                    assertTrue(r.next()); assertTrue(r.getLong(1) > 0, "Run BookingFlowTest before SQL contract checks");
                }
                assertThrows(SQLException.class, () -> s.executeUpdate("insert into dbo.appointments(appointment_code," + columns
                    + ") select top(1) 'DUP-LIVE-TEST'," + columns + " from dbo.appointments where status='CONFIRMED'"));
                c.rollback();
                int inserted = s.executeUpdate("insert into dbo.appointments(appointment_code," + columns + ") select top(1) 'CANCEL-HISTORY-TEST',patient_id,doctor_id,appointment_date,start_time,end_time,reason,'CANCELLED',created_at,updated_at from dbo.appointments where status='CONFIRMED'");
                assertEquals(1, inserted);
                assertThrows(SQLException.class, () -> s.executeUpdate("update dbo.appointments set status='PAID' where appointment_code='CANCEL-HISTORY-TEST'"));
            } finally { c.rollback(); }
        }
    }
}
