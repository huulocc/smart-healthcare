-- Admin manages doctors: a clinical profile per doctor account, the departments they
-- belong to, and the weekly shifts behind the schedule board.
--
-- departments and doctors reference each other, so the departments -> doctors foreign
-- key is added at the bottom, once both tables exist.
--
-- Enum columns are declared as native MySQL enums because that is what Hibernate 6.3+
-- generates for @Enumerated(STRING) -- see `users`.`role` in V1. Declaring them as
-- varchar(20) instead would fail ddl-auto=validate at start-up.

CREATE TABLE `departments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `dept_code` varchar(16) NOT NULL,          -- DEP-001: the "Department ID" column in the admin table
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `head_doctor_id` bigint DEFAULT NULL,      -- foreign key added once `doctors` exists
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_departments_dept_code` (`dept_code`),
  UNIQUE KEY `uk_departments_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `doctors` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  -- One row per doctor account. Name, email and phone are deliberately NOT copied here:
  -- the admin list joins to `users` for them, so a phone number has one place to change.
  `user_id` bigint NOT NULL,
  `doctor_code` varchar(16) NOT NULL,        -- DR-00317
  `department_id` bigint DEFAULT NULL,       -- null right after approval, until an admin assigns one
  `specialty` varchar(100) DEFAULT NULL,
  `experience_years` int DEFAULT NULL,       -- the UI renders "12 years"; store the number
  `availability` enum('AVAILABLE','IN_CONSULTATION','OFF_DUTY','ON_LEAVE') NOT NULL DEFAULT 'AVAILABLE',
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `avatar_url` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_doctors_user_id` (`user_id`),           -- makes the link to `users` 1:1
  UNIQUE KEY `uk_doctors_doctor_code` (`doctor_code`),
  KEY `idx_doctors_specialty` (`specialty`),
  KEY `idx_doctors_availability` (`availability`),
  KEY `idx_doctors_status` (`status`),
  CONSTRAINT `ck_doctors_experience` CHECK (`experience_years` IS NULL OR `experience_years` BETWEEN 0 AND 70),
  -- Deleting the account deletes the professional profile: it cannot exist without one.
  CONSTRAINT `fk_doctors_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  -- Deleting a department must never delete its doctors; they just become unassigned.
  CONSTRAINT `fk_doctors_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- A department outlives its head, so this clears rather than cascades.
ALTER TABLE `departments`
  ADD CONSTRAINT `fk_departments_head_doctor`
  FOREIGN KEY (`head_doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL;

CREATE TABLE `doctor_schedules` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `doctor_id` bigint NOT NULL,
  -- java.time.DayOfWeek stored as its ordinal: 0 = MONDAY ... 6 = SUNDAY, so the Mon..Sun
  -- week grid comes back in the right order straight from SQL. See DoctorSchedule.
  `day_of_week` tinyint NOT NULL,
  `start_time` time(6) NOT NULL,
  `end_time` time(6) NOT NULL,
  `shift_type` enum('BREAK','LEAVE','WORK') NOT NULL DEFAULT 'WORK',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_doctor_schedules_slot` (`doctor_id`,`day_of_week`,`start_time`),
  KEY `idx_doctor_schedules_day` (`day_of_week`),
  CONSTRAINT `ck_doctor_schedules_day` CHECK (`day_of_week` BETWEEN 0 AND 6),
  -- A shift crossing midnight has to be split into two rows, one per day.
  CONSTRAINT `ck_doctor_schedules_times` CHECK (`end_time` > `start_time`),
  CONSTRAINT `fk_doctor_schedules_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- The pending doctor requests screen filters on this column.
CREATE INDEX `idx_users_requested_role` ON `users` (`requested_role`);
