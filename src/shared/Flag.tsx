// Flag component using emoji (works offline, all platforms, zero deps)
export const Flag = ({ code, size = 24 }: { code: string; size?: number }) => {
  const cc = (code || '').toUpperCase();
  if (cc.length !== 2) return null;
  const A = 0x1F1E6;
  const flag = String.fromCodePoint(A + cc.charCodeAt(0) - 65) + String.fromCodePoint(A + cc.charCodeAt(1) - 65);
  return <span style={{ fontSize: size, lineHeight: 1, display: 'inline-block' }}>{flag}</span>;
};
