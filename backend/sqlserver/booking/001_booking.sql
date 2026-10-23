-- SQL Server 2019+. Run manually, in the intended database, with application writers stopped.
-- Do not put this in the existing MySQL Flyway directory. Never execute full.sql against a live database.
-- Preserves all rows, including PENDING and cancelled history. Rerunnable and transactional.
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
BEGIN TRY
    BEGIN TRANSACTION;
    IF OBJECT_ID(N'dbo.appointments', N'U') IS NULL OR OBJECT_ID(N'dbo.patients', N'U') IS NULL
        THROW 51000, 'Existing SQL Server appointment and patient tables are required.', 1;

    IF COL_LENGTH('dbo.appointments', 'booking_for') IS NULL
        ALTER TABLE dbo.appointments ADD booking_for varchar(10) NULL;
    IF COL_LENGTH('dbo.appointments', 'attendee_name') IS NULL
        ALTER TABLE dbo.appointments ADD attendee_name nvarchar(100) NULL;
    IF COL_LENGTH('dbo.appointments', 'attendee_email') IS NULL
        ALTER TABLE dbo.appointments ADD attendee_email varchar(254) NULL;
    IF COL_LENGTH('dbo.appointments', 'attendee_phone') IS NULL
        ALTER TABLE dbo.appointments ADD attendee_phone varchar(20) NULL;
    IF COL_LENGTH('dbo.appointments', 'attendee_dob') IS NULL
        ALTER TABLE dbo.appointments ADD attendee_dob date NULL;
    IF COL_LENGTH('dbo.appointments', 'consent_at') IS NULL
        ALTER TABLE dbo.appointments ADD consent_at datetime2(6) NULL;

    -- The SSMS export has an unnamed status CHECK; discover its generated name.
    DECLARE @dropStatus nvarchar(max) = N'';
    SELECT @dropStatus = @dropStatus + N'ALTER TABLE dbo.appointments DROP CONSTRAINT ' + QUOTENAME(name) + N';'
      FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID(N'dbo.appointments') AND definition LIKE N'%status%'
        AND name <> N'ck_booking_appointment_status';
    IF LEN(@dropStatus) > 0 EXEC sys.sp_executesql @dropStatus;
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.appointments') AND name = N'ck_booking_appointment_status')
        ALTER TABLE dbo.appointments WITH CHECK ADD CONSTRAINT ck_booking_appointment_status
            CHECK (status IN ('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW'));

    -- Create replacement protections before removing the original unconditional constraints.
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.appointments') AND name = N'ux_booking_doctor_live_slot')
        CREATE UNIQUE INDEX ux_booking_doctor_live_slot ON dbo.appointments(doctor_id, appointment_date, start_time)
            WHERE status <> 'CANCELLED';
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.appointments') AND name = N'ux_booking_patient_live_slot')
        CREATE UNIQUE INDEX ux_booking_patient_live_slot ON dbo.appointments(patient_id, appointment_date, start_time)
            WHERE status <> 'CANCELLED';
    IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.appointments') AND name = N'uk_appointments_doctor_slot')
        ALTER TABLE dbo.appointments DROP CONSTRAINT uk_appointments_doctor_slot;
    IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.appointments') AND name = N'uk_appointments_patient_slot')
        ALTER TABLE dbo.appointments DROP CONSTRAINT uk_appointments_patient_slot;

    IF OBJECT_ID(N'dbo.booking_request_keys', N'U') IS NULL
    CREATE TABLE dbo.booking_request_keys (
        id bigint IDENTITY PRIMARY KEY,
        user_id bigint NOT NULL REFERENCES dbo.users(id),
        request_key varchar(80) COLLATE Latin1_General_100_BIN2 NOT NULL,
        request_hash varchar(64) NOT NULL,
        appointment_id bigint NOT NULL REFERENCES dbo.appointments(id),
        CONSTRAINT uk_booking_request_owner_key UNIQUE(user_id, request_key)
    );
    IF OBJECT_ID(N'dbo.appointment_history', N'U') IS NULL
    CREATE TABLE dbo.appointment_history (
        id bigint IDENTITY PRIMARY KEY,
        appointment_id bigint NOT NULL REFERENCES dbo.appointments(id),
        actor_user_id bigint NOT NULL REFERENCES dbo.users(id),
        action varchar(30) NOT NULL,
        appointment_date date NOT NULL, start_time time(6) NOT NULL, end_time time(6) NOT NULL,
        status varchar(20) NOT NULL, notes nvarchar(500) NULL, cancellation_reason nvarchar(255) NULL,
        occurred_at datetime2(6) NOT NULL
    );
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.appointment_history') AND name = N'ix_booking_history_appointment')
        CREATE INDEX ix_booking_history_appointment ON dbo.appointment_history(appointment_id, id);

    IF OBJECT_ID(N'dbo.doctor_availability_exceptions', N'U') IS NULL
    CREATE TABLE dbo.doctor_availability_exceptions (
        id bigint IDENTITY PRIMARY KEY,
        doctor_id bigint NOT NULL REFERENCES dbo.doctors(id),
        exception_date date NOT NULL, start_time time(6) NOT NULL, end_time time(6) NOT NULL,
        shift_type varchar(20) NOT NULL, actor_user_id bigint NOT NULL REFERENCES dbo.users(id),
        created_at datetime2(6) NOT NULL,
        CONSTRAINT ck_booking_exception_times CHECK (end_time > start_time),
        CONSTRAINT ck_booking_exception_type CHECK (shift_type IN ('WORK','BREAK','LEAVE'))
    );
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.doctor_availability_exceptions') AND name = N'ix_booking_exception_doctor_date')
        CREATE INDEX ix_booking_exception_doctor_date ON dbo.doctor_availability_exceptions(doctor_id, exception_date, start_time);
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
