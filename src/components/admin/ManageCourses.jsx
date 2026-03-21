import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export default function ManageCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', department: '', enrollment_count: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { fetchCourses() }, [])

  const fetchCourses = async () => {
    setLoading(true)
    const { data } = await supabase.from('courses').select('*').order('code')
    setCourses(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.name || !form.code || !form.department || !form.enrollment_count) {
      setError('All fields are required')
      return
    }
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('courses').insert({
      name: form.name,
      code: form.code.toUpperCase(),
      department: form.department,
      enrollment_count: parseInt(form.enrollment_count)
    })
    if (error) setError(error.message)
    else {
      setForm({ name: '', code: '', department: '', enrollment_count: '' })
      setShowForm(false)
      fetchCourses()
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this course?')) return
    await supabase.from('courses').delete().eq('id', id)
    fetchCourses()
  }

  return (
    <div>
      <div style={styles.topBar}>
        <p style={styles.count}>{courses.length} course{courses.length !== 1 ? 's' : ''} total</p>
        <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Course'}
        </button>
      </div>

      {showForm && (
        <div style={styles.form}>
          <h3 style={styles.formTitle}>New Course</h3>
          <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>Course Name</label>
              <input style={styles.input} placeholder="e.g. Introduction to Computing"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Course Code</label>
              <input style={styles.input} placeholder="e.g. COS101"
                value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Department</label>
              <input style={styles.input} placeholder="e.g. Computer Science"
                value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Enrollment Count</label>
              <input style={styles.input} type="number" placeholder="e.g. 120"
                value={form.enrollment_count} onChange={e => setForm({ ...form, enrollment_count: e.target.value })} />
            </div>
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Course'}
          </button>
        </div>
      )}

      {loading ? (
        <p style={styles.muted}>Loading courses...</p>
      ) : courses.length === 0 ? (
        <p style={styles.muted}>No courses yet. Add your first course above.</p>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <span>Code</span>
            <span>Course Name</span>
            <span>Department</span>
            <span>Enrollment</span>
            <span></span>
          </div>
          {courses.map(course => (
            <div key={course.id} style={styles.tableRow}>
              <span style={styles.code}>{course.code}</span>
              <span style={styles.courseName}>{course.name}</span>
              <span style={styles.dept}>{course.department}</span>
              <span style={styles.enrollment}>{course.enrollment_count} students</span>
              <button style={styles.deleteBtn} onClick={() => handleDelete(course.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  count: { color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0 },
  addBtn: {
    background: 'linear-gradient(135deg, #f7971e, #ffd200)',
    border: 'none', borderRadius: '8px', padding: '10px 20px',
    color: '#1a1a1a', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
  },
  form: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px', padding: '24px', marginBottom: '24px',
  },
  formTitle: { color: '#ffd200', margin: '0 0 20px 0', fontSize: '16px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: '12px', letterSpacing: '0.5px' },
  input: {
    padding: '10px 14px', background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
    color: '#fff', fontSize: '14px', outline: 'none',
  },
  error: { color: '#ff6b6b', fontSize: '13px', margin: '0 0 12px 0' },
  saveBtn: {
    background: 'linear-gradient(135deg, #f7971e, #ffd200)',
    border: 'none', borderRadius: '8px', padding: '10px 24px',
    color: '#1a1a1a', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
  },
  muted: { color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', marginTop: '40px' },
  table: { background: 'rgba(255,255,255,0.03)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' },
  tableHeader: {
    display: 'grid', gridTemplateColumns: '100px 1fr 180px 130px 80px',
    padding: '12px 20px', background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.4)', fontSize: '12px', letterSpacing: '0.5px',
    textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  tableRow: {
    display: 'grid', gridTemplateColumns: '100px 1fr 180px 130px 80px',
    padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  code: { color: '#ffd200', fontWeight: 'bold', fontSize: '14px' },
  courseName: { color: '#ffffff', fontSize: '14px' },
  dept: { color: 'rgba(255,255,255,0.6)', fontSize: '13px' },
  enrollment: { color: 'rgba(255,255,255,0.6)', fontSize: '13px' },
  deleteBtn: {
    background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.2)',
    color: '#ff6b6b', padding: '6px 12px', borderRadius: '6px',
    cursor: 'pointer', fontSize: '12px',
  },
}