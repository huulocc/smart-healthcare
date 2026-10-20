import Button from '../../../components/Button';
import styles from './DoctorsSection.module.css';

import DoctorCard from '../../../components/DoctorCard';
import { useAppointments } from '../../../context/AppointmentContext';

const DoctorsSection = () => {
  const { doctors } = useAppointments();
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <h2 className={styles.title}>Top Rated Doctors</h2>
          <p className={styles.subtitle}>
            Book an appointment with our experienced medical professionals.
          </p>
        </div>

        <div className={styles.grid}>
          {doctors.slice(0, 3).map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} classes={styles} />
          ))}
        </div>

        <div className={styles.footer}>
          <Button to="/doctors" variant="ghost" size="lg">
            See All Doctors &rarr;
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DoctorsSection;
