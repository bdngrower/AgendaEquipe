import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/location');
      const data = await response.json();
      setLocations(data.locations || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

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
                <div key={loc.technicianId} className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{loc.technicianId}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Online
                    </span>
                  </div>
                  
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 flex flex-col gap-1">
                    <span>Visto em: {format(new Date(loc.timestamp), "dd/MM 'às' HH:mm:ss")}</span>
                    <a 
                      href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center gap-1"
                    >
                      <MapPin className="h-3 w-3" /> Ver no Google Maps
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-2 overflow-hidden flex flex-col relative h-[400px] lg:h-auto">
          {locations.length > 0 ? (
            <iframe 
              title="Radar Map"
              width="100%" 
              height="100%" 
              frameBorder="0" 
              scrolling="no" 
              marginHeight={0} 
              marginWidth={0} 
              className="rounded-xl w-full h-full flex-1"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${locations[0].longitude - 0.05}%2C${locations[0].latitude - 0.05}%2C${locations[0].longitude + 0.05}%2C${locations[0].latitude + 0.05}&layer=mapnik&marker=${locations[0].latitude}%2C${locations[0].longitude}`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <Navigation className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-zinc-500 font-medium">Aguardando sinais de GPS...</p>
            </div>
          )}
          
          <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg text-xs max-w-xs">
            <h4 className="font-bold mb-1 text-zinc-900 dark:text-zinc-100">API de Rastreamento (POST)</h4>
            <code className="text-[10px] break-all bg-zinc-100 dark:bg-zinc-950 p-1.5 rounded text-blue-600 dark:text-blue-400 block mb-2 font-mono">
              /api/location
            </code>
            <p className="text-zinc-500">
              Payload: {`{"latitude": x, "longitude": y, "timestamp": z, "technicianId": "ID"}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
