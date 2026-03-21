import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export default function ManageRooms() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', building: '', capacity: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { fetchRooms() }, [])

  const fetchRooms = async () => {
    setLoading(true)
    const { data } = await supabase.from('rooms').select('*').order('name')
    setRooms(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.name || !form.building || !form.capacity) {
      setError('All fields are required')
      return
    }
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('rooms').insert({
      name: form.name,
      building: form.building,
      capacity: parseInt(form.capacity)
    })
    if (error) setError(error.message)
    else {
      setForm({ name: '', building: '', capacity: '' })
      setShowForm(false)
      fetchRooms()
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this room?')) return
    await supabase.from('rooms').delete().eq('id', id)
    fetchRooms()
  }

  return (
    <div>
      <div style={styles.topBar}>
        <p style={styles.count}>{rooms.length} room{rooms.length !== 1 ? 's' : ''} total</p>
        <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Room'}
        </button>
      </div>

      {showForm && (
        <div style={styles.form}>
          <h3 style={styles.formTitle}>New Room</h3>
          <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>Room Name</label>
              <input style={styles.input} placeholder="e.g. LT1"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Building</label>
              <input style={styles.input} placeholder="e.g. Science Block"
                value={form.building} onChange={e => setForm({ ...form, building: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Capacity</label>
              <input style={styles.input} type="number" placeholder="e.g. 200"
                value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
            </div>
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Room'}
          </button>
        </div>
      )}

      {loading ? (
        <p style={styles.muted}>Loading rooms...</p>
      ) : rooms.length === 0 ? (
        <p style={styles.muted}>No rooms yet. Add your first room above.</p>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <span>Room Name</span>
            <span>Building</span>
            <span>Capacity</span>
            <span></span>
          </div>
          {rooms.map(room => (
            <div key={room.id} style={styles.tableRow}>
              <span style={styles.roomName}>{room.name}</span>
              <span style={styles.building}>{room.building}</span>
              <span style={styles.capacity}>{room.capacity} seats</span>
              <button style={styles.deleteBtn} onClick={() => handleDelete(room.id)}>Delete</button>
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
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' },
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
  table: {
    background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
    overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)',
  },
  tableHeader: {
    display: 'grid', gridTemplateColumns: '1fr 1fr 120px 80px',
    padding: '12px 20px', background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.4)', fontSize: '12px', letterSpacing: '0.5px',
    textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  tableRow: {
    display: 'grid', gridTemplateColumns: '1fr 1fr 120px 80px',
    padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  roomName: { color: '#ffd200', fontWeight: 'bold', fontSize: '14px' },
  building: { color: 'rgba(255,255,255,0.6)', fontSize: '13px' },
  capacity: { color: 'rgba(255,255,255,0.6)', fontSize: '13px' },
  deleteBtn: {
    background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.2)',
    color: '#ff6b6b', padding: '6px 12px', borderRadius: '6px',
    cursor: 'pointer', fontSize: '12px',
  },
}