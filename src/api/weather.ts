// src/api/weather.ts
// Open-Meteo — gratuit, sans clé API ✅

export type WeatherResult = {
  ok: true;
  temp: number;
  feelsLike: number;
  code: number;
  icon: string;
  label: string;
  wind: number;
  humidity: number;
} | {
  ok: false;
  reason: string;
};

// WMO Weather codes → emoji + label français
const WMO: Record<number, { icon: string; label: string }> = {
  0:  { icon: '☀️',  label: 'Ciel dégagé'        },
  1:  { icon: '🌤️', label: 'Peu nuageux'          },
  2:  { icon: '⛅',  label: 'Partiellement nuageux'},
  3:  { icon: '☁️',  label: 'Couvert'              },
  45: { icon: '🌫️', label: 'Brouillard'           },
  48: { icon: '🌫️', label: 'Brouillard givrant'   },
  51: { icon: '🌦️', label: 'Bruine légère'        },
  53: { icon: '🌦️', label: 'Bruine modérée'       },
  55: { icon: '🌧️', label: 'Bruine dense'         },
  61: { icon: '🌧️', label: 'Pluie légère'         },
  63: { icon: '🌧️', label: 'Pluie modérée'        },
  65: { icon: '🌧️', label: 'Pluie forte'          },
  71: { icon: '🌨️', label: 'Neige légère'         },
  73: { icon: '🌨️', label: 'Neige modérée'        },
  75: { icon: '❄️',  label: 'Neige forte'          },
  77: { icon: '🌨️', label: 'Grésil'               },
  80: { icon: '🌦️', label: 'Averses légères'      },
  81: { icon: '🌧️', label: 'Averses modérées'     },
  82: { icon: '⛈️',  label: 'Averses violentes'   },
  85: { icon: '🌨️', label: 'Averses de neige'     },
  95: { icon: '⛈️',  label: 'Orage'               },
  96: { icon: '⛈️',  label: 'Orage avec grêle'    },
  99: { icon: '⛈️',  label: 'Orage violent'        },
};

const weatherCache = new Map<string, { data: WeatherResult; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export const fetchWeather = async (
  lat: number,
  lon: number
): Promise<WeatherResult> => {

  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  // Cache valide ?
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    console.log('📦 [Weather] Cache hit:', key);
    return cached.data;
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude',  String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('current',
      'temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m'
    );
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '1');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const c = data.current;
    const wmo = WMO[c.weathercode] ?? { icon: '🌡️', label: 'Météo' };

    const result: WeatherResult = {
      ok:        true,
      temp:      Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      code:      c.weathercode,
      icon:      wmo.icon,
      label:     wmo.label,
      wind:      Math.round(c.windspeed_10m),
      humidity:  Math.round(c.relativehumidity_2m),
    };

    weatherCache.set(key, { data: result, ts: Date.now() });
    console.log('✅ [Weather] OK:', result);
    return result;

  } catch (err) {
    console.warn('⚠️ [Weather] Error:', err);
    return { ok: false, reason: 'network_error' };
  }
};