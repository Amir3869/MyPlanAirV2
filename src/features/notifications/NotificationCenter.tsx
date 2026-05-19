// src/features/notifications/NotificationCenter.tsx
// ════════════════════════════════════════════════
// SEUL CHANGEMENT PAR RAPPORT AU FICHIER EXISTANT :
// Fonction getNavigationSection dans NotifCard
// + handleNavigate dans NotificationCenter
// Tout le reste est IDENTIQUE à ce que tu as envoyé
// ════════════════════════════════════════════════
import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, X, CheckCheck, Plane,
  Calendar, Lightbulb, ChevronRight,
  ExternalLink, Wallet, BellOff, Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useTripStore,
  type AppNotification,
  type Trip,
} from '../../store/tripStore';
import { tripStatus, daysBetween } from '../../utils/dateHelpers';
import { haptic } from '../../utils/haptic';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS AGENDA
// ─────────────────────────────────────────────────────────────────────────────
const buildGoogleCalendarUrl = (params: {
  title: string; startDate: string; endDate: string; details?: string;
}): string => {
  const fmt  = (iso: string) => iso.replace(/-/g, '');
  const base = 'https://calendar.google.com/calendar/render';
  const qs   = new URLSearchParams({
    action:  'TEMPLATE',
    text:    params.title,
    dates:   `${fmt(params.startDate)}/${fmt(params.endDate)}`,
    details: params.details ?? 'Voyage créé avec MyTrip ✈️',
    sf:      'true',
    output:  'xml',
  });
  return `${base}?${qs.toString()}`;
};

