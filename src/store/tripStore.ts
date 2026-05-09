import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type StepPeriod = 'morning' | 'afternoon' | 'night';
export type StepType = 'sight' | 'food' | 'transport' | 'lodging' | 'other';

export type Step = {
  id: string;
  day: number;          // 1..n
  period: StepPeriod;
  type: StepType;
  title: string;
  place: string;        // Required: ville/quartier
  notes?: string;
  done?: boolean;
};

export type Expense = {
  id: string;
  category: 'transport' | 'food' | 'lodging' | 'leisure' | 'shopping' | 'other';
  label: string;
  amount: number;       // in trip currency
  date: string;         // ISO
  private?: boolean;
};

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type Trip = {
  id: string;
  destination: string;     // city name
  country: string;
  countryCode: string;     // ISO2
  capital?: string;
  startDate: string;       // ISO
  endDate: string;         // ISO
  budget: number;
  currency: string;        // ISO 4217
  homeCurrency: string;    // user profile currency
  photoUrl: string;        // PERSISTENT — never updated
  steps: Step[];
  expenses: Expense[];
  checklist: ChecklistItem[];
  notes: string;
  createdAt: string;
};

type State = {
  trips: Trip[];
  homeCurrency: string;
  authed: boolean;
  userName: string;
  // actions
  setAuthed: (v: boolean, name?: string) => void;
  setHomeCurrency: (c: string) => void;
  addTrip: (t: Trip) => void;
  removeTrip: (id: string) => void;
  updateTrip: (id: string, patch: Partial<Trip>) => void;
  // steps
  addStep: (tripId: string, step: Step) => void;
  updateStep: (tripId: string, stepId: string, patch: Partial<Step>) => void;
  removeStep: (tripId: string, stepId: string) => void;
  // expenses
  addExpense: (tripId: string, e: Expense) => void;
  removeExpense: (tripId: string, id: string) => void;
  // checklist
  toggleChecklist: (tripId: string, id: string) => void;
  addChecklistItem: (tripId: string, label: string) => void;
  removeChecklistItem: (tripId: string, id: string) => void;
  setChecklist: (tripId: string, items: ChecklistItem[]) => void;
  // notes
  setNotes: (tripId: string, notes: string) => void;
};

export const useTripStore = create<State>()(
  persist(
    (set) => ({
      trips: [],
      homeCurrency: 'EUR',
      authed: false,
      userName: 'Voyageur',

      setAuthed: (v, name) => set((s) => ({ authed: v, userName: name ?? s.userName })),
      setHomeCurrency: (c) => set({ homeCurrency: c }),

      addTrip: (t) => set((s) => ({ trips: [t, ...s.trips] })),
      removeTrip: (id) => set((s) => ({ trips: s.trips.filter(t => t.id !== id) })),
      updateTrip: (id, patch) => set((s) => ({
        trips: s.trips.map(t => t.id === id ? { ...t, ...patch } : t),
      })),

      addStep: (tripId, step) => set((s) => ({
        trips: s.trips.map(t => t.id === tripId ? { ...t, steps: [...t.steps, step] } : t),
      })),
      updateStep: (tripId, stepId, patch) => set((s) => ({
        trips: s.trips.map(t => t.id === tripId
          ? { ...t, steps: t.steps.map(st => st.id === stepId ? { ...st, ...patch } : st) }
          : t),
      })),
      removeStep: (tripId, stepId) => set((s) => ({
        trips: s.trips.map(t => t.id === tripId ? { ...t, steps: t.steps.filter(st => st.id !== stepId) } : t),
      })),

      addExpense: (tripId, e) => set((s) => ({
        trips: s.trips.map(t => t.id === tripId ? { ...t, expenses: [e, ...t.expenses] } : t),
      })),
      removeExpense: (tripId, id) => set((s) => ({
        trips: s.trips.map(t => t.id === tripId ? { ...t, expenses: t.expenses.filter(e => e.id !== id) } : t),
      })),

      toggleChecklist: (tripId, id) => set((s) => ({
        trips: s.trips.map(t => t.id === tripId
          ? { ...t, checklist: t.checklist.map(c => c.id === id ? { ...c, done: !c.done } : c) }
          : t),
      })),
      addChecklistItem: (tripId, label) => set((s) => ({
        trips: s.trips.map(t => t.id === tripId
          ? { ...t, checklist: [...t.checklist, { id: crypto.randomUUID(), label, done: false }] }
          : t),
      })),
      removeChecklistItem: (tripId, id) => set((s) => ({
        trips: s.trips.map(t => t.id === tripId ? { ...t, checklist: t.checklist.filter(c => c.id !== id) } : t),
      })),
      setChecklist: (tripId, items) => set((s) => ({
        trips: s.trips.map(t => t.id === tripId ? { ...t, checklist: items } : t),
      })),

      setNotes: (tripId, notes) => set((s) => ({
        trips: s.trips.map(t => t.id === tripId ? { ...t, notes } : t),
      })),
    }),
    {
      name: 'mytrip-store-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Selectors
export const useTrip = (id?: string): Trip | undefined =>
  useTripStore((s) => s.trips.find(t => t.id === id));
