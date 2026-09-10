export const DASHBOARD_PALETTE = {
  primary: '#077ddc',
  primaryLight: '#5bb9fb',
  primaryDeep: '#054073',
  accent: '#5be9ec',
  accentDeep: '#2ba7ab',
  success: '#25d366',
  danger: '#f43f5e',
  warning: '#f59e0b',
  neutral: '#94a3b8',
  navy: '#01142a',
  navyMid: '#032040',
  navyElev: '#034871',
} as const

export const CHART_COLORS = {
  conversations: DASHBOARD_PALETTE.primary,
  leads: DASHBOARD_PALETTE.accent,
  scheduled: DASHBOARD_PALETTE.primaryLight,
  held: DASHBOARD_PALETTE.success,
  cancelled: DASHBOARD_PALETTE.danger,
  noShow: DASHBOARD_PALETTE.warning,
  rescheduled: DASHBOARD_PALETTE.warning,
} as const

export const CHART_DONUT_SERIES_COLORS: string[] = [
  DASHBOARD_PALETTE.primary,
  DASHBOARD_PALETTE.accent,
  DASHBOARD_PALETTE.primaryLight,
  DASHBOARD_PALETTE.warning,
  DASHBOARD_PALETTE.success,
  DASHBOARD_PALETTE.danger,
  DASHBOARD_PALETTE.accentDeep,
  DASHBOARD_PALETTE.primaryDeep,
]

export function chartBaseOptions(color: string): Record<string, unknown> {
  return {
    chart: {
      toolbar: { show: false },
      fontFamily: 'inherit',
      foreColor: '#475569',
      zoom: { enabled: false },
    },
    colors: [color],
    stroke: { curve: 'smooth', width: 2 },
    dataLabels: { enabled: false },
    grid: { borderColor: '#e2e8f0', strokeDashArray: 3 },
    tooltip: { theme: 'light' },
  }
}
