import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday,
  addMonths,
  subMonths,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import { VisitModal } from './VisitModal';
import { Visit } from '../../types';

interface MonthlyBoardProps {
  onToggleView?: () => void;
}

export function MonthlyBoard({ onToggleView }: MonthlyBoardProps) {
  const { visits } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedVisit, setSelectedVisit] = useState<Visit | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const getVisitsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return visits.filter(v => v.date === dateStr);
  };

  const openApplet = (visit?: Visit, date?: string) => {
    setSelectedVisit(visit);
    setSelectedDate(date || '');
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-surface rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm p-4 mr-2 ml-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          {onToggleView && (
            <button 
              onClick={onToggleView}
              className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              title="Alternar para Visão Semanal"
            >
              <Calendar className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors hidden sm:block">
            <ChevronLeft className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors hidden sm:block">
            Hoje
          </button>
          <button onClick={handleNextMonth} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors hidden sm:block">
            <ChevronRight className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          </button>

          {/* Mobile navigation */}
          <div className="flex sm:hidden items-center">
            <button onClick={handlePrevMonth} className="p-1">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={handleNextMonth} className="p-1">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar pr-2">
        <div className="grid grid-cols-7 gap-px bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden min-w-[700px]">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="bg-zinc-50 dark:bg-dark-bg py-2 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {day}
            </div>
          ))}
          
          {/* Fill empty cells for first week */}
          {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white dark:bg-dark-surface min-h-[100px] opacity-50" />
          ))}

          {daysInMonth.map(date => {
            const dateVisits = getVisitsForDate(date);
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isTodayDate = isToday(date);
            const formattedDateStr = format(date, 'yyyy-MM-dd');

            return (
              <div 
                key={date.toString()} 
                className={cn(
                  "bg-white dark:bg-dark-surface min-h-[100px] p-1 sm:p-2 flex flex-col group relative transition-colors",
                  !isCurrentMonth && "opacity-40",
                  "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium",
                    isTodayDate ? "bg-blue-600 text-white" : "text-zinc-700 dark:text-zinc-300"
                  )}>
                    {format(date, 'd')}
                  </span>
                  <button 
                    onClick={() => openApplet(undefined, formattedDateStr)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-all"
                  >
                    <Plus className="h-3 w-3 text-zinc-600 dark:text-zinc-400" />
                  </button>
                </div>

                <div className="flex flex-col gap-1 mt-1">
                  {dateVisits.map(visit => (
                    <div 
                      key={visit.id}
                      onClick={() => openApplet(visit, formattedDateStr)}
                      className={cn(
                        "text-[10px] sm:text-xs px-1.5 py-1 rounded cursor-pointer transition-colors border-l-2 flex flex-col gap-0.5",
                        visit.status === 'Concluído' ? "bg-green-50 text-green-700 border-green-500 dark:bg-green-900/20 dark:text-green-400 dark:border-green-600" :
                        visit.status === 'Cancelado' ? "bg-red-50 text-red-700 border-red-500 dark:bg-red-900/20 dark:text-red-400 dark:border-red-600" :
                        visit.status === 'Confirmado' ? "bg-blue-50 text-blue-700 border-blue-500 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-600" :
                        visit.status === 'Em andamento' ? "bg-purple-50 text-purple-700 border-purple-500 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-600" :
                        "bg-zinc-100 text-zinc-700 border-zinc-500 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600",
                        visit.isEmergency && "ring-1 ring-red-400 animate-pulse"
                      )}
                    >
                      <span className="font-semibold block truncate leading-tight">{visit.customerName}</span>
                      <span className="opacity-80 block truncate text-[9px] sm:text-[10px]">{visit.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <VisitModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        visit={selectedVisit}
        defaultDate={selectedDate}
      />
    </div>
  );
}
