export function StatusBadge({ value }: { value: string }) {
  const good = ['active', 'online', 'approved', 'delivered', 'available'].some(item => value.includes(item))
  const bad = ['failed', 'rejected', 'suspended', 'cancelled'].some(item => value.includes(item))
  return <span className={`badge ${good ? 'good' : bad ? 'bad' : ''}`}><i />{value.replaceAll('_', ' ')}</span>
}
