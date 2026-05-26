const gradients = [
  'linear-gradient(135deg, #4a7c59, #5b3f8b)',
  'linear-gradient(135deg, #5b3f8b, #7c5cbf)',
  'linear-gradient(135deg, #8b6914, #c4990a)',
  'linear-gradient(135deg, #4a7c59, #6aad80)',
  'linear-gradient(135deg, #8b3252, #c4476e)',
]

function gradientFor(name: string) {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return gradients[hash % gradients.length]
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return (
    <span
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: gradientFor(name),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 600,
        color: '#fff',
        flexShrink: 0,
        letterSpacing: '-0.02em',
        userSelect: 'none',
      }}
    >
      {initials}
    </span>
  )
}
