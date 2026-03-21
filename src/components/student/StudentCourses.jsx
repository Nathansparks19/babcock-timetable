import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export default function StudentCourses({ profile }) {
  const [allCourses, setAllCourses] = useState([])
  const [registered, setRegistered] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [all, reg] = await Promise.all([
      supabase.from('courses').select('*').order('code'),
      supabase.from('student_courses').select('*').eq('student_id', profile.id)
    ])
    setAllCourses(all.data || [])
    setRegistered((reg.data || []).map(r => r.course_id))
    setLoading(false)
  }

  const toggleCourse = async (courseId) => {
    setSaving(courseId)
    const isRegistered = registered.includes(courseId)

    if (isRegistered) {
      await supabase.from('student_courses')
        .delete()
        .eq('student_id', profile.id)
        .eq('course_id', courseId)
      setRegistered(prev => prev.filter(id => id !== courseId))
    } else {
      await supabase.from('student_courses')
        .insert({ student_id: profile.id, course_id: courseId })
      setRegistered(prev => [...prev, courseId])
    }
    setSaving(null)
  }

  if (loading) return <p style={styles.muted}>Loading courses...</p>

  return (
    <div>
      <div style={styles.topBar}>
        <div>
          <p style={styles.title}>Register for your courses</p>
          <p style={styles.subtitle}>Select all courses you are enrolled in this semester. Your timetable will be automatically generated.</p>
        </div>
        <div style={styles.countBadge}>
          {registered.length} registered
        </div>
      </div>

      {allCourses.length === 0 ? (
        <p style={styles.muted}>No courses available yet.</p>
      ) : (
        <div style={styles.grid}>
          {allCourses.map(course => {
            const isReg = registered.includes(course.id)
            const isSaving = saving === course.id
            return (
              <div key={course.id} style={{ ...styles.card, ...(isReg ? styles.cardActive : {}) }}>
                <div style={styles.cardTop}>
                  <span style={styles.code}>{course.code}</span>
                  {isReg && <span style={styles.tick}>✓</span>}
                </div>
                <p style={styles.name}>{course.name}</p>
                <p style={styles.dept}>{course.department}</p>
                <button
                  style={{ ...styles.btn, ...(isReg ? styles.btnRemove : styles.btnAdd) }}
                  onClick={() => toggleCourse(course.id)}
                  disabled={isSaving}
                >
                  {isSaving ? '...' : isReg ? 'Drop Course' : 'Register'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles = {
  muted: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '40px' },
  topBar: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '28px', gap: '16px',
  },
  title: { color: '#ffffff', fontSize: '16px', fontWeight: 'bold', margin: '0 0 6px 0' },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0, maxWidth: '500px' },
  countBadge: {
    background: 'rgba(255,210,0,0.15)', border: '1px solid rgba(255,210,0,0.3)',
    color: '#ffd200', padding: '8px 16px', borderRadius: '20px',
    fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' },
  card: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', padding: '20px', transition: 'all 0.2s',
  },
  cardActive: {
    background: 'rgba(255,210,0,0.08)', border: '1px solid rgba(255,210,0,0.25)',
  },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  code: { color: '#ffd200', fontWeight: 'bold', fontSize: '15px' },
  tick: { color: '#ffd200', fontSize: '16px', fontWeight: 'bold' },
  name: { color: '#ffffff', fontSize: '14px', margin: '0 0 4px 0' },
  dept: { color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '0 0 16px 0' },
  btn: {
    width: '100%', padding: '8px', borderRadius: '8px',
    cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', border: 'none',
  },
  btnAdd: { background: 'linear-gradient(135deg, #f7971e, #ffd200)', color: '#1a1a1a' },
  btnRemove: { background: 'rgba(255,100,100,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,100,100,0.3)' },
}