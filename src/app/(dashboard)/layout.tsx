import { CollapsibleDashboardLayout } from '@/components/layout/CollapsibleDashboardLayout'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CollapsibleDashboardLayout>{children}</CollapsibleDashboardLayout>
}
