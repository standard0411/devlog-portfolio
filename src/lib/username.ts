import type { SupabaseClient } from '@supabase/supabase-js'

export const RESERVED = [
  'admin', 'api', 'login', 'signup', 'logout',
  'settings', 'u', 'health', 'portfolio', 'logs', 'projects', 'skills',
]

export function deriveBase(email: string): string {
  const local = email.split('@')[0]
  const slug = local
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const trimmed = (slug || 'user').slice(0, 28)
  const clean = trimmed.replace(/^-|-$/g, '') || 'user'
  return RESERVED.includes(clean) ? `${clean}-dev` : clean
}

export async function generateUniqueUsername(
  email: string,
  supabase: SupabaseClient,
): Promise<string> {
  const base = deriveBase(email)
  let candidate = base
  let suffix = 2
  for (;;) {
    const { data } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('username', candidate)
      .maybeSingle()
    if (!data) return candidate
    candidate = `${base}${suffix++}`
  }
}
