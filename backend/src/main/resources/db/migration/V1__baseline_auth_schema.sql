-- Baseline: the authentication schema, in T-SQL for SQL Server.
--
-- Column types are not a free choice. ddl-auto=validate compares every column against
-- what Hibernate's SQLServerDialect would have generated for the same entity, so these
-- are that dialect's own output, taken from a generated create script rather than
-- guessed. Two of them differ from the obvious MySQL translation:
--   * Instant -> datetimeoffset(7), NOT datetime2. Hibernate maps Instant through
--     TIMESTAMP_UTC, which SQL Server renders as datetimeoffset; a datetime2 column
--     reports a different JDBC type code and fails validate at start-up.
--   * @Enumerated(STRING) -> varchar(20) plus a CHECK, not a native enum. SQL Server has
--     no enum type, so the MySQL `enum('A','B')` columns become varchar with the same
--     values spelled out in a constraint.
--
-- The CHECK and DEFAULT constraints are named rather than left to SQL Server's
-- DF__users__role__619B8048 style: a generated name differs in every database, so a
-- later migration could not drop or alter the column without first looking the name up.
--
-- FROZEN. Never edit and never extend this file. Anything added here would run on fresh
-- databases and not on baselined ones (see spring.flyway.baseline-version), which is
-- exactly the drift the baseline prevents. Every later change, including changes to
-- `users`, goes in a new V<n> file.

CREATE TABLE [users] (
  [id] bigint IDENTITY(1,1) NOT NULL,
  [address] varchar(255) NULL,
  [created_at] datetimeoffset(7) NOT NULL,
  [dob] date NULL,
  [email] varchar(255) NOT NULL,
  [full_name] varchar(100) NOT NULL,
  [password_hash] varchar(255) NOT NULL,
  [phone] varchar(20) NOT NULL,
  [role] varchar(20) NOT NULL,
  [updated_at] datetimeoffset(7) NOT NULL,
  [requested_role] varchar(20) NULL,
  [email_verified] bit NULL,
  CONSTRAINT [pk_users] PRIMARY KEY ([id]),
  -- Hibernate's own generated name for @Column(unique = true) on User.email. Kept so a
  -- database built by these migrations and one built by ddl-auto report the same key.
  CONSTRAINT [UK6dotkott2kjsp8vw4d0m25fb7] UNIQUE ([email]),
  CONSTRAINT [ck_users_role] CHECK ([role] IN ('ADMIN', 'DOCTOR', 'PATIENT')),
  CONSTRAINT [ck_users_requested_role] CHECK ([requested_role] IS NULL OR [requested_role] IN ('ADMIN', 'DOCTOR', 'PATIENT'))
);

CREATE TABLE [password_reset_tokens] (
  [id] bigint IDENTITY(1,1) NOT NULL,
  [created_at] datetimeoffset(7) NOT NULL,
  [expires_at] datetimeoffset(7) NOT NULL,
  [token_hash] varchar(64) NOT NULL,
  [used_at] datetimeoffset(7) NULL,
  [user_id] bigint NOT NULL,
  CONSTRAINT [pk_password_reset_tokens] PRIMARY KEY ([id]),
  CONSTRAINT [UKajre85ybxavf1tt4omkrs5p6g] UNIQUE ([token_hash]),
  CONSTRAINT [FKk3ndxg5xp6v7wd4gjyusp15gq] FOREIGN KEY ([user_id]) REFERENCES [users] ([id])
);

-- MySQL creates an index for a foreign key on its own; SQL Server does not, and every
-- lookup here is "the tokens belonging to this user".
CREATE INDEX [FKk3ndxg5xp6v7wd4gjyusp15gq] ON [password_reset_tokens] ([user_id]);

CREATE TABLE [email_verification_tokens] (
  [id] bigint IDENTITY(1,1) NOT NULL,
  [created_at] datetimeoffset(7) NOT NULL,
  [expires_at] datetimeoffset(7) NOT NULL,
  [token_hash] varchar(64) NOT NULL,
  [used_at] datetimeoffset(7) NULL,
  [user_id] bigint NOT NULL,
  CONSTRAINT [pk_email_verification_tokens] PRIMARY KEY ([id]),
  CONSTRAINT [UKah12jdrm74nfnmu11x9xxlbex] UNIQUE ([token_hash]),
  CONSTRAINT [FKi1c4mmamlb8keqt74k4lrtwhc] FOREIGN KEY ([user_id]) REFERENCES [users] ([id])
);

CREATE INDEX [FKi1c4mmamlb8keqt74k4lrtwhc] ON [email_verification_tokens] ([user_id]);
