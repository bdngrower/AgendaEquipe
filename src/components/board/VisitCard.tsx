import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Visit } from '../../types';
import { CheckCircle2, Circle, Clock, User as UserIcon, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';

const statusColors = {
  'Pendente': 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/40',
  'Em andamento': 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/40',
  'Concluído': 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/40',
  'Cancelado': 'bg-zinc-50 dark:bg-dark-surface-hover text-zinc-600 dark:text-zinc-400 border-zinc-200/50 dark:border-dark-border',
};

interface VisitCardProps {
  visit: Visit;
  index: number;
  onClick: (visit: Visit) => void;
}

export function VisitCard({ visit, index, onClick }: VisitCardProps) {
  const { updateVisit } = useAppStore();

  const toggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateVisit(visit.id, { status: visit.status === 'Concluído' ? 'Pendente' : 'Concluído' });
  };

  return (
    <Draggable draggableId={visit.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(visit)}
          className={cn(
            "mb-3 rounded-2xl border bg-white dark:bg-dark-surface p-4 shadow-sm transition-all duration-200 group border-zinc-200/80 dark:border-dark-border hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800/50 cursor-grab active:cursor-grabbing",
            snapshot.isDragging && "shadow-xl rotate-2 scale-[1.02] border-blue-400 dark:border-blue-500 z-50 ring-2 ring-blue-500/20",
            visit.status === 'Concluído' && "opacity-60 saturate-50 hover:opacity-100 hover:saturate-100"
          )}
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <h4 className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{visit.customerName}</h4>
              {visit.isEmergency && (
                <span className="inline-flex w-fit items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50">
                  Emergência
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                statusColors[visit.status]
              )}>
                {visit.status}
              </span>
              <button 
                onClick={toggleComplete} 
                className="text-zinc-300 dark:text-zinc-600 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                title={visit.status === 'Concluído' ? "Marcar como Pendente" : "Marcar como Concluído"}
              >
                {visit.status === 'Concluído' 
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                  : <Circle className="h-5 w-5" />
                }
              </button>
            </div>
          </div>
          
          <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-blue-50 dark:bg-blue-950/30 rounded text-blue-500 dark:text-blue-400">
                <Clock className="h-3 w-3" />
              </div>
              <span className="font-medium tracking-wide">{visit.time}</span>
            </div>
            
            {visit.notes && (
              <div className="flex items-start gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-dark-border">
                 <div className="p-1 bg-amber-50 dark:bg-amber-950/30 rounded text-amber-500 dark:text-amber-400 mt-0.5">
                   <FileText className="h-3 w-3" />
                 </div>
                 <span className="line-clamp-2 leading-relaxed text-[11px] text-zinc-500 dark:text-zinc-500">{visit.notes}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
