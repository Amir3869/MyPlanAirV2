// src/store/tripStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type StepPeriod  = 'morning' | 'afternoon' | 'night';
export type StepType    = 'sight' | 'food' | 'transport' | 'lodging' | 'other';
export type AppTheme    = 'dark' | 'ocean' | 'sunset' | 'forest' | 'minimal';
export type TravelStyle = 'solo' | 'couple' | 'family' | 'business';

export type AppNotification = {
  id:        string;
  type:      'countdown' | 'checklist' | 'rate' | 'tip';
  tripId?:   string;
  title:     string;
  body:      string;
  read:      boolean;
  createdAt: string;
  startDate?: string;
  endDate?:   string;
  tripName?:  string;
};

export type TripDestination = {
  city:        string;
  countryCode: string;
  lat?:        number;
  lon?:        number;
  fromDate:    string;
  toDate:      string;
  fromDay:     number;
  toDay:       number;
};

export type Step = {
  id:      string;
  day:     number;
  period:  StepPeriod;
  type:    StepType;
  title:   string;
  place:   string;
  notes?:  string;
  done?:   boolean;
};

export type Expense = {
  id:        string;
  category:  'transport' | 'food' | 'lodging' | 'leisure' | 'shopping' | 'other';
  label:     string;
  amount:    number;
  date:      string;
  private?:  boolean;
};

export type ChecklistItem = {
  id:    string;
  label: string;
  done:  boolean;
};

export type Trip = {
  id:           string;
  destination:  string;
  country:      string;
  countryCode:  string;
  capital?:     string;
  startDate:    string;
  endDate:      string;
  budget:       number;
  currency:     string;
  homeCurrency: string;
  photoUrl:     string;
  lat?:         number;
  lon?:         number;
  steps:        Step[];
  expenses:     Expense[];
  checklist:    ChecklistItem[];
  notes:        string;
  createdAt:    string;
  isRoadtrip?:   boolean;
  destinations?: TripDestination[];
};

export type ChatMessage = {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  createdAt: string;
};

// ✅ NOUVEAU — Emojis disponibles pour le picker utilisateur
export const USER_EMOJIS = [
  // Voyage
  '✈️', '🌍', '🏔️', '🏖️', '🗺️', '🎒', '🧳', '🛸', '🚀', '🏕️',
  // Lifestyle
  '☕', '📸', '🎵', '🍜', '🏄', '🎨', '📚', '🌿', '🍷', '🎭',
  // Ambiance
  '🌙', '⭐', '🔥', '💎', '🦋', '🌊', '🏆', '🎯', '✨', '🦅',
] as const;

type State = {
  trips:           Trip[];
  homeCurrency:    string;
  authed:          boolean;
  userName:        string;
  // ✅ NOUVEAU
  userEmoji:       string;
  theme:           AppTheme;
  onboardingDone:  boolean;
  travelStyle:     TravelStyle | null;

  notifications:          AppNotification[];
  notificationsEnabled:   boolean;
  notifDisabledTrips:     string[];

  chatHistories: Record<string, ChatMessage[]>;

  aiSuggestions:   Record<string, string[]>;
  usedSuggestions: Record<string, string[]>;

  // Auth
  setAuthed:    (v: boolean, name?: string) => void;
  setUserName:  (name: string) => void;
  // ✅ NOUVEAU
  setUserEmoji: (emoji: string) => void;

  // Preferences
  setHomeCurrency: (c: string) => void;
  setTheme:        (t: AppTheme) => void;

  // Onboarding
  completeOnboarding: (data: {
    userName:     string;
    travelStyle:  TravelStyle;
    homeCurrency: string;
    theme:        AppTheme;
  }) => void;

  // Trips CRUD
  addTrip:    (t: Trip) => void;
  removeTrip: (id: string) => void;
  updateTrip: (id: string, patch: Partial<Trip>) => void;

  // Steps
  addStep:    (tripId: string, step: Step) => void;
  updateStep: (tripId: string, stepId: string, patch: Partial<Step>) => void;
  removeStep: (tripId: string, stepId: string) => void;

  // Expenses
  addExpense:    (tripId: string, e: Expense) => void;
  removeExpense: (tripId: string, id: string) => void;

  // Checklist
  toggleChecklist:     (tripId: string, id: string) => void;
  addChecklistItem:    (tripId: string, label: string) => void;
  removeChecklistItem: (tripId: string, id: string) => void;
  setChecklist:        (tripId: string, items: ChecklistItem[]) => void;

  // Notes
  setNotes: (tripId: string, notes: string) => void;

  // AI Suggestions
  setAiSuggestions:     (key: string, suggestions: string[]) => void;
  markSuggestionUsed:   (key: string, suggestion: string) => void;
  clearUsedSuggestions: (key: string) => void;

  // Notification actions
  addNotification:          (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  replaceOrAddNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>, matchKey: string) => void;
  markNotifRead:            (id: string) => void;
  markAllNotifsRead:        () => void;
  removeNotification:       (id: string) => void;
  clearNotifications:       () => void;
  setNotificationsEnabled:  (v: boolean) => void;
  toggleNotifForTrip:       (tripId: string) => void;

  // Chat actions
  addChatMessage:   (tripId: string, msg: Omit<ChatMessage, 'id' | 'createdAt'>) => void;
  clearChatHistory: (tripId: string) => void;
};

