import { clsx } from 'clsx';
import { useId, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { Button } from '../components/Button.js';
import { IconButton } from '../components/IconButton.js';
import styles from './AppLayout.module.css';

export interface NavItem {
  to: string;
  label: string;
}

export interface AppLayoutProps {
  userName: string;
  userRole: 'ADMIN' | 'EMPLOYEE';
  onLogout: () => void;
  navItems?: NavItem[];
  children: ReactNode;
}

const DEFAULT_NAV_BY_ROLE: Record<'ADMIN' | 'EMPLOYEE', NavItem[]> = {
  EMPLOYEE: [
    { to: '/', label: 'Головна' },
    { to: '/catalog', label: 'Каталог пристроїв' },
    { to: '/my-devices', label: 'Мої пристрої' },
  ],
  ADMIN: [
    { to: '/', label: 'Головна' },
    { to: '/catalog', label: 'Каталог пристроїв' },
    { to: '/admin/requests', label: 'Заявки на видачу' },
    { to: '/admin/assets', label: 'Управління активами' },
    { to: '/admin/categories', label: 'Категорії' },
    { to: '/admin/history', label: 'Історія руху' },
  ],
};

export function AppLayout({ userName, userRole, onLogout, navItems, children }: AppLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navId = useId();
  const items = navItems ?? DEFAULT_NAV_BY_ROLE[userRole];

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandAccent}>Asset</span>Pool
        </div>
        <IconButton
          className={styles.menuButton}
          aria-label={menuOpen ? 'Закрити меню навігації' : 'Відкрити меню навігації'}
          aria-expanded={menuOpen}
          aria-controls={navId}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? '✕' : '☰'}
        </IconButton>
      </header>

      <div className={styles.body}>
        {menuOpen && (
          <div className={styles.overlay} aria-hidden="true" onClick={() => setMenuOpen(false)} />
        )}

        <aside className={clsx(styles.sidebar, menuOpen && styles.sidebarOpen)}>
          <div>
            <div className={styles.brand} style={{ marginBottom: 'var(--space-4)' }}>
              <span className={styles.brandAccent}>Asset</span>Pool
            </div>
            <nav id={navId} aria-label="Основна навігація">
              <ul className={styles.navList}>
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        clsx(styles.navLink, isActive && styles.navLinkActive)
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className={styles.userBox}>
            <div>
              <div className={styles.userName}>{userName}</div>
              <div className={styles.userRole}>
                {userRole === 'ADMIN' ? 'Адміністратор' : 'Співробітник'}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              Вийти
            </Button>
          </div>
        </aside>

        <main className={styles.main}>
          <div className={styles.content}>{children}</div>
        </main>
      </div>
    </div>
  );
}
