import React, { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { Card } from '../ui';
import { Trophy, TrendingUp, Calendar } from 'lucide-react';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

export function AnalyticsDashboard() {
  const { visits, companies } = useAppStore();

  // 1. Top 3 Empresas (Pizza)
  const topCompaniesData = useMemo(() => {
    const counts: Record<string, number> = {};
    visits.forEach(v => {
      if (v.customerName) {
        counts[v.customerName] = (counts[v.customerName] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Mostramos até 5, destacando top 3
  }, [visits]);

  // 2. Agendamentos por Semana (Últimas 4 semanas)
  const weeklyData = useMemo(() => {
    const weeks: Record<string, number> = {};
    const now = new Date();
    
    // Simplificado: agrupar por semana do ano ou as últimas 4 semanas
    visits.forEach(v => {
      const d = new Date(v.date);
      const weekLabel = `Semana ${Math.ceil(d.getDate() / 7)}`;
      weeks[weekLabel] = (weeks[weekLabel] || 0) + 1;
    });

    return Object.entries(weeks).map(([name, total]) => ({ name, total })).slice(-4);
  }, [visits]);

  // 3. Agendamentos Mensais
  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    visits.forEach(v => {
      const d = new Date(v.date);
      const monthLabel = monthNames[d.getMonth()];
      months[monthLabel] = (months[monthLabel] || 0) + 1;
    });

    return monthNames.map(name => ({
      name,
      total: months[name] || 0
    })).filter(m => m.total > 0 || monthNames.indexOf(m.name) <= new Date().getMonth());
  }, [visits]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Empresas */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Top Clientes</h3>
          </div>
          <div className="h-64 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topCompaniesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {topCompaniesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Agendamentos Mensais */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Crescimento Mensal</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#71717a' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#71717a' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar 
                  dataKey="total" 
                  fill="#2563eb" 
                  radius={[4, 4, 0, 0]} 
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Visão Semanal */}
      <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-5 w-5 text-purple-500" />
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Consistência Semanal</h3>
        </div>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#71717a' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#71717a' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#8b5cf6" 
                strokeWidth={3} 
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
