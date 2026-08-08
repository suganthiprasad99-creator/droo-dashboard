'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { ModuleConfig } from '@/types/dashboard'
import { ComposeDialog } from '@/components/ui/compose-dialog'

export function PageHeader({ config, onCreated }: { config: ModuleConfig; onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  return <><div className="page-title"><div><h1>{config.name}</h1><p>{config.description}</p></div>{config.actionLabel && <button className="primary" onClick={() => setOpen(true)}><Plus />{config.actionLabel}</button>}</div>{open && <ComposeDialog module={config.name} label={config.actionLabel || 'Create'} onClose={() => setOpen(false)} onCreated={onCreated} />}</>
}
