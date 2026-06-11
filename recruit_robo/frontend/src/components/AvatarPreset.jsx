import './Avatar.css'

export const PRESETS = [
  // Light skin
  { id: 'p1',  tone: 'rr-tone-light',  hair: 'rr-hair-short', gender: 'male',   hairColor: '#2c3e50', label: 'Alex'  },
  { id: 'p2',  tone: 'rr-tone-light',  hair: 'rr-hair-long',  gender: 'female', hairColor: '#2c3e50', label: 'Maya'  },
  { id: 'p3',  tone: 'rr-tone-light',  hair: 'rr-hair-short', gender: 'male',   hairColor: '#8B4513', label: 'Leo'   },
  { id: 'p4',  tone: 'rr-tone-light',  hair: 'rr-hair-long',  gender: 'female', hairColor: '#c8a850', label: 'Zoe'   },
  // Medium skin
  { id: 'p5',  tone: 'rr-tone-medium', hair: 'rr-hair-short', gender: 'male',   hairColor: '#1a1a1a', label: 'Sam'   },
  { id: 'p6',  tone: 'rr-tone-medium', hair: 'rr-hair-long',  gender: 'female', hairColor: '#2c3e50', label: 'Priya' },
  { id: 'p7',  tone: 'rr-tone-medium', hair: 'rr-hair-short', gender: 'male',   hairColor: '#4a3728', label: 'Raj'   },
  { id: 'p8',  tone: 'rr-tone-medium', hair: 'rr-hair-long',  gender: 'female', hairColor: '#8B4513', label: 'Nia'   },
  // Deep skin
  { id: 'p9',  tone: 'rr-tone-deep',   hair: 'rr-hair-short', gender: 'male',   hairColor: '#1a1a1a', label: 'Omar'  },
  { id: 'p10', tone: 'rr-tone-deep',   hair: 'rr-hair-long',  gender: 'female', hairColor: '#1a1a1a', label: 'Aisha' },
  { id: 'p11', tone: 'rr-tone-deep',   hair: 'rr-hair-short', gender: 'male',   hairColor: '#2c3e50', label: 'Kwame' },
  { id: 'p12', tone: 'rr-tone-deep',   hair: 'rr-hair-long',  gender: 'female', hairColor: '#3d2b1f', label: 'Zara'  },
]

/** Raw avatar at 200×200. Designed to be placed inside a ScaledAvatar wrapper. */
function RawAvatar({ tone, hair, gender, hairColor }) {
  return (
    <div
      className={`rr-avatar ${tone} ${hair} ${gender === 'female' ? 'rr-female' : ''}`}
      style={{ '--hair-color': hairColor }}>
      <div className="rr-hair-back" />
      <div className="rr-face" />
      <div className="rr-ears" />
      <div className="rr-neck" />
      <div className="rr-hair-front" />
      <div className="rr-clothes">
        <div className="rr-shirt-v" />
        <div className="rr-collar-left" />
        <div className="rr-collar-right" />
      </div>
    </div>
  )
}

/**
 * ScaledAvatar renders a preset avatar at any size.
 * The inner avatar is always 200×200 and scaled down via CSS transform.
 */
export function ScaledAvatar({ tone, hair, gender, hairColor, size = 200, className = '' }) {
  const scale = size / 200
  return (
    <div
      className={className}
      style={{ width: size, height: size, overflow: 'hidden', position: 'relative', flexShrink: 0, background: '#fff' }}>
      <div style={{
        position: 'absolute', width: 200, height: 200,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}>
        <RawAvatar tone={tone} hair={hair} gender={gender} hairColor={hairColor} />
      </div>
    </div>
  )
}
