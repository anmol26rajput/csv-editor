import { ImageResponse } from 'next/og'
import { SITE_NAME, SITE_TAGLINE } from '@/lib/seo'

// Route segment config
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Branded Open Graph / Twitter card image, shared by every page unless a route
// provides its own. Rendered at build/edge time by next/og.
export default function OpengraphImage() {
    const ink = '#211e1b'
    const paper = '#faf8f5'
    const brand = '#d0884b'
    const chips = ['PDF', 'CSV', 'XLSX', 'DOCX', 'TXT']

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: ink,
                    padding: '72px',
                    fontFamily: 'sans-serif',
                }}
            >
                {/* Logo lockup */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div
                        style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '18px',
                            background: brand,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '40px',
                        }}
                    >
                        📄
                    </div>
                    <div style={{ color: paper, fontSize: '44px', fontWeight: 700 }}>
                        {SITE_NAME}
                    </div>
                </div>

                {/* Headline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div
                        style={{
                            color: paper,
                            fontSize: '80px',
                            fontWeight: 800,
                            lineHeight: 1.05,
                            letterSpacing: '-2px',
                            maxWidth: '900px',
                        }}
                    >
                        Edit any file in your browser
                    </div>
                    <div style={{ color: '#bcb6ac', fontSize: '34px' }}>
                        Free, fast, and private — your files never leave your device.
                    </div>
                </div>

                {/* File-type chips */}
                <div style={{ display: 'flex', gap: '16px' }}>
                    {chips.map((c) => (
                        <div
                            key={c}
                            style={{
                                display: 'flex',
                                color: brand,
                                border: `2px solid ${brand}`,
                                borderRadius: '999px',
                                padding: '10px 26px',
                                fontSize: '28px',
                                fontWeight: 600,
                            }}
                        >
                            {c}
                        </div>
                    ))}
                </div>
            </div>
        ),
        { ...size },
    )
}
