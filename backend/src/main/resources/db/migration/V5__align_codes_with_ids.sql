-- Make every existing code equal Doctor.codeFor(id) / Department.codeFor(id).
--
-- V4 seeded doctors with the codes the frontend mock showed (DR-00317, DR-00276, ...),
-- while doctors approved later get codeFor(id). Left alone, the doctor with id 172 would
-- be given DR-00172 -- Dr. Jenkins' seeded code -- and that approval would fail on the
-- unique key. After this, "code is a function of the id" holds for every row, so a new
-- code can never collide with an old one.
--
-- Two passes through a temporary code, as on MySQL. SQL Server maintains a unique index
-- row by row within a single UPDATE rather than checking only the finished set, so going
-- straight to the final codes can still report a duplicate mid-statement whenever one
-- row's target is another row's current code.
--
-- FORMAT(id, 'D5') is Java's %05d exactly: it pads to five digits and widens past them
-- rather than truncating, which is what the LPAD/GREATEST pair had to spell out on MySQL.

UPDATE [doctors]     SET [doctor_code] = CONCAT('TMP-', [id]);
UPDATE [doctors]     SET [doctor_code] = CONCAT('DR-',  FORMAT([id], 'D5'));

UPDATE [departments] SET [dept_code]   = CONCAT('TMP-', [id]);
UPDATE [departments] SET [dept_code]   = CONCAT('DEP-', FORMAT([id], 'D3'));
