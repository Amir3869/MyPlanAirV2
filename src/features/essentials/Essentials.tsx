import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Trash2, ListChecks, FileText, Save } from 'lucide-react';
import { useTripContext } from '../cockpit/useTripContext';
import { useTripStore } from '../../store/tripStore';
import { GlassCard } from '../../shared/GlassCard';
import { haptic } from '../../utils/haptic';

type Tab = 'checklist' | 'notes';

export const Essentials = () => {
  const { trip } = useTripContext();
  const [tab, setTab] = useState<Tab>('checklist');
  const toggleChecklist = useTripStore(s => s.toggleChecklist);
  const addItem = useTripStore(s => s.addChecklistItem);
  const removeItem = useTripStore(s => s.removeChecklistItem);
  const setNotes = useTripStore(s => s.setNotes);

  const [newItem, setNewItem] = useState('');
  const done = trip.checklist.filter(c => c.done).length;
  const total = trip.checklist.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Auto-save notes (debounce 2s)
  const [draft, setDraft] = useState(trip.notes);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => { setDraft(trip.notes); }, [trip.id]); // eslint-disable-line

  useEffect(() => {
    if (draft === trip.notes) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setNotes(trip.id, draft);
      setSavedAt(new Date());
    }, 2000);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [draft, trip.id, trip.notes, setNotes]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      {/* Tab switcher */}
      <div className="glass-strong rounded-full p-1 flex relative">
        <motion.div
          layout
          className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(124,140,255,0.4), rgba(236,72,153,0.3))',
            border: '1px solid rgba(255,255,255,0.18)',
            left: tab === 'checklist' ? 4 : 'calc(50% + 0px)',
          }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        />
        <button
          onClick={() => setTab('checklist')}
          className={`relative flex-1 py-2.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 tap ${tab === 'checklist' ? 'text-white' : 'text-white/55'}`}
        >
          <ListChecks size={15} /> Checklist
        </button>
        <button
          onClick={() => setTab('notes')}
          className={`relative flex-1 py-2.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 tap ${tab === 'notes' ? 'text-white' : 'text-white/55'}`}
        >
          <FileText size={15} /> Notes
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'checklist' ? (
          <motion.div
            key="cl"
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* Progress */}
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold tracking-tight">Préparation</div>
                <div className="text-2xl font-bold font-display">{pct}%</div>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #56c5a4, #7c8cff)' }}
                />
              </div>
              <div className="text-xs text-white/55 mt-2">{done} / {total} éléments cochés</div>
            </GlassCard>

            {/* Add item */}
            <div className="flex gap-2">
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newItem.trim()) {
                    addItem(trip.id, newItem.trim());
                    setNewItem('');
                  }
                }}
                placeholder="Ajouter un élément..."
                className="flex-1 glass rounded-xl px-4 py-3 bg-transparent outline-none font-medium text-sm"
              />
              <button
                onClick={() => { if (newItem.trim()) { addItem(trip.id, newItem.trim()); setNewItem(''); } }}
                className="w-12 h-12 rounded-xl flex items-center justify-center tap text-white"
                style={{ background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)' }}
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <AnimatePresence>
                {trip.checklist.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <GlassCard className="p-3 flex items-center gap-3">
                      <button
                        onClick={() => { haptic(8); toggleChecklist(trip.id, item.id); }}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center tap flex-shrink-0 transition ${
                          item.done ? 'bg-[#56c5a4] border-[#56c5a4]' : 'border-white/30'
                        }`}
                      >
                        {item.done && <Check size={14} className="text-black" strokeWidth={3} />}
                      </button>
                      <div className={`flex-1 font-medium tracking-tight ${item.done ? 'line-through opacity-50' : ''}`}>
                        {item.label}
                      </div>
                      <button
                        onClick={() => removeItem(trip.id, item.id)}
                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center tap text-red-400/80"
                      >
                        <Trash2 size={13} />
                      </button>
                    </GlassCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="nt"
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="paper p-6 min-h-[60vh] relative">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Notez vos pensées de voyage, réservations, souvenirs..."
                className="w-full min-h-[55vh] bg-transparent outline-none resize-none font-serif-journal text-lg leading-[32px] placeholder-white/30"
              />
              <div className="absolute bottom-3 right-4 flex items-center gap-1.5 text-xs text-white/45">
                <Save size={11} />
                {savedAt
                  ? `Sauvegardé à ${savedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                  : draft !== trip.notes ? 'Sauvegarde dans 2s...' : 'À jour'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
