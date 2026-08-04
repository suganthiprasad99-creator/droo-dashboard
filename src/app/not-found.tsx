import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function NotFound() {
  return <main><section className="panel unavailable"><AlertCircle /><h1>Page not found</h1><p>The requested Droo Operations page does not exist.</p><Link className="primary" href="/overview">Return to overview</Link></section></main>
}
