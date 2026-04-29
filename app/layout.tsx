import './globals.css'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: '1 Stop Payroll Pro', description: 'Payroll and crew tracking for 1 Stop Turnover Specialist LLC' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
