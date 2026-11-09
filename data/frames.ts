export type WallId =
  | 'reception-back'
  | 'reception-left'
  | 'reception-right'
  | 'office-back'
  | 'office-left'
  | 'office-right'

export type FrameHighlight = 'primary' | 'featured'

export type FrameIcon =
  | 'clock'
  | 'alert'
  | 'bubble'
  | 'users'
  | 'route'
  | 'whatsapp'
  | 'calendar'
  | 'book'
  | 'panel'
  | 'checks'
  | 'trend'
  | 'star'

export interface FrameCta {
  labelKey: string
  href: string
  kind: 'internal' | 'whatsapp' | 'register'
}

export interface FrameData {
  id: string
  wall: WallId
  position: number
  highlight?: FrameHighlight
  icon?: FrameIcon
  titleKey: string
  subtitleKey?: string
  bulletKeys: string[]
  cta?: FrameCta
}

const WHATSAPP_HREF = 'https://wa.me/593979798458?text=Hola,%20me%20interesa%20conocer%20más%20sobre%20LURVIAX'
const REGISTER_HREF = '/register'

export const LANDING_FRAMES: FrameData[] = [
  {
    id: 'welcome',
    wall: 'reception-back',
    position: 0,
    highlight: 'primary',
    icon: 'clock',
    titleKey: 'landing.frames.welcome.title',
    subtitleKey: 'landing.frames.welcome.subtitle',
    bulletKeys: [],
  },
  {
    id: 'problem',
    wall: 'reception-left',
    position: 0,
    icon: 'alert',
    titleKey: 'landing.frames.problem.title',
    bulletKeys: [
      'landing.frames.problem.b1',
      'landing.frames.problem.b2',
      'landing.frames.problem.b3',
    ],
  },
  {
    id: 'solution',
    wall: 'reception-left',
    position: 1,
    icon: 'bubble',
    titleKey: 'landing.frames.solution.title',
    bulletKeys: [
      'landing.frames.solution.b1',
      'landing.frames.solution.b2',
      'landing.frames.solution.b3',
    ],
  },
  {
    id: 'parallelism',
    wall: 'reception-right',
    position: 0,
    icon: 'users',
    titleKey: 'landing.frames.parallelism.title',
    bulletKeys: [
      'landing.frames.parallelism.b1',
      'landing.frames.parallelism.b2',
      'landing.frames.parallelism.b3',
    ],
  },
  {
    id: 'arch',
    wall: 'reception-right',
    position: 1,
    icon: 'route',
    titleKey: 'landing.frames.arch.title',
    bulletKeys: [
      'landing.frames.arch.b1',
      'landing.frames.arch.b2',
      'landing.frames.arch.b3',
    ],
  },
  {
    id: 'features-1',
    wall: 'office-back',
    position: 0,
    icon: 'whatsapp',
    titleKey: 'landing.frames.features1.title',
    bulletKeys: [
      'landing.caps.items.1.title',
      'landing.caps.items.2.title',
      'landing.caps.items.3.title',
    ],
  },
  {
    id: 'features-2',
    wall: 'office-back',
    position: 1,
    icon: 'book',
    titleKey: 'landing.frames.features2.title',
    bulletKeys: [
      'landing.caps.items.4.title',
      'landing.caps.items.5.title',
      'landing.caps.items.6.title',
    ],
  },
  {
    id: 'panel',
    wall: 'office-left',
    position: 0,
    icon: 'panel',
    titleKey: 'landing.frames.panel.title',
    bulletKeys: [
      'landing.frames.panel.b1',
      'landing.frames.panel.b2',
      'landing.frames.panel.b3',
      'landing.frames.panel.b4',
      'landing.frames.panel.b5',
    ],
  },
  {
    id: 'implementation',
    wall: 'office-left',
    position: 1,
    icon: 'checks',
    titleKey: 'landing.frames.implementation.title',
    bulletKeys: [
      'landing.process.items.1.title',
      'landing.process.items.2.title',
      'landing.process.items.3.title',
    ],
  },
  {
    id: 'impact',
    wall: 'office-right',
    position: 0,
    icon: 'trend',
    titleKey: 'landing.frames.impact.title',
    bulletKeys: [
      'landing.frames.impact.stat1Label',
      'landing.frames.impact.stat2Label',
      'landing.frames.impact.stat3Label',
    ],
  },
  {
    id: 'plan',
    wall: 'office-right',
    position: 1,
    highlight: 'featured',
    icon: 'star',
    titleKey: 'landing.frames.plan.title',
    subtitleKey: 'landing.frames.plan.subtitle',
    bulletKeys: [
      'landing.plans.single.items.1',
      'landing.plans.single.items.2',
      'landing.plans.single.items.3',
      'landing.plans.single.items.4',
      'landing.plans.single.items.5',
    ],
    cta: {
      labelKey: 'landing.frames.plan.ctaLabel',
      href: REGISTER_HREF,
      kind: 'register',
    },
  },
  {
    id: 'close',
    wall: 'office-back',
    position: 2,
    highlight: 'primary',
    icon: 'whatsapp',
    titleKey: 'landing.frames.close.title',
    subtitleKey: 'landing.frames.close.subtitle',
    bulletKeys: [],
    cta: {
      labelKey: 'landing.frames.close.ctaLabel',
      href: WHATSAPP_HREF,
      kind: 'whatsapp',
    },
  },
]

export function framesByWall(wall: WallId): FrameData[] {
  return LANDING_FRAMES
    .filter(f => f.wall === wall)
    .sort((a, b) => a.position - b.position)
}

export function frameIndex(id: string): number {
  return LANDING_FRAMES.findIndex(f => f.id === id)
}
