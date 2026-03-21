import { useState } from 'react'
import { supabase } from '../supabaseClient'
import StudentTimetable from '../components/student/StudentTimetable'
import StudentCourses from '../components/student/StudentCourses'
import NotificationBell from '../components/NotificationBell'

export default function StudentDashboard({ profile }) {
  const [activeTab, setActiveTab] = useState('timetable')

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const tabs = [
    { id: 'timetable', label: 'My Timetable', icon: '📅' },
    { id: 'courses', label: 'My Courses', icon: '📚' },
  ]

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <img src="/images/babcock-logo.png" alt="Babcock" style={styles.logo} />
          <h2 style={styles.portalName}>Student Portal</h2>
          <p style={styles.portalUser}>{profile?.name}</p>
          <div style={styles.roleBadge}>Student</div>
        </div>

        <nav style={styles.nav}>
          <p style={styles.navLabel}>Navigation</p>
          {tabs.map(tab => (
            <button
              key={tab.id}
              style={{ ...styles.navBtn, ...(activeTab === tab.id ? styles.navBtnActive : {}) }}
              onClick={() => setActiveTab(tab.id)}
            >
              <span style={styles.navIcon}>{tab.icon}</span>
              <span>{tab.label}</span>
              {activeTab === tab.id && <div style={styles.navActiveBar} />}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarBottom}>
          <div style={styles.versionTag}>Babcock TSS v1.0</div>
          <button style={styles.logoutBtn} onClick={handleLogout}>Sign Out</button>
        </div>
      </div>

      <div style={styles.main}>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.pageTitle}>{tabs.find(t => t.id === activeTab)?.label}</h1>
            <p style={styles.pageSub}>Babcock University — Academic Scheduling</p>
          </div>
          <NotificationBell userId={profile.id} />
        </div>
        <div style={styles.content}>
          {activeTab === 'timetable' && <StudentTimetable profile={profile} />}
          {activeTab === 'courses' && <StudentCourses profile={profile} />}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { display: 'flex', height: '100vh', background: 'var(--navy-deep)', fontFamily: 'var(--font-body)', overflow: 'hidden' },
  sidebar: { width: '260px', minWidth: '260px', background: 'var(--navy-mid)', borderRight: '1px solid var(--gold-border)', display: 'flex', flexDirection: 'column' },
  sidebarTop: { padding: '32px 24px 24px', borderBottom: '1px solid var(--white-08)', textAlign: 'center' },
  logo: { width: '56px', height: 'auto', marginBottom: '14px' },
  portalName: { fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '600', color: 'var(--gold)', margin: '0 0 4px 0' },
  portalUser: { fontSize: '13px', color: 'var(--white-40)', margin: '0 0 12px 0' },
  roleBadge: { display: 'inline-block', background: 'var(--gold-pale)', border: '1px solid var(--gold-border)', color: 'var(--gold)', fontSize: '10px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '20px' },
  nav: { flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '4px' },
  navLabel: { fontSize: '10px', fontWeight: '600', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--white-40)', padding: '0 8px', marginBottom: '8px' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 12px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--white-40)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)', position: 'relative', width: '100%' },
  navBtnActive: { background: 'var(--gold-pale)', color: 'var(--gold)', fontWeight: '600' },
  navIcon: { fontSize: '16px', width: '20px', textAlign: 'center' },
  navActiveBar: { position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: '3px', height: '60%', background: 'var(--gold)', borderRadius: '2px 0 0 2px' },
  sidebarBottom: { padding: '16px 24px 24px', borderTop: '1px solid var(--white-08)' },
  versionTag: { fontSize: '11px', color: 'var(--white-40)', marginBottom: '12px', textAlign: 'center' },
  logoutBtn: { width: '100%', padding: '10px', background: 'var(--white-05)', border: '1px solid var(--white-08)', borderRadius: 'var(--radius-sm)', color: 'var(--white-40)', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', background: 'var(--navy-mid)', borderBottom: '1px solid var(--white-08)' },
  pageTitle: { fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '700', color: 'var(--white)', margin: '0 0 2px 0' },
  pageSub: { fontSize: '12px', color: 'var(--white-40)', margin: 0, letterSpacing: '0.5px' },
  content: { flex: 1, overflow: 'auto', padding: '32px' },
}