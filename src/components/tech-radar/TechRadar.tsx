import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, RefreshCw, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, deleteDoc, doc } from 'firebase/firestore';
import { cn } from '../../lib/utils';

interface TechLocation {
  technicianId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export function TechRadar() {
  const [locations, setLocations] = useState<TechLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'technicianLocations'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as TechLocation);
      setLocations(docs);
      setLastUpdate(new Date());
      setLoading(false);
    }, (error) => {
      console.error('Error fetching real-time locations:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (e: React.MouseEvent, techId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Deseja remover o técnico ${techId} do radar?`)) {
      try {
        await deleteDoc(doc(db, 'technicianLocations', techId));
        if (selectedTechId === techId) {
          setSelectedTechId(null);
        }
      } catch (error) {
        console.error("Erro ao remover técnico:", error);
        alert("Não foi possível remover o técnico. Verifique suas permissões.");
      }
    }
  };

  const displayLocation = locations.find(l => l.technicianId === selectedTechId) || locations[0];

  return (
    <div className="h-full flex flex-col p-4 md:p-6 lg:p-8 bg-zinc-50 dark:bg-zinc-950">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Navigation className="h-6 w-6 text-blue-500" />
            Radar de Técnicos
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Monitoramento em tempo real da equipe de campo.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
          {!loading && lastUpdate && (
            <span>Atualizado: {format(lastUpdate, "HH:mm:ss")}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* List Panel */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 overflow-y-auto">
          <h2 className="font-bold text-lg mb-4 text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-2">
            Técnicos Ativos ({locations.length})
          </h2>
          
          <div className="space-y-3">
            {locations.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-8">
                Nenhum técnico transmitindo localização no momento.
              </p>
            ) : (
              locations.map((loc) => (
                <div 
                  key={loc.technicianId} 
                  onClick={() => setSelectedTechId(loc.technicianId)}
                  className={cn(
                    "p-3 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all hover:shadow-md",
                    (selectedTechId === loc.technicianId || (!selectedTechId && locations[0]?.technicianId === loc.technicianId))
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700" 
                      : "border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:border-blue-300 dark:hover:border-blue-800"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{loc.technicianId}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Online
                      </span>
                      <button 
                        onClick={(e) => handleDelete(e, loc.technicianId)}
                        className="text-zinc-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Remover Técnico"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 flex flex-col gap-1">
                    <span>Visto em: {format(new Date(loc.timestamp), "dd/MM 'às' HH:mm:ss")}</span>
                    <span className="text-blue-500 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> 
                      {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-2 overflow-hidden flex flex-col relative h-[400px] lg:h-auto">
          {displayLocation ? (
            <iframe 
              title="Radar Map"
              width="100%" 
              height="100%" 
              frameBorder="0" 
              scrolling="no" 
              marginHeight={0} 
              marginWidth={0} 
              className="rounded-xl w-full h-full flex-1"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${displayLocation.longitude - 0.005}%2C${displayLocation.latitude - 0.005}%2C${displayLocation.longitude + 0.005}%2C${displayLocation.latitude + 0.005}&layer=mapnik&marker=${displayLocation.latitude}%2C${displayLocation.longitude}`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <Navigation className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-zinc-500 font-medium">Aguardando sinais de GPS...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
