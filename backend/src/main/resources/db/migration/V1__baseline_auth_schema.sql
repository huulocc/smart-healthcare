-- Baseline: the schema that spring.jpa.hibernate.ddl-auto=update had already built on
-- existing developer databases. Flyway records it as the baseline where those tables
-- exist (spring.flyway.baseline-on-migrate) and runs it on an empty database, so both
-- end up with the same schema.
--
-- Reproduced from `mysqldump --no-data` of a real developer database, not written by
-- hand: column order, the enum columns and Hibernate's generated constraint names are
-- all kept so a fresh database comes out byte-for-byte like an existing one.
--
-- FROZEN. Never edit and never extend this file. Anything added here would run on fresh
-- databases and not on baselined ones, which is exactly the drift the baseline prevents.
-- Every later change, including changes to `users`, goes in a new V<n> file.

CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `address` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `dob` date DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  -- Hibernate 6.3+ maps @Enumerated(STRING) to a native MySQL enum, not varchar.
  `role` enum('ADMIN','DOCTOR','PATIENT') NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `requested_role` enum('ADMIN','DOCTOR','PATIENT') DEFAULT NULL,
  `email_verified` bit(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK6dotkott2kjsp8vw4d0m25fb7` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `password_reset_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `used_at` datetime(6) DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKajre85ybxavf1tt4omkrs5p6g` (`token_hash`),
  KEY `FKk3ndxg5xp6v7wd4gjyusp15gq` (`user_id`),
  CONSTRAINT `FKk3ndxg5xp6v7wd4gjyusp15gq` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `email_verification_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `used_at` datetime(6) DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKah12jdrm74nfnmu11x9xxlbex` (`token_hash`),
  KEY `FKi1c4mmamlb8keqt74k4lrtwhc` (`user_id`),
  CONSTRAINT `FKi1c4mmamlb8keqt74k4lrtwhc` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
