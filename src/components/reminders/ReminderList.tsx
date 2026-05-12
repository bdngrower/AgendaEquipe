import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Reminder, Priority } from '../../types';
import { ReminderModal } from './ReminderModal';
import { format, isPast, isToday as dateFnsIsToday, parseISO, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, CheckCircle2, Circle, Clock, Info, AlertTriangle, AlertCircle, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../lib/utils';

const priorityConfig = {
  'Baixa': { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50/50' },
  'Média': { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50/50' },
  'Alta': { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50/50' },
};

export function ReminderList() {
  const { reminders, updateReminder, deleteReminder } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('today');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | undefined>(undefined);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredReminders = reminders.filter(r => {
    const isCompleted = r.isCompleted;
    if (filter === 'completed') return isCompleted;
    if (isCompleted) return false;
    
    // Non-completed handling
    const rDate = parseISO(`${r.date}T${r.time}`);
    if (filter === 'today') return dateFnsIsToday(rDate);
    if (filter === 'overdue') return isPast(rDate) && !dateFnsIsToday(rDate);
    if (filter === 'upcoming') return isFuture(rDate) && !dateFnsIsToday(rDate);
    return true; // all active
  }).sort((a, b) => {
    return parseISO(`${a.date}T${a.time}`).getTime() - parseISO(`${b.date}T${b.time}`).getTime();
  });

  const toggleComplete = (r: Reminder) => {
    updateReminder(r.id, { isCompleted: !r.isCompleted });
  };

  const handleEdit = (r: Reminder) => {
    setSelectedReminder(r);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setSelectedReminder(undefined);
    setIsModalOpen(true);
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-transparent">
      <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Lembretes</h2>
          </div>
          <Button size="sm" onClick={handleNew}><Plus className="h-3.5 w-3.5 flex-shrink-0 mr-1"/> Novo</Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {(['today', 'upcoming', 'overdue', 'completed', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 tracking-wide uppercase text-[10px]",
                filter === f 
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm" 
                  : "bg-zinc-100 dark:bg-dark-surface hover:bg-zinc-200 dark:hover:bg-dark-surface-hover text-zinc-600 dark:text-zinc-400 border border-transparent dark:border-dark-border"
              )}
            >
              {f === 'today' && 'Hoje'}
              {f === 'upcoming' && 'Próximos'}
              {f === 'overdue' && 'Atrasados'}
              {f === 'completed' && 'Concluídos'}
              {f === 'all' && 'Todos Ativos'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:px-5 custom-scrollbar">
        {filteredReminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-400 dark:text-zinc-500">
            <Bell className="h-8 w-8 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum lembrete encontrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReminders.map(r => {
              const rDate = parseISO(`${r.date}T${r.time}`);
              const PriorityIcon = priorityConfig[r.priority].icon;
              
              const bgClass = priorityConfig[r.priority].bg.replace('50/50', '50 dark:bg-' + priorityConfig[r.priority].bg.split('-')[1] + '-950/20');
              const iconColor = priorityConfig[r.priority].color.replace('500', '600 dark:text-' + priorityConfig[r.priority].color.split('-')[1] + '-400');
              
              return (
                <div 
                  key={r.id} 
                  className={cn(
                    "group flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 hover:shadow-md",
                    r.isCompleted 
                      ? "opacity-60 bg-zinc-50 dark:bg-dark-surface border-zinc-200 dark:border-dark-border saturate-50 hover:saturate-100" 
                      : `${bgClass} border-${priorityConfig[r.priority].color.split('-')[1]}-200/50 dark:border-${priorityConfig[r.priority].color.split('-')[1]}-900/30`
                  )}
                >
                  <button onClick={() => toggleComplete(r)} className="mt-0.5 shrink-0 transition-transform active:scale-90">
                    {r.isCompleted 
                      ? <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                      : <Circle className={cn("h-5 w-5", iconColor)} />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn("font-medium text-sm sm:text-[15px] tracking-tight leading-tight mb-1", r.isCompleted ? "line-through text-zinc-500 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100")}>
                      {r.title}
                    </h4>
                    {r.description && (
                      <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-[13px] line-clamp-2 leading-relaxed mb-2.5">{r.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold tracking-wide uppercase text-zinc-500 dark:text-zinc-500">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {format(rDate, "dd MMM, HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(r)} className="p-1.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg bg-white dark:bg-dark-surface-hover hover:bg-blue-50 dark:hover:bg-blue-900/30 shadow-sm transition-colors border border-zinc-100 dark:border-dark-border"><Edit2 className="h-3.5 w-3.5" /></button>
                    {confirmDeleteId === r.id ? (
                      <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/30 rounded-lg p-1 border border-red-100 dark:border-red-900/50">
                        <button onClick={() => setConfirmDeleteId(null)} className="p-1 px-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors">Não</button>
                        <button onClick={() => { deleteReminder(r.id); setConfirmDeleteId(null); }} className="p-1 px-2.5 text-xs font-bold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors">Sim</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(r.id)} className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg bg-white dark:bg-dark-surface-hover hover:bg-red-50 dark:hover:bg-red-900/30 shadow-sm transition-colors border border-zinc-100 dark:border-dark-border"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ReminderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} reminder={selectedReminder} />
    </div>
  );
}
