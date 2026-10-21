import { Link } from 'react-router-dom';

import styles from './NotFound.module.css';

/** Without a catch-all route, a mistyped URL matched nothing and rendered a blank page. */
const NotFound = ({ inAdmin = false }: { inAdmin?: boolean }) => (
  <div className={`${styles.panel} ${inAdmin ? 'admin-card' : ''}`}>
    <p className={styles.code}>404</p>
    <h1 className={styles.title}>We could not find that page</h1>
    <p className={styles.text}>The link may be out of date, or the address mistyped.</p>
    <Link to={inAdmin ? '/admin' : '/'} className={styles.link}>
      {inAdmin ? 'Back to the dashboard' : 'Back to home'}
    </Link>
  </div>
);

export default NotFound;
