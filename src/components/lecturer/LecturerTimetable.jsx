import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { sendNotification } from '../../utils/notify'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default function LecturerTimetable({ profile }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState('Monday')
  const [rescheduling, setRescheduling] = useState(null)
  const [cancelling, setCancelling] = useState(null)

  useEffect(() => { fetchEntries() }, [])

  const fetchEntries = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('timetable_entries')
      .select(`*, course:courses(*), room:rooms(*), time_slot:time_slots(*)`)
      .eq('lecturer_id', profile.id)
    setEntries(data || [])
    setLoading(false)
  }

  const handleCancelClass = async (entry) => {
    if (!confirm(`Cancel ${entry.course?.code} on ${entry.time_slot?.day}? All students will be notified.`)) return
    setCancelling(entry.id)

    // Get all registered students
    const { data: students } = await supabase
      .from('student_courses')
      .select('student_id')
      .eq('course_id', entry.course_id)

    // Delete the entry
    await supabase.from('timetable_entries').delete().eq('id', entry.id)

    // Notify all students
    const message = `⚠️ Class Cancelled: ${entry.course?.code} - ${entry.course?.name} scheduled for ${entry.time_slot?.day} at ${entry.time_slot?.start_time} has been cancelled by ${profile.name}.`
    if (students) {
      for (const s of students) {
        await sendNotification(s.student_id, message)
      }
    }

    setCancelling(null)
    fetchEntries()
  }

  const formatTime = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
  }

  const dayEntries = entries.filter(e => e.time_slot?.day === selectedDay)

  if (loading) return <p style={styles.muted}>Loading your timetable...</p>

  return (
    <div>
      <div style={styles.summary}>
        <div style={styles.summaryCard}>
          <p style={styles.summaryNum}>{entries.length}</p>
          <p style={styles.summaryLabel}>Total Classes</p>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryNum}>{[...new Set(entries.map(e => e.time_slot?.day))].length}</p>
          <p style={styles.summaryLabel}>Days Teaching</p>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryNum}>{[...new Set(entries.map(e => e.course_id))].length}</p>
          <p style={styles.summaryLabel}>Courses</p>
        </div>
      </div>

      <div style={styles.dayTabs}>
        {DAYS.map(day => (
          <button
            key={day}
            style={{ ...styles.dayTab, ...(selectedDay === day ? styles.dayTabActive : {}) }}
            onClick={() => setSelectedDay(day)}
          >
            {day}
            {entries.filter(e => e.time_slot?.day === day).length > 0 && (
              <span style={styles.badge}>{entries.filter(e => e.time_slot?.day === day).length}</span>
            )}
          </button>
        ))}
      </div>

      {dayEntries.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyIcon}>✅</p>
          <p style={styles.emptyText}>No classes on {selectedDay}</p>
        </div>
      ) : (
        <div style={styles.classList}>
          {dayEntries
            .sort((a, b) => a.time_slot?.start_time?.localeCompare(b.time_slot?.start_time))
            .map(entry => (
              <div key={entry.id} style={styles.classCard}>
                <div style={styles.timeBar}>
                  <span style={styles.time}>{formatTime(entry.time_slot?.start_time)} — {formatTime(entry.time_slot?.end_time)}</span>
                </div>
                <div style={styles.classBody}>
                  <div style={styles.classInfo}>
                    <p style={styles.courseCode}>{entry.course?.code}</p>
                    <p style={styles.courseName}>{entry.course?.name}</p>
                    <div style={styles.classMeta}>
                      <span style={styles.metaItem}>🏛️ {entry.room?.name}, {entry.room?.building}</span>
                      <span style={styles.metaItem}>👥 {entry.course?.enrollment_count} students</span>
                    </div>
                  </div>
                  <div style={styles.classActions}>
                    <button
                      style={styles.cancelBtn}
                      onClick={() => handleCancelClass(entry)}
                      disabled={cancelling === entry.id}
                    >
                      {cancelling === entry.id ? 'Cancelling...' : '✕ Cancel Class'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  muted: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '40px' },
  summary: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' },
  summaryCard: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', textAlign: 'center' },
  summaryNum: { color: 'var(--gold)', fontSize: '32px', fontWeight: 'bold', margin: '0 0 4px 0' },
  summaryLabel: { color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' },
  dayTabs: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  dayTab: { padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' },
  dayTabActive: { background: 'var(--gold-pale)', color: 'var(--gold)', borderColor: 'var(--gold-border)', fontWeight: 'bold' },
  badge: { background: 'var(--gold)', color: '#1a1a1a', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: '60px' },
  emptyIcon: { fontSize: '40px', margin: '0 0 12px 0' },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: '15px' },
  classList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  classCard: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' },
  timeBar: { background: 'var(--gold-pale)', borderBottom: '1px solid var(--gold-border)', padding: '10px 20px' },
  time: { color: 'var(--gold)', fontSize: '13px', fontWeight: 'bold' },
  classBody: { padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' },
  classInfo: { flex: 1 },
  courseCode: { color: 'var(--gold)', fontWeight: 'bold', fontSize: '16px', margin: '0 0 4px 0' },
  courseName: { color: '#ffffff', fontSize: '14px', margin: '0 0 12px 0' },
  classMeta: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
  metaItem: { color: 'rgba(255,255,255,0.5)', fontSize: '13px' },
  classActions: { display: 'flex', flexDirection: 'column', gap: '8px' },
  cancelBtn: { padding: '8px 16px', background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.2)', borderRadius: '8px', color: '#e05252', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
}