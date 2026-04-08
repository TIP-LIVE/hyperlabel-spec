import { describe, it, expect } from 'vitest'
import {
  getLastUpdateDate,
  getLastUpdateMs,
  formatLocationName,
  thinToTimeWindow,
  isNearby,
  groupConsecutiveByCity,
  type GroupableLocation,
} from '@/lib/utils/location-display'

type Loc = GroupableLocation & { id: string }

function make(
  id: string,
  iso: string,
  city: string | null,
  lat: number,
  lng: number,
): Loc {
  return { id, recordedAt: new Date(iso), geocodedCity: city, latitude: lat, longitude: lng }
}

// London-ish coordinates used across tests
const KINGSTON = { lat: 51.43, lng: -0.247 }
const PUTNEY = { lat: 51.436, lng: -0.244 }
const CLAPHAM = { lat: 51.464, lng: -0.17 }
const SOUTHWARK = { lat: 51.503, lng: -0.09 }
const EARLSFIELD = { lat: 51.444, lng: -0.185 }

describe('getLastUpdateDate', () => {
  it('returns the more recent of locationRecordedAt and labelLastSeenAt', () => {
    const older = '2026-04-08T09:00:00Z'
    const newer = '2026-04-08T10:00:00Z'
    expect(getLastUpdateDate({ locationRecordedAt: older, labelLastSeenAt: newer })?.toISOString()).toBe(
      new Date(newer).toISOString(),
    )
    expect(getLastUpdateDate({ locationRecordedAt: newer, labelLastSeenAt: older })?.toISOString()).toBe(
      new Date(newer).toISOString(),
    )
  })

  it('falls back to whichever value is present', () => {
    const t = '2026-04-08T10:00:00Z'
    expect(getLastUpdateDate({ locationRecordedAt: t, labelLastSeenAt: null })?.toISOString()).toBe(
      new Date(t).toISOString(),
    )
    expect(getLastUpdateDate({ locationRecordedAt: null, labelLastSeenAt: t })?.toISOString()).toBe(
      new Date(t).toISOString(),
    )
  })

  it('returns null when neither is available', () => {
    expect(getLastUpdateDate({})).toBeNull()
    expect(getLastUpdateMs({})).toBe(0)
  })
})

describe('formatLocationName', () => {
  it('prefers city + country', () => {
    expect(formatLocationName({ geocodedCity: 'Berlin', geocodedCountry: 'Germany' })).toBe('Berlin, Germany')
  })

  it('falls back to city alone', () => {
    expect(formatLocationName({ geocodedCity: 'Berlin' })).toBe('Berlin')
  })

  it('uses area + country when city missing', () => {
    expect(formatLocationName({ geocodedArea: 'Mitte', geocodedCountry: 'Germany' })).toBe('Mitte, Germany')
  })

  it('falls back to coordinates when nothing else is available', () => {
    expect(formatLocationName({ latitude: 51.5, longitude: -0.1 })).toBe('51.5000, -0.1000')
  })

  it('returns null when no data at all', () => {
    expect(formatLocationName({})).toBeNull()
  })
})

describe('isNearby', () => {
  it('returns true for points within 500m', () => {
    expect(isNearby({ latitude: 51.43, longitude: -0.247 }, { latitude: 51.4315, longitude: -0.2475 })).toBe(true)
  })

  it('returns false for points several km apart', () => {
    // Kingston to Clapham (~8km) — far beyond 500m
    expect(isNearby({ latitude: KINGSTON.lat, longitude: KINGSTON.lng }, { latitude: CLAPHAM.lat, longitude: CLAPHAM.lng })).toBe(false)
  })
})

describe('thinToTimeWindow', () => {
  it('keeps a single event as-is', () => {
    const e = make('a', '2026-04-08T10:00:00Z', 'Berlin', 52.52, 13.4)
    expect(thinToTimeWindow([e])).toEqual([e])
  })

  it('drops events inside the 2-hour window of the last kept event', () => {
    const events: Loc[] = [
      make('a', '2026-04-08T10:00:00Z', 'Berlin', 52.52, 13.4), // kept
      make('b', '2026-04-08T09:30:00Z', 'Berlin', 52.52, 13.4), // within 30min — dropped
      make('c', '2026-04-08T08:00:00Z', 'Berlin', 52.52, 13.4), // 2h exactly — kept
      make('d', '2026-04-08T07:30:00Z', 'Berlin', 52.52, 13.4), // within 30min — dropped
      make('e', '2026-04-08T06:00:00Z', 'Berlin', 52.52, 13.4), // 2h exactly — kept
    ]
    const out = thinToTimeWindow(events)
    expect(out.map((e) => e.id)).toEqual(['a', 'c', 'e'])
  })
})

