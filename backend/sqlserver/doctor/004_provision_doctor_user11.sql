-- Ensure user 11 (Nguyen Chi Dung) has a doctor record and default shifts
IF EXISTS (SELECT 1 FROM dbo.users WHERE id = 11 AND role = 'DOCTOR')
   AND NOT EXISTS (SELECT 1 FROM dbo.doctors WHERE user_id = 11)
BEGIN
    INSERT INTO dbo.doctors (user_id, doctor_code, department_id, specialty, experience_years, availability, status, biography, expertise, languages, created_at, updated_at)
    VALUES (
        11,
        'DR-00011',
        5, -- General Medicine
        'General Medicine',
        5,
        'AVAILABLE',
        'ACTIVE',
        N'Bác sĩ Nguyễn Chí Dũng - Chuyên khoa Y học Tổng quát và Khám bệnh Nội khoa tổng quát.',
        N'General Medicine, Preventative Care',
        N'Vietnamese, English',
        SYSDATETIMEOFFSET(),
        SYSDATETIMEOFFSET()
    );

    DECLARE @newDoctorId bigint = SCOPE_IDENTITY();

    -- Add default weekly shifts (Monday to Friday 08:00 - 12:00, 13:00 - 17:00)
    -- Day 0 = Monday, Day 1 = Tuesday, Day 2 = Wednesday, Day 3 = Thursday, Day 4 = Friday
    INSERT INTO dbo.doctor_schedules (doctor_id, day_of_week, start_time, end_time, shift_type, created_at, updated_at)
    VALUES
        (@newDoctorId, 0, '08:00:00', '12:00:00', 'WORK', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (@newDoctorId, 0, '13:00:00', '17:00:00', 'WORK', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (@newDoctorId, 1, '08:00:00', '12:00:00', 'WORK', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (@newDoctorId, 1, '13:00:00', '17:00:00', 'WORK', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (@newDoctorId, 2, '08:00:00', '12:00:00', 'WORK', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (@newDoctorId, 2, '13:00:00', '17:00:00', 'WORK', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (@newDoctorId, 3, '08:00:00', '12:00:00', 'WORK', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (@newDoctorId, 3, '13:00:00', '17:00:00', 'WORK', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (@newDoctorId, 4, '08:00:00', '12:00:00', 'WORK', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (@newDoctorId, 4, '13:00:00', '17:00:00', 'WORK', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END;
