import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, Navigation, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui';

export function TechApp() {
  const { visits, companies, updateVisit } = useAppStore();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const today = new Date();
  const todaysVisits = visits.filter(v => isSameDay(new Date(v.date + 'T12:00:00'), today))
    .sort((a, b) => a.time.localeCompare(b.time));

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const toggleTracking = () => {
    if (isTracking) {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      setIsTracking(false);
      setWatchId(null);
    } else {
      if ('geolocation' in navigator) {
        const id = navigator.geolocation.watchPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            console.log('Location updated:', position.coords.latitude, position.coords.longitude);
          },
          (error) => {
            console.error('Error tracking location:', error);
            alert('Não foi possível obter sua localização. Verifique as permissões do navegador.');
            setIsTracking(false);
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
        setWatchId(id);
        setIsTracking(true);
      } else {
        alert('Geolocalização não é suportada neste navegador.');
      }
    }
  };

  const handleStatusChange = (visitId: string, newStatus: any) => {
    updateVisit(visitId, { status: newStatus });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 pb-24 md:p-6 max-w-md mx-auto relative border-x border-zinc-200 dark:border-zinc-800 shadow-2xl">
      
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Modo Técnico</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">{format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl border-2 border-white dark:border-zinc-800 shadow-md">
            TS
          </div>
        </div>

        {/* Location Tracker Card */}
        <div className={cn(
          "rounded-2xl p-4 transition-colors duration-300 shadow-sm border",
          isTracking 
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50" 
            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-full",
                isTracking ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
              )}>
                <Navigation className={cn("h-5 w-5", isTracking && "animate-pulse")} />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {isTracking ? 'Rastreamento Ativo' : 'Rastreamento Desligado'}
                </h3>
                {isTracking && location ? (
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Enviando localização...
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Ative para compartilhar
                  </p>
                )}
              </div>
            </div>
            
            <button 
              onClick={toggleTracking}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                isTracking ? "bg-green-500" : "bg-zinc-200 dark:bg-zinc-700"
              )}
            >
              <span className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                isTracking ? "translate-x-6" : "translate-x-1"
              )} />
            </button>
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center">
        <Clock className="w-5 h-5 mr-2 text-blue-500" />
        Sua Agenda de Hoje ({todaysVisits.length})
      </h2>

      <div className="space-y-4">
        {todaysVisits.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3" />
            <p className="text-zinc-500 dark:text-zinc-400">Nenhum chamado agendado para hoje.</p>
          </div>
        ) : (
          todaysVisits.map((visit) => {
            const company = companies.find((c) => c.id === visit.companyId);
            const address = visit.address || company?.address;

            return (
              <div key={visit.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                        {visit.time}
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                        visit.status === 'completed' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        visit.status === 'in-progress' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        visit.status === 'delayed' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                        "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      )}>
                        {visit.status === 'completed' ? 'Concluído' :
                         visit.status === 'in-progress' ? 'Em Andamento' :
                         visit.status === 'delayed' ? 'Atrasado' : 'Agendado'}
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{company?.name || 'Empresa desconhecida'}</h3>
                  
                  {visit.ticketNumber && (
                    <p className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400 mt-1">
                      #{visit.ticketNumber}
                    </p>
                  )}

                  {address && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 flex items-start">
                      <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0 mt-0.5" />
                      {address}
                    </p>
                  )}

                  {visit.notes && (
                    <div className="mt-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {visit.notes}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 flex gap-2">
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address || company?.name || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
                  >
                    <Navigation className="w-4 h-4" /> Navegar
                  </a>
                  
                  {visit.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusChange(visit.id, 'completed')}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Concluir
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
