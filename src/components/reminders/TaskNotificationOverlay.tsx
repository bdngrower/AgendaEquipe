import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Reminder } from '../../types';
import { format, parseISO, isPast, differenceInMinutes, isToday, addMinutes } from 'date-fns';
import { Bell, Clock, X, CheckCircle2, Calendar, Coffee } from 'lucide-react';
import { Button } from '../ui';
import { motion, AnimatePresence } from 'motion/react';

export function TaskNotificationOverlay() {
  const { reminders, updateReminder } = useAppStore();
  const [activeNotification, setActiveNotification] = useState<Reminder | null>(null);
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      
      const dueReminder = reminders.find(r => {
        if (r.isCompleted || notifiedIds.has(r.id)) return false;
        
        const rDate = parseISO(`${r.date}T${r.time}`);
        // Notificar se for hoje e estiver no horário ou até 30 minutos atrasado
        const diff = differenceInMinutes(now, rDate);
        return isToday(rDate) && diff >= 0 && diff < 30;
      });

      if (dueReminder) {
        setActiveNotification(dueReminder);
        setNotifiedIds(prev => new Set(prev).add(dueReminder.id));
      }
    };

    const interval = setInterval(checkReminders, 10000);
    return () => clearInterval(interval);
  }, [reminders, notifiedIds]);

  const handleComplete = () => {
    if (activeNotification) {
      updateReminder(activeNotification.id, { isCompleted: true });
      setActiveNotification(null);
    }
  };

  const handleSnooze = () => {
    if (activeNotification) {
      const rDate = parseISO(`${activeNotification.date}T${activeNotification.time}`);
      const newDate = addMinutes(rDate, 15);
      
      updateReminder(activeNotification.id, { 
        time: format(newDate, 'HH:mm'),
        date: format(newDate, 'yyyy-MM-dd')
      });
      
      // Remove from notified so it can alert again later
      setNotifiedIds(prev => {
        const next = new Set(prev);
        next.delete(activeNotification.id);
        return next;
      });
      
      setActiveNotification(null);
    }
  };

  return (
    <AnimatePresence>
      {activeNotification && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="w-full max-w-sm pointer-events-auto"
          >
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl border-2 border-blue-500 dark:border-blue-600 overflow-hidden">
              <div className="bg-blue-500 dark:bg-blue-600 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Bell className="h-5 w-5 animate-bounce" />
                  <span className="font-bold tracking-tight">Lembrete Agora!</span>
                </div>
                <button 
                  onClick={() => setActiveNotification(null)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-5">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1 leading-tight">
                  {activeNotification.title}
                </h3>
                {activeNotification.description && (
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4 line-clamp-2">
                    {activeNotification.description}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-6">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {activeNotification.time}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Hoje
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-center group"
                    onClick={handleSnooze}
                  >
                    <Coffee className="h-4 w-4 mr-2 text-amber-600 group-hover:animate-bounce" />
                    +15 min
                  </Button>
                  <Button 
                    variant="primary" 
                    className="w-full justify-center bg-blue-600 hover:bg-blue-700"
                    onClick={handleComplete}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Concluir
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
