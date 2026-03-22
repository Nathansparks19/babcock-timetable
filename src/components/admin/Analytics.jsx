import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export default function Analytics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    setLoading(true)
    const [entries, courses, rooms, lecturers, students, timeSlots] = await Promise.all([
      supabase.from('timetable_entries').select(`*, course:courses(*), room:rooms(*), time_slot:time_slots(*), lecturer:profiles(*)`),
      supabase.from('courses').select('*'),
      supabase.from('rooms').select('*'),
      supabase.from('profiles').select('*').eq('role', 'lecturer'),
      supabase.from('profiles').select('*').eq('role', 'student'),
      supabase.from('time_slots').select('*'),
    ])
    const e = entries.data || []
    const c = courses.data || []
    const r = rooms.data || []
    const l = lecturers.data || []
    const s = students.data || []
    const ts = timeSlots.data || []
    const deptMap = {}
    e.forEach(entry => { const dept = entry.course?.department || 'Unknown'; deptMap[dept] = (deptMap[dept] || 0) + 1 })
    const deptBreakdown = Object.entries(deptMap).sort((a, b) => b[1] - a[1])
    const roomMap = {}
    e.forEach(entry => { const room = entry.room?.name || 'Unknown'; roomMap[room] = (roomMap[room] || 0) + 1 })
    const roomUtilization = Object.entries(roomMap).sort((a, b) => b[1] - a[1])
    const dayMap = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 }
    e.forEach(entry => { const day = entry.time_slot?.day; if (day && dayMap[day] !== undefined) dayMap[day]++ })
    const totalSlots = ts.length
    const usedSlots = e.length
    const utilizationRate = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0
    setStats({
      totalClasses: e.length, totalCourses: c.length, totalRooms: r.length,
      totalLecturers: l.length, totalStudents: s.length, utilizationRate,
      deptBreakdown, roomUtilization: roomUtilization.slice(0, 8),
      dayDistribution: Object.entries(dayMap),
      cancelledClasses: e.filter(entry => entry.status === 'cancelled').length,
    })
    setLoading(false)
  }

  if (loading) return <p style={styles.muted}>Loading analytics...</p>
  if (!stats) return null

  const maxDept = Math.max(...stats.deptBreakdown.map(d => d[1]), 1)
  const maxDay = Math.max(...stats.dayDistribution.map(d => d[1]), 1)
  const maxRoom = Math.max(...stats.roomUtilization.map(r => r[1]), 1)

  return (
    <div>
      <div style={styles.cardGrid}>
        {[
          { label: 'Classes Scheduled', value: stats.totalClasses, icon: '📅', color: '#c9a84c' },
          { label: 'Courses in System', value: stats.totalCourses, icon: '📚', color: '#52c47a' },
          { label: 'Lecturers', value: stats.totalLecturers, icon: '👨‍🏫', color: '#a0b4ff' },
          { label: 'Students', value: stats.totalStudents, icon: '🎓', color: '#f7971e' },
          { label: 'Rooms Available', value: stats.totalRooms, icon: '🏛️', color: '#e05252' },
          { label: 'Slot Utilization', value: `${stats.utilizationRate}%`, icon: '📊', color: '#c9a84c' },
        ].map((card, i) => (
          <div key={i} style={styles.statCard}>
            <span style={styles.statIcon}>{card.icon}</span>
            <p style={{ ...styles.statValue, color: card.color }}>{card.value}</p>
            <p style={styles.statLabel}>{card.label}</p>
          </div>
        ))}
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>📅 Classes by Day</h3>
          <div style={styles.barChart}>
            {stats.dayDistribution.map(([day, count]) => (
              <div key={day} style={styles.barRow}>
                <span style={styles.barLabel}>{day.slice(0, 3)}</span>
                <div style={styles.barTrack}>
                  <div style={{ ...styles.barFill, width: `${(count / maxDay) * 100}%`, background: 'linear-gradient(90deg, var(--gold), var(--gold-light))' }} />
                </div>
                <span style={styles.barValue}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>🏫 Classes by Department</h3>
          <div style={styles.barChart}>
            {stats.deptBreakdown.slice(0, 8).map(([dept, count]) => (
              <div key={dept} style={styles.barRow}>
                <span style={styles.barLabel}>{dept.split(' ')[0]}</span>
                <div style={styles.barTrack}>
                  <div style={{ ...styles.barFill, width: `${(count / maxDept) * 100}%`, background: 'linear-gradient(90deg, #52c47a, #a0ffb4)' }} />
                </div>
                <span style={styles.barValue}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>🏛️ Room Utilization</h3>
          <div style={styles.barChart}>
            {stats.roomUtilization.map(([room, count]) => (
              <div key={room} style={styles.barRow}>
                <span style={styles.barLabel}>{room}</span>
                <div style={styles.barTrack}>
                  <div style={{ ...styles.barFill, width: `${(count / maxRoom) * 100}%`, background: 'linear-gradient(90deg, #a0b4ff, #667eea)' }} />
                </div>
                <span style={styles.barValue}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>⚡ System Overview</h3>
          <div style={styles.healthList}>
            {[
              { label: 'Total slot utilization', value: `${stats.utilizationRate}%`, color: '#52c47a' },
              { label: 'Cancelled classes', value: stats.cancelledClasses, color: stats.cancelledClasses > 0 ? '#e05252' : '#52c47a' },
              { label: 'Active departments', value: stats.deptBreakdown.length, color: '#c9a84c' },
              { label: 'Rooms in use', value: stats.roomUtilization.length, color: '#a0b4ff' },
            ].map((item, i) => (
              <div key={i} style={styles.healthRow}>
                <span style={styles.healthLabel}>{item.label}</span>
                <span style={{ ...styles.healthValue, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  muted: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '40px' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '28px' },
  statCard: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px 16px', textAlign: 'center' },
  statIcon: { fontSize: '24px', display: 'block', marginBottom: '8px' },
  statValue: { fontSize: '28px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: 'var(--font-display)' },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' },
  chartsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  chartCard: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' },
  chartTitle: { color: 'var(--white)', fontSize: '14px', fontWeight: '600', margin: '0 0 20px 0' },
  barChart: { display: 'flex', flexDirection: 'column', gap: '10px' },
  barRow: { display: 'grid', gridTemplateColumns: '70px 1fr 30px', alignItems: 'center', gap: '10px' },
  barLabel: { color: 'rgba(255,255,255,0.5)', fontSize: '12px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  barTrack: { background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '8px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '4px', minWidth: '4px' },
  barValue: { color: 'rgba(255,255,255,0.5)', fontSize: '11px', textAlign: 'right' },
  healthList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  healthRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  healthLabel: { color: 'rgba(255,255,255,0.5)', fontSize: '13px' },
  healthValue: { fontSize: '14px', fontWeight: '700' },
}