-- Admin manages doctors: a clinical profile per doctor account, the departments they
-- belong to, and the weekly shifts behind the schedule board.
--
-- departments and doctors reference each other, so the departments -> doctors foreign
-- key is added at the bottom, once both tables exist.
--
-- The two ON DELETE SET NULL keys between them form a cycle, which SQL Server is
-- normally expected to reject with "may cause cycles or multiple cascade paths". It does
-- not reject this one, and the reason is worth knowing: that check only follows actions
-- that cause further deletes. SET NULL writes a NULL and stops, so neither key can
-- re-enter the other table. Verified on SQL Server 2025 by creating both keys and then
-- deleting a user: the doctor and its shifts cascade away and the department keeps
-- existing with head_doctor_id cleared, exactly as on MySQL. No delete rule had to be
-- weakened to NO ACTION, so deletes behave the same on both databases.
--
-- Enum columns are varchar(20) with a named CHECK, and timestamps are datetimeoffset(7),
-- because that is what Hibernate's SQLServerDialect generates for these entities and
-- ddl-auto=validate compares against it. See the note at the top of V1.

CREATE TABLE [departments] (
  [id] bigint IDENTITY(1,1) NOT NULL,
  [dept_code] varchar(16) NOT NULL,          -- DEP-001: the "Department ID" column in the admin table
  [name] varchar(100) NOT NULL,
  [description] varchar(255) NULL,
  [head_doctor_id] bigint NULL,              -- foreign key added once `doctors` exists
  [status] varchar(20) NOT NULL CONSTRAINT [df_departments_status] DEFAULT 'ACTIVE',
  [created_at] datetimeoffset(7) NOT NULL,
  [updated_at] datetimeoffset(7) NOT NULL,
  CONSTRAINT [pk_departments] PRIMARY KEY ([id]),
  CONSTRAINT [uk_departments_dept_code] UNIQUE ([dept_code]),
  CONSTRAINT [uk_departments_name] UNIQUE ([name]),
  CONSTRAINT [ck_departments_status] CHECK ([status] IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE [doctors] (
  [id] bigint IDENTITY(1,1) NOT NULL,
  -- One row per doctor account. Name, email and phone are deliberately NOT copied here:
  -- the admin list joins to `users` for them, so a phone number has one place to change.
  [user_id] bigint NOT NULL,
  [doctor_code] varchar(16) NOT NULL,        -- DR-00317
  [department_id] bigint NULL,               -- null right after approval, until an admin assigns one
  [specialty] varchar(100) NULL,
  [experience_years] int NULL,               -- the UI renders "12 years"; store the number
  [availability] varchar(20) NOT NULL CONSTRAINT [df_doctors_availability] DEFAULT 'AVAILABLE',
  [status] varchar(20) NOT NULL CONSTRAINT [df_doctors_status] DEFAULT 'ACTIVE',
  [avatar_url] varchar(255) NULL,
  [created_at] datetimeoffset(7) NOT NULL,
  [updated_at] datetimeoffset(7) NOT NULL,
  CONSTRAINT [pk_doctors] PRIMARY KEY ([id]),
  CONSTRAINT [uk_doctors_user_id] UNIQUE ([user_id]),           -- makes the link to `users` 1:1
  CONSTRAINT [uk_doctors_doctor_code] UNIQUE ([doctor_code]),
  CONSTRAINT [ck_doctors_availability] CHECK ([availability] IN ('AVAILABLE', 'IN_CONSULTATION', 'OFF_DUTY', 'ON_LEAVE')),
  CONSTRAINT [ck_doctors_status] CHECK ([status] IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT [ck_doctors_experience] CHECK ([experience_years] IS NULL OR [experience_years] BETWEEN 0 AND 70),
  -- Deleting the account deletes the professional profile: it cannot exist without one.
  CONSTRAINT [fk_doctors_user] FOREIGN KEY ([user_id]) REFERENCES [users] ([id]) ON DELETE CASCADE,
  -- Deleting a department must never delete its doctors; they just become unassigned.
  CONSTRAINT [fk_doctors_department] FOREIGN KEY ([department_id]) REFERENCES [departments] ([id]) ON DELETE SET NULL
);

CREATE INDEX [idx_doctors_specialty] ON [doctors] ([specialty]);
CREATE INDEX [idx_doctors_availability] ON [doctors] ([availability]);
CREATE INDEX [idx_doctors_status] ON [doctors] ([status]);

-- A department outlives its head, so this clears rather than cascades.
ALTER TABLE [departments]
  ADD CONSTRAINT [fk_departments_head_doctor]
  FOREIGN KEY ([head_doctor_id]) REFERENCES [doctors] ([id]) ON DELETE SET NULL;

CREATE TABLE [doctor_schedules] (
  [id] bigint IDENTITY(1,1) NOT NULL,
  [doctor_id] bigint NOT NULL,
  -- java.time.DayOfWeek stored as its ordinal: 0 = MONDAY ... 6 = SUNDAY, so the Mon..Sun
  -- week grid comes back in the right order straight from SQL. See DoctorSchedule.
  --
  -- smallint, where MySQL used tinyint: SQL Server's tinyint is unsigned 0-255 and holds
  -- the range fine, but Hibernate's SQLServerDialect renders an ordinal enum as smallint,
  -- and the point of ddl-auto=validate is that this file says what the dialect says.
  [day_of_week] smallint NOT NULL,
  [start_time] time(6) NOT NULL,
  [end_time] time(6) NOT NULL,
  [shift_type] varchar(20) NOT NULL CONSTRAINT [df_doctor_schedules_shift_type] DEFAULT 'WORK',
  [created_at] datetimeoffset(7) NOT NULL,
  [updated_at] datetimeoffset(7) NOT NULL,
  CONSTRAINT [pk_doctor_schedules] PRIMARY KEY ([id]),
  CONSTRAINT [uk_doctor_schedules_slot] UNIQUE ([doctor_id], [day_of_week], [start_time]),
  CONSTRAINT [ck_doctor_schedules_shift_type] CHECK ([shift_type] IN ('BREAK', 'LEAVE', 'WORK')),
  CONSTRAINT [ck_doctor_schedules_day] CHECK ([day_of_week] BETWEEN 0 AND 6),
  -- A shift crossing midnight has to be split into two rows, one per day.
  CONSTRAINT [ck_doctor_schedules_times] CHECK ([end_time] > [start_time]),
  CONSTRAINT [fk_doctor_schedules_doctor] FOREIGN KEY ([doctor_id]) REFERENCES [doctors] ([id]) ON DELETE CASCADE
);

CREATE INDEX [idx_doctor_schedules_day] ON [doctor_schedules] ([day_of_week]);

-- The pending doctor requests screen filters on this column.
CREATE INDEX [idx_users_requested_role] ON [users] ([requested_role]);
