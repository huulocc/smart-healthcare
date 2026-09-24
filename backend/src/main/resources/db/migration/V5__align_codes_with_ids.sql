-- Make every existing code equal Doctor.codeFor(id) / Department.codeFor(id).
--
-- V4 seeded doctors with the codes the frontend mock showed (DR-00317, DR-00276, ...),
-- while doctors approved later get codeFor(id). Left alone, the doctor with id 172 would
-- be given DR-00172 -- Dr. Jenkins' seeded code -- and that approval would fail on the
-- unique key. After this, "code is a function of the id" holds for every row, so a new
-- code can never collide with an old one.
--
-- Two passes through a temporary code, because MySQL checks unique keys row by row during
-- a multi-row UPDATE: going straight to the final codes could collide mid-update whenever
-- one row's target is another row's current code.
--
-- GREATEST(n, CHAR_LENGTH(id)) instead of a fixed width: LPAD cuts a longer string down to
-- the given length, while Java's %05d just widens.

UPDATE `doctors`     SET `doctor_code` = CONCAT('TMP-', `id`);
UPDATE `doctors`     SET `doctor_code` = CONCAT('DR-',  LPAD(`id`, GREATEST(5, CHAR_LENGTH(`id`)), '0'));

UPDATE `departments` SET `dept_code`   = CONCAT('TMP-', `id`);
UPDATE `departments` SET `dept_code`   = CONCAT('DEP-', LPAD(`id`, GREATEST(3, CHAR_LENGTH(`id`)), '0'));
