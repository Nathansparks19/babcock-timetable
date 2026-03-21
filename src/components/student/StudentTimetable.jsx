import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default function StudentTimetable({ profile }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState('Monday')

  useEffect(() => { fetchTimetable() }, [])

  const fetchTimetable = async () => {
    setLoading(true)
    const { data: regCourses } = await supabase
      .from('student_courses')
      .select('course_id')
      .eq('student_id', profile.id)

    if (!regCourses || regCourses.length === 0) {
      setEntries([])
      setLoading(false)
      return
    }

    const courseIds = regCourses.map(r => r.course_id)
    const { data } = await supabase
      .from('timetable_entries')
      .select(`*, course:courses(*), lecturer:profiles(*), room:rooms(*), time_slot:time_slots(*)`)
      .in('course_id', courseIds)

    setEntries(data || [])
    setLoading(false)
  }

  const formatTime = (t) => {
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
  }

  const dayEntries = entries.filter(e => e.time_slot?.day === selectedDay)

  if (loading) return <p style={styles.muted}>Loading your timetable...</p>

  if (entries.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={styles.emptyIcon}>📚</p>
        <p style={styles.emptyText}>No timetable yet</p>
        <p style={styles.emptyHint}>Go to "My Courses" to register your courses first. Your timetable will appear here automatically.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={styles.summary}>
        <div style={styles.summaryCard}>
          <p style={styles.summaryNum}>{entries.length}</p>
          <p style={styles.summaryLabel}>Total Classes</p>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryNum}>{[...new Set(entries.map(e => e.course_id))].length}</p>
          <p style={styles.summaryLabel}>Courses</p>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryNum}>{[...new Set(entries.map(e => e.time_slot?.day))].length}</p>
          <p style={styles.summaryLabel}>Days with Classes</p>
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
                <div style={styles.classInfo}>
                  <p style={styles.courseCode}>{entry.course?.code}</p>
                  <p style={styles.courseName}>{entry.course?.name}</p>
                  <div style={styles.classMeta}>
                    <span style={styles.metaItem}>👨‍🏫 {entry.lecturer?.name}</span>
                    <span style={styles.metaItem}>🏛️ {entry.room?.name}, {entry.room?.building}</span>
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
  empty: { textAlign: 'center', marginTop: '60px' },
  emptyIcon: { fontSize: '48px', margin: '0 0 16px 0' },
  emptyText: { color: 'rgba(255,255,255,0.6)', fontSize: '16px', margin: '0 0 8px 0' },
  emptyHint: { color: 'rgba(255,255,255,0.3)', fontSize: '13px', maxWidth: '400px', margin: '0 auto' },
  summary: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' },
  summaryCard: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', padding: '20px', textAlign: 'center',
  },
  summaryNum: { color: '#ffd200', fontSize: '32px', fontWeight: 'bold', margin: '0 0 4px 0' },
  summaryLabel: { color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' },
  dayTabs: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  dayTab: {
    padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
    fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px',
  },
  dayTabActive: { background: 'rgba(255,210,0,0.15)', color: '#ffd200', borderColor: 'rgba(255,210,0,0.3)', fontWeight: 'bold' },
  badge: {
    background: '#ffd200', color: '#1a1a1a', borderRadius: '10px',
    padding: '1px 7px', fontSize: '11px', fontWeight: 'bold',
  },
  classList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  classCard: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', overflow: 'hidden',
  },
  timeBar: {
    background: 'rgba(255,210,0,0.1)', borderBottom: '1px solid rgba(255,210,0,0.15)',
    padding: '10px 20px',
  },
  time: { color: '#ffd200', fontSize: '13px', fontWeight: 'bold' },
  classInfo: { padding: '16px 20px' },
  courseCode: { color: '#ffd200', fontWeight: 'bold', fontSize: '16px', margin: '0 0 4px 0' },
  courseName: { color: '#ffffff', fontSize: '14px', margin: '0 0 12px 0' },
  classMeta: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
  metaItem: { color: 'rgba(255,255,255,0.5)', fontSize: '13px' },
}