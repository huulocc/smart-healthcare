import { Link } from 'react-router-dom';
import styles from './DepartmentsSection.module.css';

const DEPARTMENTS = [
  { id: 1, name: 'Cardiology', icon: '❤️', description: 'Heart and cardiovascular care' },
  { id: 2, name: 'Neurology', icon: '🧠', description: 'Brain and nervous system' },
  { id: 3, name: 'Pediatrics', icon: '👶', description: 'Child and infant healthcare' },
  { id: 4, name: 'General Medicine', icon: '🩺', description: 'Primary care and general health' },
];

const DepartmentsSection = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Our Departments</h2>
            <p className={styles.subtitle}>Explore our specialized healthcare departments</p>
          </div>
          <Link to="/departments" className={styles.viewAll}>
            View All Departments &rarr;
          </Link>
        </div>

        <div className={styles.grid}>
          {DEPARTMENTS.map((dept) => (
            <Link key={dept.id} to={`/departments/${dept.id}`} className={styles.card}>
              <div className={styles.icon}>{dept.icon}</div>
              <h3 className={styles.cardTitle}>{dept.name}</h3>
              <p className={styles.cardDesc}>{dept.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DepartmentsSection;
