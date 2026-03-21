import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={styles.page}>
      {/* Background Pattern */}
      <div style={styles.bgPattern} />
      <div style={styles.bgGlow} />

      <div style={{ ...styles.container, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(24px)', transition: 'all 0.6s ease' }}>

        {/* Left Panel */}
        <div style={styles.leftPanel}>
          <div style={styles.leftContent}>
            <img src="/images/babcock-logo.png" alt="Babcock University" style={styles.logo} />
            <h1 style={styles.universityName}>Babcock University</h1>
            <div style={styles.divider} />
            <p style={styles.tagline}>Timetable Scheduling System</p>
            <p style={styles.description}>
              A smart, AI-powered platform for managing academic schedules — built for students, lecturers, and administrators.
            </p>
            <div style={styles.features}>
              {['AI-powered conflict detection', 'Real-time notifications', 'Auto-generated timetables'].map((f, i) => (
                <div key={i} style={{ ...styles.feature, animationDelay: `${0.2 + i * 0.1}s` }}>
                  <span style={styles.featureDot}>✦</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div style={styles.rightPanel}>
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>Welcome back</h2>
            <p style={styles.formSubtitle}>Sign in to your account</p>

            <form onSubmit={handleLogin} style={styles.form}>
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
                <input
                  style={styles.input}
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div style={styles.errorBox}>
                  <span>⚠ </span>{error}
                </div>
              )}

              <button style={styles.submitBtn} type="submit" disabled={loading}>
                {loading ? (
                  <span style={styles.loadingText}>Signing in...</span>
                ) : (
                  <span>Sign In →</span>
                )}
              </button>
            </form>

            <p style={styles.footer}>
              Don't have an account?{' '}
              <Link to="/register" style={styles.link}>Create one here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--navy-deep)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgPattern: {
    position: 'fixed',
    inset: 0,
    backgroundImage: `radial-gradient(circle at 20% 50%, rgba(201,168,76,0.06) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(15,32,68,0.8) 0%, transparent 50%),
                      repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 1px, transparent 1px, transparent 60px)`,
    pointerEvents: 'none',
  },
  bgGlow: {
    position: 'fixed',
    top: '-20%',
    right: '-10%',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  container: {
    display: 'flex',
    width: '100%',
    maxWidth: '960px',
    minHeight: '580px',
    background: 'rgba(15, 32, 68, 0.6)',
    backdropFilter: 'blur(20px)',
    border: '1px solid var(--gold-border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-elevated)',
    position: 'relative',
    zIndex: 1,
  },
  leftPanel: {
    flex: '1',
    background: 'linear-gradient(135deg, rgba(201,168,76,0.1) 0%, transparent 60%)',
    borderRight: '1px solid var(--gold-border)',
    padding: '48px 40px',
    display: 'flex',
    alignItems: 'center',
  },
  leftContent: { width: '100%' },
  logo: { width: '72px', height: 'auto', marginBottom: '20px' },
  universityName: {
    fontFamily: 'var(--font-display)',
    fontSize: '26px',
    fontWeight: '700',
    color: 'var(--white)',
    marginBottom: '12px',
    lineHeight: '1.2',
  },
  divider: {
    width: '48px',
    height: '2px',
    background: 'linear-gradient(90deg, var(--gold), transparent)',
    marginBottom: '16px',
  },
  tagline: {
    fontSize: '13px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: 'var(--gold)',
    marginBottom: '20px',
    fontWeight: '500',
  },
  description: {
    fontSize: '14px',
    color: 'var(--white-40)',
    lineHeight: '1.7',
    marginBottom: '32px',
  },
  features: { display: 'flex', flexDirection: 'column', gap: '12px' },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    color: 'var(--white-70)',
    animation: 'fadeUp 0.5s ease forwards',
    opacity: 0,
  },
  featureDot: { color: 'var(--gold)', fontSize: '10px' },
  rightPanel: {
    width: '380px',
    padding: '48px 40px',
    display: 'flex',
    alignItems: 'center',
  },
  formCard: { width: '100%' },
  formTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--white)',
    marginBottom: '6px',
  },
  formSubtitle: {
    fontSize: '14px',
    color: 'var(--white-40)',
    marginBottom: '32px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--white-70)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  input: {
    padding: '13px 16px',
    background: 'var(--white-08)',
    border: '1px solid var(--white-15)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--white)',
    fontSize: '14px',
    outline: 'none',
    transition: 'var(--transition)',
    width: '100%',
  },
  errorBox: {
    background: 'var(--red-pale)',
    border: '1px solid rgba(224,82,82,0.2)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 16px',
    color: '#ff8a8a',
    fontSize: '13px',
  },
  submitBtn: {
    padding: '14px',
    background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: '#1a1200',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
    letterSpacing: '0.3px',
    transition: 'var(--transition)',
  },
  loadingText: { opacity: 0.7 },
  footer: {
    fontSize: '13px',
    color: 'var(--white-40)',
    textAlign: 'center',
    marginTop: '24px',
  },
  link: {
    color: 'var(--gold)',
    textDecoration: 'none',
    fontWeight: '500',
  },
}