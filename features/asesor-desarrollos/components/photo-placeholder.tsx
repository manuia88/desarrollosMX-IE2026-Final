import type { CSSProperties } from 'react';
import { IconBuilding2 } from '@/shared/ui/icons/canon-icons';

export interface PhotoPlaceholderProps {
  ariaLabel?: string;
  className?: string;
}

export function PhotoPlaceholder({ ariaLabel, className }: PhotoPlaceholderProps) {
  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 10',
    borderRadius: 'var(--canon-radius-card) var(--canon-radius-card) 0 0',
    background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };
  const iconStyle: CSSProperties = {
    color: 'rgba(255,255,255,0.4)',
  };
  return (
    <div
      role="img"
      aria-label={ariaLabel ?? 'Imagen pendiente'}
      style={containerStyle}
      className={className}
    >
      <IconBuilding2 size={56} style={iconStyle} aria-hidden="true" />
    </div>
  );
}
