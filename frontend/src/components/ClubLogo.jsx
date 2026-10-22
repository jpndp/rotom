import { useState } from 'react';

const getInitials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

export default function ClubLogo({ club, size = 48 }) {
  // Remember which URL failed, so a new URL gets a fresh attempt
  const [failedUrl, setFailedUrl] = useState(null);
  const style = { width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 };
  const name = club?.name || 'Club';

  if (club?.logoUrl && failedUrl !== club.logoUrl) {
    return (
      <img
        src={club.logoUrl}
        alt={`${name} logo`}
        style={style}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(club.logoUrl)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${name} logo`}
      style={{
        ...style,
        display: 'grid',
        placeItems: 'center',
            background: 'var(--brand)',
        color: 'var(--brand-contrast)',
        fontWeight: 700,
        fontSize: size * 0.4,
      }}
    >
      {getInitials(name)}
    </div>
  );
}