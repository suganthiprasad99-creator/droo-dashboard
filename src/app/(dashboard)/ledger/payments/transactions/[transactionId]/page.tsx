import { TransactionsPage } from '@/features/ledger/transactions-page'

export default async function TransactionDetailsPage({ params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params
  return <TransactionsPage selectedId={transactionId} />
}
