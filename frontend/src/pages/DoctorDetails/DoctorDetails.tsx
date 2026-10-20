import { Link, useParams } from 'react-router-dom';
import { CalendarDays, MapPin, Star } from 'lucide-react';
import Button from '../../components/Button';
import {
  DemoNotice,
  DoctorImage,
  FeeSummary,
  NotFound,
  Page,
} from '../../components/healthcare/HealthcareUI';
import { useAppointments } from '../../context/AppointmentContext';
import {
  addDays,
  dateKey,
  departmentForDoctor,
  formatDate,
  TIMES,
} from '../../data/appointmentDemo';
import styles from './DoctorDetails.module.css';

export default function DoctorDetails() {
  const { id } = useParams();
  const { doctors, getSlotStatus } = useAppointments();
  const doctor = doctors.find((item) => item.id === Number(id));
  if (!doctor) return <NotFound title="Doctor not found" />;
  const department = departmentForDoctor(doctor);
  const nextDate = Array.from({ length: 31 }, (_, i) =>
    addDays(dateKey(), i),
  ).find((date) =>
    TIMES.some((time) => getSlotStatus(doctor.id, date, time) === 'available'),
  );
  return (
    <Page
      previewStates
      crumbs={[{ label: 'Doctors', to: '/doctors' }, { label: doctor.name }]}
    >
      <DemoNotice />
      <div className={styles.twoColumn}>
        <div className={styles.stack}>
          <section className={`${styles.card} ${styles.profileHero}`}>
            <DoctorImage doctor={doctor} className={styles.profilePhoto} />
            <div className={styles.profileIntro}>
              <Link
                className={styles.eyebrow}
                to={`/departments/${department?.id}`}
              >
                {doctor.department}
              </Link>
              <h1>{doctor.name}</h1>
              <p>{doctor.specialty}</p>
              <div className={styles.rating}>
                <Star size={16} fill="currentColor" />
                <strong>{doctor.rating}</strong>
                <span>({doctor.reviews} reviews · source demo data)</span>
              </div>
            </div>
          </section>
          <section className={styles.card}>
            <h2>About the doctor</h2>
            <p>
              {doctor.about ||
                'A detailed biography has not been provided for this demo profile.'}
            </p>
            {doctor.expertise && (
              <>
                <h3>Areas of expertise · Demo</h3>
                <p>{doctor.expertise}</p>
              </>
            )}
            {doctor.languages && (
              <>
                <h3>Languages</h3>
                <p>{doctor.languages}</p>
              </>
            )}
            <div className={styles.fact}>
              <MapPin />
              <div>
                <small>Demo consultation location</small>
                <strong>Smart Healthcare Clinic · Room {doctor.room}</strong>
              </div>
            </div>
          </section>
          <section className={styles.card}>
            <h2>Availability preview</h2>
            <p>
              {nextDate
                ? `Next demo availability: ${formatDate(nextDate)}`
                : 'No availability in the selected period'}
            </p>
            {nextDate && (
              <div className={styles.actions}>
                {TIMES.filter(
                  (time) =>
                    getSlotStatus(doctor.id, nextDate, time) === 'available',
                )
                  .slice(0, 4)
                  .map((time) => (
                    <Button
                      key={time}
                      to={`/book/${doctor.id}`}
                      variant="outline"
                      size="sm"
                    >
                      {time}
                    </Button>
                  ))}
              </div>
            )}
            <p className={styles.help}>
              Vietnam time (UTC+7). Sample availability only.
            </p>
            <Button to={`/book/${doctor.id}`} variant="ghost">
              {nextDate ? 'View full schedule' : 'Check other dates'}
            </Button>
          </section>
          <section className={styles.card}>
            <h2>Patient reviews</h2>
            <div className={styles.rating}>
              <Star size={20} fill="currentColor" />
              <strong>{doctor.rating} / 5</strong>
              <span>· {doctor.reviews} reviews in the source demo</span>
            </div>
            <p className={styles.help}>
              Individual review text is not available.
            </p>
          </section>
        </div>
        <aside className={`${styles.card} ${styles.aside}`}>
          <span className={styles.eyebrow}>Plan your visit</span>
          <h2>Book a consultation</h2>
          <p className={styles.help}>In person · 30 minutes · Demo</p>
          <FeeSummary fee={doctor.fee} />
          <div className={styles.stack}>
            <Button to={`/book/${doctor.id}`} fullWidth>
              <CalendarDays size={18} />
              Book appointment
            </Button>
            <Button to={`/book/${doctor.id}`} variant="outline" fullWidth>
              View schedule
            </Button>
          </div>
          <hr className={styles.divider} />
          <p className={styles.help}>
            {nextDate
              ? `Next demo availability: ${formatDate(nextDate, true)}`
              : 'No availability in the selected period'}
          </p>
        </aside>
      </div>
    </Page>
  );
}
