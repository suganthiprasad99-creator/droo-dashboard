import type { ReactNode } from 'react'

export type DataTableColumn<T> = {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  className?: string
}

export function DataTable<T>({ rows, columns, rowKey, className = '', emptyMessage = 'No records found.' }: { rows: T[]; columns: DataTableColumn<T>[]; rowKey: (row: T) => string; className?: string; emptyMessage?: string }) {
  return <div className={`reusable-table-wrap ${className}`.trim()}><table className="reusable-table"><thead><tr>{columns.map(column => <th className={column.className} key={column.key}>{column.header}</th>)}</tr></thead><tbody>{rows.length ? rows.map(row => <tr key={rowKey(row)}>{columns.map(column => <td className={column.className} key={column.key}>{column.render(row)}</td>)}</tr>) : <tr><td className="reusable-table-empty" colSpan={columns.length}>{emptyMessage}</td></tr>}</tbody></table></div>
}
