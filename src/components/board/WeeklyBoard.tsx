import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, DropResult, DragStart } from '@hello-pangea/dnd';
import { format, addDays, startOfWeek, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppStore } from '../../store/useAppStore';
import { VisitCard } from './VisitCard';
import { VisitModal } from './VisitModal';
import { Visit, Status } from '../../types';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../lib/utils';

export function WeeklyBoard() {
  const { visits, updateVisit, moveVisit } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

  // Get Monday of the current week
  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
  
  const days = Array.from({ length: 5 }).map((_, i) => {
    const date = addDays(startOfCurrentWeek, i);
    return {
      date,
      dateString: format(date, 'yyyy-MM-dd'),
      title: format(date, 'EEEE', { locale: ptBR }),
      dayAndMonth: format(date, 'dd/MM'),
    };
  });

  const onDragStart = (start: DragStart) => {
    setIsDragging(true);
  };

  const onDragEnd = (result: DropResult) => {
    setIsDragging(false);
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Handle dropping in "Next Week" or "Prev Week" zones
    if (destination.droppableId === 'next-week-zone' || destination.droppableId === 'prev-week-zone') {
      const visit = visits.find(v => v.id === draggableId);
      if (visit) {
        const weeksToAdd = destination.droppableId === 'next-week-zone' ? 1 : -1;
        const newDate = addWeeks(parseISO(visit.date), weeksToAdd);
        moveVisit(draggableId, format(newDate, 'yyyy-MM-dd'));
        
        // Switch the board view to the new week to show the change
        setCurrentDate(addWeeks(currentDate, weeksToAdd));
      }
      return;
    }

    // Normal day-to-day move
    if (destination.droppableId !== source.droppableId) {
      moveVisit(draggableId, destination.droppableId);
    }
  };

  const handleOpenNewVisit = (dateStr?: string) => {
    setSelectedVisit(undefined);
    setSelectedDate(dateStr || format(new Date(), 'yyyy-MM-dd'));
    setIsModalOpen(true);
  };

  const handleCardClick = (visit: Visit) => {
    setSelectedVisit(visit);
    setSelectedDate(visit.date);
    setIsModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col pt-4">
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Agenda Semanal</h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            {format(days[0].date, "d 'de' MMMM", { locale: ptBR })} a {format(days[4].date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>Anterior</Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>Próxima</Button>
          <Button size="sm" onClick={() => handleOpenNewVisit()}>
            <Plus className="mr-2 h-4 w-4 hidden sm:inline" /> Nova Visita
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto lg:overflow-y-hidden overflow-x-auto scroll-smooth pb-6 px-4 md:px-6 relative custom-scrollbar">
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex flex-col lg:grid lg:grid-cols-5 pb-10 lg:pb-0 lg:h-full lg:min-h-[500px] gap-6 lg:gap-4 min-w-[1200px]">
            
            {/* "Previous Week" Drop Zone - Persistent to prevent Invariant errors */}
            <div 
              className={cn(
                "fixed left-0 top-1/2 -translate-y-1/2 w-16 h-64 z-[60] transition-all duration-300 pointer-events-none",
                isDragging ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full"
              )}
            >
              <Droppable droppableId="prev-week-zone">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "h-full flex flex-col items-center justify-center rounded-r-3xl border-2 border-dashed pointer-events-auto shadow-2xl transition-all",
                      snapshot.isDraggingOver 
                        ? 'bg-blue-600 text-white border-blue-400 scale-105' 
                        : 'bg-white/95 dark:bg-zinc-900/95 border-zinc-300 dark:border-zinc-800'
                    )}
                  >
                    <ChevronLeft className={cn("h-8 w-8", snapshot.isDraggingOver ? "text-white animate-pulse" : "text-zinc-400")} />
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest vertical-text mt-2", snapshot.isDraggingOver ? "text-white" : "text-zinc-400")}>Semana Anterior</span>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {days.map((day) => {
              const matches = visits
                .filter((v) => v.date === day.dateString)
                .sort((a, b) => a.time.localeCompare(b.time));

              const isToday = isSameDay(day.date, new Date());

              return (
                <div key={day.dateString} className="flex lg:h-full w-full lg:w-auto flex-col rounded-2xl bg-white dark:bg-dark-surface border border-zinc-200/80 dark:border-dark-border shadow-sm overflow-hidden transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700">
                  <div className={cn(
                    "p-3 xl:p-4 border-b border-zinc-200/80 dark:border-dark-border transition-colors",
                    isToday ? "bg-blue-50/80 dark:bg-blue-950/20" : "bg-white dark:bg-transparent"
                  )}>
                    <h3 className="capitalize flex items-center justify-between">
                      <span className={cn(
                        "font-semibold tracking-wide",
                        isToday ? "text-blue-700 dark:text-blue-400 text-sm xl:text-base" : "text-zinc-700 dark:text-zinc-200 text-sm xl:text-base"
                      )}>
                        {day.title}
                      </span>
                      <span className={cn(
                        "text-[10px] xl:text-xs font-bold tracking-wider px-2 py-0.5 xl:px-2.5 xl:py-1 rounded-full",
                        isToday ? "bg-blue-600 text-white shadow-sm" : "bg-zinc-100 dark:bg-dark-surface-hover text-zinc-500 dark:text-zinc-400"
                      )}>
                        {day.dayAndMonth}
                      </span>
                    </h3>
                  </div>

                  <Droppable droppableId={day.dateString}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 lg:overflow-y-auto min-h-[250px] p-2 transition-colors custom-scrollbar",
                          snapshot.isDraggingOver ? "bg-blue-50/50 dark:bg-blue-950/10" : "bg-white dark:bg-dark-surface"
                        )}
                      >
                        <div className="space-y-3">
                          {matches.map((visit, index) => (
                            <VisitCard
                              key={visit.id}
                              visit={visit}
                              index={index}
                              onClick={handleCardClick}
                            />
                          ))}
                        </div>
                        {provided.placeholder}
                        
                        <button 
                          onClick={() => handleOpenNewVisit(day.dateString)}
                          className="w-full py-2.5 flex items-center justify-center text-xs font-medium text-zinc-400 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-xl transition-all duration-200 mt-4 border border-transparent border-dashed hover:border-blue-200 dark:hover:border-blue-900/50"
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
                        </button>
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}

            {/* "Next Week" Drop Zone - Persistent to prevent Invariant errors */}
            <div 
              className={cn(
                "fixed right-0 top-1/2 -translate-y-1/2 w-16 h-64 z-[60] transition-all duration-300 pointer-events-none",
                isDragging ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
              )}
            >
              <Droppable droppableId="next-week-zone">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "h-full flex flex-col items-center justify-center rounded-l-3xl border-2 border-dashed pointer-events-auto shadow-2xl transition-all",
                      snapshot.isDraggingOver 
                        ? 'bg-blue-600 text-white border-blue-400 scale-105' 
                        : 'bg-white/95 dark:bg-zinc-900/95 border-zinc-300 dark:border-zinc-800'
                    )}
                  >
                    <ChevronRight className={cn("h-8 w-8", snapshot.isDraggingOver ? "text-white animate-pulse" : "text-zinc-400")} />
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest vertical-text mt-2", snapshot.isDraggingOver ? "text-white" : "text-zinc-400")}>Próxima Semana</span>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

          </div>
        </DragDropContext>
      </div>

      <VisitModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        visit={selectedVisit} 
        defaultDate={selectedDate || format(new Date(), 'yyyy-MM-dd')}
      />
    </div>
  );
}

