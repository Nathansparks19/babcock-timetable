import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { notifyTimetableChange } from '../../utils/notify'
import { sendNotification } from '../../utils/notify'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default function LecturerSwapMarket({ profile }) {
  const [myEntries, setMyEntries] = useState([])
  const [otherLecturers, setOtherLecturers] = useState([])
  const [selectedMyEntry, setSelectedMyEntry] = useState(null)
  const [selectedLecturer, setSelectedLecturer] = useState(null)
  const [theirEntries, setTheirEntries] = useState([])
  const [selectedTheirEntry, setSelectedTheirEntry] = useState(null)
  const [pendingRequests, setPendingRequests] = useState([])
  const [incomingRequests, setIncomingRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState('propose')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [myE, lecturers, pending, incoming] = await Promise.all([
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
      `).eq('target_id', profile.id).eq('status', 'pending')
    ])
    setMyEntries(myE.data || [])
    setOtherLecturers(lecturers.data || [])
    setPendingRequests(pending.data || [])
    setIncomingRequests(incoming.data || [])
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
    })

    if (!error) {
      await sendNotification(
        selectedLecturer.id,
        `🔄 Swap request from ${profile.name}: They want to swap their ${selectedMyEntry.course?.code} (${selectedMyEntry.time_slot?.day} ${selectedMyEntry.time_slot?.start_time}) with your ${selectedTheirEntry.course?.code} (${selectedTheirEntry.time_slot?.day} ${selectedTheirEntry.time_slot?.start_time}). Check your Swap Market to respond.`
      )
      setSelectedMyEntry(null)
      setSelectedLecturer(null)
      setSelectedTheirEntry(null)
      setTheirEntries([])
      fetchAll()
      setActiveTab('pending')
    }
    setSending(false)
  }

  const handleRespond = async (request, action) => {
    if (action === 'accepted') {
      // Perform the actual swap
      await supabase.from('timetable_entries')
        .update({ lecturer_id: request.target_id })
        .eq('id', request.requester_entry_id)
      await supabase.from('timetable_entries')
        .update({ lecturer_id: request.requester_id })
        .eq('id', request.target_entry_id)

      // Notify both parties
      await sendNotification(request.requester_id,
        `✅ Swap accepted! Your ${request.requester_entry?.course?.code} has been swapped with ${request.requester?.name}'s ${request.target_entry?.course?.code}.`)
      await sendNotification(request.target_id,
        `✅ Swap completed! You are now teaching ${request.requester_entry?.course?.code} on ${request.requester_entry?.time_slot?.day}.`)
    } else {
      await sendNotification(request.requester_id,
        `❌ Swap declined: ${request.target?.name} declined your swap request for ${request.requester_entry?.course?.code}.`)
    }

    await supabase.from('swap_requests').update({ status: action }).eq('id', request.id)
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
      {/* Tabs */}
      <div style={styles.tabs}>
        {[
          { id: 'propose', label: '🔄 Propose Swap' },
          { id: 'pending', label: `📤 Sent (${pendingRequests.length})` },
          { id: 'incoming', label: `📥 Incoming (${incomingRequests.length})` },
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
          <p style={styles.sectionDesc}>Select one of your classes and a colleague's class to propose a swap. The system will notify them instantly.</p>

          <div style={styles.swapGrid}>
            {/* My Classes */}
            <div style={styles.swapCol}>
              <p style={styles.colTitle}>📅 Your Class to Swap</p>
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

            {/* Arrow */}
            <div style={styles.swapArrow}>⇄</div>

            {/* Their Classes */}
            <div style={styles.swapCol}>
              <p style={styles.colTitle}>👨‍🏫 Select Colleague</p>
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
                  <p style={styles.colTitle}>Their Classes</p>
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

          {/* Propose Button */}
          {selectedMyEntry && selectedTheirEntry && (
            <div style={styles.proposeBar}>
              <div style={styles.proposeSummary}>
                <span style={styles.proposeChip}>
                  {selectedMyEntry.course?.code} • {selectedMyEntry.time_slot?.day} {formatTime(selectedMyEntry.time_slot?.start_time)}
                </span>
                <span style={styles.proposeArrow}>⇄</span>
                <span style={styles.proposeChip}>
                  {selectedTheirEntry.course?.code} • {selectedTheirEntry.time_slot?.day} {formatTime(selectedTheirEntry.time_slot?.start_time)}
                </span>
              </div>
              <button style={styles.proposeBtn} onClick={handlePropose} disabled={sending}>
                {sending ? 'Sending...' : '🔄 Send Swap Request'}
              </button>
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
                      <p style={styles.requestLabel}>Your class</p>
                      <p style={styles.requestCode}>{req.requester_entry?.course?.code}</p>
                      <p style={styles.requestTime}>{req.requester_entry?.time_slot?.day} • {formatTime(req.requester_entry?.time_slot?.start_time)}</p>
                    </div>
                    <span style={styles.requestArrow}>⇄</span>
                    <div style={styles.requestEntry}>
                      <p style={styles.requestLabel}>{req.target?.name}'s class</p>
                      <p style={styles.requestCode}>{req.target_entry?.course?.code}</p>
                      <p style={styles.requestTime}>{req.target_entry?.time_slot?.day} • {formatTime(req.target_entry?.time_slot?.start_time)}</p>
                    </div>
                  </div>
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
                    <span style={styles.incomingBadge}>Swap Request from {req.requester?.name}</span>
                    <span style={styles.requestDate}>{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={styles.requestSwap}>
                    <div style={styles.requestEntry}>
                      <p style={styles.requestLabel}>Their class</p>
                      <p style={styles.requestCode}>{req.requester_entry?.course?.code}</p>
                      <p style={styles.requestTime}>{req.requester_entry?.time_slot?.day} • {formatTime(req.requester_entry?.time_slot?.start_time)}</p>
                    </div>
                    <span style={styles.requestArrow}>⇄</span>
                    <div style={styles.requestEntry}>
                      <p style={styles.requestLabel}>Your class</p>
                      <p style={styles.requestCode}>{req.target_entry?.course?.code}</p>
                      <p style={styles.requestTime}>{req.target_entry?.time_slot?.day} • {formatTime(req.target_entry?.time_slot?.start_time)}</p>
                    </div>
                  </div>
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
    </div>
  )
}

const styles = {
  muted: { color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', marginTop: '40px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '28px' },
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
  proposeBar: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' },
  proposeSummary: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  proposeChip: { background: 'var(--gold-pale)', border: '1px solid var(--gold-border)', color: 'var(--gold)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  proposeArrow: { color: 'var(--gold)', fontSize: '18px' },
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
}