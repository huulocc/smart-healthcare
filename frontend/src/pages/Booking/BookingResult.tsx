import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, CalendarCheck, Loader2 } from 'lucide-react';
import Button from '../../components/Button';
import {
  DoctorSummary,
  FeeSummary,
  NotFound,
  Page,
  StatusBadge,
} from '../../components/healthcare/HealthcareUI';
import { useAppointments } from '../../context/AppointmentContext';
import { formatDate } from '../../data/appointmentDemo';
import { getAppointmentDetails, type AppointmentConfirmation } from '../../api/bookingApi';
import styles from './BookingResult.module.css';

export default function BookingResult() {
  const { id } = useParams();
  const { doctors } = useAppointments();
  const [appointment, setAppointment] = useState<AppointmentConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id || isNaN(Number(id))) {
      setLoading(false);
      setError(true);
      return;
    }

    setLoading(true);
    setError(false);

    getAppointmentDetails(Number(id))
      .then((data) => {
        if (active) {
          setAppointment(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <Page crumbs={[{ label: 'Booking result' }]}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem' }}>
          <Loader2 className="spin" size={36} color="#026AA7" />
          <p style={{ marginTop: '1rem', color: '#667085' }}>Retrieving your appointment confirmation…</p>
        </div>
      </Page>
    );
  }

  if (error || !appointment) {
    return (
      <NotFound
        title="Appointment not found"
        back="/my-appointments"
        label="View my appointments"
      />
    );
  }

  // Find matching doctor profile or fallback to doctor info from confirmation
  const doctor =
    doctors.find((item) => item.id === appointment.doctor.id) || {
      id: appointment.doctor.id,
      name: appointment.doctor.name,
      specialty: appointment.doctor.specialty,
      department: appointment.doctor.departmentName ?? 'Cardiology',
      rating: '4.9',
      reviews: 120,
      image: appointment.doctor.avatarUrl || '/images/doctor_1.jpg',
      fee: 100,
      room: `${appointment.doctor.id + 2}0${appointment.doctor.id}`,
      languages: 'English, Vietnamese',
      about: '',
      expertise: '',
    };

  return (
    <Page crumbs={[{ label: 'Booking result' }]}>
      <div className={styles.result}>
        <span className={`${styles.resultIcon} ${styles.resultSuccess}`}>
          <CheckCircle2 size={34} />
        </span>
        <span className={styles.eyebrow}>
          APPOINTMENT CONFIRMED · {appointment.appointmentCode}
        </span>
        <h1>Booking Completed Successfully</h1>
        <p>
          Your appointment has been registered and confirmed in the hospital system.
        </p>

        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p className={styles.reference}>Reference Code: <strong>{appointment.appointmentCode}</strong></p>
            <StatusBadge status={appointment.status} />
          </div>

          <DoctorSummary doctor={doctor} />
          <hr className={styles.divider} />

          <dl className={styles.detailGrid}>
            <div>
              <dt>Patient Name</dt>
              <dd>{appointment.patientName}</dd>
            </div>
            <div>
              <dt>Contact Phone</dt>
              <dd>{appointment.phone}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{appointment.email}</dd>
            </div>
            <div>
              <dt>Date & Time</dt>
              <dd>
                {formatDate(appointment.date, true)} · {appointment.startTime.substring(0, 5)} (UTC+7)
              </dd>
            </div>
            {appointment.reason && (
              <div className={styles.fullSpan}>
                <dt>Reason for Visit</dt>
                <dd>{appointment.reason}</dd>
              </div>
            )}
          </dl>

          <FeeSummary fee={doctor.fee} />

          <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', marginTop: '1rem', fontSize: '0.9rem', color: '#475467' }}>
            <strong>Payment notice:</strong> No upfront payment was collected. Please arrive 15 minutes before your scheduled appointment time to complete check-in.
          </div>

          <div className={styles.actions} style={{ marginTop: '1.5rem' }}>
            <Button to="/my-appointments">
              <CalendarCheck size={16} />
              View my appointments
            </Button>
            <Button to="/doctors" variant="outline">
              Find another doctor
            </Button>
          </div>
        </div>
      </div>
    </Page>
  );
}
