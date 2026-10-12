import type { LeadEventType } from '~/types/lead'

const BACKEND_LABEL_TO_TYPE: Record<string, LeadEventType> = {
  'Lead created': 'CREATED',
  'Asked about pricing': 'SIGNAL_PRICE_ASKED',
  'Requested a demo': 'SIGNAL_DEMO_REQUESTED',
  'Requested a meeting': 'SIGNAL_MEETING_REQUESTED',
  'Requested a quote': 'SIGNAL_QUOTE_REQUESTED',
  'Left an email': 'SIGNAL_EMAIL_CAPTURED',
  'Left an alternate phone': 'SIGNAL_PHONE_CAPTURED',
  'Asked to talk to a human': 'SIGNAL_HUMAN_REQUESTED',
  'Mentioned a business keyword': 'SIGNAL_BOT_KEYWORD',
  'Status changed': 'STATUS_CHANGED',
  'Synced to CRM': 'CRM_SYNC_OK',
  'CRM sync failed': 'CRM_SYNC_FAIL',
  'Manual note': 'MANUAL_NOTE',
}

export function translateLeadReason(
  reason: string | null | undefined,
  t: (key: string) => string,
): string {
  if (!reason) return ''
  return reason
    .split(', ')
    .map((raw) => {
      const label = raw.trim()
      const type = BACKEND_LABEL_TO_TYPE[label]
      return type ? t(`leads.eventType.${type}`) : label
    })
    .join(', ')
}
