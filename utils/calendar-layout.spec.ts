import {
  addDaysToDayKey,
  isoWeekdayFromDayKey,
  layoutOverlappingItems,
  startOfIsoWeek,
} from './calendar-layout'

describe('layoutOverlappingItems', () => {
  it('assigns single non-overlapping event to column 0 with 1 column', () => {
    const out = layoutOverlappingItems([
      { item: 'a', startMin: 540, endMin: 600 },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].columnIndex).toBe(0)
    expect(out[0].columnsInCluster).toBe(1)
  })

  it('splits two overlapping events into 2 columns of same cluster', () => {
    const out = layoutOverlappingItems([
      { item: 'a', startMin: 540, endMin: 600 },
      { item: 'b', startMin: 540, endMin: 600 },
    ])
    expect(out).toHaveLength(2)
    expect(new Set(out.map(o => o.columnIndex))).toEqual(new Set([0, 1]))
    expect(out.every(o => o.columnsInCluster === 2)).toBe(true)
  })

  it('30-min event uses half height of 60-min at same start (just proportionality of endMin-startMin)', () => {
    const out = layoutOverlappingItems([
      { item: 'short', startMin: 540, endMin: 570 },
      { item: 'long', startMin: 600, endMin: 660 },
    ])
    const short = out.find(o => o.item === 'short')!
    const long = out.find(o => o.item === 'long')!
    expect(short.endMin - short.startMin).toBe(30)
    expect(long.endMin - long.startMin).toBe(60)
    expect((long.endMin - long.startMin) / (short.endMin - short.startMin)).toBe(2)
  })

  it('non-overlapping events go to column 0 in separate clusters', () => {
    const out = layoutOverlappingItems([
      { item: 'a', startMin: 540, endMin: 600 },
      { item: 'b', startMin: 660, endMin: 720 },
    ])
    expect(out.every(o => o.columnIndex === 0)).toBe(true)
    expect(out.every(o => o.columnsInCluster === 1)).toBe(true)
  })

  it('handles three overlapping events forming a 3-column cluster', () => {
    const out = layoutOverlappingItems([
      { item: 'a', startMin: 540, endMin: 600 },
      { item: 'b', startMin: 555, endMin: 615 },
      { item: 'c', startMin: 570, endMin: 630 },
    ])
    expect(out).toHaveLength(3)
    expect(new Set(out.map(o => o.columnIndex))).toEqual(new Set([0, 1, 2]))
    expect(out.every(o => o.columnsInCluster === 3)).toBe(true)
  })
})

describe('date helpers', () => {
  it('isoWeekdayFromDayKey returns 1 for Monday, 7 for Sunday', () => {
    expect(isoWeekdayFromDayKey('2026-09-14')).toBe(1)
    expect(isoWeekdayFromDayKey('2026-09-20')).toBe(7)
  })

  it('addDaysToDayKey wraps months', () => {
    expect(addDaysToDayKey('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDaysToDayKey('2026-10-01', -1)).toBe('2026-09-30')
  })

  it('startOfIsoWeek returns Monday of the ISO week containing the date', () => {
    expect(startOfIsoWeek('2026-09-17')).toBe('2026-09-14')
    expect(startOfIsoWeek('2026-09-14')).toBe('2026-09-14')
    expect(startOfIsoWeek('2026-09-20')).toBe('2026-09-14')
  })
})
