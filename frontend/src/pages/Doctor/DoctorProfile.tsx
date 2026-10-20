import { useState } from 'react';
import {
  DemoNotice,
  DoctorSummary,
  Page,
} from '../../components/healthcare/HealthcareUI';
import Button from '../../components/Button';
import { useAppointments } from '../../context/AppointmentContext';
import styles from './DoctorProfile.module.css';

export default function DoctorProfile() {
  const { doctors, updateDoctor } = useAppointments();
  const doctor = doctors[0];
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({
    about: doctor.about,
    expertise: doctor.expertise,
    languages: doctor.languages,
    image: doctor.image,
  });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  return (
    <Page
      crumbs={[{ label: 'Doctor', to: '/doctor' }, { label: 'My profile' }]}
    >
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Doctor workspace preview</span>
          <h1>My public profile</h1>
          <p>Edit the sample profile for {doctor.name}.</p>
        </div>
        <Button to="/doctors/1" variant="outline">
          View public profile
        </Button>
      </div>
      <DemoNotice />
      {notice && (
        <div className={styles.successBanner} role="status">
          {notice}
        </div>
      )}
      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <DoctorSummary
            doctor={{ ...doctor, ...(editing && { image: fields.image }) }}
          />
          {!editing && (
            <Button
              onClick={() => {
                setFields({
                  about: doctor.about,
                  expertise: doctor.expertise,
                  languages: doctor.languages,
                  image: doctor.image,
                });
                setEditing(true);
                setNotice('');
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
            onSubmit={(event) => {
              event.preventDefault();
              if (
                fields.about.length > 1500 ||
                fields.expertise.length > 200 ||
                fields.languages.length > 200
              ) {
                setError(
                  'Biography must be 1500 characters or fewer; other fields must be 200 or fewer.',
                );
                return;
              }
              if (
                fields.image &&
                !fields.image.startsWith('/images/') &&
                !/^https:\/\//.test(fields.image)
              ) {
                setError('Use a local /images/ path or an HTTPS image URL.');
                return;
              }
              updateDoctor({
                about: fields.about.trim(),
                expertise: fields.expertise.trim(),
                languages: fields.languages.trim(),
                image: fields.image.trim(),
              });
              setEditing(false);
              setError('');
              setNotice(
                'Demo profile saved. Changes are now visible on the public profile.',
              );
            }}
          >
            <label className={styles.field}>
              Biography (optional)
              <textarea
                value={fields.about}
                onChange={(event) =>
                  setFields({ ...fields, about: event.target.value })
                }
                placeholder="Add a sample public biography…"
              />
            </label>
            {(['expertise', 'languages', 'image'] as const).map((field) => (
              <label key={field} className={styles.field}>
                {field === 'expertise'
                  ? 'Areas of expertise'
                  : field === 'languages'
                    ? 'Languages'
                    : 'Portrait image path or HTTPS URL'}{' '}
                (optional)
                <input
                  value={fields[field]}
                  onChange={(event) =>
                    setFields({ ...fields, [field]: event.target.value })
                  }
                />
              </label>
            ))}
            <p className={styles.help}>
              Only edit sample public information. Do not enter unverified
              qualifications or real patient details.
            </p>
            {error && (
              <p className={styles.errorBanner} role="alert">
                {error}
              </p>
            )}
            <div className={styles.actions}>
              <Button type="submit">Save changes</Button>
              <Button
                type="button"
                variant="outline"
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
              <dd>{doctor.about || 'Not provided'}</dd>
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
              <dt>Specialty (source demo data)</dt>
              <dd>{doctor.specialty}</dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd>{doctor.department}</dd>
            </div>
          </dl>
        )}
      </section>
    </Page>
  );
}
