const USER_AGENT = 'TIP-Cargo-Tracking/1.0 (tip.live)'

export async function forwardGeocode(
  query: string
): Promise<{ displayName: string; lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`,
      { headers: { 'User-Agent': USER_AGENT } }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.length === 0) return null
    return {
      displayName: data[0].display_name,
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    }
  } catch {
    return null
  }
}
