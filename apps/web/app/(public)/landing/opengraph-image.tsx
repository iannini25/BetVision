import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'BetV · Não é mágica. É estatística.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#06080F',
          color: '#F4F6FB',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 40,
            width: 680,
            height: 680,
            borderRadius: 680,
            background: 'radial-gradient(circle, rgba(168,85,247,0.30), rgba(124,58,237,0) 60%)',
            display: 'flex',
          }}
        />
        {/* eye mark */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 44 }}>
          <div
            style={{
              width: 128,
              height: 128,
              borderRadius: 128,
              border: '7px solid #A855F7',
              boxShadow: '0 0 46px rgba(168,85,247,0.65)',
              display: 'flex',
            }}
          />
          <div style={{ position: 'absolute', right: 4, top: 8, width: 20, height: 20, borderRadius: 20, background: '#4ADE80', display: 'flex' }} />
        </div>

        <div style={{ display: 'flex', fontSize: 66, fontWeight: 800 }}>Não é mágica.</div>
        <div style={{ display: 'flex', fontSize: 66, fontWeight: 800, marginTop: 4 }}>
          <span style={{ marginRight: 18 }}>É</span>
          <span style={{ color: '#C084FC' }}>estatística.</span>
        </div>
        <div style={{ display: 'flex', marginTop: 40, fontSize: 26, color: '#9AA3B8' }}>
          BetV · Copa 2026 · R$ 14,90 via PIX · 18+
        </div>
      </div>
    ),
    { ...size }
  )
}
