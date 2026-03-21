import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchNotifications()
    // Realtime subscription
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, () => fetchNotifications())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [userId])

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
  }

  const markAllRead = async () => {
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
    fetchNotifications()
  }

  const unread = notifications.filter(n => !n.is_read).length

  const formatTime = (ts) => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={styles.wrapper}>
      <button style={styles.bell} onClick={() => setOpen(!open)}>
        🔔
        {unread > 0 && <span style={styles.badge}>{unread}</span>}
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.dropHeader}>
            <span style={styles.dropTitle}>Notifications</span>
            {unread > 0 && (
              <button style={styles.markRead} onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p style={styles.empty}>No notifications yet</p>
          ) : (
            <div style={styles.list}>
              {notifications.map(n => (
                <div key={n.id} style={{ ...styles.item, ...(n.is_read ? {} : styles.itemUnread) }}>
                  <p style={styles.itemMsg}>{n.message}</p>
                  <p style={styles.itemTime}>{formatTime(n.created_at)}</p>
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
  wrapper: { position: 'relative' },
  bell: {
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', padding: '8px 12px', cursor: 'pointer',
    fontSize: '18px', position: 'relative',
  },
  badge: {
    position: 'absolute', top: '-6px', right: '-6px',
    background: '#ff4444', color: '#fff', borderRadius: '10px',
    padding: '1px 6px', fontSize: '10px', fontWeight: 'bold',
  },
  dropdown: {
    position: 'absolute', right: 0, top: '48px',
    width: '340px', background: '#1a2f3a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    zIndex: 1000, overflow: 'hidden',
  },
  dropHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  dropTitle: { color: '#ffffff', fontWeight: 'bold', fontSize: '14px' },
  markRead: {
    background: 'none', border: 'none', color: '#ffd200',
    cursor: 'pointer', fontSize: '12px',
  },
  empty: { color: 'rgba(255,255,255,0.3)', fontSize: '13px', textAlign: 'center', padding: '24px' },
  list: { maxHeight: '360px', overflowY: 'auto' },
  item: {
    padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  itemUnread: { background: 'rgba(255,210,0,0.05)', borderLeft: '3px solid #ffd200' },
  itemMsg: { color: 'rgba(255,255,255,0.85)', fontSize: '13px', margin: '0 0 4px 0', lineHeight: '1.5' },
  itemTime: { color: 'rgba(255,255,255,0.3)', fontSize: '11px', margin: 0 },
}