const downloadICS = (params: {
  title: string; startDate: string; endDate: string; details?: string;
}) => {
  const fmt = (iso: string) => iso.replace(/-/g, '') + 'T000000Z';
  const uid = `mytrip-${Date.now()}@mytrip.app`;
  const icsContent = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//MyTrip//MyTrip App//FR',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${params.startDate.replace(/-/g, '')}`,
    `DTEND;VALUE=DATE:${params.endDate.replace(/-/g, '')}`,
    `SUMMARY:${params.title}`,
    `DESCRIPTION:${params.details ?? 'Voyage créé avec MyTrip ✈️'}`,
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date().toISOString().slice(0, 10))}`,
    'STATUS:CONFIRMED', 'TRANSP:TRANSPARENT',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `mytrip-${params.title.replace(/\s+/g, '-').toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ─────────────────────────────────────────────────────────────────────────────
// PRIORITÉ
// ─────────────────────────────────────────────────────────────────────────────
type Priority = 'urgent' | 'normal' | 'info';

const getNotifPriority = (notif: AppNotification): Priority => {
  if (notif.type === 'countdown') {
    const match = notif.title.match(/dans (\d+) jour/);
    const days  = match ? parseInt(match[1], 10) : 99;
    return days <= 3 ? 'urgent' : 'normal';
  }
  if (notif.type === 'checklist') return 'normal';
  if (notif.type === 'rate')      return 'normal';
  return 'info';
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  urgent: { label: 'Urgent',  color: '#ef4444', bg: 'rgba(239,68,68,0.15)'  },
  normal: { label: 'À faire', color: '#f0b24a', bg: 'rgba(240,178,74,0.15)' },
  info:   { label: 'Info',    color: '#56c5a4', bg: 'rgba(86,197,164,0.15)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// GÉNÉRATEUR INTELLIGENT
// ─────────────────────────────────────────────────────────────────────────────
export const useNotificationGenerator = () => {
  const trips                    = useTripStore((s) => s.trips);
  const notifications            = useTripStore((s) => s.notifications);
  const notificationsEnabled     = useTripStore((s) => s.notificationsEnabled);
  const notifDisabledTrips       = useTripStore((s) => s.notifDisabledTrips);
  const addNotification          = useTripStore((s) => s.addNotification);
  const replaceOrAddNotification = useTripStore((s) => s.replaceOrAddNotification);

  useEffect(() => {
    if (trips.length === 0)    return;
    if (!notificationsEnabled) return;

    const RECHECK_KEY  = 'mytrip-notif-lastcheck';
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    const lastCheckRaw = sessionStorage.getItem(RECHECK_KEY);
    const lastCheck    = lastCheckRaw ? parseInt(lastCheckRaw, 10) : 0;
    const now          = Date.now();
    if (now - lastCheck < SIX_HOURS_MS) return;
    sessionStorage.setItem(RECHECK_KEY, String(now));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeTrips = trips.filter((t) => {
      const s = tripStatus(t.startDate, t.endDate);
      return s === 'upcoming' || s === 'ongoing';
    });
    if (activeTrips.length === 0) return;

    const sorted      = [...activeTrips].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
    const ongoingTrip = sorted.find((t) => tripStatus(t.startDate, t.endDate) === 'ongoing');
    const nextTrip: Trip = ongoingTrip ?? sorted[0];
    if (!nextTrip) return;
    if (notifDisabledTrips.includes(nextTrip.id)) return;

    const status    = tripStatus(nextTrip.startDate, nextTrip.endDate);
    const startDate = new Date(nextTrip.startDate);
    startDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.round((startDate.getTime() - today.getTime()) / 86400000);

    const label = nextTrip.isRoadtrip
      ? `${nextTrip.country} · Roadtrip`
      : nextTrip.destination;

    if (status === 'upcoming') {
      if ([30, 14, 7, 3, 1].includes(daysUntil)) {
        replaceOrAddNotification(
          {
            type:      'countdown',
            tripId:    nextTrip.id,
            title:     `✈️ ${label} dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''} !`,
            body:      daysUntil <= 3
              ? 'Dernière ligne droite — vérifiez votre checklist et vos documents.'
              : daysUntil <= 7
                ? "Plus qu'une semaine ! Finalisez votre préparation."
                : `Il reste ${daysUntil} jours avant votre grande aventure.`,
            startDate: nextTrip.startDate,
            endDate:   nextTrip.endDate,
            tripName:  label,
          },
          'countdown',
        );
      }

      if (daysUntil <= 7 && daysUntil > 0) {
        const remaining = nextTrip.checklist.filter((c) => !c.done).length;
        if (remaining > 0) {
          replaceOrAddNotification(
            {
              type:   'checklist',
              tripId: nextTrip.id,
              title:  `📋 ${remaining} item${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''} sur votre checklist`,
              body:   daysUntil <= 3
                ? `Urgence ! ${remaining} chose${remaining > 1 ? 's' : ''} à préparer avant ${label}.`
                : `Checklist incomplète pour ${label}. Plus que ${daysUntil} jours !`,
            },
            'checklist',
          );
        }
      }

      if (daysUntil <= 3 && nextTrip.checklist.length === 0) {
        const alreadyEmpty = notifications.some(
          (n) => n.tripId === nextTrip.id && n.type === 'checklist' && n.title.includes('vide'),
        );
        if (!alreadyEmpty) {
          addNotification({
            type:   'checklist',
            tripId: nextTrip.id,
            title:  '📋 Checklist vide — départ imminent !',
            body:   `Vous partez dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''} pour ${label} sans rien dans la checklist.`,
          });
        }
      }

      if (daysUntil <= 14 && nextTrip.budget === 0) {
        const alreadyBudget = notifications.some(
          (n) => n.tripId === nextTrip.id && n.type === 'rate' && n.title.includes('Budget non défini'),
        );
        if (!alreadyBudget) {
          addNotification({
            type:   'rate',
            tripId: nextTrip.id,
            title:  '💰 Budget non défini pour ce voyage',
            body:   `Définissez un budget pour ${label} afin de suivre vos dépenses.`,
          });
        }
      }

      if (nextTrip.budget > 0) {
        const spent   = nextTrip.expenses.reduce((s, e) => s + e.amount, 0);
        const percent = (spent / nextTrip.budget) * 100;
        if (percent >= 80) {
          replaceOrAddNotification(
            {
              type:   'rate',
              tripId: nextTrip.id,
              title:  `💰 Budget à ${Math.round(percent)}% — attention !`,
              body:   `${Math.round(spent)} ${nextTrip.currency} sur ${nextTrip.budget} ${nextTrip.currency} pour ${label}.`,
            },
            'Budget à',
          );
        }
      }

      if (nextTrip.isRoadtrip && daysUntil <= 14 && (nextTrip.destinations?.length ?? 0) === 0) {
        const alreadyRoadtrip = notifications.some(
          (n) => n.tripId === nextTrip.id && n.type === 'tip' && n.title.includes('sans étapes'),
        );
        if (!alreadyRoadtrip) {
          addNotification({
            type:   'tip',
            tripId: nextTrip.id,
            title:  '🗺️ Roadtrip sans étapes définies',
            body:   `Votre roadtrip en ${nextTrip.country} n'a pas d'étapes. Ajoutez vos villes !`,
          });
        }
      }
    }

    if (status === 'ongoing') {
      const totalDays = daysBetween(nextTrip.startDate, nextTrip.endDate);
      const elapsed   = daysBetween(nextTrip.startDate, new Date().toISOString().slice(0, 10));
      const dayIndex  = Math.min(elapsed, totalDays);

      replaceOrAddNotification(
        {
          type:   'tip',
          tripId: nextTrip.id,
          title:  `🌍 Jour ${dayIndex}/${totalDays} — Bon voyage !`,
          body:   `Profitez de votre ${nextTrip.isRoadtrip ? `roadtrip en ${nextTrip.country}` : `séjour à ${nextTrip.destination}`}. N'oubliez pas de noter vos dépenses !`,
        },
        'Jour',
      );

      if (nextTrip.budget > 0) {
        const spent   = nextTrip.expenses.reduce((s, e) => s + e.amount, 0);
        const percent = (spent / nextTrip.budget) * 100;
        if (percent >= 80) {
          replaceOrAddNotification(
            {
              type:   'rate',
              tripId: nextTrip.id,
              title:  `💰 Budget à ${Math.round(percent)}% consommé`,
              body:   `${Math.round(spent)} ${nextTrip.currency} sur ${nextTrip.budget} ${nextTrip.currency}. Attention !`,
            },
            'Budget à',
          );
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips.length]);
};

// ─────────────────────────────────────────────────────────────────────────────
// ICÔNE PAR TYPE
// ─────────────────────────────────────────────────────────────────────────────
const NotifIcon = ({ type }: { type: AppNotification['type'] }) => {
  const configs: Record<
    AppNotification['type'],
    { icon: React.ElementType; color: string; bg: string }
  > = {
    countdown: { icon: Plane,      color: '#7c8cff', bg: 'rgba(124,140,255,0.15)' },
    checklist: { icon: CheckCheck, color: '#56c5a4', bg: 'rgba(86,197,164,0.15)'  },
    rate:      { icon: Wallet,     color: '#f0b24a', bg: 'rgba(240,178,74,0.15)'  },
    tip:       { icon: Lightbulb,  color: '#ec4899', bg: 'rgba(236,72,153,0.15)'  },
  };
  const cfg  = configs[type];
  const Icon = cfg.icon;
  return (
    <div
      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: cfg.bg }}
    >
      <Icon size={16} style={{ color: cfg.color }} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TOAST CONFIRMATION AGENDA
// ─────────────────────────────────────────────────────────────────────────────
const AgendaToast = ({
  tripName,
  type,
  onClose,
}: {
  tripName: string;
  type:     'google' | 'ical';
  onClose:  () => void;
}) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1,  y: 0,   scale: 1    }}
      exit={{ opacity: 0,    y: -12,  scale: 0.96 }}
      transition={{ type: 'spring', damping: 24, stiffness: 300 }}
      className="mx-4 mb-2 rounded-2xl overflow-hidden"
      style={{
        background:     'rgba(86,197,164,0.12)',
        border:         '1px solid rgba(86,197,164,0.3)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(86,197,164,0.2)' }}
        >
          <Calendar size={14} style={{ color: '#56c5a4' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: '#56c5a4' }}>
            ✓ Ajouté à l'agenda
          </p>
          <p className="text-[11px] text-white/40 truncate">
            {type === 'google'
              ? `«${tripName}» — Google Calendar ouvert`
              : `«${tripName}» — fichier .ics téléchargé`}
          </p>
        </div>
        <button onClick={onClose} className="tap opacity-50 hover:opacity-80 transition">
          <X size={13} className="text-white" />
        </button>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CARTE NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────
const NotifCard = ({
  notif,
  onRead,
  onNavigate,
  onRemove,
  onAgendaSuccess,
}: {
  notif:           AppNotification;
  onRead:          (id: string) => void;
  onNavigate:      (tripId?: string, section?: string) => void;
  onRemove:        (id: string) => void;
  onAgendaSuccess: (tripName: string, type: 'google' | 'ical') => void;
}) => {
  const [agendaOpen, setAgendaOpen] = useState(false);

  const priority = getNotifPriority(notif);
  const prioCfg  = PRIORITY_CONFIG[priority];

  const hasAgenda = !!(
    (notif.type === 'countdown' || notif.type === 'tip') &&
    notif.startDate && notif.endDate && notif.tripName
  );

  // ✅ FIX — Routes correctes selon App.tsx
  const getNavigationSection = (): string => {
    if (notif.type === 'checklist') return 'essentials'; // ← était 'checklist'
    if (notif.type === 'rate')      return 'budget';     // ← était 'expenses'
    if (notif.type === 'tip')       return 'overview';
    return 'overview';
  };

  const handleGoogleCal = () => {
    if (!notif.startDate || !notif.endDate || !notif.tripName) return;
    haptic([5, 20, 5]);
    window.open(
      buildGoogleCalendarUrl({
        title:     `✈️ ${notif.tripName}`,
        startDate: notif.startDate,
        endDate:   notif.endDate,
        details:   `Voyage planifié avec MyTrip\n${notif.body}`,
      }),
      '_blank',
      'noopener,noreferrer',
    );
    setAgendaOpen(false);
    onRead(notif.id);
    onAgendaSuccess(notif.tripName, 'google');
  };

  const handleIcal = () => {
    if (!notif.startDate || !notif.endDate || !notif.tripName) return;
    haptic([5, 20, 5]);
    downloadICS({
      title:     `✈️ ${notif.tripName}`,
      startDate: notif.startDate,
      endDate:   notif.endDate,
      details:   `Voyage planifié avec MyTrip\n${notif.body}`,
    });
    setAgendaOpen(false);
    onRead(notif.id);
    onAgendaSuccess(notif.tripName, 'ical');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1,  y: 0,  scale: 1    }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: notif.read
          ? 'rgba(255,255,255,0.03)'
          : 'rgba(124,140,255,0.06)',
        border: notif.read
          ? '1px solid rgba(255,255,255,0.06)'
          : '1px solid rgba(124,140,255,0.2)',
      }}
    >
      <button
        onClick={() => { haptic(6); onRemove(notif.id); }}
        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center tap z-10 opacity-40 hover:opacity-80 transition-opacity"
        style={{
          background: 'rgba(255,255,255,0.08)',
          border:     '1px solid rgba(255,255,255,0.12)',
        }}
        aria-label="Supprimer cette notification"
      >
        <X size={11} className="text-white" />
      </button>

      <div className="flex items-start gap-3 p-4 pr-8">
        <NotifIcon type={notif.type} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              {!notif.read && priority !== 'info' && (
                <div
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full mb-1.5"
                  style={{
                    background: prioCfg.bg,
                    border:     `1px solid ${prioCfg.color}40`,
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: prioCfg.color }}
                  />
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: prioCfg.color }}
                  >
                    {prioCfg.label}
                  </span>
                </div>
              )}
              <div
                className="font-semibold text-sm tracking-tight leading-tight"
                style={{ color: notif.read ? 'rgba(255,255,255,0.65)' : 'white' }}
              >
                {notif.title}
              </div>
            </div>
            {!notif.read && (
              <div
                className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                style={{ background: '#7c8cff' }}
              />
            )}
          </div>

          <p className="text-xs text-white/45 mt-1 leading-relaxed">{notif.body}</p>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {notif.tripId && (
              <button
                onClick={() => {
                  haptic(6);
                  onRead(notif.id);
                  // ✅ FIX — Utilise getNavigationSection() avec les bonnes routes
                  onNavigate(notif.tripId, getNavigationSection());
                }}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full tap"
                style={{
                  background: 'rgba(124,140,255,0.15)',
                  border:     '1px solid rgba(124,140,255,0.25)',
                  color:      '#a5b4fc',
                }}
              >
                {notif.type === 'checklist'
                  ? 'Voir la checklist'
                  : notif.type === 'rate'
                    ? 'Voir le budget'
                    : 'Voir le voyage'}
                <ChevronRight size={11} />
              </button>
            )}

            {hasAgenda && (
              <button
                onClick={() => { haptic(6); setAgendaOpen(!agendaOpen); }}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full tap"
                style={{
                  background: agendaOpen
                    ? 'rgba(86,197,164,0.2)'
                    : 'rgba(255,255,255,0.06)',
                  border: agendaOpen
                    ? '1px solid rgba(86,197,164,0.35)'
                    : '1px solid rgba(255,255,255,0.1)',
                  color: agendaOpen ? '#56c5a4' : 'rgba(255,255,255,0.5)',
                }}
              >
                <Calendar size={11} />
                Agenda
              </button>
            )}

            {!notif.read && (
              <button
                onClick={() => { haptic(6); onRead(notif.id); }}
                className="text-xs text-white/25 tap hover:text-white/45 transition ml-auto"
              >
                ✓ Lu
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {agendaOpen && hasAgenda && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-xs font-semibold text-white/60 mb-1">
                📅 Ajouter «{notif.tripName}» à votre agenda
              </p>
              <p className="text-[11px] text-white/30 mb-3 leading-relaxed">
                Le voyage sera ajouté aux dates prévues dans votre calendrier.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleGoogleCal}
                  className="flex items-center gap-2 px-3 py-3 rounded-2xl tap"
                  style={{
                    background: 'rgba(66,133,244,0.12)',
                    border:     '1px solid rgba(66,133,244,0.25)',
                  }}
                >
                  <ExternalLink size={13} style={{ color: '#4285F4' }} />
                  <div className="text-left">
                    <div className="text-xs font-bold" style={{ color: '#4285F4' }}>
                      Google Calendar
                    </div>
                    <div className="text-[9px] text-white/30">Ouvre le navigateur</div>
                  </div>
                </button>
                <button
                  onClick={handleIcal}
                  className="flex items-center gap-2 px-3 py-3 rounded-2xl tap"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border:     '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <Calendar size={13} className="text-white/60" />
                  <div className="text-left">
                    <div className="text-xs font-bold text-white/80">iCal / Outlook</div>
                    <div className="text-[9px] text-white/30">Télécharge .ics</div>
                  </div>
                </button>
              </div>
              <p className="text-[10px] text-white/20 mt-2 leading-relaxed">
                💡 Le .ics s'ouvre dans Apple Calendar, Outlook ou tout agenda compatible.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION LABEL
// ─────────────────────────────────────────────────────────────────────────────
const SectionLabel = ({ label }: { label: string }) => (
  <div
    className="text-[10px] font-bold uppercase tracking-widest px-1 mb-2 mt-1"
    style={{ color: 'rgba(255,255,255,0.25)' }}
  >
    {label}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION CENTER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export const NotificationCenter = ({
  open,
  onClose,
}: {
  open:    boolean;
  onClose: () => void;
}) => {
  const navigate = useNavigate();

  const notifications           = useTripStore((s) => s.notifications);
  const notificationsEnabled    = useTripStore((s) => s.notificationsEnabled);
  const notifDisabledTrips      = useTripStore((s) => s.notifDisabledTrips);
  const trips                   = useTripStore((s) => s.trips);
  const markNotifRead           = useTripStore((s) => s.markNotifRead);
  const markAllRead             = useTripStore((s) => s.markAllNotifsRead);
  const clearAll                = useTripStore((s) => s.clearNotifications);
  const removeNotification      = useTripStore((s) => s.removeNotification);
  const setNotificationsEnabled = useTripStore((s) => s.setNotificationsEnabled);
  const toggleNotifForTrip      = useTripStore((s) => s.toggleNotifForTrip);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [agendaToast,  setAgendaToast]  = useState<{
    tripName: string;
    type: 'google' | 'ical';
  } | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (open && unreadCount > 0) haptic([5, 15, 5]);
  }, [open, unreadCount]);

  const urgentNotifs = notifications.filter((n) => {
    const p = getNotifPriority(n);
    return (p === 'urgent' || p === 'normal') && !n.read;
  });
  const infoNotifs = notifications.filter((n) => {
    const p = getNotifPriority(n);
    return p === 'info' || n.read;
  });

  const activeTrips = trips.filter((t) => {
    const s = tripStatus(t.startDate, t.endDate);
    return s === 'upcoming' || s === 'ongoing';
  });

  // ✅ FIX — handleNavigate avec routes correctes
  const handleNavigate = useCallback(
    (tripId?: string, section?: string) => {
      onClose();
      if (!tripId) return;
      // Routes valides selon App.tsx
      const validSections = ['overview', 'parcours', 'budget', 'essentials', 'chat'];
      const target = section && validSections.includes(section) ? section : 'overview';
      setTimeout(() => navigate(`/trip/${tripId}/${target}`), 220);
    },
    [navigate, onClose],
  );

  const handleMarkAllRead = () => { haptic([5, 20, 5]); markAllRead(); };
  const handleClearAll    = () => { haptic([5, 20, 5]); clearAll(); };

  const handleAgendaSuccess = useCallback(
    (tripName: string, type: 'google' | 'ical') => {
      setAgendaToast({ tripName, type });
    },
    [],
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0,   y: -20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed top-0 left-0 right-0 z-[90] max-h-[85vh] overflow-hidden"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <div
              className="mx-4 mt-4 rounded-3xl overflow-hidden flex flex-col"
              style={{
                background:     'rgba(14,14,22,0.97)',
                border:         '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(40px)',
                boxShadow:      '0 32px 80px rgba(0,0,0,0.6)',
                maxHeight:      'calc(85vh - 16px)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: unreadCount > 0
                        ? 'rgba(124,140,255,0.2)'
                        : 'rgba(255,255,255,0.07)',
                    }}
                  >
                    <Bell
                      size={16}
                      style={{
                        color: unreadCount > 0 ? '#7c8cff' : 'rgba(255,255,255,0.5)',
                      }}
                    />
                  </div>
                  <div>
                    <div className="font-bold tracking-tight text-base">Notifications</div>
                    {unreadCount > 0 ? (
                      <div className="text-xs text-white/45">
                        {unreadCount} non lue{unreadCount > 1 ? 's' : ''} · prochain voyage
                      </div>
                    ) : (
                      <div className="text-xs text-white/30">Tout est à jour ✓</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { haptic(6); setSettingsOpen(!settingsOpen); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center tap"
                    style={{
                      background: settingsOpen
                        ? 'rgba(124,140,255,0.2)'
                        : 'rgba(255,255,255,0.06)',
                      border: settingsOpen
                        ? '1px solid rgba(124,140,255,0.3)'
                        : '1px solid rgba(255,255,255,0.1)',
                    }}
                    aria-label="Paramètres notifications"
                  >
                    <BellOff
                      size={13}
                      style={{ color: settingsOpen ? '#7c8cff' : 'rgba(255,255,255,0.5)' }}
                    />
                  </button>

                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full tap"
                      style={{
                        background: 'rgba(124,140,255,0.12)',
                        color:      '#a5b4fc',
                        border:     '1px solid rgba(124,140,255,0.2)',
                      }}
                    >
                      Tout lire
                    </button>
                  )}

                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full flex items-center justify-center tap"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                    aria-label="Fermer"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Panneau paramètres */}
              <AnimatePresence>
                {settingsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden flex-shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <div className="px-5 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold">Notifications activées</div>
                          <div className="text-xs text-white/35">Toutes les alertes voyage</div>
                        </div>
                        <button
                          onClick={() => { haptic(8); setNotificationsEnabled(!notificationsEnabled); }}
                          className="w-12 h-6 rounded-full transition-all relative flex-shrink-0"
                          style={{
                            background: notificationsEnabled
                              ? 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)'
                              : 'rgba(255,255,255,0.12)',
                          }}
                          aria-label={notificationsEnabled ? 'Désactiver' : 'Activer'}
                        >
                          <motion.div
                            animate={{ x: notificationsEnabled ? 26 : 2 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            className="absolute top-1 w-4 h-4 rounded-full bg-white"
                          />
                        </button>
                      </div>

                      {activeTrips.length > 0 && notificationsEnabled && (
                        <div>
                          <div className="text-[11px] text-white/30 uppercase tracking-wider mb-2">
                            Par voyage
                          </div>
                          {activeTrips.map((t) => {
                            const isDisabled = notifDisabledTrips.includes(t.id);
                            const lbl        = t.isRoadtrip
                              ? `${t.country} · Roadtrip`
                              : t.destination;
                            return (
                              <div
                                key={t.id}
                                className="flex items-center justify-between py-1.5"
                              >
                                <div className="text-sm text-white/70 truncate flex-1 mr-3">
                                  {lbl}
                                </div>
                                <button
                                  onClick={() => { haptic(6); toggleNotifForTrip(t.id); }}
                                  className="w-10 h-5 rounded-full transition-all relative flex-shrink-0"
                                  style={{
                                    background: !isDisabled
                                      ? 'rgba(124,140,255,0.4)'
                                      : 'rgba(255,255,255,0.1)',
                                  }}
                                  aria-label={isDisabled ? 'Activer' : 'Désactiver'}
                                >
                                  <motion.div
                                    animate={{ x: !isDisabled ? 21 : 2 }}
                                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white"
                                  />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Toast agenda */}
              <AnimatePresence>
                {agendaToast && (
                  <AgendaToast
                    key="agenda-toast"
                    tripName={agendaToast.tripName}
                    type={agendaToast.type}
                    onClose={() => setAgendaToast(null)}
                  />
                )}
              </AnimatePresence>

              {/* Liste */}
              <div className="overflow-y-auto flex-1 px-4 py-3">
                <AnimatePresence mode="popLayout">
                  {notifications.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center py-12 gap-3"
                    >
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      >
                        <Bell size={24} className="text-white/20" />
                      </div>
                      <p className="text-sm text-white/35 text-center">
                        Aucune notification pour le moment.
                        <br />
                        <span className="text-white/20 text-xs">
                          Les alertes voyage apparaîtront ici.
                        </span>
                      </p>
                    </motion.div>
                  ) : (
                    <div className="space-y-2">
                      {urgentNotifs.length > 0 && (
                        <>
                          <SectionLabel label="À traiter" />
                          {urgentNotifs.map((notif) => (
                            <NotifCard
                              key={notif.id}
                              notif={notif}
                              onRead={markNotifRead}
                              onNavigate={handleNavigate}
                              onRemove={removeNotification}
                              onAgendaSuccess={handleAgendaSuccess}
                            />
                          ))}
                        </>
                      )}
                      {infoNotifs.length > 0 && (
                        <>
                          <SectionLabel
                            label={urgentNotifs.length > 0 ? 'Informations' : 'Notifications'}
                          />
                          {infoNotifs.map((notif) => (
                            <NotifCard
                              key={notif.id}
                              notif={notif}
                              onRead={markNotifRead}
                              onNavigate={handleNavigate}
                              onRemove={removeNotification}
                              onAgendaSuccess={handleAgendaSuccess}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div
                  className="flex items-center justify-center py-3 flex-shrink-0"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <button
                    onClick={handleClearAll}
                    className="flex items-center gap-1.5 text-xs text-white/25 tap hover:text-white/45 transition px-4 py-1.5"
                  >
                    <Trash2 size={11} />
                    Tout effacer
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BADGE CLOCHE
// ─────────────────────────────────────────────────────────────────────────────
export const BellWithBadge = ({ onClick }: { onClick: () => void }) => {
  const unreadCount = useTripStore(
    (s) => s.notifications.filter((n) => !n.read).length,
  );

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="w-11 h-11 glass rounded-full flex items-center justify-center tap relative"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
    >
      <Bell size={18} />
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', damping: 16, stiffness: 300 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
            style={{
              background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
              fontSize:   '10px',
              fontWeight: 700,
              color:      'white',
              boxShadow:  '0 2px 8px rgba(var(--accent-from-rgb, 124,140,255), 0.5)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};