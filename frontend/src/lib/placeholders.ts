export function createFallbackImageDataUrl(seed: string, label?: string) {
  const palette = [
    ['#114b5f', '#1a936f'],
    ['#5f0f40', '#9a031e'],
    ['#264653', '#2a9d8f'],
    ['#3d405b', '#e07a5f'],
    ['#1d3557', '#457b9d'],
  ];

  const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const [start, end] = palette[hash % palette.length];
  const initials = (label || seed)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'LD';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="675" fill="url(#bg)" rx="32" />
      <circle cx="980" cy="150" r="130" fill="rgba(255,255,255,0.10)" />
      <circle cx="220" cy="560" r="160" fill="rgba(255,255,255,0.08)" />
      <text
        x="50%"
        y="52%"
        text-anchor="middle"
        fill="white"
        font-family="Arial, sans-serif"
        font-size="180"
        font-weight="700"
        letter-spacing="8"
      >${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
