import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState('student')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, role } }
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  const roles = [
    { value: 'student', label: 'Student', icon: '🎓', desc: 'View your personal timetable' },
    { value: 'lecturer', label: 'Lecturer', icon: '👨‍🏫', desc: 'Manage your schedule & availability' },
    { value: 'admin', label: 'Administrator', icon: '⚙️', desc: 'Build and manage all timetables' },
  ]

  return (
    <div style={styles.page}>
      <div style={styles.bgPattern} />
      <div style={styles.bgGlow} />

      <div style={{
        ...styles.container,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(24px)',
        transition: 'all 0.6s ease'
      }}>
        <div style={styles.leftPanel}>
          <div style={styles.leftContent}>
            <img src="/images/babcock-logo.png" alt="Babcock University" style={styles.logo} />
            <h1 style={styles.universityName}>Babcock University</h1>
            <div style={styles.divider} />
            <p style={styles.tagline}>Timetable Scheduling System</p>
            <p style={styles.description}>
              Join the platform and get instant access to your personalized academic schedule.
            </p>
            <div style={styles.infoBox}>
              <p style={styles.infoTitle}>Choose your role carefully</p>
              <p style={styles.infoText}>Your role determines what you can see and do in the system. Students see their timetable, lecturers manage availability, and admins control everything.</p>
            </div>
          </div>
        </div>

        <div style={styles.rightPanel}>
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>Create Account</h2>
            <p style={styles.formSubtitle}>Join the scheduling system</p>

            <form onSubmit={handleRegister} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Full Name</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="e.g. Dr. Adeyemi Johnson"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Email Address</label>
                <input
                  style={styles.input}
                  type="email"
                  placeholder="you@babcock.edu.ng"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Password</label>
                <div style={styles.inputWrapper}>
                  <input
                    style={styles.inputInner}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Select Your Role</label>
                <div style={styles.roleGrid}>
                  {roles.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      style={{ ...styles.roleCard, ...(role === r.value ? styles.roleCardActive : {}) }}
                      onClick={() => setRole(r.value)}
                    >
                      <span style={styles.roleIcon}>{r.icon}</span>
                      <span style={styles.roleLabel}>{r.label}</span>
                      <span style={styles.roleDesc}>{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div style={styles.errorBox}>
                  <span>⚠ </span>{error}
                </div>
              )}

              <button style={styles.submitBtn} type="submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account →'}
              </button>
            </form>

            <p style={styles.footer}>
              Already have an account?{' '}
              <Link to="/login" style={styles.link}>Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh', background: 'var(--navy-deep)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: '24px',
    position: 'relative', overflow: 'hidden',
  },
  bgPattern: {
    position: 'fixed', inset: 0,
    backgroundImage: `radial-gradient(circle at 80% 50%, rgba(201,168,76,0.06) 0%, transparent 50%),
                      repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 1px, transparent 1px, transparent 60px)`,
    pointerEvents: 'none',
  },
  bgGlow: {
    position: 'fixed', bottom: '-20%', left: '-10%', width: '600px', height: '600px',
    background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  container: {
    display: 'flex', width: '100%', maxWidth: '960px',
    background: 'rgba(15, 32, 68, 0.6)', backdropFilter: 'blur(20px)',
    border: '1px solid var(--gold-border)', borderRadius: 'var(--radius-lg)',
    overflow: 'hidden', boxShadow: 'var(--shadow-elevated)', position: 'relative', zIndex: 1,
  },
  leftPanel: {
    flex: '1', background: 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, transparent 60%)',
    borderRight: '1px solid var(--gold-border)', padding: '48px 40px',
    display: 'flex', alignItems: 'center',
  },
  leftContent: { width: '100%' },
  logo: { width: '72px', height: 'auto', marginBottom: '20px' },
  universityName: {
    fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: '700',
    color: 'var(--white)', marginBottom: '12px',
  },
  divider: {
    width: '48px', height: '2px',
    background: 'linear-gradient(90deg, var(--gold), transparent)', marginBottom: '16px',
  },
  tagline: {
    fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase',
    color: 'var(--gold)', marginBottom: '20px', fontWeight: '500',
  },
  description: { fontSize: '14px', color: 'var(--white-40)', lineHeight: '1.7', marginBottom: '28px' },
  infoBox: {
    background: 'var(--gold-pale)', border: '1px solid var(--gold-border)',
    borderRadius: 'var(--radius-md)', padding: '16px 20px',
  },
  infoTitle: { color: 'var(--gold)', fontSize: '13px', fontWeight: '600', marginBottom: '8px' },
  infoText: { color: 'var(--white-40)', fontSize: '13px', lineHeight: '1.6' },
  rightPanel: {
    width: '420px', padding: '40px', display: 'flex',
    alignItems: 'center', overflowY: 'auto',
  },
  formCard: { width: '100%' },
  formTitle: {
    fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '700',
    color: 'var(--white)', marginBottom: '6px',
  },
  formSubtitle: { fontSize: '14px', color: 'var(--white-40)', marginBottom: '28px' },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: {
    fontSize: '12px', fontWeight: '500', color: 'var(--white-70)',
    letterSpacing: '0.5px', textTransform: 'uppercase',
  },
  input: {
    padding: '12px 16px', background: 'var(--white-08)',
    border: '1px solid var(--white-15)', borderRadius: 'var(--radius-sm)',
    color: 'var(--white)', fontSize: '14px', outline: 'none', width: '100%',
  },
  inputWrapper: {
    display: 'flex', alignItems: 'center',
    background: 'var(--white-08)', border: '1px solid var(--white-15)',
    borderRadius: 'var(--radius-sm)', overflow: 'hidden',
  },
  inputInner: {
    flex: 1, padding: '12px 16px', background: 'transparent',
    border: 'none', color: 'var(--white)', fontSize: '14px', outline: 'none',
  },
  eyeBtn: {
    background: 'transparent', border: 'none', padding: '0 14px',
    cursor: 'pointer', fontSize: '16px', color: 'var(--white-40)',
    display: 'flex', alignItems: 'center',
  },
  roleGrid: { display: 'flex', flexDirection: 'column', gap: '8px' },
  roleCard: {
    display: 'grid', gridTemplateColumns: '28px 1fr', gridTemplateRows: 'auto auto',
    columnGap: '10px', padding: '12px 14px', background: 'var(--white-05)',
    border: '1px solid var(--white-08)', borderRadius: 'var(--radius-sm)',
    cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)',
  },
  roleCardActive: { background: 'var(--gold-pale)', border: '1px solid var(--gold-border)' },
  roleIcon: { fontSize: '18px', gridRow: '1 / 3', display: 'flex', alignItems: 'center' },
  roleLabel: { color: 'var(--white)', fontSize: '13px', fontWeight: '600', display: 'block' },
  roleDesc: { color: 'var(--white-40)', fontSize: '11px', display: 'block' },
  errorBox: {
    background: 'var(--red-pale)', border: '1px solid rgba(224,82,82,0.2)',
    borderRadius: 'var(--radius-sm)', padding: '12px 16px', color: '#ff8a8a', fontSize: '13px',
  },
  submitBtn: {
    padding: '13px', background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%)',
    border: 'none', borderRadius: 'var(--radius-sm)', color: '#1a1200',
    fontSize: '15px', fontWeight: '600', cursor: 'pointer', letterSpacing: '0.3px',
  },
  footer: { fontSize: '13px', color: 'var(--white-40)', textAlign: 'center', marginTop: '20px' },
  link: { color: 'var(--gold)', textDecoration: 'none', fontWeight: '500' },
}