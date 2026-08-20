import { Link } from 'react-router-dom';
import styles from './DepartmentsSection.module.css';

import { DEPARTMENTS } from '../../../data/mockData';

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
          {DEPARTMENTS.slice(0, 4).map((dept) => (
            <Link key={dept.id} to={`/departments/${dept.id}`} className={styles.card}>
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
