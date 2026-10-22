-- The five departments the admin screens already show (frontend adminData.ts).
--
-- Versioned rather than repeatable: a repeatable migration re-runs whenever its checksum
-- changes and would overwrite descriptions an admin edited through the UI. Reference data
-- a human can edit afterwards is versioned data.
--
-- created_at / updated_at are NOT NULL with no database default, because Hibernate sets
-- them on entities; raw SQL has to supply them. SYSDATETIMEOFFSET() rather than
-- SYSDATETIME(), because the columns are datetimeoffset -- see the note at the top of V1.
--
-- mockData.ts also lists Orthopedics, Ophthalmology and Dental. Only the five the *admin*
-- screens show are seeded; adding the rest is what the departments screen is for.

INSERT INTO [departments] ([dept_code], [name], [description], [status], [created_at], [updated_at]) VALUES
  ('DEP-001', 'Cardiology',       'Cardiovascular care and treatment', 'ACTIVE', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
  ('DEP-002', 'Neurology',        'Brain and nervous system care',     'ACTIVE', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
  ('DEP-003', 'Pediatrics',       'Child and infant healthcare',       'ACTIVE', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
  ('DEP-004', 'Dermatology',      'Skin, hair and nail treatment',     'ACTIVE', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
  ('DEP-005', 'General Medicine', 'Primary and general medical care',  'ACTIVE', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
