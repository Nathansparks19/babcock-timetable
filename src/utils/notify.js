import { supabase } from '../supabaseClient'

export const sendNotification = async (userId, message) => {
  await supabase.from('notifications').insert({ user_id: userId, message })
}

export const notifyTimetableChange = async (entry, action) => {
  const messages = {
    created: `New class scheduled: ${entry.course?.code} - ${entry.course?.name} on ${entry.time_slot?.day} at ${entry.time_slot?.start_time} in ${entry.room?.name}`,
    deleted: `Class cancelled: ${entry.course?.code} - ${entry.course?.name} on ${entry.time_slot?.day} at ${entry.time_slot?.start_time}`,
  }
  const message = messages[action]

  // Notify lecturer
  if (entry.lecturer_id) {
    await sendNotification(entry.lecturer_id, message)
  }

  // Notify registered students
  const { data: students } = await supabase
    .from('student_courses')
    .select('student_id')
    .eq('course_id', entry.course_id)

  if (students) {
    for (const s of students) {
      await sendNotification(s.student_id, message)
    }
  }
}