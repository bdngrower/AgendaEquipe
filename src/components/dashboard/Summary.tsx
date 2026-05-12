import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { CheckCircle2, Clock, CheckSquare, XCircle, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Summary() {
  const { visits, reminders } = useAppStore();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const visitsThisWeek = visits.filter(v => {
    try {
      const d = parseISO(v.date);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    } catch { return false; }
  });

  const totalVisits = visitsThisWeek.length;
  const completedVisits = visitsThisWeek.filter(v => v.status === 'Concluído').length;
  const pendingVisits = visitsThisWeek.filter(v => v.status === 'Pendente' || v.status === 'Em andamento').length;
  const canceledVisits = visitsThisWeek.filter(v => v.status === 'Cancelado').length;

  const incompleteReminders = reminders.filter(r => !r.isCompleted).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-6 mb-4">
      <div className="bg-white dark:bg-dark-surface p-5 rounded-2xl border border-zinc-200/80 dark:border-dark-border shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex justify-between items-start mb-3">
           <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium tracking-wide uppercase text-[11px]">Total (Semana)</h3>
           <Users className="text-zinc-400 dark:text-zinc-500 h-5 w-5" />
        </div>
        <p className="text-3xl font-light tracking-tight text-zinc-900 dark:text-white">{totalVisits}</p>
      </div>

      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-5 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/40 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex justify-between items-start mb-3">
           <h3 className="text-emerald-700 dark:text-emerald-400/80 text-sm font-medium tracking-wide uppercase text-[11px]">Concluídas</h3>
           <CheckCircle2 className="text-emerald-500 dark:text-emerald-600 h-5 w-5" />
        </div>
        <p className="text-3xl font-light tracking-tight text-emerald-950 dark:text-emerald-50">{completedVisits}</p>
      </div>

      <div className="bg-amber-50/50 dark:bg-amber-950/20 p-5 rounded-2xl border border-amber-200/50 dark:border-amber-900/40 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex justify-between items-start mb-3">
           <h3 className="text-amber-700 dark:text-amber-400/80 text-sm font-medium tracking-wide uppercase text-[11px]">Pendentes</h3>
           <Clock className="text-amber-500 dark:text-amber-600 h-5 w-5" />
        </div>
        <p className="text-3xl font-light tracking-tight text-amber-950 dark:text-amber-50">{pendingVisits}</p>
      </div>

      <div className="bg-zinc-50 dark:bg-dark-surface p-5 rounded-2xl border border-zinc-200/80 dark:border-dark-border shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex justify-between items-start mb-3">
           <h3 className="text-zinc-600 dark:text-zinc-400 text-sm font-medium tracking-wide uppercase text-[11px]">Canceladas</h3>
           <XCircle className="text-zinc-400 dark:text-zinc-500 h-5 w-5" />
        </div>
        <p className="text-3xl font-light tracking-tight text-zinc-900 dark:text-white">{canceledVisits}</p>
      </div>

      <div className="bg-blue-50/50 dark:bg-blue-950/20 p-5 rounded-2xl border border-blue-200/50 dark:border-blue-900/40 shadow-sm transition-all duration-200 hover:shadow-md">
         <div className="flex justify-between items-start mb-3">
           <h3 className="text-blue-700 dark:text-blue-400/80 text-sm font-medium tracking-wide uppercase text-[11px]">Lembretes</h3>
           <CheckSquare className="text-blue-500 dark:text-blue-600 h-5 w-5" />
        </div>
        <p className="text-3xl font-light tracking-tight text-blue-950 dark:text-blue-50">{incompleteReminders}</p>
      </div>
    </div>
  );
}
