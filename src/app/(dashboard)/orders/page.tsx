import { LiveOperationsPage } from '@/features/live-operations/live-operations-page'

export default async function Page({ searchParams }: { searchParams: Promise<{ layout?: string }> }) {
  const { layout } = await searchParams
  const initialView = layout === 'table' ? 'table' : layout === 'kanban' || layout === 'board' ? 'board' : 'map'
  return <LiveOperationsPage initialView={initialView} />
}
