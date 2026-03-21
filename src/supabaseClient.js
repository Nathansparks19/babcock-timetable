import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://whzvigygilyjvlqqkzkj.supabase.co'
const supabaseAnonKey = 'sb_publishable_GMjloFDIWzMq0t6RTCmPvg_I8GyLoBo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)