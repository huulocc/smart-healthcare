import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  DoctorSummary,
  Page,
} from '../../components/healthcare/HealthcareUI';
import Button from '../../components/Button';
import {
  getDoctorMe,
  updateDoctorPublicProfile,
  type DoctorProfile as DoctorProfileType,
} from '../../api/bookingApi';
import styles from './DoctorProfile.module.css';

export default function DoctorProfile() {
  const [doctor, setDoctor] = useState<DoctorProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({
    about: '',
    expertise: '',
    languages: '',
    image: '',
  });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadProfile = () => {
    setLoading(true);
    getDoctorMe()
      .then((data) => {
        setDoctor(data);
        setFields({
          about: data.biography ?? '',
          expertise: data.expertise ?? '',
          languages: data.languages ?? '',
          image: data.avatarUrl ?? '',
        });
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load doctor profile.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading) {
    return (
      <Page crumbs={[{ label: 'Doctor', to: '/doctor' }, { label: 'My profile' }]}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
          <Loader2 className="spin" size={36} color="#026AA7" />
        </div>
      </Page>
    );
  }

  if (!doctor) {
    return (
      <Page crumbs={[{ label: 'Doctor', to: '/doctor' }, { label: 'My profile' }]}>
        <div className={styles.heading}>
          <div>
            <span className={styles.eyebrow}>Doctor Portal</span>
            <h1>Doctor Profile</h1>
            <p>Unable to load doctor profile. Please ensure you are logged in as a registered doctor.</p>
          </div>
          <Button onClick={loadProfile} variant="outline">
            Retry
          </Button>
        </div>
      </Page>
    );
  }

  const publicLink = `/doctors/${doctor.id}`;
  const summaryDoctor = {
    id: doctor.id,
    name: doctor.fullName,
    specialty: doctor.specialty || 'General Practice',
    department: doctor.departmentName ?? 'Clinic',
    experience: doctor.experienceYears ? `${doctor.experienceYears} years` : 'Experienced',
    fee: 500000,
    room: doctor.doctorCode ? doctor.doctorCode.replace('DR-', 'R-') : 'R-101',
    rating: '4.9',
    reviews: 0,
    about: fields.about || doctor.biography || '',
    expertise: fields.expertise || doctor.expertise || '',
    languages: fields.languages || doctor.languages || 'English, Vietnamese',
    image: editing ? (fields.image || doctor.avatarUrl || '/images/doctor_1.jpg') : (doctor.avatarUrl || '/images/doctor_1.jpg'),
  };

  return (
    <Page crumbs={[{ label: 'Doctor', to: '/doctor' }, { label: 'My profile' }]}>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Doctor Portal</span>
          <h1>My public profile</h1>
          <p>
            Public profile for {doctor.fullName} ({doctor.doctorCode})
          </p>
        </div>
        <Button to={publicLink} variant="outline">
          View public profile
        </Button>
      </div>

      {notice && (
        <div className={styles.successBanner} role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <DoctorSummary doctor={summaryDoctor} />
          {!editing && (
            <Button
              onClick={() => {
                setFields({
                  about: doctor.biography ?? '',
                  expertise: doctor.expertise ?? '',
                  languages: doctor.languages ?? '',
                  image: doctor.avatarUrl ?? '',
                });
                setEditing(true);
                setNotice('');
                setError('');
              }}
            >
              Edit profile
            </Button>
          )}
        </div>
        <hr className={styles.divider} />
        {editing ? (
          <form
            className={styles.form}
            onSubmit={async (event) => {
              event.preventDefault();
              if (fields.about.length > 1500) {
                setError('Biography must be 1500 characters or fewer.');
                return;
              }
              if (fields.expertise.length > 255 || fields.languages.length > 255) {
                setError('Expertise and languages must be 255 characters or fewer.');
                return;
              }
              if (
                fields.image &&
                !fields.image.startsWith('/images/') &&
                !/^https?:\/\//.test(fields.image)
              ) {
                setError('Use a local /images/ path or a valid HTTP/HTTPS URL.');
                return;
              }

              setSaving(true);
              setError('');
              try {
                const updated = await updateDoctorPublicProfile({
                  biography: fields.about.trim(),
                  expertise: fields.expertise.trim(),
                  languages: fields.languages.trim(),
                  avatarUrl: fields.image.trim(),
                });
                setDoctor(updated);
                setEditing(false);
                setNotice('Profile updated successfully in SQL Server database.');
              } catch (cause: unknown) {
                let msg = 'Failed to update profile.';
                if (typeof cause === 'object' && cause !== null && 'response' in cause) {
                  const res = (cause as { response?: { data?: { detail?: string; message?: string } } }).response;
                  if (res?.data?.detail) msg = res.data.detail;
                  else if (res?.data?.message) msg = res.data.message;
                }
                setError(msg);
              } finally {
                setSaving(false);
              }
            }}
          >
            <label className={styles.field}>
              Biography (public)
              <textarea
                value={fields.about}
                onChange={(event) =>
                  setFields({ ...fields, about: event.target.value })
                }
                placeholder="Enter public clinical biography, education, and career summary…"
                rows={4}
              />
            </label>
            <label className={styles.field}>
              Areas of expertise (comma-separated)
              <input
                value={fields.expertise}
                onChange={(event) =>
                  setFields({ ...fields, expertise: event.target.value })
                }
                placeholder="e.g. Cardiology, Heart Rhythm, Preventative Care"
              />
            </label>
            <label className={styles.field}>
              Languages spoken
              <input
                value={fields.languages}
                onChange={(event) =>
                  setFields({ ...fields, languages: event.target.value })
                }
                placeholder="e.g. English, Vietnamese, French"
              />
            </label>
            <label className={styles.field}>
              Portrait avatar image path or URL
              <input
                value={fields.image}
                onChange={(event) =>
                  setFields({ ...fields, image: event.target.value })
                }
                placeholder="e.g. /images/doctor_1.jpg or https://..."
              />
            </label>
            <p className={styles.help}>
              Only edit your public professional details. Role, department, and doctor identifier are managed by hospital administration.
            </p>
            {error && (
              <p className={styles.errorBanner} role="alert">
                {error}
              </p>
            )}
            <div className={styles.actions}>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  setError('');
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <dl className={styles.detailGrid}>
            <div className={styles.fullSpan}>
              <dt>Biography</dt>
              <dd>{doctor.biography || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Areas of expertise</dt>
              <dd>{doctor.expertise || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Languages</dt>
              <dd>{doctor.languages || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Specialty</dt>
              <dd>{doctor.specialty || 'General'}</dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd>{doctor.departmentName || 'Clinic'}</dd>
            </div>
            <div>
              <dt>Doctor Identifier</dt>
              <dd style={{ fontFamily: 'monospace' }}>{doctor.doctorCode}</dd>
            </div>
            <div>
              <dt>Clinical Experience</dt>
              <dd>{doctor.experienceYears ? `${doctor.experienceYears} years` : 'Not specified'}</dd>
            </div>
          </dl>
        )}
      </section>
    </Page>
  );
}
