import { createClient } from '@/lib/supabase-server'
import PayrollApp from '@/components/payroll-app'
import { redirect } from 'next/navigation'
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // login wall removed
  const { data: workers } = await supabase.from('workers').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
  const { data: payWeeks } = await supabase.from('pay_weeks').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
  const weekIds = (payWeeks || []).map((w) => w.id)
  const { data: workEntries } = weekIds.length ? await supabase.from('work_entries').select('*').in('pay_week_id', weekIds) : { data: [] as any[] }
  const { data: adjustments } = weekIds.length ? await supabase.from('adjustments').select('*').in('pay_week_id', weekIds) : { data: [] as any[] }
  return <PayrollApp userId={user.id} initialWorkers={workers || []} initialWeeks={payWeeks || []} initialEntries={workEntries || []} initialAdjustments={adjustments || []} />
}
