import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { sendNotification } from '../../utils/notify'

export default function LecturerSwapMarket({ profile }) {
  const [myEntries, setMyEntries] = useState([])
  const [otherLecturers, setOtherLecturers] = useState([])
  const [selectedMyEntry, setSelectedMyEntry] = useState(null)
  const [selectedLecturer, setSelectedLecturer] = useState(null)
  const [theirEntries, setTheirEntries] = useState([])
  const [selectedTheirEntry, setSelectedTheirEntry] = useState(null)
  const [swapRoom, setSwapRoom] = useState(true)
  const [pendingRequests, setPendingRequests] = useState([])
  const [incomingRequests, setIncomingRequests] = useState([])
  const [subRequests, setSubRequests] = useState([])
  const [openSubRequests, setOpenSubRequests] = useState([])
  const [showSubForm, setShowSubForm] = useState(false)
  const [subEntry, setSubEntry] = useState('')
  const [subReason, setSubReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState('propose')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [myE, lecturers, pending, incoming, mySubs, openSubs] = await Promise.all([
      supabase.from('timetable_entries').select(`
        *, course:courses(*), room:rooms(*), time_slot:time_slots(*)
      `).eq('lecturer_id', profile.id),
      supabase.from('profiles').select('*').eq('role', 'lecturer').neq('id', profile.id),
      supabase.from('swap_requests').select(`
        *,
        requester:profiles!swap_requests_requester_id_fkey(*),
        target:profiles!swap_requests_target_id_fkey(*),
        requester_entry:timetable_entries!swap_requests_requester_entry_id_fkey(*, course:courses(*), time_slot:time_slots(*), room:rooms(*)),
        target_entry:timetable_entries!swap_requests_target_entry_id_fkey(*, course:courses(*), time_slot:time_slots(*), room:rooms(*))
      `).eq('requester_id', profile.id).eq('status', 'pending'),
      supabase.from('swap_requests').select(`
        *,
        requester:profiles!swap_requests_requester_id_fkey(*),
        target:profiles!swap_requests_target_id_fkey(*),
        requester_entry:timetable_entries!swap_requests_requester_entry_id_fkey(*, course:courses(*), time_slot:time_slots(*), room:rooms(*)),
        target_entry:timetable_entries!swap_requests_target_entry_id_fkey(*, course:courses(*), time_slot:time_slots(*), room:rooms(*))
      `).eq('target_id', profile.id).eq('status', 'pending'),
      supabase.from('substitute_requests').select(`
        *, entry:timetable_entries(*, course:courses(*), time_slot:time_slots(*), room:rooms(*)),
        substitute:profiles!substitute_requests_substitute_id_fkey(*)
      `).eq('requester_id', profile.id),
      supabase.from('substitute_requests').select(`
        *,
        requester:profiles!substitute_requests_requester_id_fkey(*),
        entry:timetable_entries(*, course:courses(*), time_slot:time_slots(*), room:rooms(*))
      `).eq('status', 'open').neq('requester_id', profile.id)
    ])
    setMyEntries(myE.data || [])
    setOtherLecturers(lecturers.data || [])
    setPendingRequests(pending.data || [])
    setIncomingRequests(incoming.data || [])
    setSubRequests(mySubs.data || [])
    setOpenSubRequests(openSubs.data || [])
    setLoading(false)
  }

  const fetchTheirEntries = async (lecturerId) => {
    const { data } = await supabase
      .from('timetable_entries')
      .select(`*, course:courses(*), room:rooms(*), time_slot:time_slots(*)`)
      .eq('lecturer_id', lecturerId)
    setTheirEntries(data || [])
  }

  const handleLecturerSelect = (lecturer) => {
    setSelectedLecturer(lecturer)
    setSelectedTheirEntry(null)
    fetchTheirEntries(lecturer.id)
  }

  const handlePropose = async () => {
    if (!selectedMyEntry || !selectedTheirEntry) return
    setSending(true)
    const { error } = await supabase.from('swap_requests').insert({
      requester_id: profile.id,
      requester_entry_id: selectedMyEntry.id,
      target_id: selectedLecturer.id,
      target_entry_id: selectedTheirEntry.id,
      swap_room: swapRoom,
    })
    if (!error) {
      await sendNotification(
        selectedLecturer.id,
        `🔄 Swap request from ${profile.name}: They want to swap time slots — their ${selectedMyEntry.course?.code} (${selectedMyEntry.time_slot?.day} ${selectedMyEntry.time_slot?.start_time}) ↔ your ${selectedTheirEntry.course?.code} (${selectedTheirEntry.time_slot?.day} ${selectedTheirEntry.time_slot?.start_time}). ${swapRoom ? 'Rooms will also swap.' : 'Each lecturer keeps their own room.'}`
      )
      setSelectedMyEntry(null)
      setSelectedLecturer(null)
      setSelectedTheirEntry(null)
      setTheirEntries([])
      setSwapRoom(true)
      fetchAll()
      setActiveTab('pending')
    }
    setSending(false)
  }

  const handleRespond = async (request, action) => {
    if (action === 'accepted') {
      const mySlot = request.requester_entry?.time_slot_id
      const myRoom = request.requester_entry?.room_id
      const theirSlot = request.target_entry?.time_slot_id
      const theirRoom = request.target_entry?.room_id

      await supabase.from('timetable_entries')
        .update({
          time_slot_id: theirSlot,
          ...(request.swap_room ? { room_id: theirRoom } : {})
        })
        .eq('id', request.requester_entry_id)

      await supabase.from('timetable_entries')
        .update({
          time_slot_id: mySlot,
          ...(request.swap_room ? { room_id: myRoom } : {})
        })
        .eq('id', request.target_entry_id)

      await sendNotification(request.requester_id,
        `✅ Swap accepted! Your ${request.requester_entry?.course?.code} now moves to ${request.target_entry?.time_slot?.day} ${request.target_entry?.time_slot?.start_time}${request.swap_room ? ` in ${request.target_entry?.room?.name}` : ''}.`)
      await sendNotification(request.target_id,
        `✅ Swap completed! Your ${request.target_entry?.course?.code} now moves to ${request.requester_entry?.time_slot?.day} ${request.requester_entry?.time_slot?.start_time}${request.swap_room ? ` in ${request.requester_entry?.room?.name}` : ''}.`)

      const [studentsA, studentsB] = await Promise.all([
        supabase.from('student_courses').select('student_id').eq('course_id', request.requester_entry?.course_id),
        supabase.from('student_courses').select('student_id').eq('course_id', request.target_entry?.course_id),
      ])
      for (const s of studentsA.data || []) {
        await sendNotification(s.student_id, `🔄 Timetable Update: ${request.requester_entry?.course?.code} has moved to ${request.target_entry?.time_slot?.day} ${request.target_entry?.time_slot?.start_time}.`)
      }
      for (const s of studentsB.data || []) {
        await sendNotification(s.student_id, `🔄 Timetable Update: ${request.target_entry?.course?.code} has moved to ${request.requester_entry?.time_slot?.day} ${request.requester_entry?.time_slot?.start_time}.`)
      }
    } else {
      await sendNotification(request.requester_id,
        `❌ Swap declined: ${request.target?.name} declined your swap request.`)
    }
    await supabase.from('swap_requests').update({ status: action }).eq('id', request.id)
    fetchAll()
  }

  const handlePostSubRequest = async () => {
    if (!subEntry) return
    setSending(true)
    const { error } = await supabase.from('substitute_requests').insert({
      requester_id: profile.id,
      entry_id: subEntry,
      reason: subReason,
    })
    if (!error) {
      for (const l of otherLecturers) {
        await sendNotification(l.id,
          `🙋 Substitute Needed: ${profile.name} is looking for a substitute. Check the Swap Market to volunteer.`)
      }
      setSubEntry('')
      setSubReason('')
      setShowSubForm(false)
      fetchAll()
      setActiveTab('substitute')
    }
    setSending(false)
  }

  const handleVolunteer = async (request) => {
    setSending(true)
    await supabase.from('substitute_requests')
      .update({ substitute_id: profile.id, status: 'filled' })
      .eq('id', request.id)
    await supabase.from('timetable_entries')
      .update({ substitute_id: profile.id })
      .eq('id', request.entry_id)
    await sendNotification(request.requester_id,
      `✅ Substitute found! ${profile.name} will cover your ${request.entry?.course?.code} on ${request.entry?.time_slot?.day} at ${request.entry?.time_slot?.start_time}.`)
    const { data: students } = await supabase
      .from('student_courses').select('student_id').eq('course_id', request.entry?.course?.id)
    for (const s of students || []) {
      await sendNotification(s.student_id,
        `👨‍🏫 Substitute Notice: ${profile.name} will be substituting for ${request.requester?.name} in ${request.entry?.course?.code} on ${request.entry?.time_slot?.day} at ${request.entry?.time_slot?.start_time}.`)
    }
    setSending(false)
    fetchAll()
  }

  const formatTime = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
  }

  if (loading) return <p style={styles.muted}>Loading...</p>

  return (
    <div>
      <div style={styles.tabs}>
        {[
          { id: 'propose', label: '🔄 Propose Swap' },
          { id: 'pending', label: `📤 Sent (${pendingRequests.length})` },
          { id: 'incoming', label: `📥 Incoming (${incomingRequests.length})` },
          { id: 'substitute', label: `🙋 Substitutes (${openSubRequests.length})` },
        ].map(t => (
          <button
            key={t.id}
            style={{ ...styles.tab, ...(activeTab === t.id ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Propose Swap */}
      {activeTab === 'propose' && (
        <div>
          <p style={styles.sectionDesc}>
            Select one of your classes and a colleague's class to propose a time slot swap.
            <strong style={{ color: 'var(--gold)' }}> Each lecturer keeps their own course.</strong>
          </p>

          <div style={styles.swapGrid}>
            <div style={styles.swapCol}>
              <p style={styles.colTitle}>📅 Your Class</p>
              {myEntries.length === 0 ? (
                <p style={styles.muted}>No classes scheduled yet</p>
              ) : (
                <div style={styles.entryList}>
                  {myEntries.map(entry => (
                    <div
                      key={entry.id}
                      style={{ ...styles.entryCard, ...(selectedMyEntry?.id === entry.id ? styles.entryCardSelected : {}) }}
                      onClick={() => setSelectedMyEntry(entry)}
                    >
                      <p style={styles.entryCode}>{entry.course?.code}</p>
                      <p style={styles.entryName}>{entry.course?.name}</p>
                      <p style={styles.entryTime}>{entry.time_slot?.day} • {formatTime(entry.time_slot?.start_time)}</p>
                      <p style={styles.entryRoom}>🏛️ {entry.room?.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.swapArrow}>⇄</div>

            <div style={styles.swapCol}>
              <p style={styles.colTitle}>👨‍🏫 Colleague's Class</p>
              <select
                style={styles.select}
                value={selectedLecturer?.id || ''}
                onChange={e => {
                  const l = otherLecturers.find(l => l.id === e.target.value)
                  if (l) handleLecturerSelect(l)
                }}
              >
                <option value="">Choose a lecturer...</option>
                {otherLecturers.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              {selectedLecturer && (
                <div style={{ marginTop: '12px' }}>
                  {theirEntries.length === 0 ? (
                    <p style={styles.muted}>{selectedLecturer.name} has no scheduled classes</p>
                  ) : (
                    <div style={styles.entryList}>
                      {theirEntries.map(entry => (
                        <div
                          key={entry.id}
                          style={{ ...styles.entryCard, ...(selectedTheirEntry?.id === entry.id ? styles.entryCardSelected : {}) }}
                          onClick={() => setSelectedTheirEntry(entry)}
                        >
                          <p style={styles.entryCode}>{entry.course?.code}</p>
                          <p style={styles.entryName}>{entry.course?.name}</p>
                          <p style={styles.entryTime}>{entry.time_slot?.day} • {formatTime(entry.time_slot?.start_time)}</p>
                          <p style={styles.entryRoom}>🏛️ {entry.room?.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {selectedMyEntry && selectedTheirEntry && (
            <div style={styles.proposeBar}>
              <div style={styles.proposeSummary}>
                <div style={styles.proposeChip}>
                  <p style={styles.proposeChipCode}>{selectedMyEntry.course?.code}</p>
                  <p style={styles.proposeChipTime}>
                    moves to → {selectedTheirEntry.time_slot?.day} {formatTime(selectedTheirEntry.time_slot?.start_time)}
                    {swapRoom ? ` • ${selectedTheirEntry.room?.name}` : ` • ${selectedMyEntry.room?.name} (kept)`}
                  </p>
                </div>
                <span style={styles.proposeArrow}>⇄</span>
                <div style={styles.proposeChip}>
                  <p style={styles.proposeChipCode}>{selectedTheirEntry.course?.code}</p>
                  <p style={styles.proposeChipTime}>
                    moves to → {selectedMyEntry.time_slot?.day} {formatTime(selectedMyEntry.time_slot?.start_time)}
                    {swapRoom ? ` • ${selectedMyEntry.room?.name}` : ` • ${selectedTheirEntry.room?.name} (kept)`}
                  </p>
                </div>
              </div>
              <div style={styles.proposeRight}>
                <label style={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={swapRoom}
                    onChange={e => setSwapRoom(e.target.checked)}
                    style={{ marginRight: '8px', accentColor: 'var(--gold)' }}
                  />
                  Also swap rooms
                </label>
                <button style={styles.proposeBtn} onClick={handlePropose} disabled={sending}>
                  {sending ? 'Sending...' : '🔄 Send Swap Request'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sent Requests */}
      {activeTab === 'pending' && (
        <div>
          {pendingRequests.length === 0 ? (
            <div style={styles.empty}>
              <p style={styles.emptyIcon}>📤</p>
              <p style={styles.emptyText}>No pending swap requests sent</p>
            </div>
          ) : (
            <div style={styles.requestList}>
              {pendingRequests.map(req => (
                <div key={req.id} style={styles.requestCard}>
                  <div style={styles.requestHeader}>
                    <span style={styles.pendingBadge}>Awaiting Response</span>
                    <span style={styles.requestDate}>{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={styles.requestSwap}>
                    <div style={styles.requestEntry}>
                      <p style={styles.requestLabel}>Your course — time changes to</p>
                      <p style={styles.requestCode}>{req.requester_entry?.course?.code}</p>
                      <p style={styles.requestTime}>→ {req.target_entry?.time_slot?.day} • {formatTime(req.target_entry?.time_slot?.start_time)}</p>
                      {req.swap_room && <p style={styles.requestTime}>→ {req.target_entry?.room?.name}</p>}
                    </div>
                    <span style={styles.requestArrow}>⇄</span>
                    <div style={styles.requestEntry}>
                      <p style={styles.requestLabel}>{req.target?.name}'s course — time changes to</p>
                      <p style={styles.requestCode}>{req.target_entry?.course?.code}</p>
                      <p style={styles.requestTime}>→ {req.requester_entry?.time_slot?.day} • {formatTime(req.requester_entry?.time_slot?.start_time)}</p>
                      {req.swap_room && <p style={styles.requestTime}>→ {req.requester_entry?.room?.name}</p>}
                    </div>
                  </div>
                  {!req.swap_room && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>Rooms are not swapping</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Incoming Requests */}
      {activeTab === 'incoming' && (
        <div>
          {incomingRequests.length === 0 ? (
            <div style={styles.empty}>
              <p style={styles.emptyIcon}>📥</p>
              <p style={styles.emptyText}>No incoming swap requests</p>
            </div>
          ) : (
            <div style={styles.requestList}>
              {incomingRequests.map(req => (
                <div key={req.id} style={styles.requestCard}>
                  <div style={styles.requestHeader}>
                    <span style={styles.incomingBadge}>From {req.requester?.name}</span>
                    <span style={styles.requestDate}>{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={styles.requestSwap}>
                    <div style={styles.requestEntry}>
                      <p style={styles.requestLabel}>Their course moves to your slot</p>
                      <p style={styles.requestCode}>{req.requester_entry?.course?.code}</p>
                      <p style={styles.requestTime}>→ {req.target_entry?.time_slot?.day} • {formatTime(req.target_entry?.time_slot?.start_time)}</p>
                      {req.swap_room && <p style={styles.requestTime}>→ {req.target_entry?.room?.name}</p>}
                    </div>
                    <span style={styles.requestArrow}>⇄</span>
                    <div style={styles.requestEntry}>
                      <p style={styles.requestLabel}>Your course moves to their slot</p>
                      <p style={styles.requestCode}>{req.target_entry?.course?.code}</p>
                      <p style={styles.requestTime}>→ {req.requester_entry?.time_slot?.day} • {formatTime(req.requester_entry?.time_slot?.start_time)}</p>
                      {req.swap_room && <p style={styles.requestTime}>→ {req.requester_entry?.room?.name}</p>}
                    </div>
                  </div>
                  {!req.swap_room && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginBottom: '12px' }}>Rooms are not swapping</p>}
                  <div style={styles.requestActions}>
                    <button style={styles.acceptBtn} onClick={() => handleRespond(req, 'accepted')}>✓ Accept Swap</button>
                    <button style={styles.declineBtn} onClick={() => handleRespond(req, 'declined')}>✕ Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Substitute Tab */}
      {activeTab === 'substitute' && (
        <div>
          <div style={styles.subHeader}>
            <div>
              <p style={styles.subTitle}>Can't make a class? Request a substitute</p>
              <p style={styles.subDesc}>Post your class and other lecturers can volunteer to cover it. Students will be notified automatically.</p>
            </div>
            <button style={styles.proposeBtn} onClick={() => setShowSubForm(!showSubForm)}>
              {showSubForm ? '✕ Cancel' : '+ Request Substitute'}
            </button>
          </div>

          {showSubForm && (
            <div style={styles.subForm}>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Select your class that needs a substitute</label>
                <select style={styles.select} value={subEntry} onChange={e => setSubEntry(e.target.value)}>
                  <option value="">Choose a class...</option>
                  {myEntries.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.course?.code} — {e.time_slot?.day} {formatTime(e.time_slot?.start_time)} ({e.room?.name})
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Reason (optional)</label>
                <input
                  style={styles.input}
                  placeholder="e.g. Medical appointment, Conference..."
                  value={subReason}
                  onChange={e => setSubReason(e.target.value)}
                />
              </div>
              <button style={styles.proposeBtn} onClick={handlePostSubRequest} disabled={sending || !subEntry}>
                {sending ? 'Posting...' : 'Post Request'}
              </button>
            </div>
          )}

          {subRequests.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <p style={styles.colTitle}>Your Substitute Requests</p>
              <div style={styles.requestList}>
                {subRequests.map(req => (
                  <div key={req.id} style={styles.requestCard}>
                    <div style={styles.requestHeader}>
                      <span style={{
                        ...styles.pendingBadge,
                        background: req.status === 'filled' ? 'rgba(82,196,122,0.15)' : 'rgba(255,200,0,0.1)',
                        color: req.status === 'filled' ? '#52c47a' : '#ffd200',
                        borderColor: req.status === 'filled' ? 'rgba(82,196,122,0.3)' : 'rgba(255,200,0,0.2)',
                      }}>
                        {req.status === 'filled' ? '✅ Substitute Found' : '⏳ Looking for Substitute'}
                      </span>
                    </div>
                    <p style={styles.requestCode}>{req.entry?.course?.code} — {req.entry?.time_slot?.day} {formatTime(req.entry?.time_slot?.start_time)}</p>
                    {req.reason && <p style={styles.requestTime}>Reason: {req.reason}</p>}
                    {req.substitute && <p style={{ color: '#52c47a', fontSize: '13px', marginTop: '8px' }}>✅ Substitute: {req.substitute?.name}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p style={styles.colTitle}>Open Requests from Colleagues</p>
          {openSubRequests.length === 0 ? (
            <div style={styles.empty}>
              <p style={styles.emptyIcon}>🙋</p>
              <p style={styles.emptyText}>No open substitute requests right now</p>
            </div>
          ) : (
            <div style={styles.requestList}>
              {openSubRequests.map(req => (
                <div key={req.id} style={styles.requestCard}>
                  <div style={styles.requestHeader}>
                    <span style={styles.incomingBadge}>From {req.requester?.name}</span>
                    <span style={styles.requestDate}>{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                  <p style={styles.requestCode}>{req.entry?.course?.code} — {req.entry?.course?.name}</p>
                  <p style={styles.requestTime}>{req.entry?.time_slot?.day} • {formatTime(req.entry?.time_slot?.start_time)} • {req.entry?.room?.name}</p>
                  {req.reason && <p style={{ ...styles.requestTime, marginTop: '4px', fontStyle: 'italic' }}>"{req.reason}"</p>}
                  <div style={{ marginTop: '12px' }}>
                    <button style={styles.acceptBtn} onClick={() => handleVolunteer(req)} disabled={sending}>
                      🙋 Volunteer to Substitute
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  muted: { color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', marginTop: '40px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' },
  tab: { padding: '9px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  tabActive: { background: 'var(--gold-pale)', color: 'var(--gold)', borderColor: 'var(--gold-border)', fontWeight: '600' },
  sectionDesc: { color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '24px', lineHeight: '1.6' },
  swapGrid: { display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: '16px', alignItems: 'start', marginBottom: '24px' },
  swapCol: {},
  swapArrow: { color: 'var(--gold)', fontSize: '24px', textAlign: 'center', paddingTop: '40px' },
  colTitle: { color: 'var(--gold)', fontSize: '13px', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  select: { width: '100%', padding: '10px 14px', background: '#1e3a4a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', marginBottom: '8px' },
  entryList: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' },
  entryCard: { padding: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s' },
  entryCardSelected: { background: 'var(--gold-pale)', border: '1px solid var(--gold-border)' },
  entryCode: { color: 'var(--gold)', fontWeight: '700', fontSize: '14px', margin: '0 0 2px 0' },
  entryName: { color: '#fff', fontSize: '12px', margin: '0 0 6px 0' },
  entryTime: { color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: '0 0 2px 0' },
  entryRoom: { color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: 0 },
  proposeBar: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  proposeSummary: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 },
  proposeChip: { background: 'var(--gold-pale)', border: '1px solid var(--gold-border)', padding: '8px 14px', borderRadius: '10px', flex: 1 },
  proposeChipCode: { color: 'var(--gold)', fontWeight: '700', fontSize: '13px', margin: '0 0 4px 0' },
  proposeChipTime: { color: 'rgba(255,255,255,0.6)', fontSize: '11px', margin: 0 },
  proposeArrow: { color: 'var(--gold)', fontSize: '18px' },
  proposeRight: { display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' },
  toggleLabel: { color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  proposeBtn: { background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', border: 'none', borderRadius: '8px', padding: '10px 20px', color: '#1a1200', fontWeight: '700', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' },
  empty: { textAlign: 'center', marginTop: '60px' },
  emptyIcon: { fontSize: '40px', margin: '0 0 12px 0' },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: '14px' },
  requestList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  requestCard: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' },
  requestHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  pendingBadge: { background: 'rgba(255,200,0,0.1)', border: '1px solid rgba(255,200,0,0.2)', color: '#ffd200', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  incomingBadge: { background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)', color: '#a0b4ff', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  requestDate: { color: 'rgba(255,255,255,0.3)', fontSize: '11px' },
  requestSwap: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' },
  requestEntry: { flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px' },
  requestLabel: { color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px 0' },
  requestCode: { color: 'var(--gold)', fontWeight: '700', fontSize: '15px', margin: '0 0 4px 0' },
  requestTime: { color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: 0 },
  requestArrow: { color: 'var(--gold)', fontSize: '20px' },
  requestActions: { display: 'flex', gap: '10px' },
  acceptBtn: { flex: 1, padding: '10px', background: 'rgba(82,196,122,0.15)', border: '1px solid rgba(82,196,122,0.3)', borderRadius: '8px', color: '#52c47a', fontWeight: '600', cursor: 'pointer', fontSize: '13px' },
  declineBtn: { flex: 1, padding: '10px', background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.2)', borderRadius: '8px', color: '#e05252', fontWeight: '600', cursor: 'pointer', fontSize: '13px' },
  subHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px' },
  subTitle: { color: '#fff', fontSize: '15px', fontWeight: '600', margin: '0 0 6px 0' },
  subDesc: { color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 },
  subForm: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  fieldLabel: { color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '10px 14px', background: '#1e3a4a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' },
}