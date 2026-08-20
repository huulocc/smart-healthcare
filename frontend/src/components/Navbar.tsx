import { Link } from 'react-router-dom';
import styles from './Navbar.module.css';

const Navbar = () => {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.navContainer}`}>
        <div className={styles.logo}>
          <Link to="/">
            <span className={styles.logoAccent}>Smart</span>Healthcare
          </Link>
        </div>
        
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/departments">Departments</Link></li>
            <li><Link to="/doctors">Doctors</Link></li>
            <li><Link to="/ai-chat" className={styles.chatLink}>AI Chat</Link></li>
          </ul>
        </nav>

        <div className={styles.actions}>
          <Link to="/login" className={styles.loginBtn}>Log In</Link>
          <Link to="/register" className={styles.registerBtn}>Sign Up</Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
