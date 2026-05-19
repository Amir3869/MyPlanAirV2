// src/features/world/WorldMap.tsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { GeoJsonObject, Feature, Geometry } from 'geojson';
import type { StyleFunction } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Globe from 'react-globe.gl';
import {
  ChevronLeft, Globe as GlobeIcon, Map,
  Trophy, Navigation, Plane, Calendar,
  MapPin, Star, RotateCcw,
} from 'lucide-react';
import { useTripStore, type Trip } from '../../store/tripStore';
import { Flag } from '../../shared/Flag';
import { GlassCard } from '../../shared/GlassCard';
import { fmtRange, tripStatus } from '../../utils/dateHelpers';
import L from 'leaflet';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type ViewMode = 'map2d' | 'globe3d' | 'stats';

type TripPoint = {
  lat:         number;
  lon:         number;
  label:       string;
  country:     string;
  countryCode: string;
  status:      'upcoming' | 'ongoing' | 'finished';
  tripId:      string;
  dateRange:   string;
};

type ArcData = {
  startLat: number;
  startLng: number;
  endLat:   number;
  endLng:   number;
  color:    string;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES COULEURS
// ─────────────────────────────────────────────────────────────────────────────
const COLOR = {
  ongoing:  '#56c5a4',
  upcoming: '#7c8cff',
  finished: 'rgba(255,255,255,0.55)',
  dream:    '#f0b24a',
  base:     '#07070b',
  glass:    'rgba(255,255,255,0.06)',
  border:   'rgba(255,255,255,0.1)',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// HAVERSINE
// ─────────────────────────────────────────────────────────────────────────────
const haversineKm = (
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number => {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─────────────────────────────────────────────────────────────────────────────
// BADGES
// ─────────────────────────────────────────────────────────────────────────────
type Badge = {
  id:          string;
  emoji:       string;
  label:       string;
  description: string;
  unlocked:    boolean;
  xp:          number;
};

const computeBadges = (
  totalTrips:      number,
  uniqueCountries: number,
  totalKm:         number,
  hasOngoing:      boolean,
): Badge[] => [
  {
    id: 'first_trip', emoji: '✈️', label: '1er Voyage',
    description: 'Premier carnet créé',
    unlocked: totalTrips >= 1, xp: 50,
  },
  {
    id: 'explorer', emoji: '🗺️', label: 'Explorateur',
    description: '5 pays visités',
    unlocked: uniqueCountries >= 5, xp: 150,
  },
  {
    id: 'globetrotter', emoji: '🌍', label: 'Globe-trotter',
    description: '10 pays visités',
    unlocked: uniqueCountries >= 10, xp: 300,
  },
  {
    id: 'frequent', emoji: '🎒', label: 'Voyageur Fréquent',
    description: '5 voyages créés',
    unlocked: totalTrips >= 5, xp: 200,
  },
  {
    id: 'km_10k', emoji: '🚀', label: '10 000 km',
    description: '10 000 km parcourus',
    unlocked: totalKm >= 10000, xp: 250,
  },
  {
    id: 'km_50k', emoji: '🛸', label: '50 000 km',
    description: '50 000 km parcourus',
    unlocked: totalKm >= 50000, xp: 500,
  },
  {
    id: 'nomad', emoji: '🏕️', label: 'Nomade',
    description: 'Voyage en cours',
    unlocked: hasOngoing, xp: 100,
  },
  {
    id: 'legend', emoji: '👑', label: 'Légende',
    description: '10 voyages créés',
    unlocked: totalTrips >= 10, xp: 1000,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// RECENTRAGE CARTE
// ─────────────────────────────────────────────────────────────────────────────
const RecenterMap = ({ lat, lon }: { lat: number; lon: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], 5, { animate: true });
  }, [lat, lon, map]);
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD MINI
// ─────────────────────────────────────────────────────────────────────────────
const StatMini = ({
  value, label, color, emoji,
}: {
  value: string | number;
  label: string;
  color: string;
  emoji: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl p-3 text-center flex flex-col items-center gap-1"
    style={{
      background:     `${color}14`,
      border:         `1px solid ${color}30`,
      backdropFilter: 'blur(16px)',
    }}
  >
    <span className="text-lg">{emoji}</span>
    <div
      className="text-xl font-bold font-display tracking-tighter leading-tight"
      style={{ color }}
    >
      {value}
    </div>
    <div className="text-[10px] text-white/45 uppercase tracking-wider leading-tight">
      {label}
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// TRIP LIST ITEM
// ─────────────────────────────────────────────────────────────────────────────
const TripListItem = ({
  trip,
  index,
  onClick,
}: {
  trip:    Trip;
  index:   number;
  onClick: () => void;
}) => {
  const status = tripStatus(trip.startDate, trip.endDate);
  const color  = status === 'ongoing'
    ? COLOR.ongoing
    : status === 'upcoming'
    ? COLOR.upcoming
    : COLOR.finished;

  const statusLabel =
    status === 'ongoing'  ? '● En cours'  :
    status === 'upcoming' ? '○ À venir'   : '✓ Terminé';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', damping: 22 }}
    >
      <GlassCard
        className="p-4 flex items-center gap-3 cursor-pointer"
        onClick={onClick}
      >
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Flag code={trip.countryCode} size={22} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold tracking-tight truncate">
            {trip.isRoadtrip ? `${trip.country} · Roadtrip` : trip.destination}
          </div>
          <div className="text-xs text-white/45 flex items-center gap-1.5 mt-0.5">
            <Calendar size={10} />
            {fmtRange(trip.startDate, trip.endDate)}
          </div>
          {trip.isRoadtrip && trip.destinations && (
            <div className="text-[10px] text-white/30 mt-0.5">
              {trip.destinations.length} villes
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div
            className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
          >
            {statusLabel}
          </div>
          {trip.lat && trip.lon && trip.lat !== 0 && (
            <div className="text-[9px] text-white/25 flex items-center gap-0.5">
              <MapPin size={8} />
              {trip.lat.toFixed(1)}°
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// VUE 2D — Carte Leaflet
// ─────────────────────────────────────────────────────────────────────────────
const Map2DView = ({
  trips,
  gpsPos,
  gpsLoading,
  onRequestGPS,
  centerOnGps,
  visitedCountryCodes,
  upcomingCountryCodes,
  ongoingCountryCodes,
}: {
  trips:                 Trip[];
  gpsPos:                { lat: number; lon: number } | null;
  gpsLoading:            boolean;
  onRequestGPS:          () => void;
  centerOnGps:           boolean;
  visitedCountryCodes:   Set<string>;
  upcomingCountryCodes:  Set<string>;
  ongoingCountryCodes:   Set<string>;
}) => {
  const navigate = useNavigate();

  const [geoData,  setGeoData]  = useState<GeoJsonObject | null>(null);
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    fetch(
      'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson',
    )
      .then((r) => {
        if (!r.ok) throw new Error('GeoJSON fetch failed');
        return r.json();
      })
      .then((data: GeoJsonObject) => setGeoData(data))
      .catch(() => setGeoError(true));
  }, []);

  const countryStyle: StyleFunction = useCallback(
    (feature?: Feature<Geometry>) => {
      if (!feature) return {};
      const props = feature.properties as Record<string, string> | null;
      const code =
        props?.ISO_A2 ??
        props?.iso_a2 ??
        props?.ADM0_A3?.slice(0, 2) ??
        '';
      const upperCode = (code as string).toUpperCase();

      if (ongoingCountryCodes.has(upperCode)) {
        return { fillColor: COLOR.ongoing,  fillOpacity: 0.45, color: COLOR.ongoing,  weight: 1.5 };
      }
      if (upcomingCountryCodes.has(upperCode)) {
        return { fillColor: COLOR.upcoming, fillOpacity: 0.35, color: COLOR.upcoming, weight: 1   };
      }
      if (visitedCountryCodes.has(upperCode)) {
        return { fillColor: 'rgba(255,255,255,0.3)', fillOpacity: 0.2, color: 'rgba(255,255,255,0.3)', weight: 0.8 };
      }
      return { fillColor: 'rgba(255,255,255,0.03)', fillOpacity: 0.03, color: 'rgba(255,255,255,0.08)', weight: 0.5 };
    },
    [ongoingCountryCodes, upcomingCountryCodes, visitedCountryCodes],
  );

  const onEachFeature = useCallback(
    (feature: Feature<Geometry>, layer: L.Layer) => {
      const props = feature.properties as Record<string, string> | null;
      const code  = (props?.ISO_A2 ?? props?.iso_a2 ?? '').toUpperCase();
      const name  = props?.ADMIN ?? props?.name ?? props?.NAME ?? '';

      const relatedTrips = trips.filter((t: Trip) => t.countryCode.toUpperCase() === code);

      if (relatedTrips.length > 0) {
        const status = tripStatus(relatedTrips[0].startDate, relatedTrips[0].endDate);
        const color  =
          status === 'ongoing'  ? COLOR.ongoing  :
          status === 'upcoming' ? COLOR.upcoming : COLOR.finished;

        layer.bindPopup(`
          <div style="
            background: rgba(14,14,20,0.97);
            color: #ffffff;
            border-radius: 16px;
            padding: 14px 16px;
            min-width: 180px;
            font-family: Inter, sans-serif;
            border: 1px solid rgba(255,255,255,0.1);
          ">
            <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:4px;">
              ${name}
            </div>
            ${relatedTrips.map((t: Trip) => `
              <div style="font-weight:700;font-size:15px;letter-spacing:-0.02em;margin-bottom:2px;">
                ${t.isRoadtrip ? `${t.country} · Roadtrip` : t.destination}
              </div>
              <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:4px;">
                ${fmtRange(t.startDate, t.endDate)}
              </div>
            `).join('')}
            <div style="font-size:11px;font-weight:700;color:${color};margin-top:6px;">
              ${relatedTrips.length} voyage${relatedTrips.length > 1 ? 's' : ''}
            </div>
          </div>
        `);
      }
    },
    [trips],
  );

  const tripsWithCoords = trips.filter(
    (t: Trip) => t.lat && t.lon && t.lat !== 0 && t.lon !== 0,
  );

  const mapCenter: [number, number] =
    tripsWithCoords.length > 0
      ? [tripsWithCoords[0].lat!, tripsWithCoords[0].lon!]
      : [20, 0];

  return (
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{
        height:    '52vh',
        border:    `1px solid ${COLOR.border}`,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}
    >
      <MapContainer
        center={mapCenter}
        zoom={2}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        minZoom={1.5}
        maxZoom={12}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {geoData && (
          <GeoJSON
            key={`${visitedCountryCodes.size}-${ongoingCountryCodes.size}-${upcomingCountryCodes.size}`}
            data={geoData}
            style={countryStyle}
            onEachFeature={onEachFeature}
          />
        )}

        {centerOnGps && gpsPos && (
          <RecenterMap lat={gpsPos.lat} lon={gpsPos.lon} />
        )}

        {tripsWithCoords.map((trip: Trip) => {
          const status = tripStatus(trip.startDate, trip.endDate);
          const color  =
            status === 'ongoing'  ? COLOR.ongoing  :
            status === 'upcoming' ? COLOR.upcoming : COLOR.finished;

          return (
            <CircleMarker
              key={trip.id}
              center={[trip.lat!, trip.lon!]}
              radius={status === 'ongoing' ? 9 : 6}
              pathOptions={{
                color,
                fillColor:   color,
                fillOpacity: 1,
                weight:      status === 'ongoing' ? 3 : 2,
              }}
              eventHandlers={{
                click: () => navigate(`/trip/${trip.id}/overview`),
              }}
            >
              <Popup>
                <div
                  style={{
                    background:   'rgba(14,14,20,0.97)',
                    color:        '#ffffff',
                    borderRadius: 16,
                    padding:      '12px 14px',
                    minWidth:     170,
                    fontFamily:   'Inter, sans-serif',
                    border:       '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div
                    style={{
                      fontWeight:    700,
                      fontSize:      15,
                      letterSpacing: '-0.02em',
                      marginBottom:  4,
                    }}
                  >
                    {trip.isRoadtrip
                      ? `${trip.country} · Roadtrip`
                      : trip.destination}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
                    {fmtRange(trip.startDate, trip.endDate)}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color }}>
                    {status === 'ongoing'  ? '● En cours'  :
                     status === 'upcoming' ? '○ À venir'   : '✓ Terminé'}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {gpsPos && (
          <CircleMarker
            center={[gpsPos.lat, gpsPos.lon]}
            radius={7}
            pathOptions={{
              color:       '#ffffff',
              fillColor:   '#ffffff',
              fillOpacity: 1,
              weight:      3,
            }}
          >
            <Popup>
              <div
                style={{
                  background:   'rgba(14,14,20,0.97)',
                  color:        '#ffffff',
                  borderRadius: 12,
                  padding:      '10px 14px',
                  fontFamily:   'Inter, sans-serif',
                  fontWeight:   700,
                  border:       '1px solid rgba(255,255,255,0.1)',
                }}
              >
                📍 Vous êtes ici
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {geoError && (
        <div
          className="absolute bottom-16 left-4 right-4 text-center text-xs py-2 px-3 rounded-xl"
          style={{
            background: 'rgba(240,178,74,0.15)',
            border:     '1px solid rgba(240,178,74,0.3)',
            color:      '#f0b24a',
          }}
        >
          ⚠️ Coloration des pays indisponible (hors-ligne)
        </div>
      )}

      {!geoData && !geoError && (
        <div
          className="absolute bottom-16 left-4 right-4 text-center text-xs py-2 px-3 rounded-xl"
          style={{
            background: COLOR.glass,
            border:     `1px solid ${COLOR.border}`,
            color:      'rgba(255,255,255,0.45)',
          }}
        >
          Chargement des frontières...
        </div>
      )}

      <button
        onClick={onRequestGPS}
        disabled={gpsLoading}
        className="absolute bottom-4 right-4 z-[1000] w-11 h-11 rounded-2xl flex items-center justify-center tap"
        style={{
          background:     'rgba(14,14,20,0.92)',
          border:         `1px solid ${COLOR.border}`,
          backdropFilter: 'blur(16px)',
          boxShadow:      '0 8px 32px rgba(0,0,0,0.4)',
        }}
        aria-label="Ma position GPS"
      >
        {gpsLoading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-4 h-4 border border-white/30 border-t-white rounded-full"
          />
        ) : (
          <Navigation
            size={16}
            style={{ color: gpsPos ? COLOR.ongoing : 'rgba(255,255,255,0.6)' }}
          />
        )}
      </button>

      <div
        className="absolute bottom-4 left-4 z-[1000] flex items-center gap-3 px-3 py-2 rounded-2xl text-[10px]"
        style={{
          background:     'rgba(14,14,20,0.88)',
          border:         `1px solid ${COLOR.border}`,
          backdropFilter: 'blur(16px)',
        }}
      >
        {[
          { color: COLOR.ongoing,  label: 'En cours' },
          { color: COLOR.upcoming, label: 'À venir'  },
          { color: COLOR.finished, label: 'Terminé'  },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-white/55">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// VUE 3D — Globe WebGL
// ─────────────────────────────────────────────────────────────────────────────
const Globe3DView = ({
  tripPoints,
  arcs,
  containerRef,
}: {
  tripPoints:   TripPoint[];
  arcs:         ArcData[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [isReady,    setIsReady]    = useState(false);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setDimensions({
          w: containerRef.current.offsetWidth,
          h: containerRef.current.offsetHeight,
        });
        setIsReady(true);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef]);

  const points = useMemo(
    () =>
      tripPoints.map((p) => ({
        lat:   p.lat,
        lng:   p.lon,
        size:  p.status === 'ongoing' ? 0.8 : 0.55,
        color:
          p.status === 'ongoing'  ? COLOR.ongoing  :
          p.status === 'upcoming' ? COLOR.upcoming : COLOR.finished,
        label: p.label,
      })),
    [tripPoints],
  );

  if (!isReady || dimensions.w === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-2 border-white/15 border-t-[#7c8cff] rounded-full"
        />
      </div>
    );
  }

  return (
    <Globe
      width={dimensions.w}
      height={dimensions.h}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
      backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
      showAtmosphere
      atmosphereColor="#7c8cff"
      atmosphereAltitude={0.18}
      pointsData={points}
      pointAltitude={0.025}
      pointRadius="size"
      pointColor="color"
      pointLabel="label"
      arcsData={arcs}
      arcColor="color"
      arcAltitude={0.22}
      arcStroke={0.5}
      arcDashLength={0.5}
      arcDashGap={0.15}
      arcDashAnimateTime={3000}
      animateIn
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// VUE STATS — Badges + chiffres
// ─────────────────────────────────────────────────────────────────────────────
const StatsView = ({
  stats,
  badges,
}: {
  stats: {
    totalTrips:      number;
    uniqueCountries: number;
    totalKm:         number;
    finishedTrips:   number;
    ongoingTrips:    number;
    upcomingTrips:   number;
    pctWorld:        number;
    totalCountries:  number;
    favoriteCountry: string | null;
    favoriteCode:    string;
    favoriteCount:   number;
  };
  badges: Badge[];
}) => {
  const unlocked = badges.filter((b) => b.unlocked);
  const locked   = badges.filter((b) => !b.unlocked);
  const totalXP  = unlocked.reduce((acc, b) => acc + b.xp, 0);
  const maxXP    = badges.reduce((acc, b) => acc + b.xp, 0);

  return (
    <div className="space-y-5">

      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/45 mb-0.5">
              Niveau Voyageur
            </div>
            <div className="text-2xl font-bold font-display tracking-tighter">
              {totalXP} XP
            </div>
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)' }}
          >
            <Star size={20} className="text-white" />
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-white/8 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(totalXP / maxXP) * 100}%` }}
            transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #7c8cff 0%, #ec4899 100%)' }}
          />
        </div>
        <div className="text-xs text-white/30 mt-1.5">
          {totalXP} / {maxXP} XP · {unlocked.length}/{badges.length} badges débloqués
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-3">
        {[
          { value: stats.totalTrips,      label: 'Voyages',  color: COLOR.upcoming, emoji: '✈️' },
          { value: stats.uniqueCountries, label: 'Pays',     color: COLOR.ongoing,  emoji: '🌍' },
          { value: stats.finishedTrips,   label: 'Terminés', color: COLOR.finished, emoji: '✓'  },
          { value: stats.upcomingTrips,   label: 'À venir',  color: COLOR.dream,    emoji: '📅' },
        ].map((s) => (
          <GlassCard key={s.label} className="p-4 text-center">
            <div className="text-2xl mb-1">{s.emoji}</div>
            <div
              className="text-3xl font-bold font-display tracking-tighter"
              style={{ color: s.color }}
            >
              {s.value}
            </div>
            <div className="text-xs text-white/45 mt-0.5">{s.label}</div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${COLOR.dream}20` }}
          >
            <Plane size={18} style={{ color: COLOR.dream }} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/45">
              Kilomètres parcourus
            </div>
            <div
              className="text-2xl font-bold font-display tracking-tighter"
              style={{ color: COLOR.dream }}
            >
              {stats.totalKm.toLocaleString('fr-FR')} km
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-white/45">Monde exploré</div>
          <div className="text-xs font-bold" style={{ color: COLOR.upcoming }}>
            {stats.pctWorld.toFixed(1)}% — {stats.uniqueCountries}/{stats.totalCountries} pays
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-white/8 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(stats.pctWorld, 0.5)}%` }}
            transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #7c8cff 0%, #56c5a4 50%, #ec4899 100%)',
            }}
          />
        </div>
        <div className="text-xs text-white/25 mt-1.5">
          Il reste {stats.totalCountries - stats.uniqueCountries} pays à découvrir 🌎
        </div>
      </GlassCard>

      {stats.favoriteCountry && (
        <GlassCard className="p-5 flex items-center gap-4">
          <div className="text-3xl">🏆</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-white/45 mb-0.5">
              Destination favorite
            </div>
            <div className="font-bold text-lg tracking-tight flex items-center gap-2">
              <Flag code={stats.favoriteCode} size={20} />
              {stats.favoriteCountry}
            </div>
            <div className="text-xs text-white/45 mt-0.5">
              {stats.favoriteCount} voyage{stats.favoriteCount > 1 ? 's' : ''}
            </div>
          </div>
        </GlassCard>
      )}

      {unlocked.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-white/40 mb-3 px-1">
            🏅 Badges débloqués ({unlocked.length})
          </div>
          <div className="grid grid-cols-2 gap-2">
            {unlocked.map((badge, i) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07, type: 'spring', damping: 20 }}
                className="rounded-2xl p-4 text-center"
                style={{
                  background: 'rgba(124,140,255,0.1)',
                  border:     '1px solid rgba(124,140,255,0.22)',
                }}
              >
                <div className="text-3xl mb-1">{badge.emoji}</div>
                <div className="font-semibold text-sm tracking-tight">{badge.label}</div>
                <div className="text-[10px] text-white/40 mt-0.5">{badge.description}</div>
                <div className="text-[10px] font-bold mt-1" style={{ color: COLOR.upcoming }}>
                  +{badge.xp} XP
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {locked.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-white/25 mb-3 px-1">
            🔒 À débloquer ({locked.length})
          </div>
          <div className="grid grid-cols-2 gap-2">
            {locked.map((badge) => (
              <div
                key={badge.id}
                className="rounded-2xl p-4 text-center opacity-35"
                style={{
                  background: COLOR.glass,
                  border:     `1px solid ${COLOR.border}`,
                }}
              >
                <div className="text-3xl mb-1 grayscale">{badge.emoji}</div>
                <div className="font-semibold text-sm tracking-tight">{badge.label}</div>
                <div className="text-[10px] text-white/40 mt-0.5">{badge.description}</div>
                <div className="text-[10px] text-white/25 mt-1">+{badge.xp} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {unlocked.length === 0 && (
        <GlassCard className="p-8 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-sm text-white/45">
            Créez votre premier voyage pour débloquer des badges !
          </p>
        </GlassCard>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 🌍 WORLDMAP — COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export const WorldMap = () => {
  const navigate = useNavigate();
  const trips    = useTripStore((s) => s.trips);
  const userName = useTripStore((s) => s.userName);

  const [viewMode,    setViewMode]    = useState<ViewMode>('map2d');
  const [gpsPos,      setGpsPos]      = useState<{ lat: number; lon: number } | null>(null);
  const [gpsLoading,  setGpsLoading]  = useState(false);
  const [centerOnGps, setCenterOnGps] = useState(false);

  const globeContainerRef = useRef<HTMLDivElement>(null);

  const visitedCountryCodes = useMemo(
    () =>
      new Set(
        trips
          .filter((t: Trip) => tripStatus(t.startDate, t.endDate) === 'finished')
          .map((t: Trip) => t.countryCode.toUpperCase()),
      ),
    [trips],
  );

  const upcomingCountryCodes = useMemo(
    () =>
      new Set(
        trips
          .filter((t: Trip) => tripStatus(t.startDate, t.endDate) === 'upcoming')
          .map((t: Trip) => t.countryCode.toUpperCase()),
      ),
    [trips],
  );

  const ongoingCountryCodes = useMemo(
    () =>
      new Set(
        trips
          .filter((t: Trip) => tripStatus(t.startDate, t.endDate) === 'ongoing')
          .map((t: Trip) => t.countryCode.toUpperCase()),
      ),
    [trips],
  );

  const tripPoints = useMemo<TripPoint[]>(
    () =>
      trips
        .filter((t: Trip) => t.lat && t.lon && t.lat !== 0 && t.lon !== 0)
        .map((t: Trip) => ({
          lat:         t.lat!,
          lon:         t.lon!,
          label:       t.isRoadtrip ? `${t.country} · Roadtrip` : t.destination,
          country:     t.country,
          countryCode: t.countryCode,
          status:      tripStatus(t.startDate, t.endDate),
          tripId:      t.id,
          dateRange:   fmtRange(t.startDate, t.endDate),
        })),
    [trips],
  );

  const arcs = useMemo<ArcData[]>(() => {
    const pts = tripPoints.filter(
      (p) => p.status === 'finished' || p.status === 'ongoing',
    );
    const result: ArcData[] = [];
    const HOME = { lat: 48.8566, lon: 2.3522 };
    pts.forEach((p) => {
      result.push({
        startLat: HOME.lat,
        startLng: HOME.lon,
        endLat:   p.lat,
        endLng:   p.lon,
        color:
          p.status === 'ongoing'
            ? `${COLOR.ongoing}cc`
            : 'rgba(255,255,255,0.2)',
      });
    });
    return result;
  }, [tripPoints]);

  const stats = useMemo(() => {
    const uniqueCountries = new Set(trips.map((t: Trip) => t.countryCode));
    const HOME_LAT = 48.8566;
    const HOME_LON = 2.3522;
    const totalCountries = 195;

    const totalKm = trips
      .filter(
        (t: Trip) =>
          t.lat && t.lon &&
          tripStatus(t.startDate, t.endDate) !== 'upcoming',
      )
      .reduce(
        (sum: number, t: Trip) =>
          sum + haversineKm(HOME_LAT, HOME_LON, t.lat!, t.lon!) * 2,
        0,
      );

    const countryCounts = trips.reduce<Record<string, number>>((acc, t: Trip) => {
      acc[t.country] = (acc[t.country] ?? 0) + 1;
      return acc;
    }, {});

    const favoriteEntry = Object.entries(countryCounts).sort(
      ([, a], [, b]) => b - a,
    )[0];

    return {
      totalTrips:      trips.length,
      uniqueCountries: uniqueCountries.size,
      totalCountries,
      pctWorld:        Math.min(100, (uniqueCountries.size / totalCountries) * 100),
      totalKm:         Math.round(totalKm),
      finishedTrips:   trips.filter((t: Trip) => tripStatus(t.startDate, t.endDate) === 'finished').length,
      ongoingTrips:    trips.filter((t: Trip) => tripStatus(t.startDate, t.endDate) === 'ongoing').length,
      upcomingTrips:   trips.filter((t: Trip) => tripStatus(t.startDate, t.endDate) === 'upcoming').length,
      hasOngoing:      trips.some((t: Trip)   => tripStatus(t.startDate, t.endDate) === 'ongoing'),
      favoriteCountry: favoriteEntry?.[0] ?? null,
      favoriteCode:    favoriteEntry
        ? (trips.find((t: Trip) => t.country === favoriteEntry[0])?.countryCode ?? '')
        : '',
      favoriteCount: favoriteEntry?.[1] ?? 0,
    };
  }, [trips]);

  const badges = useMemo(
    () =>
      computeBadges(
        stats.totalTrips,
        stats.uniqueCountries,
        stats.totalKm,
        stats.hasOngoing,
      ),
    [stats],
  );

  const requestGPS = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsPos({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setCenterOnGps(true);
        setGpsLoading(false);
        setTimeout(() => setCenterOnGps(false), 1500);
      },
      () => setGpsLoading(false),
      { timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  return (
    <div className="min-h-screen relative bg-[#07070b]">

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="aurora opacity-20" />
      </div>

      <header className="relative z-20 px-5 pt-safe">
        <div className="max-w-3xl mx-auto pt-3 flex items-center justify-between">

          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full glass flex items-center justify-center tap"
            aria-label="Retour"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-center">
            <h1 className="font-display text-xl font-bold tracking-tighter">
              Mon Monde
            </h1>
            <p className="text-xs text-white/45">
              {userName} · {stats.uniqueCountries} pays · {stats.totalKm.toLocaleString('fr-FR')} km
            </p>
          </div>

          <div
            className="flex items-center gap-1 p-1 rounded-full"
            style={{
              background: COLOR.glass,
              border:     `1px solid ${COLOR.border}`,
            }}
          >
            {[
              { mode: 'map2d'   as ViewMode, icon: Map,       label: 'Carte 2D' },
              { mode: 'globe3d' as ViewMode, icon: GlobeIcon, label: 'Globe 3D' },
              { mode: 'stats'   as ViewMode, icon: Trophy,    label: 'Stats'    },
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="w-8 h-8 rounded-full flex items-center justify-center tap transition-all"
                style={{
                  background: viewMode === mode
                    ? 'rgba(124,140,255,0.3)'
                    : 'transparent',
                  border: viewMode === mode
                    ? '1px solid rgba(124,140,255,0.4)'
                    : '1px solid transparent',
                }}
                aria-label={label}
              >
                <Icon
                  size={14}
                  style={{
                    color: viewMode === mode
                      ? COLOR.upcoming
                      : 'rgba(255,255,255,0.5)',
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="relative z-10 px-5 max-w-3xl mx-auto mt-4">
        <div className="grid grid-cols-4 gap-2">
          <StatMini value={stats.totalTrips}                           label="Voyages" color={COLOR.upcoming} emoji="✈️" />
          <StatMini value={stats.uniqueCountries}                      label="Pays"    color={COLOR.ongoing}  emoji="🌍" />
          <StatMini value={`${(stats.totalKm / 1000).toFixed(0)}k`}   label="Km"      color={COLOR.dream}    emoji="🚀" />
          <StatMini value={`${stats.pctWorld.toFixed(1)}%`}           label="Monde"   color="#ec4899"        emoji="🌎" />
        </div>
      </div>

      <div className="relative z-10 px-5 max-w-3xl mx-auto mt-4 pb-32">
        <AnimatePresence mode="wait">

          {viewMode === 'map2d' && (
            <motion.div
              key="map2d"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <Map2DView
                trips={trips}
                gpsPos={gpsPos}
                gpsLoading={gpsLoading}
                onRequestGPS={requestGPS}
                centerOnGps={centerOnGps}
                visitedCountryCodes={visitedCountryCodes}
                upcomingCountryCodes={upcomingCountryCodes}
                ongoingCountryCodes={ongoingCountryCodes}
              />

              {trips.length === 0 ? (
                <GlassCard className="p-8 text-center">
                  <GlobeIcon size={32} className="mx-auto mb-3 text-white/20" />
                  <p className="text-white/45 text-sm">Aucun voyage créé pour l'instant.</p>
                  <p className="text-white/25 text-xs mt-1">
                    Créez votre premier voyage pour le voir sur la carte.
                  </p>
                </GlassCard>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wider text-white/35 px-1">
                    Mes voyages ({trips.length})
                  </div>
                  {trips.map((trip: Trip, i: number) => (
                    <TripListItem
                      key={trip.id}
                      trip={trip}
                      index={i}
                      onClick={() => navigate(`/trip/${trip.id}/overview`)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {viewMode === 'globe3d' && (
            <motion.div
              key="globe3d"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <div
                ref={globeContainerRef}
                className="relative rounded-3xl overflow-hidden"
                style={{
                  height:     '65vh',
                  background: 'radial-gradient(ellipse at center, rgba(10,10,24,0.9) 0%, #07070b 100%)',
                  border:     `1px solid ${COLOR.border}`,
                  boxShadow:  '0 24px 80px rgba(0,0,0,0.6)',
                }}
              >
                <Globe3DView
                  tripPoints={tripPoints}
                  arcs={arcs}
                  containerRef={globeContainerRef}
                />

                <div
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs px-4 py-2 rounded-full whitespace-nowrap"
                  style={{
                    background:     'rgba(14,14,20,0.85)',
                    border:         `1px solid ${COLOR.border}`,
                    backdropFilter: 'blur(16px)',
                    color:          'rgba(255,255,255,0.4)',
                  }}
                >
                  ← Faites tourner le globe →
                </div>

                <button
                  onClick={() => {
                    setViewMode('map2d');
                    setTimeout(() => setViewMode('globe3d'), 50);
                  }}
                  className="absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center tap"
                  style={{
                    background:     'rgba(14,14,20,0.85)',
                    border:         `1px solid ${COLOR.border}`,
                    backdropFilter: 'blur(12px)',
                  }}
                  aria-label="Réinitialiser la vue"
                >
                  <RotateCcw size={14} className="text-white/50" />
                </button>
              </div>

              <GlassCard className="p-4">
                <div className="text-xs uppercase tracking-wider text-white/35 mb-3">Légende</div>
                <div className="flex items-center gap-4 flex-wrap">
                  {[
                    { color: COLOR.ongoing,  label: 'En cours', emoji: '●' },
                    { color: COLOR.upcoming, label: 'À venir',  emoji: '●' },
                    { color: COLOR.finished, label: 'Terminé',  emoji: '●' },
                  ].map(({ color, label, emoji }) => (
                    <div key={label} className="flex items-center gap-2 text-xs text-white/55">
                      <span style={{ color, fontSize: 10 }}>{emoji}</span>
                      {label}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-xs text-white/55">
                    <div
                      className="w-6 h-0.5 rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, rgba(86,197,164,0.6), rgba(255,255,255,0.15))',
                      }}
                    />
                    Arc de trajet
                  </div>
                </div>
              </GlassCard>

              {trips.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wider text-white/35 px-1">
                    Destinations ({trips.length})
                  </div>
                  {trips.map((trip: Trip, i: number) => (
                    <TripListItem
                      key={trip.id}
                      trip={trip}
                      index={i}
                      onClick={() => navigate(`/trip/${trip.id}/overview`)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {viewMode === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <StatsView stats={stats} badges={badges} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};