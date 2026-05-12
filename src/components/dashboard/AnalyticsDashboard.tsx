import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { Button } from '../ui';
import { Trophy, TrendingUp, Calendar, Download, Sparkles, FileText, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

export function AnalyticsDashboard() {
  const { visits, companies } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);

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
      .slice(0, 5); 
  }, [visits]);

  // 2. Agendamentos por Semana
  const weeklyData = useMemo(() => {
    const weeks: Record<string, number> = {};
    visits.forEach(v => {
      const d = new Date(v.date);
      const weekLabel = `Sem ${Math.ceil(d.getDate() / 7)}`;
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

  const generateAIInsights = async () => {
    if (loadingInsights || visits.length === 0) return;
    setLoadingInsights(true);
    try {
      const dataSummary = `
        Total visits: ${visits.length}
        Top customers: ${topCompaniesData.map(c => `${c.name} (${c.value} visits)`).join(', ')}
        Recent weekly trends: ${weeklyData.map(w => `${w.name}: ${w.total}`).join(', ')}
      `;

      let text = '';
      try {
        const response = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataSummary })
        });
        if (!response.ok) throw new Error('API server error');
        const data = await response.json();
        text = data.insights;
      } catch (apiError) {
        // Fallback for Vercel Static deployments without the backend
        if (import.meta.env.VITE_AI_KEY) {
          const Groq = (await import('groq-sdk')).default;
          // Note: using Groq in the browser requires dangerouslyAllowBrowser
          const groq = new Groq({ apiKey: import.meta.env.VITE_AI_KEY, dangerouslyAllowBrowser: true });
          const response = await groq.chat.completions.create({
            model: "llama3-8b-8192",
            messages: [{ role: "user", content: `Analyze these business visit logistics data and provide 3 short, punchy insights in Portuguese about business performance, identifying trends or areas for improvement. Data: ${dataSummary}` }],
            temperature: 0.7,
            max_completion_tokens: 300,
          });
          text = response.choices[0]?.message?.content || '';
        } else {
          throw new Error('No API key available for client-side fallback.');
        }
      }
      setInsights(text || 'Não foi possível gerar insights no momento.');
    } catch (error) {
      console.error("AI Insights Error:", error);
      setInsights('Erro ao conectar com a inteligência artificial. Se estiver no Vercel, certifique-se de configurar a variável VITE_AI_KEY.');
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (visits.length > 0 && !insights) {
      generateAIInsights();
    }
  }, [visits.length]);

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Visão Geral</h2>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleExportPDF}
          disabled={isExporting}
          className="bg-white dark:bg-dark-surface border-zinc-200 dark:border-dark-border"
        >
          {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Exportar PDF
        </Button>
      </div>

      <div id="analytics-content" className="space-y-6" style={{ backgroundColor: '#ffffff', color: '#18181b', minWidth: isExporting ? '1000px' : 'auto' }}>
        {/* Insights AI */}
        <div className="ai-card p-6 rounded-3xl text-white shadow-xl overflow-hidden relative" style={{ background: '#2563eb' }}>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="h-24 w-24 rotate-12" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-200" />
                <h3 className="font-bold tracking-tight">Insights Inteligentes</h3>
              </div>
              <button 
                onClick={generateAIInsights}
                disabled={loadingInsights}
                className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors disabled:opacity-50"
              >
                {loadingInsights ? 'Analisando...' : 'Atualizar'}
              </button>
            </div>
            
            {loadingInsights ? (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-blue-100 font-medium">Extraindo padrões dos seus agendamentos...</span>
              </div>
            ) : (
              <div className="text-blue-50 leading-relaxed text-sm font-medium whitespace-pre-line">
                {insights || 'Nenhum insight disponível ainda. Agende mais visitas para análise.'}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Empresas */}
          <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm print:shadow-none print:border-zinc-300" style={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7' }}>
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg print:bg-transparent" style={{ backgroundColor: '#fffbeb' }}>
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100" style={{ color: '#18181b' }}>Top Clientes</h3>
            </div>
            <div className="h-[300px] min-h-[300px] w-full min-w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={300}>
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
          <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm print:shadow-none print:border-zinc-300" style={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7' }}>
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg print:bg-transparent" style={{ backgroundColor: '#eff6ff' }}>
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100" style={{ color: '#18181b' }}>Crescimento Mensal</h3>
            </div>
            <div className="h-[300px] min-h-[300px] w-full min-w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
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
                    radius={[10, 10, 0, 0]} 
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Visão Semanal */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm print:shadow-none print:border-zinc-300" style={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7' }}>
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg print:bg-transparent" style={{ backgroundColor: '#faf5ff' }}>
              <Calendar className="h-5 w-5 text-purple-500" />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100" style={{ color: '#18181b' }}>Consistência Semanal</h3>
          </div>
          <div className="h-[250px] min-h-[250px] w-full min-w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={250}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
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
                  strokeWidth={4} 
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
