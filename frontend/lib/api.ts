// frontend/lib/api.ts
import { logger } from './logger';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  logger.info(`API Request: ${options.method || 'GET'} ${endpoint}`, {
    url: `${API_URL}${endpoint}`,
    hasToken: !!token
  });

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    logger.error(`API Error: ${res.status} ${endpoint}`, {
      status: res.status,
      detail: error.detail,
      endpoint
    });
    throw new Error(error.detail || `API Error: ${res.status}`);
  }

  logger.info(`API Success: ${res.status} ${endpoint}`);
  if (res.status === 204) return null;
  return res.json();
}

export const authApi = {
  login: (login: string, password: string) =>
    fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
  getMe: () => fetchAPI('/auth/me'),
};

export const usersApi = {
  getAll: () => fetchAPI('/users'),
  create: (data: any) => fetchAPI('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => fetchAPI(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) => fetchAPI(`/users/${id}`, { method: 'DELETE' }),
  getStats: () => fetchAPI('/users/stats/summary'),
};

export const objectsApi = {
  getAll: () => fetchAPI('/objects'),
  create: (data: any) => fetchAPI('/objects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => fetchAPI(`/objects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) => fetchAPI(`/objects/${id}`, { method: 'DELETE' }),
};

export const unitsApi = {
  getAll: () => fetchAPI('/units'),
  create: (data: any) => fetchAPI('/units', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => fetchAPI(`/units/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) => fetchAPI(`/units/${id}`, { method: 'DELETE' }),
};

export const serviceCategoriesApi = {
  getAll: () => fetchAPI('/service-categories'),
  create: (data: any) => fetchAPI('/service-categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => fetchAPI(`/service-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) => fetchAPI(`/service-categories/${id}`, { method: 'DELETE' }),
  moveUp: (id: number) => fetchAPI(`/service-categories/${id}/move-up`, { method: 'POST' }),
  moveDown: (id: number) => fetchAPI(`/service-categories/${id}/move-down`, { method: 'POST' }),
};

export const servicesApi = {
  getAll: () => fetchAPI('/services/types'),
  create: (data: any) => fetchAPI('/services/types', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => fetchAPI(`/services/types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) => fetchAPI(`/services/types/${id}`, { method: 'DELETE' }),
  getRates: (objectId?: number) => {
    const params = objectId ? `?object_id=${objectId}` : '';
    return fetchAPI(`/services/rates${params}`);
  },
  createRate: (data: any) => fetchAPI('/services/rates', { method: 'POST', body: JSON.stringify(data) }),
  updateRate: (id: number, data: any) => fetchAPI(`/services/rates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRate: (id: number) => fetchAPI(`/services/rates/${id}`, { method: 'DELETE' }),
  exportRatesExcel: (objectId?: number) => {
    const params = objectId ? `?object_id=${objectId}` : '';
    return `${API_URL}/services/rates/export/excel${params}`;
  },
  exportRatesPdf: (objectId?: number) => {
    const params = objectId ? `?object_id=${objectId}` : '';
    return `${API_URL}/services/rates/export/pdf${params}`;
  },
};

export const resourcesApi = {
  getAll: (resourceType?: string) => {
    const params = resourceType ? `?resource_type=${resourceType}` : '';
    return fetchAPI(`/resources${params}`);
  },
  create: (data: any) => fetchAPI('/resources', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => fetchAPI(`/resources/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) => fetchAPI(`/resources/${id}`, { method: 'DELETE' }),
  getRates: (resourceId?: number) => {
    const params = resourceId ? `?resource_id=${resourceId}` : '';
    return fetchAPI(`/resources/rates${params}`);
  },
  createRate: (data: any) => fetchAPI('/resources/rates', { method: 'POST', body: JSON.stringify(data) }),
  updateRate: (id: number, data: any) => fetchAPI(`/resources/rates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRate: (id: number) => fetchAPI(`/resources/rates/${id}`, { method: 'DELETE' }),
  getNorms: (serviceTypeId?: number, resourceId?: number) => {
    const params = new URLSearchParams();
    if (serviceTypeId) params.append('service_type_id', serviceTypeId.toString());
    if (resourceId) params.append('resource_id', resourceId.toString()); // 🎯 ИСПРАВЛЕНО: было toS tring()
    return fetchAPI(`/resources/norms?${params.toString()}`);
  },
  createNorm: (data: any) => fetchAPI('/resources/norms', { method: 'POST', body: JSON.stringify(data) }),
  updateNorm: (id: number, data: any) => fetchAPI(`/resources/norms/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteNorm: (id: number) => fetchAPI(`/resources/norms/${id}`, { method: 'DELETE' }),
};

export const pricingSettingsApi = {
  getAll: () => fetchAPI('/pricing-settings'),
  create: (data: any) => fetchAPI('/pricing-settings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => fetchAPI(`/pricing-settings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) => fetchAPI(`/pricing-settings/${id}`, { method: 'DELETE' }),
  calculate: (data: any) => fetchAPI('/pricing-settings/calculate', { method: 'POST', body: JSON.stringify(data) }),
};

export const costAnalysisApi = {
  analyzeReport: (reportId: number) => fetchAPI(`/cost-analysis/reports/${reportId}`),
  analyzeImpact: (data: any) => fetchAPI('/cost-analysis/impact', { method: 'POST', body: JSON.stringify(data) }),
};

export const plansApi = {
  getAll: (objectId?: number, year?: number) => {
    const params = new URLSearchParams();
    if (objectId) params.append('object_id', objectId.toString());
    if (year) params.append('year', year.toString());
    return fetchAPI(`/plans?${params.toString()}`);
  },
  get: (id: number) => fetchAPI(`/plans/${id}`), // 🎯 ДОБАВЛЕНО: метод get
  create: (data: any) => fetchAPI('/plans', { method: 'POST', body: JSON.stringify(data) }),
  delete: (planId: number) => fetchAPI(`/plans/${planId}`, { method: 'DELETE' }),
  copy: (planId: number, data: any) => fetchAPI(`/plans/${planId}/copy`, { method: 'POST', body: JSON.stringify(data) }),
  getItems: (planId: number) => fetchAPI(`/plans/${planId}/items`),
  addItem: (planId: number, data: any) => fetchAPI(`/plans/${planId}/items`, { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (planId: number, itemId: number, data: any) => fetchAPI(`/plans/${planId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteItem: (planId: number, itemId: number) => fetchAPI(`/plans/${planId}/items/${itemId}`, { method: 'DELETE' }),
  getTariff: (planId: number) => fetchAPI(`/plans/${planId}/tariff`),
  exportExcel: (planId: number) => `${API_URL}/plans/${planId}/export/excel`,
  exportPdf: (planId: number) => `${API_URL}/plans/${planId}/export/pdf`,
  getServiceRates: (planId: number, serviceTypeId: number) => fetchAPI(`/plans/${planId}/services/${serviceTypeId}/rates`),
  recalculateRates: (planId: number) => fetchAPI(`/plans/${planId}/recalculate-rates`, { method: 'POST' }),
};

export const factsApi = {
  getAll: (objectId?: number, year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (objectId) params.append('object_id', objectId.toString());
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    return fetchAPI(`/facts?${params.toString()}`);
  },
  get: (factId: number) => fetchAPI(`/facts/${factId}`), // 🎯 ДОБАВЛЕНО: метод get
  create: (data: any) => fetchAPI('/facts', { method: 'POST', body: JSON.stringify(data) }),
  update: (factId: number, data: any) => fetchAPI(`/facts/${factId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (factId: number) => fetchAPI(`/facts/${factId}`, { method: 'DELETE' }),
  copyFromPlan: (factId: number, planId: number, month: number, year: number) =>
    fetchAPI(`/facts/${factId}/copy-from-plan?plan_id=${planId}&month=${month}&year=${year}`, { method: 'POST' }),
  getItems: (factId: number) => fetchAPI(`/facts/${factId}/items`),
  addItem: (factId: number, data: any) => fetchAPI(`/facts/${factId}/items`, { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (itemId: number, data: any) => fetchAPI(`/facts/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteItem: (itemId: number) => fetchAPI(`/facts/items/${itemId}`, { method: 'DELETE' }),
  getPlanFactComparison: (factId: number) => fetchAPI(`/facts/${factId}/plan-fact`),
  exportExcel: (factId: number) => `${API_URL}/facts/${factId}/export/excel`,
  exportPdf: (factId: number) => `${API_URL}/facts/${factId}/export/pdf`,
};

export const actsApi = {
  getAll: (objectId?: number, year?: number) => {
    const params = new URLSearchParams();
    if (objectId) params.append('object_id', objectId.toString());
    if (year) params.append('year', year.toString());
    return fetchAPI(`/acts?${params.toString()}`);
  },
  get: (actId: number) => fetchAPI(`/acts/${actId}`), // 🎯 ДОБАВЛЕНО: метод get
  createFromFact: (factId: number) => fetchAPI(`/acts/from-fact/${factId}`, { method: 'POST' }),
  delete: (actId: number) => fetchAPI(`/acts/${actId}`, { method: 'DELETE' }),
  exportPdf: (actId: number) => `${API_URL}/acts/${actId}/export/pdf`,
};

export const reportsApi = {
  getAll: (objectId?: number, year?: number) => {
    const params = new URLSearchParams();
    if (objectId) params.append('object_id', objectId.toString());
    if (year) params.append('year', year.toString());
    return fetchAPI(`/reports?${params.toString()}`);
  },
  get: (reportId: number) => fetchAPI(`/reports/${reportId}`),
  create: (data: any) => fetchAPI('/reports', { method: 'POST', body: JSON.stringify(data) }),
  update: (reportId: number, data: any) => fetchAPI(`/reports/${reportId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (reportId: number) => fetchAPI(`/reports/${reportId}`, { method: 'DELETE' }),
  exportExcel: (reportId: number) => `${API_URL}/reports/${reportId}/export/excel`,
  exportPdf: (reportId: number) => `${API_URL}/reports/${reportId}/export/pdf`,
};

export const dashboardApi = {
  getStats: (year?: number) => {
    const params = year ? `?year=${year}` : '';
    return fetchAPI(`/dashboard/stats${params}`);
  },
};

export const importApi = {
  preview: async (file: File, objectId: number, startMonth: number, startYear: number) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('object_id', objectId.toString());
    formData.append('start_month', startMonth.toString());
    formData.append('start_year', startYear.toString());
    const res = await fetch(`${API_URL}/plans/import-excel/preview`, { method: 'POST', body: formData });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || `API Error: ${res.status}`);
    }
    return res.json();
  },
  confirm: (data: any) => fetchAPI('/plans/import-excel/confirm', { method: 'POST', body: JSON.stringify(data) }),
};

// ============================================================
// ТИПЫ (оставлены без изменений, они корректны)
// ============================================================
export interface UserResponse {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: 'admin' | 'economist' | 'master' | 'viewer';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ObjectData {
  id: number;
  name: string;
  type: string;
  address?: string;
  area_sqm: string | null;
  spaces_count: number | null;
  tariff_base: 'area' | 'spaces';
  is_active: boolean;
}

export interface UnitData {
  id: number;
  code: string;
  name: string;
  symbol: string;
  is_active: boolean;
}

export interface ServiceCategoryData {
  id: number;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  services_count?: number;
}

export interface ServiceData {
  id: number;
  code: string;
  name: string;
  unit_id: number;
  category_id: number;
  frequency: string | null;
  is_active: boolean;
  unit: UnitData | null;
  category: ServiceCategoryData | null;
}

export interface ServiceRateData {
  id: number;
  object_id: number | null;
  service_type_id: number;
  price_per_unit: string;
  valid_from: string;
  valid_to: string | null;
  service_name?: string;
  object_name?: string;
}

export interface PlanData {
  id: number;
  object_id: number;
  start_year: number;
  start_month: number;
  period_months: number;
  name: string;
  status: string;
}

export interface MonthlyData {
  id: number;
  month: number;
  year: number;
  quantity: string;
  unit_price: string;
  amount: string;
}

export interface PlanItemData {
  id: number;
  service_type_id: number;
  total_quantity: string;
  total_amount: string;
  frequency: string | null;
  description: string | null;
  monthly: MonthlyData[];
}

export interface TariffData {
  grand_total: string;
  tariff_per_unit: string;
  object_name: string;
  object_type: string;
  tariff_base: 'area' | 'spaces';
  tariff_unit: string;
  divisor: string;
}

export interface FactHeaderData {
  id: number;
  object_id: number;
  year: number;
  month: number;
  status: string;
  created_by: number | null;
  created_at: string;
  approved_by: number | null;
  approved_at: string | null;
}

export interface FactItemData {
  id: number;
  fact_header_id: number;
  plan_item_id: number | null;
  service_type_id: number;
  actual_quantity: string;
  unit_price: string;
  actual_amount: string;
  executed_at: string | null;
  executor: string | null;
  notes: string | null;
}

export interface PlanFactComparisonItem {
  service_type_id: number;
  service_name: string;
  unit_symbol: string;
  plan_quantity: string;
  fact_quantity: string;
  plan_amount: string;
  fact_amount: string;
  deviation_qty: string;
  deviation_pct: string;
}

export interface ActItemData {
  id: number;
  act_id: number;
  service_type_id: number;
  frequency: string | null;
  quantity: string;
  unit_price: string;
  total_amount: string | null;
}

export interface ActData {
  id: number;
  act_number: string;
  act_date: string;
  fact_header_id: number;
  total_amount: string;
  status: string;
  pdf_url: string | null;
  created_at: string;
  items: ActItemData[];
}

export interface ReportItemData {
  id: number;
  report_id: number;
  service_type_id: number;
  service_name: string;
  unit_symbol: string;
  frequency: string | null;
  category_name: string | null;
  total_quantity: string;
  total_amount: string;
  acts_count: number;
}

export interface ReportData {
  id: number;
  object_id: number;
  object_name?: string;
  start_month: number;
  start_year: number;
  end_month: number;
  end_year: number;
  name: string | null;
  status: string;
  total_amount: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: ReportItemData[];
}

export interface KPICard {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  color: string;
}

export interface MonthlyPlanFact {
  month_label: string;
  plan_amount: number;
  fact_amount: number;
  deviation: number;
}

export interface TopDeviation {
  service_name: string;
  category_name: string;
  plan_amount: number;
  fact_amount: number;
  deviation_pct: number;
}

export interface CategoryDistribution {
  category_name: string;
  total_amount: number;
  percentage: number;
}

export interface Alert {
  object_name: string;
  period: string;
  service_name: string;
  deviation_pct: number;
  severity: string;
}

export interface DashboardData {
  kpi: KPICard[];
  monthly_plan_fact: MonthlyPlanFact[];
  top_deviations: TopDeviation[];
  category_distribution: CategoryDistribution[];
  alerts: Alert[];
}

export interface ImportedServiceRow {
  row_number: number;
  service_code: string | null;
  service_name: string;
  unit_symbol: string;
  monthly_quantities: number[];
  matched_service_id: number | null;
  match_status: string;
}

export interface ImportPreview {
  file_name: string;
  plan_name: string;
  object_id: number;
  object_name: string;
  start_month: number;
  start_year: number;
  period_months: number;
  services: ImportedServiceRow[];
  warnings: string[];
}

export interface PriceCalculationResult {
  service_name: string;
  object_name: string;
  cost_price: string;
  overhead_amount: string;
  profit_amount: string;
  vat_amount: string;
  final_price: string;
  overhead_percent: string;
  profit_percent: string;
  vat_percent: string;
  settings_source: string;
}

export interface ResourceData {
  id: number;
  code: string;
  name: string;
  unit: string;
  resource_type: string;
  is_active: boolean;
}

export interface ResourceRateData {
  id: number;
  resource_id: number;
  price_per_unit: string;
  valid_from: string;
  valid_to: string | null;
  resource_name?: string;
}

export interface ResourceNormData {
  id: number;
  service_type_id: number;
  resource_id: number;
  quantity_per_unit: string;
  is_active: boolean;
  valid_from: string;
  valid_to: string | null;
  service_name?: string;
  resource_name?: string;
}

export interface PricingSettingsData {
  id: number;
  object_id: number | null;
  service_type_id: number | null;
  overhead_percent: string;
  profit_percent: string;
  vat_percent: string;
  valid_from: string;
  valid_to: string | null;
  object_name?: string;
  service_name?: string;
}

export interface ResourceBreakdown {
  resource_id: number;
  resource_name: string;
  resource_type: string;
  unit: string;
  quantity: string;
  price_per_unit: string;
  total_amount: string;
}

export interface ServiceCostAnalysis {
  service_type_id: number;
  service_name: string;
  category_name: string | null;
  unit_symbol: string;
  total_quantity: string;
  total_amount: string;
  materials_cost: string;
  labor_cost: string;
  transport_cost: string;
  energy_cost: string;
  other_cost: string;
  resources: ResourceBreakdown[];
}

export interface ReportCostAnalysis {
  report_id: number;
  report_name: string;
  object_name: string;
  period: string;
  total_amount: string;
  materials_total: string;
  labor_total: string;
  transport_total: string;
  energy_total: string;
  other_total: string;
  services: ServiceCostAnalysis[];
}

export interface ServiceImpact {
  service_type_id: number;
  service_name: string;
  old_price: string;
  new_price: string;
  price_change: string;
  price_change_percent: string;
  total_amount_old: string;
  total_amount_new: string;
  amount_change: string;
}

export interface ImpactAnalysis {
  report_id: number;
  report_name: string;
  total_old: string;
  total_new: string;
  total_change: string;
  total_change_percent: string;
  services_impact: ServiceImpact[];
}