-- 003_doctor_profile_fields.sql
-- Additive migration for doctor public profile persistence (biography, expertise, languages)

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.doctors') AND name = 'biography')
BEGIN
    ALTER TABLE dbo.doctors ADD biography nvarchar(1500) NULL;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.doctors') AND name = 'expertise')
BEGIN
    ALTER TABLE dbo.doctors ADD expertise nvarchar(255) NULL;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.doctors') AND name = 'languages')
BEGIN
    ALTER TABLE dbo.doctors ADD languages nvarchar(255) NULL;
END;
GO

-- Seed default initial profile details for existing doctors if blank
UPDATE dbo.doctors
SET biography = 'Board-certified specialist dedicated to providing evidence-based patient consultations, diagnosis, and long-term treatment planning.',
    expertise = ISNULL(specialty, 'General Practice') + ', Preventative Medicine, Clinical Consultations',
    languages = 'English, Vietnamese'
WHERE biography IS NULL;
GO
