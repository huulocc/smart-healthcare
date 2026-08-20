import { Link } from 'react-router-dom';
import { DEPARTMENTS } from '../../data/mockData';
import styles from './Departments.module.css';

const Departments = () => {
  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.title}>Medical Departments</h1>
          <p className={styles.subtitle}>
            Explore our specialized departments and find the right care for your needs.
          </p>
        </div>

        <div className={styles.grid}>
          {DEPARTMENTS.map((dept) => (
            <Link key={dept.id} to={`/departments/${dept.id}`} className={styles.card}>
              <div className={styles.cardContent}>
                <h2 className={styles.cardTitle}>{dept.name}</h2>
                <p className={styles.cardDesc}>{dept.description}</p>
                <span className={styles.linkText}>View Details &rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Departments;