describe('groupConsecutiveByCity — chronological integrity', () => {
  it('returns an empty array for no input', () => {
    expect(groupConsecutiveByCity([])).toEqual([])
  })

  it('keeps each group in newest-first order internally', () => {
    const events: Loc[] = [
      make('c', '2026-04-08T15:00:00Z', 'Berlin', 52.52, 13.4),
      make('b', '2026-04-08T13:00:00Z', 'Berlin', 52.52, 13.4),
      make('a', '2026-04-08T11:00:00Z', 'Berlin', 52.52, 13.4),
    ]
    const [group] = groupConsecutiveByCity(events)
    expect(group.events.map((e) => e.id)).toEqual(['c', 'b', 'a'])
    expect(group.representative.id).toBe('c')
  })

  it('starts a new group when the geocoded city changes', () => {
    const events: Loc[] = [
      make('1', '2026-04-08T15:00:00Z', 'Berlin', 52.52, 13.4),
      make('2', '2026-04-08T13:00:00Z', 'Munich', 48.14, 11.58),
      make('3', '2026-04-08T11:00:00Z', 'Munich', 48.14, 11.58),
    ]
    const groups = groupConsecutiveByCity(events)
    expect(groups.map((g) => g.representative.geocodedCity)).toEqual(['Berlin', 'Munich'])
    expect(groups[1].events.map((e) => e.id)).toEqual(['2', '3'])
  })

  it('does NOT merge two different named places that happen to be spatially close (regression)', () => {
    // Kingston Vale and Putney Vale are ~700m apart. Strict city matching must
    // keep them as separate groups so Kingston events never get hidden under a
    // "Putney Vale" label (or vice versa).
    const events: Loc[] = [
      make('p', '2026-04-08T11:41:00Z', 'Putney Vale', PUTNEY.lat, PUTNEY.lng),
      make('k1', '2026-04-08T09:38:00Z', 'Kingston Vale', KINGSTON.lat, KINGSTON.lng),
      make('k2', '2026-04-08T07:38:00Z', 'Kingston Vale', KINGSTON.lat, KINGSTON.lng),
    ]
    const groups = groupConsecutiveByCity(events)
    expect(groups).toHaveLength(2)
    expect(groups[0].representative.geocodedCity).toBe('Putney Vale')
    expect(groups[0].events).toHaveLength(1)
    expect(groups[1].representative.geocodedCity).toBe('Kingston Vale')
    expect(groups[1].events).toHaveLength(2)
  })

  it('falls back to proximity only when a city name is missing', () => {
    const events: Loc[] = [
      make('1', '2026-04-08T15:00:00Z', 'Berlin', 52.52, 13.4),
      make('2', '2026-04-08T13:00:00Z', null, 52.521, 13.401), // ungeocoded, near previous
      make('3', '2026-04-08T11:00:00Z', null, 52.5, 13.38), // ungeocoded, far
    ]
    const groups = groupConsecutiveByCity(events)
    expect(groups).toHaveLength(2)
    expect(groups[0].events.map((e) => e.id)).toEqual(['1', '2'])
    expect(groups[1].events.map((e) => e.id)).toEqual(['3'])
  })

  it('applies a defensive sort when given unsorted input', () => {
    // Deliberately mis-ordered input — oldest first. The function must still
    // produce chronologically correct, newest-first output.
    const events: Loc[] = [
      make('old', '2026-04-08T11:00:00Z', 'Berlin', 52.52, 13.4),
      make('mid', '2026-04-08T13:00:00Z', 'Berlin', 52.52, 13.4),
      make('new', '2026-04-08T15:00:00Z', 'Berlin', 52.52, 13.4),
    ]
    const [group] = groupConsecutiveByCity(events)
    expect(group.events.map((e) => e.id)).toEqual(['new', 'mid', 'old'])
    expect(group.representative.id).toBe('new')
  })

  it('maintains the no-overlap invariant across adjacent groups', () => {
    // Mixed sequence with jitter interleaved with a dominant run. Each group's
    // oldest event must still be strictly newer than the next group's newest.
    const events: Loc[] = [
      make('c1', '2026-04-08T15:49:00Z', 'Clapham Junction', CLAPHAM.lat, CLAPHAM.lng),
      make('p1', '2026-04-08T11:41:00Z', 'Putney Vale', PUTNEY.lat, PUTNEY.lng),
      make('k1', '2026-04-08T09:38:00Z', 'Kingston Vale', KINGSTON.lat, KINGSTON.lng),
      make('k2', '2026-04-08T07:38:00Z', 'Kingston Vale', KINGSTON.lat, KINGSTON.lng),
      make('k3', '2026-04-07T21:38:00Z', 'Kingston Vale', KINGSTON.lat, KINGSTON.lng),
      make('s1', '2026-04-07T19:11:00Z', 'Southwark', SOUTHWARK.lat, SOUTHWARK.lng),
      make('e1', '2026-04-07T16:59:00Z', 'Earlsfield', EARLSFIELD.lat, EARLSFIELD.lng),
      make('k4', '2026-04-07T14:00:00Z', 'Kingston Vale', KINGSTON.lat, KINGSTON.lng),
      make('k5', '2026-04-05T02:00:00Z', 'Kingston Vale', KINGSTON.lat, KINGSTON.lng),
    ]
    const groups = groupConsecutiveByCity(events)

    // Each group's oldest must be strictly newer than the next group's newest.
    for (let i = 0; i < groups.length - 1; i++) {
      const oldestOfCurrent = groups[i].events[groups[i].events.length - 1].recordedAt.getTime()
      const newestOfNext = groups[i + 1].events[0].recordedAt.getTime()
      expect(oldestOfCurrent).toBeGreaterThan(newestOfNext)
    }
  })

  it('does not absorb a jitter event into a foreign group via proximity when cities exist (regression)', () => {
    // Earlsfield is ~2km from Clapham Junction — well outside the 500m proximity
    // fallback, so strict city matching must still split them even if the
    // fallback were (incorrectly) widened. This guards against a past regression
    // where the public timeline merged cross-city jitter by coordinate proximity.
    const events: Loc[] = [
      make('c', '2026-04-08T15:00:00Z', 'Clapham Junction', CLAPHAM.lat, CLAPHAM.lng),
      make('e', '2026-04-07T16:59:00Z', 'Earlsfield', EARLSFIELD.lat, EARLSFIELD.lng),
    ]
    const groups = groupConsecutiveByCity(events)
    expect(groups).toHaveLength(2)
    expect(groups[0].representative.geocodedCity).toBe('Clapham Junction')
    expect(groups[1].representative.geocodedCity).toBe('Earlsfield')
  })
})
