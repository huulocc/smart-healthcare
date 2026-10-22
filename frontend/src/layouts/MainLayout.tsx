import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AIChatWidget from '../components/AIChatWidget';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { pathname } = useLocation();
  const inlineChat =
    /^\/(book|booking|my-appointments|appointments)(\/|$)/.test(pathname) ||
    /^\/doctors\//.test(pathname);
  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.main}>{children}</main>
      <Footer />
      <AIChatWidget inline={inlineChat} />
    </div>
  );
};

export default MainLayout;
