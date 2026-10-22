-- Bring a database that Flyway baselined into line with what V1-V5 actually describe.
--
-- Why this file exists. The team's SQL Server database was not built by these migrations;
-- it was grown with ddl-auto=update plus hand-written T-SQL before the application was
-- ported, and it carries tables that belong to other people's unmerged work. Dropping it
-- and replaying V1-V5 on an empty database would throw away both their work and the real
-- accounts registered in it, so spring.flyway.baseline-version=5 records V1-V5 as already
-- applied instead. That claim is only honest if the differences are closed, and three of
-- them were real:
--
--   * password_reset_tokens.used_at and email_verification_tokens.used_at were datetime2
--     while every other Instant column was datetimeoffset. That one fails outright:
--     ddl-auto=validate compares JDBC type codes, and datetime2 does not report the code
--     Hibernate expects for an Instant, so the application would not start.
--   * doctor_schedules.day_of_week was tinyint, where the dialect renders an ordinal enum
--     as smallint. Both hold 0-6, and validate happens to accept tinyint because the two
--     report the same type code, but then a restored database and a fresh one would be
--     subtly different schemas. One shape is worth the churn.
--   * created_at / updated_at / expires_at were nullable, though the entities declare them
--     NOT NULL. validate does not check nullability, so this was not breaking anything --
--     it just meant the database would have accepted a row the application cannot read
--     back, since the Instant fields are not optional.
--
-- Every statement here is written to be a no-op on a database that did run V1-V5, so the
-- two paths converge rather than drift further apart. Re-declaring a column with the type
-- it already has costs nothing, so almost nothing needs an IF EXISTS guard.
--
-- Converting datetime2 to datetimeoffset assumes the old values were UTC, which they were:
-- the rows that have a used_at sit minutes after a created_at recorded as +00:00, and the
-- application writes Instant, never local time. So the three existing values keep meaning
-- the same moment.

-- The one part that cannot be written as a plain statement. SQL Server refuses to retype a
-- column while a DEFAULT constraint mentions it, and the restored database declared those
-- defaults without naming them, so it calls this one DF__password___used___66603565 and
-- the next database to be restored will call it something else. There is no name to drop,
-- only a name to look up -- which is the argument for the named df_* constraints in V1 and
-- V2. A fresh database declares no default on used_at at all, so the lookup finds nothing
-- and COALESCE turns the whole batch into an empty one.
--
-- The GO is a batch boundary, not a statement separator. Flyway splits SQL Server
-- migrations on GO rather than on semicolons -- flyway-sqlserver's SQLServerParser returns
-- Delimiter.GO as its default -- so everything above it is submitted as one batch and
-- everything below it as another. That is what this needs: the dropped default has to be
-- gone from the metadata before the ALTER COLUMN below is compiled, and keeping the
-- variable inside its own batch says so plainly. It also means a semicolon here does not
-- end a statement, which is why the DECLARE and the EXEC can sit together at all.
DECLARE @drop_used_at_defaults nvarchar(max);
SELECT @drop_used_at_defaults = COALESCE(STRING_AGG(
           N'ALTER TABLE ' + QUOTENAME(OBJECT_NAME(d.parent_object_id))
         + N' DROP CONSTRAINT ' + QUOTENAME(d.name) + N';', N' '), N'')
  FROM sys.default_constraints d
  JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id
 WHERE c.name = 'used_at'
   AND OBJECT_NAME(d.parent_object_id) IN ('password_reset_tokens', 'email_verification_tokens');
EXEC sp_executesql @drop_used_at_defaults;
GO

ALTER TABLE [password_reset_tokens]     ALTER COLUMN [used_at] datetimeoffset(7) NULL;
ALTER TABLE [email_verification_tokens] ALTER COLUMN [used_at] datetimeoffset(7) NULL;

ALTER TABLE [users]            ALTER COLUMN [created_at] datetimeoffset(7) NOT NULL;
ALTER TABLE [users]            ALTER COLUMN [updated_at] datetimeoffset(7) NOT NULL;
ALTER TABLE [departments]      ALTER COLUMN [created_at] datetimeoffset(7) NOT NULL;
ALTER TABLE [departments]      ALTER COLUMN [updated_at] datetimeoffset(7) NOT NULL;
ALTER TABLE [doctors]          ALTER COLUMN [created_at] datetimeoffset(7) NOT NULL;
ALTER TABLE [doctors]          ALTER COLUMN [updated_at] datetimeoffset(7) NOT NULL;
ALTER TABLE [doctor_schedules] ALTER COLUMN [created_at] datetimeoffset(7) NOT NULL;
ALTER TABLE [doctor_schedules] ALTER COLUMN [updated_at] datetimeoffset(7) NOT NULL;

ALTER TABLE [password_reset_tokens]     ALTER COLUMN [created_at] datetimeoffset(7) NOT NULL;
ALTER TABLE [password_reset_tokens]     ALTER COLUMN [expires_at] datetimeoffset(7) NOT NULL;
ALTER TABLE [email_verification_tokens] ALTER COLUMN [created_at] datetimeoffset(7) NOT NULL;
ALTER TABLE [email_verification_tokens] ALTER COLUMN [expires_at] datetimeoffset(7) NOT NULL;

-- day_of_week carries an index, a unique key and a range check, and SQL Server refuses to
-- retype a column any of them mention -- whether or not the type actually changes. They
-- are dropped and restated exactly as V2 declares them, so this runs the same way on a
-- restored database and on a fresh one.
ALTER TABLE [doctor_schedules] DROP CONSTRAINT [ck_doctor_schedules_day];
DROP INDEX [idx_doctor_schedules_day] ON [doctor_schedules];
ALTER TABLE [doctor_schedules] DROP CONSTRAINT [uk_doctor_schedules_slot];

ALTER TABLE [doctor_schedules] ALTER COLUMN [day_of_week] smallint NOT NULL;

ALTER TABLE [doctor_schedules] ADD CONSTRAINT [uk_doctor_schedules_slot] UNIQUE ([doctor_id], [day_of_week], [start_time]);
CREATE INDEX [idx_doctor_schedules_day] ON [doctor_schedules] ([day_of_week]);
ALTER TABLE [doctor_schedules] ADD CONSTRAINT [ck_doctor_schedules_day] CHECK ([day_of_week] BETWEEN 0 AND 6);
