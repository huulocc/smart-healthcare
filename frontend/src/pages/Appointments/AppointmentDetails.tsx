import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
    Download,
  Loader2,
  MapPin,
  RefreshCw,
  X,
} from 'lucide-react';
import Button from '../../components/Button';
import AvailabilityPicker from '../../components/healthcare/AvailabilityPicker';
import {
  DoctorSummary,
  FeeSummary,
  Modal,
  NotFound,
  Page,
  StatusBadge,
} from '../../components/healthcare/HealthcareUI';
import { useAppointments } from '../../context/AppointmentContext';
import { dateKey, formatDate } from '../../data/appointmentDemo';
import {
  cancelAppointment,
  cancelDoctorAppointment,
  getAppointmentDetails,
  getAppointmentHistory,
  getDoctorAppointmentDetails,
  rescheduleAppointment,
  rescheduleDoctorAppointment,
  updateDoctorAppointmentNotes,
  updateDoctorAppointmentStatus,
  type AppointmentConfirmation,
  type AppointmentHistoryItem,
} from '../../api/bookingApi';
import styles from '../../components/healthcare/Healthcare.module.css';

export default function AppointmentDetails() {
  const { id } = useParams();
  const location = useLocation();
  const isDoctor = location.pathname.startsWith('/doctor/');
  const { doctors, refresh } = useAppointments();

  const [appointment, setAppointment] = useState<AppointmentConfirmation | null>(null);
  const [history, setHistory] = useState<AppointmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [modal, setModal] = useState<'cancel' | 'reschedule' | 'complete' | 'notes' | null>(null);
  const [cancelReason, setCancelReason] = useState('Unable to attend at scheduled time');
  const [date, setDate] = useState(dateKey());
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(
    (location.state as { notice?: string } | null)?.notice ?? '',
  );

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    setLoadError(false);

    const fetchDetail = isDoctor
      ? getDoctorAppointmentDetails(id)
      : getAppointmentDetails(id);

    fetchDetail
      .then((data) => {
        setAppointment(data);
        setNotes(data.notes ?? '');
        setLoading(false);
        // Load history
        getAppointmentHistory(id)
          .then((hist) => setHistory(hist.content || []))
          .catch(() => {});
      })
      .catch(() => {
        setLoadError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [id, isDoctor]);

  if (loading) {
    return (
      <Page crumbs={[{ label: 'Appointment details' }]}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
          <Loader2 className="spin" size={36} color="#026AA7" />
        </div>
      </Page>
    );
  }

  if (loadError || !appointment) {
    return (
      <NotFound
        title="Appointment not found"
        back={isDoctor ? '/doctor/appointments' : '/my-appointments'}
        label="Back to appointments"
      />
    );
  }

  const doctor = doctors.find((item) => item.id === appointment.doctor.id) || {
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

  const appointmentInstant = new Date(
    `${appointment.date}T${appointment.startTime.substring(0, 5)}:00+07:00`,
  ).getTime();
  const isFuture = appointmentInstant > Date.now();
  const canCancel =
    (appointment.status === 'CONFIRMED' || appointment.status === 'PENDING') && isFuture;
  const canReschedule = appointment.status === 'CONFIRMED' && isFuture;

  async function handleCancel() {
    setSubmitting(true);
    setError('');
    try {
      if (isDoctor) {
        await cancelDoctorAppointment(appointment!.id, cancelReason);
      } else {
        await cancelAppointment(appointment!.id, cancelReason);
      }
      setNotice('Appointment cancelled successfully. Time slot has been released.');
      setModal(null);
      loadData();
      refresh();
    } catch (cause: unknown) {
      let msg = 'Failed to cancel appointment.';
      if (typeof cause === 'object' && cause !== null && 'response' in cause) {
        const res = (cause as { response?: { data?: { detail?: string; message?: string } } }).response;
        if (res?.data?.detail) msg = res.data.detail;
        else if (res?.data?.message) msg = res.data.message;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReschedule() {
    if (!time) {
      setError('Please choose a valid time slot.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (isDoctor) {
        await rescheduleDoctorAppointment(appointment!.id, date, time);
      } else {
        await rescheduleAppointment(appointment!.id, date, time);
      }
      setNotice('Appointment rescheduled successfully.');
      setModal(null);
      loadData();
      refresh();
    } catch (cause: unknown) {
      let msg = 'Failed to reschedule appointment.';
      if (typeof cause === 'object' && cause !== null && 'response' in cause) {
        const res = (cause as { response?: { data?: { detail?: string; message?: string } } }).response;
        if (res?.data?.detail) msg = res.data.detail;
        else if (res?.data?.message) msg = res.data.message;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(newStatus: 'IN_PROGRESS' | 'COMPLETED', statusNotes?: string) {
    setSubmitting(true);
    setError('');
    try {
      await updateDoctorAppointmentStatus(appointment!.id, newStatus, statusNotes);
      setNotice(
        newStatus === 'IN_PROGRESS'
          ? 'Consultation started.'
          : 'Consultation marked as completed.',
      );
      setModal(null);
      loadData();
      refresh();
    } catch (cause: unknown) {
      let msg = 'Failed to update consultation status.';
      if (typeof cause === 'object' && cause !== null && 'response' in cause) {
        const res = (cause as { response?: { data?: { detail?: string; message?: string } } }).response;
        if (res?.data?.detail) msg = res.data.detail;
        else if (res?.data?.message) msg = res.data.message;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveNotes() {
    setSubmitting(true);
    setError('');
    try {
      await updateDoctorAppointmentNotes(appointment!.id, notes);
      setNotice('Consultation notes updated successfully.');
      setModal(null);
      loadData();
      refresh();
    } catch (cause: unknown) {
      let msg = 'Failed to update notes.';
      if (typeof cause === 'object' && cause !== null && 'response' in cause) {
        const res = (cause as { response?: { data?: { detail?: string; message?: string } } }).response;
        if (res?.data?.detail) msg = res.data.detail;
        else if (res?.data?.message) msg = res.data.message;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
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
    const start = new Date(
      `${appointment.date}T${appointment.startTime.substring(0, 5)}:00+07:00`,
    );
    const stamp = (value: Date) =>
      value
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
    const content = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Smart Healthcare//Hospital Booking//EN',
      'BEGIN:VEVENT',
      `UID:${appointment.appointmentCode}@smart-healthcare.com`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(new Date(start.getTime() + 1800000))}`,
      `SUMMARY:Medical consultation - ${doctor.name}`,
      `LOCATION:Smart Healthcare Clinic - Room ${doctor.room}`,
      `DESCRIPTION:Appointment Code: ${appointment.appointmentCode}. Patient: ${appointment.patientName}.`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(
      new Blob([content], { type: 'text/calendar;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `${appointment.appointmentCode}.ics`;
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
          <p>Clinical visit information and scheduling.</p>
        </div>
        {appointment.status !== 'CANCELLED' && (
          <Button variant="outline" onClick={downloadCalendar}>
            <Download size={17} />
            Add to calendar
          </Button>
        )}
      </div>

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
                <p>Reference Code: <strong>{appointment.appointmentCode}</strong></p>
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
                  <strong>
                    {appointment.startTime.substring(0, 5)} - {appointment.endTime.substring(0, 5)} · 30 minutes (UTC+7)
                  </strong>
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
                <dt>Attendee name</dt>
                <dd>{appointment.patientName}</dd>
              </div>
              <div>
                <dt>Booking for</dt>
                <dd>{appointment.bookingFor === 'myself' ? 'Self' : 'Other person'}</dd>
              </div>
              <div>
                <dt>Phone number</dt>
                <dd>{appointment.phone}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{appointment.email}</dd>
              </div>
              <div>
                <dt>Date of birth</dt>
                <dd>{appointment.dob}</dd>
              </div>
              <div>
                <dt>Consent timestamp</dt>
                <dd>
                  {appointment.consentAt
                    ? new Date(appointment.consentAt).toLocaleString('en-GB', {
                        timeZone: 'Asia/Ho_Chi_Minh',
                      }) + ' (UTC+7)'
                    : 'Recorded'}
                </dd>
              </div>
              <div className={styles.fullSpan}>
                <dt>Reason for visit</dt>
                <dd>{appointment.reason}</dd>
              </div>
              {appointment.notes && (
                <div className={styles.fullSpan}>
                  <dt>Consultation notes</dt>
                  <dd style={{ whiteSpace: 'pre-wrap' }}>{appointment.notes}</dd>
                </div>
              )}
              {appointment.cancellationReason && (
                <div className={styles.fullSpan}>
                  <dt style={{ color: '#DC2626' }}>Cancellation reason</dt>
                  <dd style={{ color: '#B91C1C' }}>{appointment.cancellationReason}</dd>
                </div>
              )}
            </dl>

            {/* Actions for Patient */}
            {!isDoctor && canCancel && (
              <>
                <hr className={styles.divider} />
                <div className={styles.actions}>
                  {canReschedule && (
                    <Button variant="outline" onClick={() => open('reschedule')}>
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

            {/* Actions for Doctor */}
            {isDoctor && (
              <>
                <hr className={styles.divider} />
                <div className={styles.actions}>
                  {appointment.status === 'CONFIRMED' && (
                    <>
                      <Button onClick={() => handleStatusChange('IN_PROGRESS')}>
                        Start consultation
                      </Button>
                      <Button variant="ghost" onClick={() => open('cancel')}>
                        <X size={16} />
                        Cancel appointment
                      </Button>
                    </>
                  )}
                  {appointment.status === 'IN_PROGRESS' && (
                    <>
                      <Button onClick={() => open('complete')}>
                        <CheckCircle2 size={17} />
                        Complete consultation
                      </Button>
                      <Button variant="outline" onClick={() => open('notes')}>
                        Update notes
                      </Button>
                    </>
                  )}
                  {appointment.status === 'COMPLETED' && (
                    <Button variant="outline" onClick={() => open('notes')}>
                      Edit consultation notes
                    </Button>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Audit trail / History */}
          <section className={styles.card}>
            <h2>Lifecycle History</h2>
            <p className={styles.help}>
              Audit record of appointment state transitions.
            </p>
            <hr className={styles.divider} />
            {history.length === 0 ? (
              <ol className={styles.timeline} style={{ marginTop: '1rem' }}>
                <li>
                  <strong>Appointment created</strong>
                  <small>
                    {new Date(appointment.createdAt).toLocaleString('en-GB', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                    })}{' '}
                    (UTC+7)
                  </small>
                </li>
                <li>
                  <strong>Status: {appointment.status}</strong>
                  <small>
                    {formatDate(appointment.date, true)} at {appointment.startTime.substring(0, 5)} (UTC+7)
                  </small>
                </li>
              </ol>
            ) : (
              <ol className={styles.timeline} style={{ marginTop: '1rem' }}>
                {history.map((h) => (
                  <li key={h.id}>
                    <strong>Action: {h.action} · Status: {h.status}</strong>
                    <small>
                      {new Date(h.occurredAt).toLocaleString('en-GB', {
                        timeZone: 'Asia/Ho_Chi_Minh',
                      })}{' '}
                      (UTC+7)
                      {h.notes ? ` · Note: ${h.notes}` : ''}
                      {h.cancellationReason ? ` · Reason: ${h.cancellationReason}` : ''}
                    </small>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className={`${styles.card} ${styles.aside}`}>
          <h2>Policy & Billing</h2>
          <FeeSummary fee={doctor.fee} />
          <div className={styles.scheduleRow}>
            <strong>Payment policy</strong>
            <span>Direct at clinic</span>
          </div>
          <div className={styles.scheduleRow}>
            <strong>Status</strong>
            <span>{appointment.status}</span>
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#64748B' }}>
            No online pre-payment is collected. Fees are paid in person upon check-in at the clinic desk.
          </div>
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

      {/* Modals */}
      {modal && (
        <Modal
          title={
            modal === 'cancel'
              ? 'Cancel this appointment?'
              : modal === 'complete'
                ? 'Complete this consultation?'
                : modal === 'notes'
                  ? 'Consultation Notes'
                  : 'Reschedule appointment'
          }
          onClose={() => setModal(null)}
        >
          {modal === 'cancel' && (
            <>
              <p>
                Your slot on {formatDate(appointment.date, true)} at{' '}
                {appointment.startTime.substring(0, 5)} will be released back to the clinic schedule.
              </p>
              <label className={styles.field} style={{ marginTop: '1rem' }}>
                Reason for cancellation *
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter reason..."
                  maxLength={255}
                />
              </label>
            </>
          )}

          {modal === 'reschedule' && (
            <AvailabilityPicker
              doctorId={doctor.id}
              appointments={[]}
              excludeId={String(appointment.id)}
              date={date}
              time={time}
              onChange={(day, slot) => {
                setDate(day);
                setTime(slot);
              }}
            />
          )}

          {modal === 'complete' && (
            <>
              <p>
                Mark consultation as completed? You can record clinical notes below.
              </p>
              <label className={styles.field} style={{ marginTop: '1rem' }}>
                Consultation notes
                <textarea
                  value={notes}
                  maxLength={500}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Document consultation findings and recommendations…"
                />
              </label>
            </>
          )}

          {modal === 'notes' && (
            <label className={styles.field} style={{ marginTop: '1rem' }}>
              Consultation notes
              <textarea
                value={notes}
                maxLength={500}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Document consultation findings and recommendations…"
              />
            </label>
          )}

          {error && (
            <p className={styles.errorBanner} role="alert" style={{ marginTop: '1rem' }}>
              {error}
            </p>
          )}

          <hr className={styles.divider} />
          <div className={`${styles.actions} ${styles.spread}`}>
            <Button variant="outline" onClick={() => setModal(null)} disabled={submitting}>
              {modal === 'cancel' ? 'Keep appointment' : 'Go back'}
            </Button>

            {modal === 'cancel' && (
              <Button
                className={styles.dangerButton}
                onClick={handleCancel}
                loading={submitting}
              >
                Yes, cancel appointment
              </Button>
            )}

            {modal === 'reschedule' && (
              <Button
                disabled={!time || submitting}
                onClick={handleReschedule}
                loading={submitting}
              >
                Confirm new time
              </Button>
            )}

            {modal === 'complete' && (
              <Button onClick={() => handleStatusChange('COMPLETED', notes)} loading={submitting}>
                Yes, mark completed
              </Button>
            )}

            {modal === 'notes' && (
              <Button onClick={handleSaveNotes} loading={submitting}>
                Save notes
              </Button>
            )}
          </div>
        </Modal>
      )}
    </Page>
  );
}
