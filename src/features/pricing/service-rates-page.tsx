'use client'

import { FormEvent, useMemo, useState } from 'react'
import { BookOpen, Check, ChevronLeft, ChevronRight, Copy, Download, Eye, Funnel, Gauge, MoreHorizontal, Pencil, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { useApiData } from '@/hooks/use-api-data'
import styles from './service-rates-page.module.css'

type SortKey = 'id' | 'service' | 'serviceArea' | 'zone' | 'currency' | 'basePrice' | 'perKm' | 'minimumCharge' | 'maximumDistance' | 'effectiveDate' | 'riderShare' | 'status' | 'created'
type ServiceRate = { id: string; service: string; serviceArea: string; zone: string; currency: 'INR' | 'USD' | 'EUR' | 'GBP'; basePrice: string; perKm: string; minimumCharge: string; maximumDistance: string; effectiveDate: string; riderShare: string; status: 'active' | 'draft'; created: string }
const serviceRateColumns: [SortKey, string][] = [['id', 'ID'], ['service', 'Service'], ['serviceArea', 'Service Area'], ['zone', 'Zone'], ['currency', 'Currency'], ['basePrice', 'Base price'], ['perKm', 'Per km'], ['minimumCharge', 'Minimum'], ['maximumDistance', 'Max distance'], ['effectiveDate', 'Effective'], ['riderShare', 'Rider share'], ['status', 'Status'], ['created', 'Created']]
const newId = () => `rate_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now()}`
const seededServiceRate: ServiceRate = { id: 'rate_chennai_standard', service: 'Chennai Standard Delivery', serviceArea: 'Chennai Central', zone: 'All zones', currency: 'INR', basePrice: '60', perKm: '14', minimumCharge: '80', maximumDistance: '40', effectiveDate: '2026-08-05', riderShare: '80', status: 'active', created: '2026-08-05T00:00:00Z' }
type RateFilters = { id: string; serviceArea: string; zone: string; created: string; updated: string }
const emptyRateFilters = (): RateFilters => ({ id: '', serviceArea: '', zone: '', created: '', updated: '' })

export function ServiceRatesPage() {
  const { rows, loading, error, refresh } = useApiData('Pricing')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('created')
  const [ascending, setAscending] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [overrides, setOverrides] = useState<Record<string, ServiceRate>>({})
  const [archived, setArchived] = useState<string[]>([])
  const [editor, setEditor] = useState<ServiceRate | null>(null)
  const [viewer, setViewer] = useState<ServiceRate | null>(null)
  const [menuId, setMenuId] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<RateFilters>(emptyRateFilters)
  const [draftFilters, setDraftFilters] = useState<RateFilters>(emptyRateFilters)
  const [visibleColumns, setVisibleColumns] = useState<SortKey[]>(['id', 'service', 'serviceArea', 'zone', 'created'])

  const rates = useMemo<ServiceRate[]>(() => {
    const apiRates = rows.map((row, index) => ({
      id: String(row.id || `rate_${index + 1}`), service: String(row.service || row.name || 'Standard delivery'),
      serviceArea: String(row.service_area || row.area || 'Chennai Central'), zone: String(row.zone || 'All zones'),
      currency: (['INR', 'USD', 'EUR', 'GBP'].includes(String(row.currency)) ? String(row.currency) : 'INR') as ServiceRate['currency'],
      basePrice: String(row.base_price || row.base_price_minor && Number(row.base_price_minor) / 100 || '₹60'),
      perKm: String(row.per_km || row.per_km_minor && Number(row.per_km_minor) / 100 || '₹14'),
      minimumCharge: String(row.minimum_charge || row.minimum_fee_minor && Number(row.minimum_fee_minor) / 100 || '₹80'),
      maximumDistance: String(row.maximum_distance || row.maximum_distance_km || '40'),
      effectiveDate: String(row.effective_from || row.effective_date || '2026-08-05').slice(0, 10),
      riderShare: String(row.rider_share || row.solo_rider_share_percent || '80'),
      status: String(row.status || 'active') === 'draft' ? 'draft' as const : 'active' as const,
      created: String(row.created_at || row.effective_from || '2026-08-05T00:00:00Z'),
    }))
    const sourceRates = apiRates.length ? apiRates : [seededServiceRate]
    const ids = new Set(sourceRates.map(rate => rate.id))
    return [...sourceRates.map(rate => overrides[rate.id] || rate), ...Object.values(overrides).filter(rate => !ids.has(rate.id))].filter(rate => !archived.includes(rate.id))
  }, [rows, overrides, archived])

  const visibleRates = useMemo(() => rates
    .filter(rate => !search || Object.values(rate).some(value => value.toLowerCase().includes(search.toLowerCase())))
    .filter(rate => !filters.id || rate.id.toLowerCase().includes(filters.id.toLowerCase()))
    .filter(rate => !filters.serviceArea || rate.serviceArea === filters.serviceArea)
    .filter(rate => !filters.zone || rate.zone === filters.zone)
    .filter(rate => !filters.created || rate.created.slice(0, 10) === filters.created)
    .filter(rate => !filters.updated || rate.created.slice(0, 10) === filters.updated)
    .sort((left, right) => String(left[sort]).localeCompare(String(right[sort])) * (ascending ? 1 : -1)), [rates, search, filters, sort, ascending])

  function changeSort(key: SortKey) { if (sort === key) setAscending(value => !value); else { setSort(key); setAscending(true) } }
  function clearFilters() { const cleared = emptyRateFilters(); setDraftFilters(cleared); setFilters(cleared); setFilterOpen(false) }
  function applyFilters() { setFilters({ ...draftFilters }); setFilterOpen(false) }
  function openNew() { setEditor({ id: newId(), service: '', serviceArea: '', zone: 'All zones', currency: 'INR', basePrice: '', perKm: '', minimumCharge: '', maximumDistance: '', effectiveDate: new Date().toISOString().slice(0, 10), riderShare: '', status: 'draft', created: new Date().toISOString() }) }
  function openGuide() { setColumnsOpen(false); setMenuId(''); setGuideOpen(true) }
  function duplicate(rate: ServiceRate) { const copy = { ...rate, id: newId(), service: `${rate.service} copy`, status: 'draft' as const, created: new Date().toISOString() }; setOverrides(current => ({ ...current, [copy.id]: copy })); setMenuId('') }
  function archive(rate: ServiceRate) { if (!window.confirm(`Archive “${rate.service}”?`)) return; setArchived(current => [...current, rate.id]); setSelected(current => current.filter(id => id !== rate.id)); setMenuId('') }
  function saveRate(rate: ServiceRate) { setOverrides(current => ({ ...current, [rate.id]: rate })); setEditor(null) }
  function exportRates() {
    const csv = [['ID', 'Service', 'Service Area', 'Zone', 'Currency', 'Base Price', 'Per Km', 'Minimum Charge', 'Maximum Distance (km)', 'Effective Date', 'Rider Share (%)', 'Status', 'Created'], ...visibleRates.map(rate => [rate.id, rate.service, rate.serviceArea, rate.zone, rate.currency, rate.basePrice, rate.perKm, rate.minimumCharge, rate.maximumDistance, rate.effectiveDate, rate.riderShare, rate.status, rate.created])].map(values => values.map(value => JSON.stringify(value)).join(',')).join('\n')
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'droo-service-rates.csv'; link.click(); URL.revokeObjectURL(link.href)
  }

  const allSelected = visibleRates.length > 0 && visibleRates.every(rate => selected.includes(rate.id))
  return <div className="service-rates-page">
    <header className="service-rates-header service-rates-reference-header">
      <div><h1>Service Rates</h1></div>
      <div className="service-rates-actions">
        <label><Search /><input aria-label="Search service rates" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search Service Rates" /></label>
        <button className={`rate-icon-button${filterOpen ? ' active' : ''}`} aria-label="Filter service rates" aria-expanded={filterOpen} title="Filter" onClick={() => { setDraftFilters(filters); setFilterOpen(value => !value); setColumnsOpen(false) }}><Funnel /></button>
        <div className="rate-columns-menu-wrap"><button className="rate-icon-button" aria-label="Customize columns" title="Customize columns" onClick={() => { setColumnsOpen(value => !value); setFilterOpen(false) }}><SlidersHorizontal /></button>{columnsOpen && <div className={`rate-columns-menu ${styles.columnsCard}`}><strong>Customize columns</strong><small>{visibleColumns.length} of {serviceRateColumns.length} shown</small><div className="rate-columns-list">{serviceRateColumns.map(([key, label]) => <label key={key}><input type="checkbox" checked={visibleColumns.includes(key)} onChange={event => setVisibleColumns(current => event.target.checked ? [...current, key] : current.filter(column => column !== key))} /><span>{label}</span></label>)}</div><button type="button" className={styles.columnsDone} onClick={() => setColumnsOpen(false)}>Done</button></div>}</div>
        <button className="rate-icon-button" aria-label="Refresh service rates" title="Refresh" onClick={refresh}><RefreshCw /></button>
        <button type="button" className="primary" onClick={openNew}><Plus />New</button>
        <button className="secondary" disabled={!visibleRates.length} onClick={exportRates}><Download />Export</button>
      </div>
    </header>
    {filterOpen && <section className={`service-rate-filter-card ${styles.filterCard}`} role="dialog" aria-label="Service rate filters"><header><h2>Filters</h2></header><div><label><strong>ID</strong><span><input value={draftFilters.id} onChange={event => setDraftFilters({ ...draftFilters, id: event.target.value })} placeholder="ID" />{draftFilters.id && <button type="button" aria-label="Clear ID" onClick={() => setDraftFilters(current => ({ ...current, id: '' }))}><X /></button>}</span></label><label><strong>Service Area</strong><select value={draftFilters.serviceArea} onChange={event => setDraftFilters({ ...draftFilters, serviceArea: event.target.value })}><option value="">Select service area</option>{Array.from(new Set(rates.map(rate => rate.serviceArea))).map(value => <option key={value}>{value}</option>)}</select></label><label><strong>Zone</strong><select value={draftFilters.zone} onChange={event => setDraftFilters({ ...draftFilters, zone: event.target.value })}><option value="">Select zone</option>{Array.from(new Set(rates.map(rate => rate.zone))).map(value => <option key={value}>{value}</option>)}</select></label><label><strong>Created</strong><input type="date" value={draftFilters.created} onChange={event => setDraftFilters({ ...draftFilters, created: event.target.value })} /></label><label><strong>Updated</strong><input type="date" value={draftFilters.updated} onChange={event => setDraftFilters({ ...draftFilters, updated: event.target.value })} /></label></div><footer><button type="button" onClick={clearFilters}><Trash2 />Clear</button><button type="button" className="primary" onClick={applyFilters}><Check />Apply</button></footer></section>}
    <section className="service-rates-table-card"><div className="service-rates-table-wrap"><table><thead><tr>
      <th className="rate-check"><input aria-label="Select all service rates" type="checkbox" checked={allSelected} onChange={event => setSelected(event.target.checked ? visibleRates.map(rate => rate.id) : [])} /></th>
      {serviceRateColumns.filter(([key]) => visibleColumns.includes(key)).map(([key, label]) => <th key={key}><button onClick={() => changeSort(key)}>{label}</button></th>)}<th aria-label="Actions" />
    </tr></thead><tbody>{visibleRates.map(rate => <tr key={rate.id}><td className="rate-check"><input aria-label={`Select ${rate.service}`} type="checkbox" checked={selected.includes(rate.id)} onChange={event => setSelected(current => event.target.checked ? [...current, rate.id] : current.filter(id => id !== rate.id))} /></td>
      {visibleColumns.includes('id') && <td><code>{rate.id}</code></td>}{visibleColumns.includes('service') && <td><strong>{rate.service}</strong></td>}{visibleColumns.includes('serviceArea') && <td>{rate.serviceArea}</td>}{visibleColumns.includes('zone') && <td>{rate.zone}</td>}{visibleColumns.includes('currency') && <td>{rate.currency}</td>}{visibleColumns.includes('basePrice') && <td>{formatMoney(rate.basePrice, rate.currency)}</td>}{visibleColumns.includes('perKm') && <td>{formatMoney(rate.perKm, rate.currency)}</td>}{visibleColumns.includes('minimumCharge') && <td>{formatMoney(rate.minimumCharge, rate.currency)}</td>}{visibleColumns.includes('maximumDistance') && <td>{rate.maximumDistance} km</td>}{visibleColumns.includes('effectiveDate') && <td>{new Date(rate.effectiveDate).toLocaleDateString()}</td>}{visibleColumns.includes('riderShare') && <td>{rate.riderShare}%</td>}{visibleColumns.includes('status') && <td><span className={`rate-status ${rate.status}`}>{rate.status}</span></td>}{visibleColumns.includes('created') && <td>{new Date(rate.created).toLocaleDateString()}</td>}
      <td className="rate-menu-cell"><button className="rate-row-menu" aria-label={`Actions for ${rate.service}`} onClick={() => setMenuId(current => current === rate.id ? '' : rate.id)}><MoreHorizontal /></button>{menuId === rate.id && <div className="rate-row-actions"><button onClick={() => { setViewer(rate); setMenuId('') }}><Eye />View</button><button onClick={() => { setEditor(rate); setMenuId('') }}><Pencil />Edit</button><button onClick={() => duplicate(rate)}><Copy />Duplicate</button><button className="danger" onClick={() => archive(rate)}><Trash2 />Archive</button></div>}</td>
    </tr>)}</tbody></table>{!visibleRates.length && <div className="service-rates-empty"><span><Gauge /></span><h2>{loading ? 'Loading service rates' : search ? 'No matching service rates' : 'Set up your first service rate'}</h2><p>{error || (search ? 'Try a different search term.' : 'Service rates define how Fleet-Ops prices routes, zones, distance and other service rules.')}</p><div>{search && <button type="button" className="secondary" onClick={() => setSearch('')}>Clear search</button>}<button type="button" className="secondary" aria-haspopup="dialog" onClick={openGuide}><BookOpen />Service rates guide</button><button type="button" className="primary" onClick={openNew}><Plus />New service rate</button></div></div>}</div>
      <footer><span>Showing <strong>{visibleRates.length ? 1 : 0}</strong> to <strong>{visibleRates.length}</strong> of <strong>{visibleRates.length}</strong> results</span><div><button disabled aria-label="Previous page"><ChevronLeft /></button><button className="active">1</button><button disabled aria-label="Next page"><ChevronRight /></button></div></footer>
    </section>
    {editor && <RateEditor rate={editor} onClose={() => setEditor(null)} onSave={saveRate} />}{viewer && <RateViewer rate={viewer} onClose={() => setViewer(null)} />}{guideOpen && <GuideModal onClose={() => setGuideOpen(false)} />}
  </div>
}

function formatMoney(value: string, currency: ServiceRate['currency']) { const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }; return /^[₹$€£]/.test(value) ? value : `${symbols[currency]}${value}` }
function RateEditor({ rate, onClose, onSave }: { rate: ServiceRate; onClose: () => void; onSave: (rate: ServiceRate) => void }) {
  const [draft, setDraft] = useState(rate)
  const [orderType, setOrderType] = useState('pickup_dropoff')
  const [calculationMethod, setCalculationMethod] = useState('per_meter')
  const [durationTerms, setDurationTerms] = useState('')
  const [distanceUnit, setDistanceUnit] = useState('meter')
  const [cashOnDelivery, setCashOnDelivery] = useState(false)
  const [peakHours, setPeakHours] = useState(false)
  const [restrictedArea, setRestrictedArea] = useState('')
  function submit(event: FormEvent) { event.preventDefault(); onSave(draft) }
  return <div className="modal-backdrop"><form className="modal rate-editor rate-reference-editor" onSubmit={submit}><header><div><h2>{rate.service ? 'Edit service rate' : 'Create a new service rate'}</h2><p>Configure service pricing, terms, and operating restrictions.</p></div><div><button type="submit" className="primary">Create Service Rate</button><button type="button" aria-label="Close" onClick={onClose}><X /></button></div></header><div className="rate-reference-body">
    <RateSection title="Service Rate Details"><label><span>Service Name *</span><input required value={draft.service} onChange={event => setDraft({ ...draft, service: event.target.value })} placeholder="Service Name" /></label><label><span>Service Order Type *</span><select required value={orderType} onChange={event => setOrderType(event.target.value)}><option value="pickup_dropoff">Pickup &amp; Dropoff</option><option value="delivery">Delivery</option><option value="transport">Transport</option></select></label><label><span>Base Fee *</span><div className="rate-money-input"><select aria-label="Currency" value={draft.currency} onChange={event => setDraft({ ...draft, currency: event.target.value as ServiceRate['currency'] })}><option value="INR">🇮🇳 INR</option><option value="USD">🇺🇸 USD</option><option value="EUR">🇪🇺 EUR</option><option value="GBP">🇬🇧 GBP</option></select><input aria-label="Base fee" required type="number" min="0" step="0.01" value={draft.basePrice.replace(/[₹$€£]/, '')} onChange={event => setDraft({ ...draft, basePrice: event.target.value })} placeholder="0.00" /></div></label><label><span>Rate Calculation Method *</span><select required value={calculationMethod} onChange={event => setCalculationMethod(event.target.value)}><option value="per_meter">Per Meter</option><option value="per_kilometer">Per Kilometer</option><option value="flat">Flat Rate</option></select></label></RateSection>
    <RateSection title="Terms"><label className="wide"><span>Duration Terms</span><input value={durationTerms} onChange={event => setDurationTerms(event.target.value)} placeholder="Duration terms if applicable" /></label></RateSection>
    <RateSection title="Per Meter"><p className="wide rate-reference-help">Define a flat fee multiplied by distance. For example: fee × distance + base fee.</p><label><span>Per Meter Flat Rate Fee *</span><div className="rate-money-input"><b>{draft.currency === 'INR' ? '₹' : draft.currency}</b><input aria-label="Per meter flat rate fee" required type="number" min="0" step="0.01" value={draft.perKm.replace(/[₹$€£]/, '')} onChange={event => setDraft({ ...draft, perKm: event.target.value })} placeholder="0.00" /></div></label><label><span>Distance Unit *</span><select value={distanceUnit} onChange={event => setDistanceUnit(event.target.value)}><option value="meter">Meter</option><option value="kilometer">Kilometer</option></select></label><code className="wide">({draft.perKm || '0'} × distance {distanceUnit === 'meter' ? 'm' : 'km'}) + {formatMoney(draft.basePrice || '0', draft.currency)}</code></RateSection>
    <RateSection title="Cash on Delivery"><label className="wide rate-switch"><input type="checkbox" checked={cashOnDelivery} onChange={event => setCashOnDelivery(event.target.checked)} /><span>Enable additional fee for cash on delivery orders?</span></label></RateSection>
    <RateSection title="Peak Hours"><label className="wide rate-switch"><input type="checkbox" checked={peakHours} onChange={event => setPeakHours(event.target.checked)} /><span>Enable an additional fee for orders made during defined peak hours?</span></label></RateSection>
    <RateSection title="Restrict Service"><label className="wide"><span>Service Area</span><select value={restrictedArea} onChange={event => { setRestrictedArea(event.target.value); setDraft({ ...draft, serviceArea: event.target.value || draft.serviceArea }) }}><option value="">Restrict to service area</option><option>Chennai Central</option><option>South Chennai</option><option>All service areas</option></select></label></RateSection>
  </div><footer><button type="button" className="secondary" onClick={onClose}>Cancel</button><button type="submit" className="primary">Create Service Rate</button></footer></form></div>
}
function RateSection({ title, children }: { title: string; children: React.ReactNode }) { return <section><h3>{title}</h3><div>{children}</div></section> }
function RateViewer({ rate, onClose }: { rate: ServiceRate; onClose: () => void }) { return <div className="modal-backdrop"><section className="modal rate-viewer" role="dialog" aria-modal="true" aria-label={`${rate.service} details`}><header><div><h2>{rate.service}</h2><p>{rate.id}</p></div><button aria-label="Close" onClick={onClose}><X /></button></header><dl><div><dt>Service area</dt><dd>{rate.serviceArea}</dd></div><div><dt>Zone</dt><dd>{rate.zone}</dd></div><div><dt>Currency</dt><dd>{rate.currency}</dd></div><div><dt>Base price</dt><dd>{formatMoney(rate.basePrice, rate.currency)}</dd></div><div><dt>Per kilometre</dt><dd>{formatMoney(rate.perKm, rate.currency)}</dd></div><div><dt>Minimum charge</dt><dd>{formatMoney(rate.minimumCharge, rate.currency)}</dd></div><div><dt>Maximum distance</dt><dd>{rate.maximumDistance} km</dd></div><div><dt>Effective date</dt><dd>{new Date(rate.effectiveDate).toLocaleDateString()}</dd></div><div><dt>Rider share</dt><dd>{rate.riderShare}%</dd></div><div><dt>Status</dt><dd>{rate.status}</dd></div></dl><footer><button className="primary" onClick={onClose}>Done</button></footer></section></div> }
function GuideModal({ onClose }: { onClose: () => void }) { return <div className="modal-backdrop order-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="modal rate-guide order-compose-modal" role="dialog" aria-modal="true" aria-label="Service rates guide"><header><div><h2>Service rates guide</h2><p>How Fleet-Ops chooses a price for an order.</p></div><button type="button" aria-label="Close" onClick={onClose}><X /></button></header><ol><li><strong>Choose a service</strong><span>Select the delivery type customers will book.</span></li><li><strong>Set the coverage</strong><span>Choose the service area and optional zone where the rate applies.</span></li><li><strong>Enter pricing</strong><span>Add the starting fee, minimum charge, maximum distance and the amount charged for each kilometre.</span></li><li><strong>Set the rider share</strong><span>Choose the percentage of the delivery revenue paid to the rider.</span></li><li><strong>Activate the rate</strong><span>Draft rates are safe to edit; active rates can be used for pricing from the effective date.</span></li></ol><div className="rate-guide-example"><strong>Example</strong><span>Standard Delivery · Chennai Central · ₹50 base + ₹10/km · ₹80 minimum · 40 km maximum · 80% rider share</span></div><footer><button type="button" className="primary" onClick={onClose}>Got it</button></footer></section></div> }
