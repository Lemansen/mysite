import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Если ключей нет, сайт работает в локальном режиме (данные в браузере)
export const supabase = url && key ? createClient(new URL(url).origin, key) : null;
