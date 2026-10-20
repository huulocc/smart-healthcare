import { useState } from 'react';
import Button from '../../components/Button';
import { DEPARTMENTS } from '../../data/mockData';
import DoctorCard from '../../components/DoctorCard';
import { useAppointments } from '../../context/AppointmentContext';
import styles from './Doctors.module.css';

const Doctors = () => {
  const { doctors } = useAppointments();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  // Filter doctors based on search and department selection
  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch =
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept =
      selectedDept === '' || doctor.department === selectedDept;

    return matchesSearch && matchesDept;
  });

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.title}>Find a Doctor</h1>
          <p className={styles.subtitle}>
            Browse our directory of experienced medical professionals and book
            your appointment.
          </p>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <input
              type="text"
              aria-label="Search doctors by name or specialty"
              placeholder="Search by name or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.selectBox}>
            <select
              value={selectedDept}
              aria-label="Filter by department"
              onChange={(e) => setSelectedDept(e.target.value)}
              className={styles.select}
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredDoctors.length > 0 ? (
          <div className={styles.grid}>
            {filteredDoctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <h3>No doctors found</h3>
            <p>We couldn't find any doctors matching your current filters.</p>
            <Button
              onClick={() => {
                setSearchTerm('');
                setSelectedDept('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Doctors;
