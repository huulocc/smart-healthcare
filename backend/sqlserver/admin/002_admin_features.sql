-- SQL Server 2019+. Additive Admin Features Migration
-- Covers System Settings, Admin Notifications, AI Usage Telemetry, and User Status
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
BEGIN TRY
    BEGIN TRANSACTION;

    -- 1. Ensure user status column exists
    IF COL_LENGTH('dbo.users', 'status') IS NULL
    BEGIN
        ALTER TABLE dbo.users ADD status varchar(20) NOT NULL CONSTRAINT df_users_status DEFAULT 'ACTIVE';
    END

    -- 2. System Settings table
    IF OBJECT_ID(N'dbo.system_settings', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.system_settings (
            setting_key varchar(50) NOT NULL PRIMARY KEY,
            setting_value nvarchar(max) NOT NULL,
            category varchar(50) NOT NULL,
            description nvarchar(255) NULL,
            updated_at datetimeoffset NOT NULL,
            updated_by_user_id bigint NULL REFERENCES dbo.users(id)
        );

        -- Seed initial settings
        INSERT INTO dbo.system_settings (setting_key, setting_value, category, description, updated_at) VALUES
        ('system_name', N'Smart Healthcare', 'GENERAL', N'Name of the healthcare portal', SYSUTCDATETIME()),
        ('facility_name', N'Smart Healthcare Medical Center', 'GENERAL', N'Official facility name', SYSUTCDATETIME()),
        ('contact_email', N'admin@smarthealthcare.com', 'GENERAL', N'Public contact email', SYSUTCDATETIME()),
        ('contact_phone', N'+84 28 3722 1223', 'GENERAL', N'Public contact phone', SYSUTCDATETIME()),
        ('timezone', N'Asia/Ho_Chi_Minh', 'GENERAL', N'System operational timezone', SYSUTCDATETIME()),
        ('email_notifications_enabled', N'true', 'NOTIFICATIONS', N'Send general email notifications', SYSUTCDATETIME()),
        ('appointment_reminders_enabled', N'true', 'NOTIFICATIONS', N'Send reminder emails before scheduled consultations', SYSUTCDATETIME()),
        ('ai_alerts_enabled', N'true', 'OPERATIONAL', N'Alert administrators on flagged or failed AI requests', SYSUTCDATETIME()),
        ('maintenance_mode', N'false', 'OPERATIONAL', N'Temporarily restrict patient access for system maintenance', SYSUTCDATETIME());
    END

    -- 3. Admin Notifications table
    IF OBJECT_ID(N'dbo.admin_notifications', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.admin_notifications (
            id bigint IDENTITY(1,1) PRIMARY KEY,
            title nvarchar(255) NOT NULL,
            message nvarchar(max) NOT NULL,
            type varchar(30) NOT NULL,
            severity varchar(20) NOT NULL DEFAULT 'INFO',
            is_read bit NOT NULL DEFAULT 0,
            read_at datetimeoffset NULL,
            link_path varchar(255) NULL,
            created_at datetimeoffset NOT NULL
        );
        CREATE INDEX ix_admin_notifications_read ON dbo.admin_notifications(is_read, created_at DESC);

        -- Seed baseline operational notifications
        INSERT INTO dbo.admin_notifications (title, message, type, severity, is_read, link_path, created_at) VALUES
        (N'New appointment booked', N'Emma Thompson booked an appointment with Dr. Sophia Chen for Cardiology.', 'APPOINTMENT', 'INFO', 0, '/admin/appointments', SYSUTCDATETIME()),
        (N'Doctor registration pending review', N'Dr. Daniel Kim submitted credentials for Dermatology department approval.', 'DOCTOR_REQUEST', 'WARNING', 0, '/admin/doctor-requests', DATEADD(MINUTE, -45, SYSUTCDATETIME())),
        (N'AI Consultation request completed', N'Patient initiated consultation query regarding allergy and asthma guidance.', 'AI_ALERT', 'INFO', 0, '/admin/ai-usage', DATEADD(HOUR, -2, SYSUTCDATETIME())),
        (N'System database backup verified', N'Automated daily transaction log and schema backup completed successfully.', 'SYSTEM', 'SUCCESS', 1, '/admin/reports', DATEADD(HOUR, -6, SYSUTCDATETIME())),
        (N'High AI response latency detected', N'Request AI-REQ-20261021-081 took 2,840ms due to reasoning tokens.', 'AI_ALERT', 'WARNING', 1, '/admin/ai-usage', DATEADD(DAY, -1, SYSUTCDATETIME()));
    END

    -- 4. AI Usage Events Telemetry table
    IF OBJECT_ID(N'dbo.ai_usage_events', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.ai_usage_events (
            id bigint IDENTITY(1,1) PRIMARY KEY,
            request_id varchar(64) NOT NULL UNIQUE,
            timestamp datetimeoffset NOT NULL,
            provider varchar(50) NOT NULL,
            model varchar(50) NOT NULL,
            prompt_tokens int NOT NULL DEFAULT 0,
            completion_tokens int NOT NULL DEFAULT 0,
            total_tokens int NOT NULL DEFAULT 0,
            latency_ms bigint NOT NULL,
            estimated_cost decimal(12, 6) NOT NULL DEFAULT 0,
            is_cost_estimated bit NOT NULL DEFAULT 1,
            status varchar(20) NOT NULL,
            error_code varchar(50) NULL,
            error_message nvarchar(255) NULL
        );
        CREATE INDEX ix_ai_usage_timestamp ON dbo.ai_usage_events(timestamp DESC);
        CREATE INDEX ix_ai_usage_status ON dbo.ai_usage_events(status, timestamp);
        CREATE INDEX ix_ai_usage_model ON dbo.ai_usage_events(model, timestamp);

        -- Seed realistic baseline telemetry across models, dates, and outcomes
        INSERT INTO dbo.ai_usage_events (request_id, timestamp, provider, model, prompt_tokens, completion_tokens, total_tokens, latency_ms, estimated_cost, is_cost_estimated, status, error_code, error_message) VALUES
        ('REQ-AI-20261023-001', DATEADD(MINUTE, -15, SYSUTCDATETIME()), 'GOOGLE', 'gemini-1.5-flash', 342, 185, 527, 485, 0.000085, 1, 'SUCCESS', NULL, NULL),
        ('REQ-AI-20261023-002', DATEADD(HOUR, -1, SYSUTCDATETIME()), 'GOOGLE', 'gemini-1.5-flash', 412, 290, 702, 620, 0.000124, 1, 'SUCCESS', NULL, NULL),
        ('REQ-AI-20261023-003', DATEADD(HOUR, -3, SYSUTCDATETIME()), 'GOOGLE', 'gemini-1.5-pro', 850, 620, 1470, 2150, 0.003920, 1, 'SUCCESS', NULL, NULL),
        ('REQ-AI-20261023-004', DATEADD(HOUR, -5, SYSUTCDATETIME()), 'OLLAMA', 'llama3:8b', 290, 140, 430, 1840, 0.000000, 0, 'SUCCESS', NULL, NULL),
        ('REQ-AI-20261023-005', DATEADD(HOUR, -8, SYSUTCDATETIME()), 'GOOGLE', 'gemini-1.5-flash', 120, 0, 120, 310, 0.000010, 1, 'REFUSED', 'SAFETY_POLICY', N'Prompt flagged by medical safety filter'),
        ('REQ-AI-20261022-001', DATEADD(DAY, -1, SYSUTCDATETIME()), 'GOOGLE', 'gemini-1.5-flash', 510, 330, 840, 710, 0.000155, 1, 'SUCCESS', NULL, NULL),
        ('REQ-AI-20261022-002', DATEADD(DAY, -1, SYSUTCDATETIME()), 'GOOGLE', 'gemini-1.5-flash', 620, 410, 1030, 890, 0.000195, 1, 'SUCCESS', NULL, NULL),
        ('REQ-AI-20261022-003', DATEADD(DAY, -1, SYSUTCDATETIME()), 'GOOGLE', 'gemini-1.5-pro', 1100, 750, 1850, 2840, 0.005050, 1, 'SUCCESS', NULL, NULL),
        ('REQ-AI-20261022-004', DATEADD(DAY, -1, SYSUTCDATETIME()), 'GOOGLE', 'gemini-1.5-flash', 280, 0, 280, 5000, 0.000000, 1, 'TIMEOUT', 'GATEWAY_TIMEOUT', N'Connection to upstream model timed out'),
        ('REQ-AI-20261021-001', DATEADD(DAY, -2, SYSUTCDATETIME()), 'GOOGLE', 'gemini-1.5-flash', 430, 260, 690, 590, 0.000122, 1, 'SUCCESS', NULL, NULL),
        ('REQ-AI-20261021-002', DATEADD(DAY, -2, SYSUTCDATETIME()), 'GOOGLE', 'gemini-1.5-flash', 380, 210, 590, 520, 0.000101, 1, 'SUCCESS', NULL, NULL),
        ('REQ-AI-20261021-003', DATEADD(DAY, -2, SYSUTCDATETIME()), 'OLLAMA', 'llama3:8b', 310, 180, 490, 2100, 0.000000, 0, 'SUCCESS', NULL, NULL),
        ('REQ-AI-20261020-001', DATEADD(DAY, -3, SYSUTCDATETIME()), 'GOOGLE', 'gemini-1.5-flash', 490, 310, 800, 650, 0.000145, 1, 'SUCCESS', NULL, NULL),
        ('REQ-AI-20261020-002', DATEADD(DAY, -3, SYSUTCDATETIME()), 'GOOGLE', 'gemini-1.5-flash', 150, 0, 150, 280, 0.000012, 1, 'FAILED', 'MODEL_OVERLOADED', N'Google 503 Model overloaded');
    END

    COMMIT TRANSACTION;
    PRINT 'Admin features migration applied successfully.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    DECLARE @msg nvarchar(4000) = ERROR_MESSAGE();
    RAISERROR(@msg, 16, 1);
END CATCH;
