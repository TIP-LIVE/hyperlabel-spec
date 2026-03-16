import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'TIP — Door-to-Door Cargo Tracking'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'black',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Eye logo */}
        <svg viewBox="0 0 34 34" fill="none" width="80" height="80">
          <circle cx="16.77" cy="16.77" r="16.77" fill="white" />
          <circle cx="22.12" cy="11.85" r="6.55" fill="black" />
        </svg>

        {/* Brand name */}
        <div
          style={{
            display: 'flex',
            marginTop: 24,
            fontSize: 64,
            fontWeight: 800,
            color: '#00FF2B',
            letterSpacing: '-0.02em',
          }}
        >
          TIP
        </div>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            marginTop: 16,
            fontSize: 32,
            fontWeight: 600,
            color: 'white',
            letterSpacing: '-0.01em',
          }}
        >
          Door-to-Door Cargo Tracking
        </div>

        {/* Description */}
        <div
          style={{
            display: 'flex',
            marginTop: 16,
            fontSize: 20,
            color: '#9ca3af',
            maxWidth: 600,
            textAlign: 'center',
          }}
        >
          Real-time visibility in 180+ countries. From $20 per label.
        </div>
      </div>
    ),
    { ...size }
  )
}
