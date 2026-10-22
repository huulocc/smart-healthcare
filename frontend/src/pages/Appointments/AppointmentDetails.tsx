import { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  MapPin,
  RefreshCw,
  X,
} from 'lucide-react';
import Button from '../../components/Button';
import AvailabilityPicker from '../../components/healthcare/AvailabilityPicker';
import {
  DemoNotice,
  DoctorSummary,
  FeeSummary,
  Modal,
  NotFound,
  Page,
  StatusBadge,
} from '../../components/healthcare/HealthcareUI';
import { useAppointments } from '../../context/AppointmentContext';
import { dateKey, formatDate, money } from '../../data/appointmentDemo';
import styles from '../../components/healthcare/Healthcare.module.css';

export default function AppointmentDetails() {
  const { id } = useParams();
  const location = useLocation();
  const isDoctor = location.pathname.startsWith('/doctor/');
  const {
    appointments,
    doctors,
    cancel,
    reschedule,
    pay,
    setStatus,
    getSlotStatus,
  } = useAppointments();
  const appointment = appointments.find(
    (item) =>
      item.id === id &&
      (isDoctor ? item.doctorId === 1 : item.source === 'booking'),
  );
  const doctor = doctors.find((item) => item.id === appointment?.doctorId);
  const [modal, setModal] = useState<
    'cancel' | 'reschedule' | 'pay' | 'complete' | null
  >(null);
  const [date, setDate] = useState(dateKey());
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState(appointment?.notes ?? '');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(
    (location.state as { notice?: string } | null)?.notice ?? '',
  );
  if (!appointment || !doctor)
    return (
      <NotFound
        title="Appointment not found"
        back={isDoctor ? '/doctor/appointments' : '/my-appointments'}
        label="Back to appointments"
      />
    );
  const canManage =
    appointment.status === 'CONFIRMED' &&
    new Date(`${appointment.date}T${appointment.time}:00+07:00`).getTime() >
      Date.now();
  function act(action: () => void, message: string) {
    try {
      action();
      setError('');
      setNotice(message);
      setModal(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to update this appointment.',
      );
    }
  }
  function open(value: typeof modal) {
    setError('');
    setModal(value);
    if (value === 'reschedule') {
      setDate(appointment!.date);
      setTime('');
    }
  }
  function downloadCalendar() {
    if (!appointment || !doctor) return;
    const start = new Date(`${appointment.date}T${appointment.time}:00+07:00`);
    const stamp = (value: Date) =>
      value
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
    const content = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Smart Healthcare//UI Demo//EN',
      'BEGIN:VEVENT',
      `UID:${appointment.id}@smart-healthcare.demo`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(new Date(start.getTime() + 1800000))}`,
      `SUMMARY:Demo consultation - ${doctor.name}`,
      `LOCATION:Smart Healthcare Clinic - Room ${doctor.room}`,
      'DESCRIPTION:UI demo only. No real appointment has been booked.',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(
      new Blob([content], { type: 'text/calendar;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `${appointment.id}.ics`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Page
      crumbs={[
        {
          label: isDoctor ? 'Doctor workspace' : 'My appointments',
          to: isDoctor ? '/doctor/appointments' : '/my-appointments',
        },
        { label: 'Appointment details' },
      ]}
    >
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Appointment overview</span>
          <h1>Appointment details</h1>
          <p>Everything you need for your visit, in one place.</p>
        </div>
        {appointment.status !== 'CANCELLED' && (
          <Button variant="outline" onClick={downloadCalendar}>
            <Download size={17} />
            Add to calendar
          </Button>
        )}
      </div>
      <DemoNotice />
      {notice && (
        <div className={styles.successBanner} role="status">
          <CheckCircle2 size={20} />
          {notice}
        </div>
      )}
      {error && !modal && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}
      <div className={styles.twoColumn}>
        <div className={styles.stack}>
          <section className={styles.card}>
            <div className={styles.detailHeader}>
              <div>
                <h2>In-person consultation</h2>
                <p>Reference: {appointment.id}</p>
              </div>
              <StatusBadge status={appointment.status} />
            </div>
            <DoctorSummary doctor={doctor} />
            <hr className={styles.divider} />
            <div className={styles.facts}>
              <div className={styles.fact}>
                <CalendarDays />
                <div>
                  <small>Date & time</small>
                  <strong>{formatDate(appointment.date)}</strong>
                  <strong>{appointment.time} · 30 minutes (UTC+7)</strong>
                </div>
              </div>
              <div className={styles.fact}>
                <MapPin />
                <div>
                  <small>Location</small>
                  <strong>Smart Healthcare Clinic</strong>
                  <strong>
                    Room {doctor.room} · {doctor.department}
                  </strong>
                </div>
              </div>
            </div>
            <hr className={styles.divider} />
            <h2>Patient information</h2>
            <dl className={styles.detailGrid} style={{ marginTop: '1.2rem' }}>
              <div>
                <dt>Patient full name</dt>
                <dd>{appointment.patientName}</dd>
              </div>
              <div>
                <dt>Phone number</dt>
                <dd>{appointment.phone}</dd>
              </div>
              <div className={styles.fullSpan}>
                <dt>Reason for visit</dt>
                <dd>{appointment.reason}</dd>
              </div>
              {appointment.notes && (
                <div className={styles.fullSpan}>
                  <dt>Consultation notes · Demo</dt>
                  <dd>{appointment.notes}</dd>
                </div>
              )}
            </dl>
            {(canManage ||
              (isDoctor && appointment.status === 'CONFIRMED')) && (
              <>
                <hr className={styles.divider} />
                <div className={styles.actions}>
                  {!isDoctor && (
                    <Button
                      variant="outline"
                      onClick={() => open('reschedule')}
                    >
                      <RefreshCw size={16} />
                      Reschedule
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => open('cancel')}>
                    <X size={16} />
                    Cancel appointment
                  </Button>
                </div>
              </>
            )}
            {isDoctor && appointment.status === 'CONFIRMED' && (
              <>
                <hr className={styles.divider} />
                <Button
                  onClick={() =>
                    act(
                      () => setStatus(appointment.id, 'IN_PROGRESS'),
                      'Demo consultation started.',
                    )
                  }
                >
                  Start consultation
                </Button>
              </>
            )}
            {isDoctor && appointment.status === 'IN_PROGRESS' && (
              <>
                <hr className={styles.divider} />
                <label className={styles.field}>
                  Consultation notes (optional)
                  <textarea
                    value={notes}
                    maxLength={2000}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Add sample consultation notes…"
                  />
                </label>
                <div className={styles.actions} style={{ marginTop: '1rem' }}>
                  <Button onClick={() => open('complete')}>
                    <CheckCircle2 size={17} />
                    Complete consultation
                  </Button>
                </div>
              </>
            )}
          </section>
          <section className={styles.card}>
            <h2>Before your visit</h2>
            <p className={styles.help}>
              Please arrive 15 minutes early. Bring your identification,
              previous medical records, and a list of medications you take.
            </p>
            <hr className={styles.divider} />
            <h3>Appointment status</h3>
            <ol className={styles.timeline} style={{ marginTop: '1rem' }}>
              <li>
                <strong>Demo booking created</strong>
                <small>
                  {new Date(appointment.createdAt).toLocaleString('en-GB', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                  })}{' '}
                  (UTC+7)
                </small>
              </li>
              <li>
                <strong>
                  {appointment.paymentStatus === 'PAID'
                    ? 'Simulated payment complete'
                    : appointment.paymentStatus === 'REFUND_PENDING'
                      ? 'Simulated refund pending'
                      : 'Payment due at clinic'}
                </strong>
                <small>
                  {appointment.paymentStatus === 'REFUND_PENDING'
                    ? 'Demo state only; no refund will be processed.'
                    : `${money(appointment.deposit)} deposit · No real transaction`}
                </small>
              </li>
              <li>
                <strong>
                  {appointment.status === 'CANCELLED'
                    ? 'Appointment cancelled'
                    : appointment.status === 'COMPLETED'
                      ? 'Consultation completed'
                      : appointment.status === 'IN_PROGRESS'
                        ? 'Consultation in progress'
                        : 'Appointment confirmed'}
                </strong>
                <small>
                  {formatDate(appointment.date, true)} at {appointment.time}{' '}
                  (UTC+7)
                </small>
              </li>
            </ol>
          </section>
        </div>
        <aside className={`${styles.card} ${styles.aside}`}>
          <h2>Payment summary</h2>
          <FeeSummary fee={appointment.fee} />
          <div className={styles.scheduleRow}>
            <strong>Method</strong>
            <span>
              {appointment.paymentMethod === 'DEMO_CARD'
                ? 'Demo card'
                : 'Demo bank transfer'}
            </span>
          </div>
          <div className={styles.scheduleRow}>
            <strong>Status</strong>
            <span>
              {appointment.paymentStatus === 'PAID'
                ? 'Paid · Demo'
                : appointment.paymentStatus === 'REFUND_PENDING'
                  ? 'Refund pending · Demo'
                  : appointment.status === 'CANCELLED'
                    ? 'No payment due'
                    : 'Unpaid'}
            </span>
          </div>
          {appointment.paymentStatus === 'UNPAID' &&
            appointment.status !== 'CANCELLED' &&
            !isDoctor && (
              <div style={{ marginTop: '1.3rem' }}>
                <Button onClick={() => open('pay')} fullWidth>
                  <CreditCard size={17} />
                  Simulate payment
                </Button>
              </div>
            )}
          <hr className={styles.divider} />
          <Button
            to={isDoctor ? '/doctor/appointments' : '/my-appointments'}
            variant="outline"
            fullWidth
          >
            Back to appointments
          </Button>
        </aside>
      </div>
      {modal && (
        <Modal
          title={
            modal === 'cancel'
              ? 'Cancel this appointment?'
              : modal === 'pay'
                ? 'Simulate online payment'
                : modal === 'complete'
                  ? 'Complete this consultation?'
                  : 'Reschedule appointment'
          }
          onClose={() => setModal(null)}
        >
          {modal === 'complete' && (
            <p>
              Mark this demo consultation as completed and save the sample
              notes? This updates the dashboard.
            </p>
          )}
          {modal === 'cancel' && (
            <>
              <p>
                Your slot on {formatDate(appointment.date, true)} at{' '}
                {appointment.time} will be released.
              </p>
              {appointment.paymentStatus === 'PAID' && (
                <p className={styles.help}>
                  The simulated payment will be marked as refund pending. No
                  real refund is processed.
                </p>
              )}
            </>
          )}
          {modal === 'reschedule' && (
            <AvailabilityPicker
              doctorId={doctor.id}
              appointments={appointments}
              excludeId={appointment.id}
              date={date}
              time={time}
              onChange={(day, slot) => {
                setDate(day);
                setTime(slot);
              }}
            />
          )}
          {modal === 'pay' && (
            <>
              <p>
                Confirm a demo payment of{' '}
                <strong>{money(appointment.fee)}</strong> for this consultation.
              </p>
              <p className={styles.help}>
                This action only updates the UI. No card information is
                collected and no money is charged.
              </p>
            </>
          )}
          {error && (
            <p className={styles.errorBanner} role="alert">
              {error}
            </p>
          )}
          <hr className={styles.divider} />
          <div className={`${styles.actions} ${styles.spread}`}>
            <Button variant="outline" onClick={() => setModal(null)}>
              {modal === 'cancel' ? 'Keep appointment' : 'Go back'}
            </Button>
            {modal === 'cancel' ? (
              <Button
                className={styles.dangerButton}
                onClick={() =>
                  act(
                    () => cancel(appointment.id),
                    'Demo appointment cancelled. The time slot has been released.',
                  )
                }
              >
                Yes, cancel appointment
              </Button>
            ) : modal === 'pay' ? (
              <Button
                onClick={() =>
                  act(
                    () => pay(appointment.id),
                    'Simulated payment successful. No money was charged.',
                  )
                }
              >
                Confirm demo payment
              </Button>
            ) : modal === 'complete' ? (
              <Button
                onClick={() =>
                  act(
                    () => setStatus(appointment.id, 'COMPLETED', notes.trim()),
                    'Demo consultation marked as completed.',
                  )
                }
              >
                Yes, mark completed
              </Button>
            ) : (
              <Button
                disabled={
                  !time ||
                  getSlotStatus(doctor.id, date, time, appointment.id) !==
                    'available'
                }
                onClick={() =>
                  act(
                    () => reschedule(appointment.id, date, time),
                    'Your demo appointment has been rescheduled.',
                  )
                }
              >
                Confirm new time
              </Button>
            )}
          </div>
        </Modal>
      )}
    </Page>
  );
}
