import { useEffect, useState } from 'react';
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
import { getDoctorAvailability, type Slot } from '../../api/bookingApi';
import styles from './DoctorDetails.module.css';

export default function DoctorDetails() {
  const { id } = useParams();
  const { doctors, getSlotStatus } = useAppointments();
  const doctor = doctors.find((item) => item.id === Number(id));
  const [realSlots, setRealSlots] = useState<Slot[] | null>(null);

  const today = dateKey();
  const maxDate = addDays(today, 29);

  useEffect(() => {
    let active = true;
    if (!doctor) return;
    getDoctorAvailability(doctor.id, today, maxDate)
      .then((res) => {
        if (active) setRealSlots(res.slots || []);
      })
      .catch(() => {
        if (active) setRealSlots([]);
      });
    return () => {
      active = false;
    };
  }, [doctor, today, maxDate]);

  if (!doctor) return <NotFound title="Doctor not found" />;
  const department = departmentForDoctor(doctor);

  // Compute nextDate from realSlots if loaded, otherwise from getSlotStatus
  const nextDate = realSlots !== null
    ? (realSlots.length > 0 ? realSlots[0].date : null)
    : Array.from({ length: 30 }, (_, i) => addDays(dateKey(), i)).find((date) =>
        TIMES.some((time) => getSlotStatus(doctor.id, date, time) === 'available'),
      );

  const availableTimesOnNextDate = realSlots !== null && nextDate
    ? realSlots
        .filter((s) => s.date === nextDate)
        .map((s) => (s.startTime.length === 5 ? s.startTime : s.startTime.substring(0, 5)))
    : nextDate
      ? TIMES.filter((time) => getSlotStatus(doctor.id, nextDate, time) === 'available')
      : [];

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
                <span>({doctor.reviews} reviews · verified profile)</span>
              </div>
            </div>
          </section>
          <section className={styles.card}>
            <h2>About the doctor</h2>
            <p>
              {doctor.about ||
                'A detailed biography has not been provided for this profile.'}
            </p>
            {doctor.expertise && (
              <>
                <h3>Areas of expertise</h3>
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
                <small>Consultation location</small>
                <strong>Smart Healthcare Clinic · Room {doctor.room}</strong>
              </div>
            </div>
          </section>
          <section className={styles.card}>
            <h2>Availability preview</h2>
            <p>
              {nextDate
                ? `Next availability: ${formatDate(nextDate)}`
                : 'No availability in the next 30 days'}
            </p>
            {nextDate && availableTimesOnNextDate.length > 0 && (
              <div className={styles.actions}>
                {availableTimesOnNextDate.slice(0, 4).map((time) => (
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
              Vietnam time (UTC+7). Live doctor schedules.
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
              <span>· {doctor.reviews} reviews in the clinic system</span>
            </div>
            <p className={styles.help}>
              Individual review text is not available.
            </p>
          </section>
        </div>
        <aside className={`${styles.card} ${styles.aside}`}>
          <span className={styles.eyebrow}>Plan your visit</span>
          <h2>Book a consultation</h2>
          <p className={styles.help}>In person · 30 minutes</p>
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
              ? `Next availability: ${formatDate(nextDate, true)}`
              : 'No availability in the selected period'}
          </p>
        </aside>
      </div>
    </Page>
  );
}
