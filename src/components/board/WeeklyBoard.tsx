import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppStore } from '../../store/useAppStore';
import { VisitCard } from './VisitCard';
import { VisitModal } from './VisitModal';
import { Visit, Status } from '../../types';
import { Plus } from 'lucide-react';
import { Button } from '../ui';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0]; // Monday to Sunday manually sorted because date-fns week starts on Sunday traditionally, but we want Mon-Sun. Let's handle it by getting Monday and adding days.
export function WeeklyBoard() {
  const { visits, updateVisit, moveVisit } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  
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

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Since we sort mostly by time visually, a pure Reorder in the same column doesn't 
    // update the strict DB 'order' unless we implement an 'order' field. 
    // Usually, sorting by time is better for agendas. 
    // But if moved to a different day, update the date.
    if (destination.droppableId !== source.droppableId) {
      moveVisit(draggableId, destination.droppableId); // newdate is droppableId
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
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(addDays(currentDate, -7))}>Anterior</Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(addDays(currentDate, 7))}>Próxima</Button>
          <Button size="sm" onClick={() => handleOpenNewVisit()}>
            <Plus className="mr-2 h-4 w-4 hidden sm:inline" /> Nova Visita
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-6 px-4 md:px-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex h-full min-h-[600px] gap-4">
            {days.map((day) => {
              const matches = visits
                .filter((v) => v.date === day.dateString)
                .sort((a, b) => a.time.localeCompare(b.time)); // sort by time

              const isToday = isSameDay(day.date, new Date());

              return (
                <div key={day.dateString} className="flex h-full w-80 shrink-0 flex-col rounded-2xl bg-zinc-50/50 dark:bg-dark-surface border border-zinc-200/80 dark:border-dark-border shadow-sm overflow-hidden transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700">
                  <div className={`p-4 border-b border-zinc-200/80 dark:border-dark-border transition-colors ${isToday ? 'bg-blue-50/80 dark:bg-blue-950/20' : 'bg-white dark:bg-transparent'}`}>
                    <h3 className="capitalize flex items-center justify-between">
                      <span className={`font-semibold tracking-wide ${isToday ? 'text-blue-700 dark:text-blue-400' : 'text-zinc-700 dark:text-zinc-200'}`}>
                        {day.title}
                      </span>
                      <span className={`text-xs font-bold tracking-wider px-2.5 py-1 rounded-full ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-dark-surface-hover text-zinc-500 dark:text-zinc-400'}`}>
                        {day.dayAndMonth}
                      </span>
                    </h3>
                  </div>

                  <Droppable droppableId={day.dateString}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto p-3 transition-colors ${
                          snapshot.isDraggingOver ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''
                        }`}
                      >
                        {matches.map((visit, index) => (
                          <VisitCard
                            key={visit.id}
                            visit={visit}
                            index={index}
                            onClick={handleCardClick}
                          />
                        ))}
                        {provided.placeholder}
                        
                        <button 
                          onClick={() => handleOpenNewVisit(day.dateString)}
                          className="w-full py-2.5 flex items-center justify-center text-sm font-medium text-zinc-400 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-xl transition-all duration-200 mt-2 border border-transparent border-dashed hover:border-blue-200 dark:hover:border-blue-900/50"
                        >
                          <Plus className="mr-1.5 h-4 w-4" /> Adicionar
                        </button>
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
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
