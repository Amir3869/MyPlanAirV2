// Exchange rates — uses ExchangeRate.host (no API key, free)
// With a curated offline fallback for full reliability

const FALLBACK_RATES_EUR: Record<string, number> = {
  EUR: 1, USD: 1.08, GBP: 0.85, JPY: 162, CHF: 0.96, CAD: 1.47, AUD: 1.62,
  NZD: 1.78, CNY: 7.82, KRW: 1450, THB: 38.5, IDR: 17000, SGD: 1.46,
  HKD: 8.45, VND: 27000, AED: 3.97, TRY: 35, MAD: 10.8, EGP: 53,
  MXN: 21.5, BRL: 6.4, ARS: 1100, PEN: 4.05, ZAR: 20, KES: 140,
  DKK: 7.46, SEK: 11.4, NOK: 11.7, ISK: 150,
};

export const convertOffline = (from: string, to: string, amount: number): number => {
  const fr = FALLBACK_RATES_EUR[from] ?? 1;
  const tr = FALLBACK_RATES_EUR[to] ?? 1;
  // Convert via EUR base
  const eur = amount / fr;
  return eur * tr;
};

export type RateResult = { rate: number; source: 'live' | 'offline'; updatedAt: string };

export const fetchRate = async (from: string, to: string): Promise<RateResult> => {
  if (from === to) return { rate: 1, source: 'offline', updatedAt: new Date().toISOString() };
  // Try live API
  try {
    const url = `https://api.exchangerate.host/convert?from=${from}&to=${to}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.result === 'number' && data.result > 0) {
        return { rate: data.result, source: 'live', updatedAt: new Date().toISOString() };
      }
    }
  } catch {
    // fall through
  }
  // Offline fallback
  const rate = convertOffline(from, to, 1);
  return { rate, source: 'offline', updatedAt: new Date().toISOString() };
};
