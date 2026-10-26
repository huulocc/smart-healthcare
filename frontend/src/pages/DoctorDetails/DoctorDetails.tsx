import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Stethoscope } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import Button from '../../components/Button';
import {
  DoctorImage,
  NotFound,
  Page,
} from '../../components/healthcare/HealthcareUI';
import { useAsync } from '../../hooks/useAsync';
import { getPublicDoctor } from '../../api/publicApi';
import { getDoctorAvailability, type Slot } from '../../api/bookingApi';
import { getStoredToken } from '../../api/client';
import styles from './DoctorDetails.module.css';

const DAYS_AHEAD = 29;

/** Dates are plain yyyy-MM-dd strings end to end, the same shape the API uses. */
const isoDay = (date: Date) => format(date, 'yyyy-MM-dd');
const readable = (day: string) => format(parseISO(day), 'EEEE d MMMM yyyy');

export default function DoctorDetails() {
  const { id } = useParams();
  const doctorId = Number(id);

  // The directory is public; availability is not. A visitor who is not signed in would get
  // 401 from /api/booking, so the request is not made at all and the panel says why.
  const signedIn = getStoredToken() !== null;
  const today = isoDay(new Date());
  const until = isoDay(addDays(new Date(), DAYS_AHEAD));

  const doctor = useAsync(() => getPublicDoctor(doctorId), [doctorId]);

  const availability = useAsync<Slot[] | null>(
    () =>
      signedIn && Number.isFinite(doctorId)
        ? getDoctorAvailability(doctorId, today, until).then(
            (response) => response.slots ?? [],
          )
        : Promise.resolve(null),
    [doctorId, signedIn, today, until],
  );

  if (!Number.isFinite(doctorId)) return <NotFound title="Doctor not found" />;
  if (doctor.state.status === 'loading') {
    return (
      <Page crumbs={[{ label: 'Doctors', to: '/doctors' }]}>
        <section className={styles.card}>
          <p>Loading this profile...</p>
        </section>
      </Page>
    );
  }
  if (doctor.state.status === 'error') {
    return <NotFound title="Doctor not found" />;
  }

  const profile = doctor.state.data;
  const slots = availability.state.status === 'ready' ? availability.state.data : null;
  const nextDay = slots && slots.length > 0 ? slots[0].date : null;
  const timesOnNextDay = (slots ?? [])
    .filter((slot) => slot.date === nextDay)
    .map((slot) => slot.startTime.slice(0, 5));

  return (
    <Page
      crumbs={[{ label: 'Doctors', to: '/doctors' }, { label: profile.name }]}
    >
      <div className={styles.twoColumn}>
        <div className={styles.stack}>
          <section className={`${styles.card} ${styles.profileHero}`}>
            <DoctorImage
              doctor={{ name: profile.name, image: profile.avatarUrl ?? '' }}
              className={styles.profilePhoto}
            />
            <div className={styles.profileIntro}>
              {profile.departmentId === null ? (
                <span className={styles.eyebrow}>
                  {profile.departmentName ?? 'General Medicine'}
                </span>
              ) : (
                <Link
                  className={styles.eyebrow}
                  to={`/departments/${profile.departmentId}`}
                >
                  {profile.departmentName}
                </Link>
              )}
              <h1>{profile.name}</h1>
              <p>{profile.specialty}</p>
            </div>
          </section>

          <section className={styles.card}>
            <h2>About the doctor</h2>
            <div className={styles.fact}>
              <Stethoscope />
              <div>
                <small>Specialty</small>
                <strong>{profile.specialty}</strong>
              </div>
            </div>
            {profile.experienceYears !== null && (
              <div className={styles.fact}>
                <CalendarDays />
                <div>
                  <small>Clinical experience</small>
                  <strong>{profile.experienceYears} years</strong>
                </div>
              </div>
            )}
            <p className={styles.help}>
              Reference {profile.doctorCode}. A longer biography is not held in
              the clinic system.
            </p>
          </section>

          <section className={styles.card}>
            <h2>Availability</h2>
            {!signedIn ? (
              <>
                <p>Sign in to see this doctor's open appointment times.</p>
                <Button to="/login" variant="outline">
                  Sign in
                </Button>
              </>
            ) : availability.state.status === 'loading' ? (
              <p>Checking the schedule...</p>
            ) : availability.state.status === 'error' ? (
              <>
                <p>Could not load the schedule. {availability.state.message}</p>
                <Button onClick={availability.reload} variant="outline">
                  Try Again
                </Button>
              </>
            ) : (
              <>
                <p>
                  {nextDay
                    ? `Next availability: ${readable(nextDay)}`
                    : `No availability in the next ${DAYS_AHEAD + 1} days`}
                </p>
                {timesOnNextDay.length > 0 && (
                  <div className={styles.actions}>
                    {timesOnNextDay.slice(0, 4).map((time) => (
                      <Button
                        key={time}
                        to={`/book/${profile.id}`}
                        variant="outline"
                        size="sm"
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                )}
                <p className={styles.help}>Vietnam time (UTC+7).</p>
              </>
            )}
          </section>
        </div>

        <aside className={`${styles.card} ${styles.aside}`}>
          <span className={styles.eyebrow}>Plan your visit</span>
          <h2>Book a consultation</h2>
          <p className={styles.help}>In person · 30 minutes</p>
          <div className={styles.stack}>
            <Button to={`/book/${profile.id}`} fullWidth>
              <CalendarDays size={18} />
              Book appointment
            </Button>
          </div>
          <hr className={styles.divider} />
          <p className={styles.help}>
            No payment is taken when booking. The clinic confirms your
            appointment by email.
          </p>
        </aside>
      </div>
    </Page>
  );
}
