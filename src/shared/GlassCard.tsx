import type { ReactNode, CSSProperties } from 'react';
import { cn } from '../utils/cn';

export const GlassCard = ({
  children, className, style, onClick, strong = false,
}: { children: ReactNode; className?: string; style?: CSSProperties; onClick?: () => void; strong?: boolean }) => (
  <div
    onClick={onClick}
    className={cn(strong ? 'glass-strong' : 'glass', className, onClick && 'tap cursor-pointer')}
    style={style}
  >
    {children}
  </div>
);