export const useTripStore = create<State>()(
  persist(
    (set) => ({
      trips:           [],
      homeCurrency:    'EUR',
      authed:          false,
      userName:        'Voyageur',
      userEmoji:       '✈️',        // ✅ NOUVEAU — défaut
      theme:           'dark',
      onboardingDone:  false,
      travelStyle:     null,

      notifications:        [],
      notificationsEnabled: true,
      notifDisabledTrips:   [],

      chatHistories:   {},
      aiSuggestions:   {},
      usedSuggestions: {},

      // ── Auth ──────────────────────────────────────────────────────────────
      setAuthed:    (v, name) => set((s) => ({ authed: v, userName: name ?? s.userName })),
      setUserName:  (name)    => set({ userName: name }),
      // ✅ NOUVEAU
      setUserEmoji: (emoji)   => set({ userEmoji: emoji }),

      // ── Preferences ───────────────────────────────────────────────────────
      setHomeCurrency: (c) => set({ homeCurrency: c }),
      setTheme:        (t) => set({ theme: t }),

      // ── Onboarding ────────────────────────────────────────────────────────
      completeOnboarding: ({ userName, travelStyle, homeCurrency, theme }) =>
        set({ userName, travelStyle, homeCurrency, theme, onboardingDone: true }),

      // ── Trips CRUD ────────────────────────────────────────────────────────
      addTrip:    (t)         => set((s) => ({ trips: [t, ...s.trips] })),
      removeTrip: (id)        => set((s) => ({ trips: s.trips.filter((t) => t.id !== id) })),
      updateTrip: (id, patch) => set((s) => ({
        trips: s.trips.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      })),

      // ── Steps ─────────────────────────────────────────────────────────────
      addStep: (tripId, step) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId ? { ...t, steps: [...t.steps, step] } : t,
        ),
      })),
      updateStep: (tripId, stepId, patch) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, steps: t.steps.map((st) => st.id === stepId ? { ...st, ...patch } : st) }
            : t,
        ),
      })),
      removeStep: (tripId, stepId) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, steps: t.steps.filter((st) => st.id !== stepId) }
            : t,
        ),
      })),

      // ── Expenses ──────────────────────────────────────────────────────────
      addExpense: (tripId, e) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId ? { ...t, expenses: [e, ...t.expenses] } : t,
        ),
      })),
      removeExpense: (tripId, id) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, expenses: t.expenses.filter((e) => e.id !== id) }
            : t,
        ),
      })),

      // ── Checklist ─────────────────────────────────────────────────────────
      toggleChecklist: (tripId, id) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, checklist: t.checklist.map((c) => c.id === id ? { ...c, done: !c.done } : c) }
            : t,
        ),
      })),
      addChecklistItem: (tripId, label) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, checklist: [...t.checklist, { id: crypto.randomUUID(), label, done: false }] }
            : t,
        ),
      })),
      removeChecklistItem: (tripId, id) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, checklist: t.checklist.filter((c) => c.id !== id) }
            : t,
        ),
      })),
      setChecklist: (tripId, items) => set((s) => ({
        trips: s.trips.map((t) => t.id === tripId ? { ...t, checklist: items } : t),
      })),

      // ── Notes ─────────────────────────────────────────────────────────────
      setNotes: (tripId, notes) => set((s) => ({
        trips: s.trips.map((t) => t.id === tripId ? { ...t, notes } : t),
      })),

      // ── AI Suggestions ────────────────────────────────────────────────────
      setAiSuggestions: (key, suggestions) => set((s) => ({
        aiSuggestions: { ...s.aiSuggestions, [key]: suggestions },
      })),
      markSuggestionUsed: (key, suggestion) => set((s) => ({
        usedSuggestions: {
          ...s.usedSuggestions,
          [key]: [...(s.usedSuggestions[key] ?? []), suggestion],
        },
      })),
      clearUsedSuggestions: (key) => set((s) => ({
        usedSuggestions: { ...s.usedSuggestions, [key]: [] },
      })),

      // ── Notifications ─────────────────────────────────────────────────────
      addNotification: (n) => set((s) => {
        if (!s.notificationsEnabled) return s;
        if (n.tripId && s.notifDisabledTrips.includes(n.tripId)) return s;
        return {
          notifications: [
            {
              ...n,
              id:        crypto.randomUUID(),
              read:      false,
              createdAt: new Date().toISOString(),
            },
            ...s.notifications,
          ].slice(0, 50),
        };
      }),

      replaceOrAddNotification: (n, matchKey) => set((s) => {
        if (!s.notificationsEnabled) return s;
        if (n.tripId && s.notifDisabledTrips.includes(n.tripId)) return s;

        const existingIndex = s.notifications.findIndex(
          (existing) =>
            existing.tripId === n.tripId &&
            existing.type   === n.type   &&
            existing.title.includes(matchKey),
        );

        const newNotif: AppNotification = {
          ...n,
          id:        crypto.randomUUID(),
          read:      false,
          createdAt: new Date().toISOString(),
        };

        if (existingIndex !== -1) {
          const updated = [...s.notifications];
          updated[existingIndex] = newNotif;
          return { notifications: updated };
        }

        return {
          notifications: [newNotif, ...s.notifications].slice(0, 50),
        };
      }),

      markNotifRead: (id) => set((s) => ({
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        ),
      })),

      markAllNotifsRead: () => set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
      })),

      removeNotification: (id) => set((s) => ({
        notifications: s.notifications.filter((n) => n.id !== id),
      })),

      clearNotifications: () => set({ notifications: [] }),

      setNotificationsEnabled: (v) => set({ notificationsEnabled: v }),

      toggleNotifForTrip: (tripId) => set((s) => {
        const disabled = s.notifDisabledTrips;
        if (disabled.includes(tripId)) {
          return { notifDisabledTrips: disabled.filter((id) => id !== tripId) };
        }
        return { notifDisabledTrips: [...disabled, tripId] };
      }),

      // ── Chat ──────────────────────────────────────────────────────────────
      addChatMessage: (tripId, msg) => set((s) => ({
        chatHistories: {
          ...s.chatHistories,
          [tripId]: [
            ...(s.chatHistories[tripId] ?? []),
            {
              ...msg,
              id:        crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ].slice(-100),
        },
      })),

      clearChatHistory: (tripId) => set((s) => ({
        chatHistories: { ...s.chatHistories, [tripId]: [] },
      })),
    }),

    {
      name:    'mytrip-store-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        trips:                state.trips,
        homeCurrency:         state.homeCurrency,
        authed:               state.authed,
        userName:             state.userName,
        userEmoji:            state.userEmoji,      // ✅ NOUVEAU — persisté
        theme:                state.theme,
        onboardingDone:       state.onboardingDone,
        travelStyle:          state.travelStyle,
        notifications:        state.notifications,
        notificationsEnabled: state.notificationsEnabled,
        notifDisabledTrips:   state.notifDisabledTrips,
        chatHistories:        state.chatHistories,
      }),
    },
  ),
);

export const useTrip = (id?: string): Trip | undefined =>
  useTripStore((s) => s.trips.find((t) => t.id === id));