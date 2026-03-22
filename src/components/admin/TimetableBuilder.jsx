import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { notifyTimetableChange } from '../../utils/notify'
import { exportTimetablePDF } from '../../utils/exportPDF'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default function TimetableBuilder() {
  const [courses, setCourses] = useState([])
  const [rooms, setRooms] = useState([])
  const [lecturers, setLecturers] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [entries, setEntries] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ course_id: '', lecturer_id: '', room_id: '', time_slot_id: '' })
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(null)
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [selectedDay, setSelectedDay] = useState('Monday')
  const [selectedDept, setSelectedDept] = useState('All')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [c, r, l, ts, e] = await Promise.all([
      supabase.from('courses').select('*'),
      supabase.from('rooms').select('*'),
      supabase.from('profiles').select('*').eq('role', 'lecturer'),
      supabase.from('time_slots').select('*').order('day').order('start_time'),
      supabase.from('timetable_entries').select(`
        *,
        course:courses(*),
        lecturer:profiles(*),
        room:rooms(*),
        time_slot:time_slots(*)
      `)
    ])
    setCourses(c.data || [])
    setRooms(r.data || [])
    setLecturers(l.data || [])
    setTimeSlots(ts.data || [])
    setEntries(e.data || [])
  }

  const checkConflicts = () => {
    if (!form.course_id || !form.lecturer_id || !form.room_id || !form.time_slot_id) return null
    const room = rooms.find(r => r.id === form.room_id)
    const course = courses.find(c => c.id === form.course_id)
    const lecturer = lecturers.find(l => l.id === form.lecturer_id)
    const conflicts = []
    const roomClash = entries.find(e => e.room_id === form.room_id && e.time_slot_id === form.time_slot_id)
    if (roomClash) conflicts.push(`Room "${room?.name}" is already booked at this time for ${roomClash.course?.name}`)
    const lecturerClash = entries.find(e => e.lecturer_id === form.lecturer_id && e.time_slot_id === form.time_slot_id)
    if (lecturerClash) conflicts.push(`${lecturer?.name} is already teaching ${lecturerClash.course?.name} at this time`)
    if (room && course && course.enrollment_count > room.capacity) {
      conflicts.push(`Room capacity (${room.capacity}) is less than course enrollment (${course.enrollment_count} students)`)
    }
    return conflicts.length > 0 ? { conflicts, room, course, lecturer } : null
  }

  const getAISuggestions = async (conflictData) => {
    setLoadingAI(true)
    setAiSuggestions(null)
    const course = courses.find(c => c.id === form.course_id)
    const lecturer = lecturers.find(l => l.id === form.lecturer_id)
    const availableRooms = rooms.filter(r => r.capacity >= (course?.enrollment_count || 0))
    const bookedSlotIds = entries.filter(e => e.lecturer_id === form.lecturer_id).map(e => e.time_slot_id)
    const availableSlots = timeSlots.filter(s => !bookedSlotIds.includes(s.id)).slice(0, 10)
    const prompt = `You are a university timetable scheduling assistant.
Course: ${course?.name} (${course?.code}), Enrollment: ${course?.enrollment_count} students
Lecturer: ${lecturer?.name}
Conflicts detected: ${conflictData.conflicts.join('; ')}
Available rooms that fit the enrollment:
${availableRooms.map(r => `- ${r.name} (${r.building}, capacity: ${r.capacity})`).join('\n')}
Available time slots where the lecturer is free:
${availableSlots.map(s => `- ${s.day} ${s.start_time}-${s.end_time}`).join('\n')}
Suggest the 3 best alternative scheduling options. For each option give:
1. Day and time
2. Recommended room
3. One sentence reason why it's a good fit
Be concise and practical. Format as a numbered list.`
    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await response.json()
      const text = data.content?.map(b => b.text).join('') || 'No suggestions available.'
      setAiSuggestions(text)
    } catch (err) {
      setAiSuggestions('Could not load AI suggestions. Please try again.')
    }
    setLoadingAI(false)
  }

  const autoSchedule = async () => {
    if (!form.course_id || !form.lecturer_id) {
      setConflict({ conflicts: ['Please select a course and lecturer first'], isError: true })
      return
    }
    setLoadingAI(true)
    setAiSuggestions(null)
    setConflict(null)
    const course = courses.find(c => c.id === form.course_id)
    const lecturer = lecturers.find(l => l.id === form.lecturer_id)
    const { data: unavailData } = await supabase
      .from('lecturer_unavailability')
      .select('time_slot_id')
      .eq('lecturer_id', form.lecturer_id)
    const unavailSlotIds = (unavailData || []).map(u => u.time_slot_id)
    const bookedSlotIds = entries.filter(e => e.lecturer_id === form.lecturer_id).map(e => e.time_slot_id)
    const bookedRoomSlots = entries.map(e => `${e.room_id}_${e.time_slot_id}`)
    const availableRooms = rooms.filter(r => r.capacity >= (course?.enrollment_count || 0))
    const freeSlots = timeSlots.filter(s => !unavailSlotIds.includes(s.id) && !bookedSlotIds.includes(s.id))
    const freeCombinations = []
    for (const slot of freeSlots) {
      for (const room of availableRooms) {
        if (!bookedRoomSlots.includes(`${room.id}_${slot.id}`)) {
          freeCombinations.push({ slot, room })
        }
      }
    }
    if (freeCombinations.length === 0) {
      setAiSuggestions('No available slots found for this lecturer and course combination.')
      setLoadingAI(false)
      return
    }
    const prompt = `You are a university timetable scheduling assistant.
Course: ${course?.name} (${course?.code}), Enrollment: ${course?.enrollment_count} students
Lecturer: ${lecturer?.name}
Available room and time slot combinations:
${freeCombinations.slice(0, 15).map((c, i) => `${i + 1}. ${c.slot.day} ${c.slot.start_time}-${c.slot.end_time}, Room: ${c.room.name} (${c.room.building}, capacity: ${c.room.capacity})`).join('\n')}
Pick the SINGLE best option for scheduling this class. Consider:
- Reasonable teaching hours (avoid very early or very late)
- Room capacity should fit but not massively exceed enrollment
- Spread classes across the week when possible
Respond with ONLY a JSON object in this exact format, no other text:
{
  "slot_index": <number 1-${Math.min(freeCombinations.length, 15)}>,
  "reason": "<one sentence explanation>"
}`
    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await response.json()
      const text = data.content?.map(b => b.text).join('') || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      const chosen = freeCombinations[parsed.slot_index - 1]
      if (chosen) {
        setForm(prev => ({ ...prev, room_id: chosen.room.id, time_slot_id: chosen.slot.id }))
        setAiSuggestions(`✨ AI selected: ${chosen.slot.day} ${chosen.slot.start_time}-${chosen.slot.end_time} in ${chosen.room.name} — ${parsed.reason}`)
      }
    } catch (err) {
      setAiSuggestions('Could not auto-schedule. Please try again or select manually.')
    }
    setLoadingAI(false)
  }

  const handleFormChange = (field, value) => {
    const updated = { ...form, [field]: value }
    setForm(updated)
    setConflict(null)
    setAiSuggestions(null)
  }

  const handleSchedule = async () => {
    if (!form.course_id || !form.lecturer_id || !form.room_id || !form.time_slot_id) {
      setConflict({ conflicts: ['Please fill in all fields'], isError: true })
      return
    }
    const detected = checkConflicts()
    if (detected) {
      setConflict(detected)
      getAISuggestions(detected)
      return
    }
    setSaving(true)
    const { data: newEntry, error } = await supabase.from('timetable_entries').insert({
      course_id: form.course_id,
      lecturer_id: form.lecturer_id,
      room_id: form.room_id,
      time_slot_id: form.time_slot_id,
    }).select(`*, course:courses(*), lecturer:profiles(*), room:rooms(*), time_slot:time_slots(*)`).single()
    if (!error && newEntry) {
      await notifyTimetableChange(newEntry, 'created')
      setForm({ course_id: '', lecturer_id: '', room_id: '', time_slot_id: '' })
      setShowForm(false)
      setConflict(null)
      setAiSuggestions(null)
      fetchAll()
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this entry from the timetable?')) return
    const entryToDelete = entries.find(e => e.id === id)
    await supabase.from('timetable_entries').delete().eq('id', id)
    if (entryToDelete) await notifyTimetableChange(entryToDelete, 'deleted')
    fetchAll()
  }

  const departments = ['All', ...new Set(courses.map(c => c.department).filter(Boolean).sort())]
  const daySlots = timeSlots.filter(s => s.day === selectedDay)
  const dayEntries = entries.filter(e => {
    const matchesDay = e.time_slot?.day === selectedDay
    const matchesDept = selectedDept === 'All' || e.course?.department === selectedDept
    return matchesDay && matchesDept
  })

  const formatTime = (t) => {
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
  }

  return (
    <div>
      <div style={styles.topBar}>
        <p style={styles.count}>{entries.length} class{entries.length !== 1 ? 'es' : ''} scheduled</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={styles.exportBtn} onClick={() => exportTimetablePDF(entries, timeSlots)}>
            📄 Export PDF
          </button>
          <button style={styles.addBtn} onClick={() => { setShowForm(!showForm); setConflict(null); setAiSuggestions(null) }}>
            {showForm ? '✕ Cancel' : '+ Schedule Class'}
          </button>
        </div>
      </div>

      {showForm && (
        <div style={styles.form}>
          <h3 style={styles.formTitle}>Schedule a New Class</h3>
          <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>Course</label>
              <select style={styles.select} value={form.course_id} onChange={e => handleFormChange('course_id', e.target.value)}>
                <option value="">Select course...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Lecturer</label>
              <select style={styles.select} value={form.lecturer_id} onChange={e => handleFormChange('lecturer_id', e.target.value)}>
                <option value="">Select lecturer...</option>
                {lecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Room <span style={styles.optional}>(or use Auto-Schedule)</span></label>
              <select style={styles.select} value={form.room_id} onChange={e => handleFormChange('room_id', e.target.value)}>
                <option value="">Select room...</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name} - {r.building} ({r.capacity} seats)</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Day & Time <span style={styles.optional}>(or use Auto-Schedule)</span></label>
              <select style={styles.select} value={form.time_slot_id} onChange={e => handleFormChange('time_slot_id', e.target.value)}>
                <option value="">Select time slot...</option>
                {DAYS.map(day => (
                  <optgroup key={day} label={day}>
                    {timeSlots.filter(s => s.day === day).map(s => (
                      <option key={s.id} value={s.id}>{formatTime(s.start_time)} - {formatTime(s.end_time)}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {form.course_id && form.lecturer_id && (
            <div style={styles.autoScheduleBar}>
              <div>
                <p style={styles.autoTitle}>🤖 Let AI pick the best slot automatically</p>
                <p style={styles.autoSubtitle}>AI will check lecturer availability and all free rooms, then pick the optimal combination</p>
              </div>
              <button style={styles.autoBtn} onClick={autoSchedule} disabled={loadingAI}>
                {loadingAI ? '🧠 Thinking...' : '✨ Auto-Schedule'}
              </button>
            </div>
          )}

          {aiSuggestions && !conflict && (
            <div style={styles.autoResult}>
              <p style={styles.autoResultText}>{aiSuggestions}</p>
            </div>
          )}

          {conflict && !conflict.isError && (
            <div style={styles.conflictBox}>
              <p style={styles.conflictTitle}>⚠️ Scheduling Conflict Detected</p>
              {conflict.conflicts.map((c, i) => <p key={i} style={styles.conflictItem}>• {c}</p>)}
              <div style={styles.aiBox}>
                <p style={styles.aiTitle}>🧠 AI Suggestions</p>
                {loadingAI ? (
                  <p style={styles.aiLoading}>Generating smart alternatives...</p>
                ) : aiSuggestions ? (
                  <p style={styles.aiText}>{aiSuggestions}</p>
                ) : null}
              </div>
            </div>
          )}

          {conflict?.isError && <p style={styles.error}>{conflict.conflicts[0]}</p>}

          <button style={styles.saveBtn} onClick={handleSchedule} disabled={saving}>
            {saving ? 'Scheduling...' : 'Schedule Class'}
          </button>
        </div>
      )}

      {/* Department Filter */}
      <div style={styles.deptFilter}>
        <span style={styles.deptLabel}>Department:</span>
        <div style={styles.deptScroll}>
          {departments.map(dept => (
            <button
              key={dept}
              style={{ ...styles.deptBtn, ...(selectedDept === dept ? styles.deptBtnActive : {}) }}
              onClick={() => setSelectedDept(dept)}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Day Tabs */}
      <div style={styles.dayTabs}>
        {DAYS.map(day => (
          <button
            key={day}
            style={{ ...styles.dayTab, ...(selectedDay === day ? styles.dayTabActive : {}) }}
            onClick={() => setSelectedDay(day)}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Timetable Grid */}
      {daySlots.length === 0 ? (
        <p style={styles.muted}>No time slots for {selectedDay}</p>
      ) : (
        <div style={styles.grid2}>
          {daySlots.map(slot => {
            const entry = dayEntries.find(e => e.time_slot_id === slot.id)
            return (
              <div key={slot.id} style={entry ? styles.slotFilled : styles.slotEmpty}>
                <p style={styles.slotTime}>{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</p>
                {entry ? (
                  <>
                    <div style={styles.slotStatusBar}>
                      <p style={styles.slotCourse}>{entry.course?.code}</p>
                      <span style={{
                        ...styles.statusDot,
                        background: entry.status === 'cancelled' ? '#e05252' :
                          entry.status === 'rescheduled' ? '#f7971e' : '#52c47a'
                      }} />
                    </div>
                    <p style={styles.slotName}>{entry.course?.name}</p>
                    <p style={styles.slotInfo}>👨‍🏫 {entry.lecturer?.name}</p>
                    <p style={styles.slotInfo}>🏛️ {entry.room?.name}</p>
                    <button style={styles.removeBtn} onClick={() => handleDelete(entry.id)}>Remove</button>
                  </>
                ) : (
                  <p style={styles.slotFree}>Free</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles = {
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  count: { color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0 },
  addBtn: { background: 'linear-gradient(135deg, #f7971e, #ffd200)', border: 'none', borderRadius: '8px', padding: '10px 20px', color: '#1a1a1a', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' },
  exportBtn: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 20px', color: 'rgba(255,255,255,0.7)', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
  form: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', marginBottom: '24px' },
  formTitle: { color: 'var(--gold)', margin: '0 0 20px 0', fontSize: '16px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: '12px', letterSpacing: '0.5px' },
  optional: { color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontStyle: 'italic' },
  select: { padding: '10px 14px', background: '#1e3a4a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' },
  autoScheduleBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(100,150,255,0.08)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '16px', gap: '16px' },
  autoTitle: { color: '#a0b4ff', fontWeight: 'bold', fontSize: '14px', margin: '0 0 4px 0' },
  autoSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0 },
  autoBtn: { background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', borderRadius: '8px', padding: '10px 20px', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' },
  autoResult: { background: 'rgba(100,150,255,0.08)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '10px', padding: '14px', marginBottom: '16px' },
  autoResultText: { color: '#a0b4ff', fontSize: '13px', margin: 0, lineHeight: '1.6' },
  conflictBox: { background: 'rgba(255,150,0,0.1)', border: '1px solid rgba(255,150,0,0.3)', borderRadius: '10px', padding: '16px', marginBottom: '16px' },
  conflictTitle: { color: '#ffaa00', fontWeight: 'bold', margin: '0 0 8px 0', fontSize: '14px' },
  conflictItem: { color: 'rgba(255,200,100,0.9)', fontSize: '13px', margin: '4px 0' },
  aiBox: { marginTop: '16px', borderTop: '1px solid rgba(255,150,0,0.2)', paddingTop: '16px' },
  aiTitle: { color: 'var(--gold)', fontWeight: 'bold', margin: '0 0 8px 0', fontSize: '14px' },
  aiLoading: { color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontStyle: 'italic' },
  aiText: { color: 'rgba(255,255,255,0.85)', fontSize: '13px', lineHeight: '1.8', whiteSpace: 'pre-wrap' },
  error: { color: '#ff6b6b', fontSize: '13px', marginBottom: '12px' },
  saveBtn: { background: 'linear-gradient(135deg, #f7971e, #ffd200)', border: 'none', borderRadius: '8px', padding: '10px 24px', color: '#1a1a1a', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' },
  deptFilter: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  deptLabel: { color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
  deptScroll: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  deptBtn: { padding: '5px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' },
  deptBtnActive: { background: 'var(--gold-pale)', color: 'var(--gold)', borderColor: 'var(--gold-border)', fontWeight: '600' },
  dayTabs: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  dayTab: { padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '14px' },
  dayTabActive: { background: 'var(--gold-pale)', color: 'var(--gold)', borderColor: 'var(--gold-border)', fontWeight: 'bold' },
  muted: { color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', marginTop: '40px' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' },
  slotEmpty: { background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px', padding: '16px', minHeight: '100px' },
  slotFilled: { background: 'var(--gold-pale)', border: '1px solid var(--gold-border)', borderRadius: '10px', padding: '16px' },
  slotTime: { color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: '0 0 8px 0' },
  slotStatusBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  slotCourse: { color: 'var(--gold)', fontWeight: 'bold', fontSize: '14px', margin: 0 },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  slotName: { color: '#ffffff', fontSize: '12px', margin: '0 0 8px 0' },
  slotInfo: { color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: '2px 0' },
  slotFree: { color: 'rgba(255,255,255,0.2)', fontSize: '12px', fontStyle: 'italic', marginTop: '8px' },
  removeBtn: { marginTop: '8px', background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.2)', color: '#ff6b6b', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' },
}