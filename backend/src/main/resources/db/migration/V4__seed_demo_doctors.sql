-- Demo doctors, so the admin list, the stat tiles, the department heads and the schedule
-- board have something to show. Registering five doctors by hand would mean opening five
-- email activation links.
--
-- doctors.user_id is NOT NULL, so demo doctors need `users` rows, which need a password
-- hash. 'LOGIN-DISABLED' is not a BCrypt hash, so BCryptPasswordEncoder.matches() returns
-- false for every password: these are display data, not accounts anyone can sign in to.
-- No real credential is committed here, and none can be guessed into working.
--
-- email_verified is 1 rather than MySQL's b'1': the column is a SQL Server `bit`.

INSERT INTO [users] ([full_name], [email], [phone], [password_hash], [role], [requested_role], [email_verified], [created_at], [updated_at]) VALUES
  ('Dr. Sophia Chen',   'sophia.chen@smarthealthcare.com',   '+14155550124', 'LOGIN-DISABLED', 'DOCTOR', NULL, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
  ('Dr. James Wilson',  'james.wilson@smarthealthcare.com',  '+14155550138', 'LOGIN-DISABLED', 'DOCTOR', NULL, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
  ('Dr. Maya Patel',    'maya.patel@smarthealthcare.com',    '+14155550157', 'LOGIN-DISABLED', 'DOCTOR', NULL, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
  ('Dr. Daniel Kim',    'daniel.kim@smarthealthcare.com',    '+14155550163', 'LOGIN-DISABLED', 'DOCTOR', NULL, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
  ('Dr. Sarah Jenkins', 'sarah.jenkins@smarthealthcare.com', '+14155550179', 'LOGIN-DISABLED', 'DOCTOR', NULL, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());

-- Doctor codes are the ones the frontend already displays, so they are written out here
-- rather than derived from the id the way Doctor.codeFor() does for a real approval.
INSERT INTO [doctors] ([user_id], [doctor_code], [department_id], [specialty], [experience_years], [availability], [status], [avatar_url], [created_at], [updated_at]) VALUES
  ((SELECT [id] FROM [users] WHERE [email] = 'sophia.chen@smarthealthcare.com'),   'DR-00317', (SELECT [id] FROM [departments] WHERE [dept_code] = 'DEP-001'), 'Interventional Cardiology', 12, 'AVAILABLE', 'ACTIVE', '/images/doctor_2.jpg', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
  ((SELECT [id] FROM [users] WHERE [email] = 'james.wilson@smarthealthcare.com'),  'DR-00276', (SELECT [id] FROM [departments] WHERE [dept_code] = 'DEP-002'), 'Clinical Neurology',        15, 'AVAILABLE', 'ACTIVE', '/images/doctor_1.jpg', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
  ((SELECT [id] FROM [users] WHERE [email] = 'maya.patel@smarthealthcare.com'),    'DR-00231', (SELECT [id] FROM [departments] WHERE [dept_code] = 'DEP-003'), 'General Pediatrics',         9, 'AVAILABLE', 'ACTIVE', '/images/doctor_2.jpg', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
  ((SELECT [id] FROM [users] WHERE [email] = 'daniel.kim@smarthealthcare.com'),    'DR-00198', (SELECT [id] FROM [departments] WHERE [dept_code] = 'DEP-004'), 'Clinical Dermatology',      10, 'ON_LEAVE',  'ACTIVE', '/images/doctor_3.jpg', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
  ((SELECT [id] FROM [users] WHERE [email] = 'sarah.jenkins@smarthealthcare.com'), 'DR-00172', (SELECT [id] FROM [departments] WHERE [dept_code] = 'DEP-005'), 'Internal Medicine',         14, 'AVAILABLE', 'ACTIVE', '/images/doctor_1.jpg', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());

-- Department heads, now that the doctors exist.
UPDATE [departments] SET [head_doctor_id] = (SELECT [id] FROM [doctors] WHERE [doctor_code] = 'DR-00317') WHERE [dept_code] = 'DEP-001';
UPDATE [departments] SET [head_doctor_id] = (SELECT [id] FROM [doctors] WHERE [doctor_code] = 'DR-00276') WHERE [dept_code] = 'DEP-002';
UPDATE [departments] SET [head_doctor_id] = (SELECT [id] FROM [doctors] WHERE [doctor_code] = 'DR-00231') WHERE [dept_code] = 'DEP-003';
UPDATE [departments] SET [head_doctor_id] = (SELECT [id] FROM [doctors] WHERE [doctor_code] = 'DR-00198') WHERE [dept_code] = 'DEP-004';
UPDATE [departments] SET [head_doctor_id] = (SELECT [id] FROM [doctors] WHERE [doctor_code] = 'DR-00172') WHERE [dept_code] = 'DEP-005';

-- The three weeks the schedule board draws. 0 = MONDAY ... 6 = SUNDAY.
--
-- One deliberate difference from the mock: there, Thursday shows only "Break 12:00". Here
-- Thursday is a 09:00-17:00 WORK row plus a 12:00-13:00 BREAK row, because a break with no
-- shift around it is not a coherent record. The unique key on (doctor, day, start_time)
-- allows both, since their start times differ.
--
-- Only the first branch of the UNION casts its times. SQL Server picks a UNION's result
-- type by data type precedence, so time(6) wins over the varchar literals in the other
-- branches and converts them all.
INSERT INTO [doctor_schedules] ([doctor_id], [day_of_week], [start_time], [end_time], [shift_type], [created_at], [updated_at])
SELECT d.[id], s.[dow], s.[st], s.[et], s.[kind], SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
FROM [doctors] d
JOIN (
             SELECT 'DR-00317' AS [code], 0 AS [dow], CAST('09:00:00' AS time(6)) AS [st], CAST('17:00:00' AS time(6)) AS [et], 'WORK' AS [kind]
  UNION ALL  SELECT 'DR-00317', 1, '09:00:00', '17:00:00', 'WORK'
  UNION ALL  SELECT 'DR-00317', 2, '09:00:00', '17:00:00', 'WORK'
  UNION ALL  SELECT 'DR-00317', 3, '09:00:00', '17:00:00', 'WORK'
  UNION ALL  SELECT 'DR-00317', 3, '12:00:00', '13:00:00', 'BREAK'
  UNION ALL  SELECT 'DR-00317', 4, '09:00:00', '15:00:00', 'WORK'
  UNION ALL  SELECT 'DR-00276', 0, '10:00:00', '18:00:00', 'WORK'
  UNION ALL  SELECT 'DR-00276', 1, '10:00:00', '18:00:00', 'WORK'
  UNION ALL  SELECT 'DR-00276', 2, '00:00:00', '23:59:59', 'LEAVE'
  UNION ALL  SELECT 'DR-00276', 3, '00:00:00', '23:59:59', 'LEAVE'
  UNION ALL  SELECT 'DR-00276', 4, '10:00:00', '16:00:00', 'WORK'
  UNION ALL  SELECT 'DR-00231', 0, '08:00:00', '16:00:00', 'WORK'
  UNION ALL  SELECT 'DR-00231', 1, '08:00:00', '16:00:00', 'WORK'
  UNION ALL  SELECT 'DR-00231', 2, '08:00:00', '16:00:00', 'WORK'
  UNION ALL  SELECT 'DR-00231', 3, '08:00:00', '16:00:00', 'WORK'
  UNION ALL  SELECT 'DR-00231', 4, '08:00:00', '14:00:00', 'WORK'
) s ON s.[code] = d.[doctor_code];
