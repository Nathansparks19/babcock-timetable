import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default function LecturerAvailability({ profile }) {
  const [timeSlots, setTimeSlots] = useState([])
  const [unavailable, setUnavailable] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [ts, un] = await Promise.all([
      supabase.from('time_slots').select('*').order('day').order('start_time'),
      supabase.from('lecturer_unavailability').select('*').eq('lecturer_id', profile.id)
    ])
    setTimeSlots(ts.data || [])
    setUnavailable((un.data || []).map(u => u.time_slot_id))
    setLoading(false)
  }

  const toggleSlot = (slotId) => {
    setUnavailable(prev =>
      prev.includes(slotId)
        ? prev.filter(id => id !== slotId)
        : [...prev, slotId]
    )
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    // Delete existing unavailability records
    await supabase.from('lecturer_unavailability')
      .delete().eq('lecturer_id', profile.id)

    // Insert new ones
    if (unavailable.length > 0) {
      await supabase.from('lecturer_unavailability').insert(
        unavailable.map(slotId => ({
          lecturer_id: profile.id,
          time_slot_id: slotId
        }))
      )
    }
    setSaving(false)
    setSaved(true)
  }

  const formatTime = (t) => {
    const [h] = t.split(':')
    const hour = parseInt(h)
    return `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'pm' : 'am'}`
  }

  if (loading) return <p style={styles.muted}>Loading...</p>

  return (
    <div>
      <div style={styles.topBar}>
        <div>
          <p style={styles.title}>Mark your unavailable time slots</p>
          <p style={styles.subtitle}>Click on a slot to mark it as unavailable. The admin will not be able to schedule you during these times.</p>
        </div>
        <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Availability'}
        </button>
      </div>

      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendBox, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
          <span>Available</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendBox, background: 'rgba(255,80,80,0.2)', border: '1px solid rgba(255,80,80,0.4)' }} />
          <span>Unavailable</span>
        </div>
      </div>

      <div style={styles.grid}>
        {DAYS.map(day => (
          <div key={day} style={styles.dayCol}>
            <p style={styles.dayLabel}>{day}</p>
            <div style={styles.slots}>
              {timeSlots.filter(s => s.day === day).map(slot => {
                const isUnavailable = unavailable.includes(slot.id)
                return (
                  <button
                    key={slot.id}
                    style={{
                      ...styles.slot,
                      ...(isUnavailable ? styles.slotUnavailable : styles.slotAvailable)
                    }}
                    onClick={() => toggleSlot(slot.id)}
                  >
                    {formatTime(slot.start_time)}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  muted: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '40px' },
  topBar: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '24px', gap: '16px',
  },
  title: { color: '#ffffff', fontSize: '16px', fontWeight: 'bold', margin: '0 0 6px 0' },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0, maxWidth: '500px' },
  saveBtn: {
    background: 'linear-gradient(135deg, #f7971e, #ffd200)',
    border: 'none', borderRadius: '8px', padding: '10px 24px',
    color: '#1a1a1a', fontWeight: 'bold', cursor: 'pointer',
    fontSize: '14px', whiteSpace: 'nowrap',
  },
  legend: { display: 'flex', gap: '20px', marginBottom: '24px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' },
  legendBox: { width: '20px', height: '20px', borderRadius: '4px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' },
  dayCol: {},
  dayLabel: {
    color: '#ffd200', fontSize: '13px', fontWeight: 'bold',
    marginBottom: '8px', textAlign: 'center',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  slots: { display: 'flex', flexDirection: 'column', gap: '4px' },
  slot: {
    width: '100%', padding: '8px 4px', borderRadius: '6px',
    cursor: 'pointer', fontSize: '12px', textAlign: 'center',
    transition: 'all 0.15s',
  },
  slotAvailable: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.6)',
  },
  slotUnavailable: {
    background: 'rgba(255,80,80,0.2)',
    border: '1px solid rgba(255,80,80,0.4)',
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
}