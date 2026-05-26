import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Log } from '@/types'
import EditLogForm from './EditLogForm'

export default async function EditLogPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('logs')
    .select('*')
    .eq('id', id)
    .single()

  const log = data as Log | null
  if (!log) notFound()

  return <EditLogForm log={log} />
}
