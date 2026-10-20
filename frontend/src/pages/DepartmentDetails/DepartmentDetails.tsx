import { useParams } from 'react-router-dom';
import DoctorCard from '../../components/DoctorCard';
import Button from '../../components/Button';
import {
  EmptyState,
  NotFound,
  Page,
} from '../../components/healthcare/HealthcareUI';
import { DEPARTMENTS } from '../../data/mockData';
import { departmentForDoctor } from '../../data/appointmentDemo';
import { useAppointments } from '../../context/AppointmentContext';
import styles from './DepartmentDetails.module.css';

export default function DepartmentDetails() {
  const { id } = useParams();
  const department = DEPARTMENTS.find((item) => item.id === Number(id));
  const { doctors } = useAppointments();
  if (!department)
    return (
      <NotFound
        title="Department not found"
        back="/departments"
        label="Back to departments"
      />
    );
  const related = doctors.filter(
    (doctor) => departmentForDoctor(doctor)?.id === department.id,
  );
  return (
    <Page
      previewStates
      crumbs={[
        { label: 'Departments', to: '/departments' },
        { label: department.name },
      ]}
    >
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Medical department</span>
          <h1>{department.name}</h1>
          <p>{department.description}</p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            document
              .getElementById('department-doctors')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        >
          Find doctors in this department
        </Button>
      </div>
      <section className={styles.card}>
        <h2>About this department</h2>
        <p>{department.description}</p>
      </section>
      <section id="department-doctors" className={styles.doctorSection}>
        <div className={styles.sectionHeader}>
          <h2>Doctors in this department</h2>
          <span>
            {related.length} {related.length === 1 ? 'doctor' : 'doctors'}{' '}
            listed
          </span>
        </div>
        {related.length ? (
          <div className={styles.grid}>
            {related.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No doctors listed in this department yet"
            description="Explore our other departments to find a medical professional."
          >
            <Button to="/doctors">Browse all doctors</Button>
          </EmptyState>
        )}
      </section>
    </Page>
  );
}
