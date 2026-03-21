import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export default function ManageLecturers() {
  const [lecturers, setLecturers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchLecturers() }, [])

  const fetchLecturers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'lecturer')
      .order('name')
    setLecturers(data || [])
    setLoading(false)
  }

  return (
    <div>
      <div style={styles.topBar}>
        <p style={styles.count}>{lecturers.length} lecturer{lecturers.length !== 1 ? 's' : ''} registered</p>
        <p style={styles.hint}>Lecturers register themselves via the Register page with the "Lecturer" role</p>
      </div>

      {loading ? (
        <p style={styles.muted}>Loading lecturers...</p>
      ) : lecturers.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyIcon}>👨‍🏫</p>
          <p style={styles.emptyText}>No lecturers registered yet.</p>
          <p style={styles.emptyHint}>Lecturers need to create an account on the Register page and select the "Lecturer" role.</p>
        </div>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <span>Name</span>
            <span>Email</span>
            <span>Status</span>
          </div>
          {lecturers.map(lecturer => (
            <div key={lecturer.id} style={styles.tableRow}>
              <span style={styles.name}>{lecturer.name}</span>
              <span style={styles.email}>{lecturer.email}</span>
              <span style={styles.badge}>Active</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  topBar: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '24px',
    flexWrap: 'wrap', gap: '8px',
  },
  count: { color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0 },
  hint: {
    color: 'rgba(255,255,255,0.3)', fontSize: '12px',
    margin: 0, fontStyle: 'italic',
  },
  muted: { color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', marginTop: '40px' },
  emptyState: { textAlign: 'center', marginTop: '60px' },
  emptyIcon: { fontSize: '48px', margin: '0 0 16px 0' },
  emptyText: { color: 'rgba(255,255,255,0.6)', fontSize: '16px', margin: '0 0 8px 0' },
  emptyHint: { color: 'rgba(255,255,255,0.3)', fontSize: '13px', margin: 0, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' },
  table: {
    background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
    overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)',
  },
  tableHeader: {
    display: 'grid', gridTemplateColumns: '1fr 1fr 100px',
    padding: '12px 20px', background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.4)', fontSize: '12px',
    letterSpacing: '0.5px', textTransform: 'uppercase',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  tableRow: {
    display: 'grid', gridTemplateColumns: '1fr 1fr 100px',
    padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  name: { color: '#ffffff', fontSize: '14px', fontWeight: 'bold' },
  email: { color: 'rgba(255,255,255,0.5)', fontSize: '13px' },
  badge: {
    background: 'rgba(100,220,100,0.15)', border: '1px solid rgba(100,220,100,0.3)',
    color: '#6ddc6d', padding: '4px 10px', borderRadius: '20px',
    fontSize: '11px', fontWeight: 'bold', textAlign: 'center', width: 'fit-content',
  },
}