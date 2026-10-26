import { useEffect, useState } from 'react';
import Button from '../../components/Button';
import DoctorCard from '../../components/DoctorCard';
import { useAsync } from '../../hooks/useAsync';
import {
  doctorCardModel,
  getPublicDepartments,
  getPublicDoctors,
} from '../../api/publicApi';
import styles from './Doctors.module.css';

const PAGE_SIZE = 12;

const Doctors = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [query, setQuery] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(0);

  // One request per pause in typing, not one per keystroke. The filtering itself is done
  // by the server, so every change of either filter is a round trip.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchTerm.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const departments = useAsync(() => getPublicDepartments(), []);

  const doctors = useAsync(
    () =>
      getPublicDoctors({
        departmentId: departmentId === '' ? undefined : Number(departmentId),
        search: query === '' ? undefined : query,
        page,
        size: PAGE_SIZE,
      }),
    [departmentId, query, page],
  );

  function clearFilters() {
    setSearchTerm('');
    setQuery('');
    setDepartmentId('');
    setPage(0);
  }

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
              value={departmentId}
              aria-label="Filter by department"
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(0);
              }}
              className={styles.select}
            >
              <option value="">All Departments</option>
              {departments.state.status === 'ready' &&
                departments.state.data.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {doctors.state.status === 'loading' && (
          <div className={styles.emptyState}>
            <h3>Loading doctors...</h3>
          </div>
        )}

        {doctors.state.status === 'error' && (
          <div className={styles.emptyState}>
            <h3>Could not load the directory</h3>
            <p>{doctors.state.message}</p>
            <Button onClick={doctors.reload}>Try Again</Button>
          </div>
        )}

        {doctors.state.status === 'ready' &&
          (doctors.state.data.content.length > 0 ? (
            <>
              <div className={styles.grid}>
                {doctors.state.data.content.map((doctor) => (
                  <DoctorCard
                    key={doctor.id}
                    doctor={doctorCardModel(doctor)}
                  />
                ))}
              </div>
              {doctors.state.data.totalPages > 1 && (
                <div className={styles.filters}>
                  <Button
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Previous
                  </Button>
                  <span className={styles.subtitle}>
                    Page {doctors.state.data.page + 1} of{' '}
                    {doctors.state.data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page + 1 >= doctors.state.data.totalPages}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              <h3>No doctors found</h3>
              <p>
                We couldn't find any doctors matching your current filters.
              </p>
              <Button onClick={clearFilters}>Clear Filters</Button>
            </div>
          ))}
      </div>
    </div>
  );
};

export default Doctors;
