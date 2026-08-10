'use client'

import { fetchAuthenticated } from '@/hooks/use-api-data'

export type AssetRef = { vehicle_id?: string; equipment_id?: string }
export type MaintenanceSummary = { overdue_schedules:number; due_next_7_days:number; open_work_orders:number; assets_out_of_service:number; low_stock_parts:number; month_cost_minor:number; currency:string }
export type MaintenanceEquipment = { id:string; code:string; name:string; type:string; status:'active'|'out_of_service'|'retired'; serial_number?:string; manufacturer?:string; model?:string; metadata:Record<string,string>; created_at:string; updated_at:string }
export type MaintenanceSchedule = AssetRef & { id:string; name:string; maintenance_type:string; trigger_type:'time'|'distance'|'engine_hours'|'hybrid'; interval_days?:number; interval_distance_km?:number; interval_engine_hours?:number; last_completed_at?:string; next_due_at?:string; status:'active'|'paused'; instructions?:string; created_at:string; updated_at:string }
export type WorkOrderStatus = 'draft'|'open'|'assigned'|'in_progress'|'on_hold'|'completed'|'cancelled'
export type WorkOrderAction = 'open'|'assign'|'start'|'hold'|'resume'|'complete'|'cancel'
export type MaintenanceWorkOrder = AssetRef & { id:string; schedule_id?:string; code:string; subject:string; description?:string; category:'inspection'|'service'|'repair'|'preventive'; priority:'low'|'medium'|'high'|'urgent'; status:WorkOrderStatus; assigned_user_id?:string; assigned_vendor_ref?:string; opened_at?:string; due_at?:string; started_at?:string; completed_at?:string; estimated_cost_minor:number; actual_cost_minor:number; currency:string; instructions?:string; created_at:string; updated_at:string }
export type MaintenanceRecord = AssetRef & { id:string; work_order_id:string; maintenance_type:string; performed_at:string; odometer_km?:number; engine_hours?:number; summary:string; actual_cost_minor:number; currency:string; created_at:string }
export type MaintenancePart = { id:string; part_number:string; name:string; status:'active'|'archived'; unit_cost_minor:number; currency:string; quantity_on_hand:number; reorder_threshold:number; created_at:string; updated_at:string }

type Problem = { title?:string; detail?:string; code?:string }
async function request<T>(path:string, init:RequestInit={}) {
  const headers:Record<string,string> = { Accept:'application/json', ...(init.headers as Record<string,string> || {}) }
  if (init.body) headers['Content-Type']='application/json'
  if (init.method && init.method !== 'GET') headers['Idempotency-Key']=crypto.randomUUID()
  const response=await fetchAuthenticated(`/v1/admin/maintenance${path}`,{...init,headers})
  if(!response.ok){const problem=await response.json().catch(()=>null) as Problem|null;throw new Error(problem?.detail||problem?.title||`Maintenance request failed (${response.status}).`)}
  if(response.status===204)return undefined as T
  return response.json() as Promise<T>
}
async function list<T>(path:string){return (await request<{data:T[]}>(path)).data}

export const maintenanceApi={
  summary:()=>request<MaintenanceSummary>('/summary'),
  listEquipment:()=>list<MaintenanceEquipment>('/equipment'),
  createEquipment:(input:Record<string,unknown>)=>request<MaintenanceEquipment>('/equipment',{method:'POST',body:JSON.stringify(input)}),
  listSchedules:()=>list<MaintenanceSchedule>('/schedules'),
  createSchedule:(input:Record<string,unknown>)=>request<MaintenanceSchedule>('/schedules',{method:'POST',body:JSON.stringify(input)}),
  pauseSchedule:(id:string)=>request<MaintenanceSchedule>(`/schedules/${encodeURIComponent(id)}/pause`,{method:'POST'}),
  resumeSchedule:(id:string)=>request<MaintenanceSchedule>(`/schedules/${encodeURIComponent(id)}/resume`,{method:'POST'}),
  triggerSchedule:(id:string)=>request<MaintenanceWorkOrder>(`/schedules/${encodeURIComponent(id)}/trigger`,{method:'POST'}),
  listWorkOrders:()=>list<MaintenanceWorkOrder>('/work-orders'),
  createWorkOrder:(input:Record<string,unknown>)=>request<MaintenanceWorkOrder>('/work-orders',{method:'POST',body:JSON.stringify(input)}),
  allowedActions:(id:string)=>request<{work_order_id:string;actions:WorkOrderAction[]}>(`/work-orders/${encodeURIComponent(id)}/allowed-actions`),
  transitionWorkOrder:(id:string,input:Record<string,unknown>)=>request<MaintenanceWorkOrder>(`/work-orders/${encodeURIComponent(id)}/transition`,{method:'POST',body:JSON.stringify(input)}),
  addWorkOrderPart:(id:string,input:{part_id:string;quantity:number})=>request<void>(`/work-orders/${encodeURIComponent(id)}/parts`,{method:'POST',body:JSON.stringify(input)}),
  listRecords:()=>list<MaintenanceRecord>('/records'),
  listParts:()=>list<MaintenancePart>('/parts'),
  createPart:(input:Record<string,unknown>)=>request<MaintenancePart>('/parts',{method:'POST',body:JSON.stringify(input)}),
}

export function formatMaintenanceStatus(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase())}
export function minorMoney(value:number,currency='INR'){return new Intl.NumberFormat('en-IN',{style:'currency',currency}).format(value/100)}
