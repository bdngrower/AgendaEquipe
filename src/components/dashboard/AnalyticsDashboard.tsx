import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { Button } from '../ui';
import { Trophy, TrendingUp, Calendar, Download, Sparkles, FileText, Loader2, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

type DateFilterType = 'all' | 'this_year' | 'last_6_months' | 'this_month';

export function AnalyticsDashboard() {
  const { visits, companies, theme } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');

  const filteredVisits = useMemo(() => {
    if (dateFilter === 'all') return visits;
    
    const now = new Date();
    return visits.filter(v => {
      // Usar a mesma tratativa de timezone (meio-dia) para ser consistente
      const vDate = new Date(v.date + 'T12:00:00');
      if (dateFilter === 'this_year') {
        return vDate.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'this_month') {
        return vDate.getFullYear() === now.getFullYear() && vDate.getMonth() === now.getMonth();
      }
      if (dateFilter === 'last_6_months') {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        return vDate >= sixMonthsAgo;
      }
      return true;
    });
  }, [visits, dateFilter]);

  // 1. Top 3 Empresas (Pizza)
  const topCompaniesData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredVisits.forEach(v => {
      if (v.customerName) {
        counts[v.customerName] = (counts[v.customerName] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); 
  }, [filteredVisits]);

  // 2. Agendamentos por Semana
  const weeklyData = useMemo(() => {
    const weeks: Record<string, number> = {};
    const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

    // Sort visits by date to maintain chronological order
    const sortedVisits = [...filteredVisits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedVisits.forEach(v => {
      const d = new Date(v.date + 'T12:00:00');
      
      const dayOfWeek = d.getDay(); // 0 = Dom, 1 = Seg ... 6 = Sab
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      
      const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday);
      const friday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4);
      
      const day = monday.getDate().toString().padStart(2, '0');
      const month = (monday.getMonth() + 1).toString().padStart(2, '0');
      const fridayDay = friday.getDate().toString().padStart(2, '0');
      const fridayMonth = (friday.getMonth() + 1).toString().padStart(2, '0');
      
      // Label mais intuitivo focado no intervalo de datas
      const weekLabel = `Período ${day}/${month} a ${fridayDay}/${fridayMonth}`;
      
      weeks[weekLabel] = (weeks[weekLabel] || 0) + 1;
    });

    return Object.entries(weeks)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => {
        // Ordenação por data (extraindo o primeiro dia do label)
        const dateA = a.name.match(/Período (\d+)\/(\d+)/);
        const dateB = b.name.match(/Período (\d+)\/(\d+)/);
        if (dateA && dateB) {
           const dA = parseInt(dateA[2]) * 100 + parseInt(dateA[1]);
           const dB = parseInt(dateB[2]) * 100 + parseInt(dateB[1]);
           return dA - dB;
        }
        return 0;
      })
      .slice(-5);
  }, [filteredVisits]);

  // 3. Agendamentos Mensais
  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    filteredVisits.forEach(v => {
      const d = new Date(v.date + 'T12:00:00');
      const monthLabel = monthNames[d.getMonth()];
      // Para o gráfico de crescimento, a gente pode querer mostrar apenas os meses filtrados
      months[monthLabel] = (months[monthLabel] || 0) + 1;
    });

    // Filtra para garantir que só exibe os meses que têm dados (ou se não houver filtro mostra os até o mês atual)
    return monthNames.map(name => ({
      name,
      total: months[name] || 0
    })).filter(m => m.total > 0 || dateFilter === 'all' && monthNames.indexOf(m.name) <= new Date().getMonth());
  }, [filteredVisits, dateFilter]);

  const generateAIInsights = async () => {
    if (loadingInsights || filteredVisits.length === 0) return;
    setLoadingInsights(true);
    try {
      const dataSummary = `
        Total visits: ${filteredVisits.length}
        Top customers: ${topCompaniesData.map(c => `${c.name} (${c.value} visits)`).join(', ')}
        Recent weekly trends: ${weeklyData.map(w => `${w.name}: ${w.total}`).join(', ')}
      `;

      let text = '';
      
      const systemPrompt = `Analise esses dados de logísticas de chamados técnicos externos. 
      Forneça 3 insights curtos e diretos em português sobre: volume, reincidência por empresa, eficiência. 
      NÃO mencione vendas. Seja observador e criativo. Varie sua resposta se já viu dados parecidos. 
      Dados atuias: ${dataSummary}`;

      // Always try client-side first if the key is available to avoid 405 on Vercel static deployments
      if (import.meta.env.VITE_AI_KEY) {
        try {
          const Groq = (await import('groq-sdk')).default;
          const groq = new Groq({ apiKey: import.meta.env.VITE_AI_KEY, dangerouslyAllowBrowser: true });
          const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: "Você é um especialista em logística de suporte técnico." },
              { role: "user", content: systemPrompt }
            ],
            temperature: 0.9,
            max_completion_tokens: 300,
          });
          text = response.choices[0]?.message?.content || '';
        } catch (e) {
          console.error("Groq client error:", e);
        }
      } 
      
      // Fallback to server if client-side failed or no key
      if (!text) {
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
          console.error("API error:", apiError);
          text = 'Não foi possível gerar insights. Verifique a chave de API (VITE_AI_KEY) ou o servidor.';
        }
      }
      
      setInsights(text);
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
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(22);
      doc.setTextColor(0);
      doc.text("Relatório de Chamados Externos", 20, 20);

      // Date
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, 28);

      let yPos = 45;

      // Section: Insights
      if (insights) {
        doc.setFontSize(14);
        doc.setTextColor(37, 99, 235); // Blue
        doc.text("Análise de Rotina Operacional", 20, yPos);
        yPos += 8;
        
        doc.setFontSize(11);
        doc.setTextColor(50);
        // Clean markdown from insights, simple string split
        const cleanInsights = insights.replace(/\*\*/g, '');
        const splitText = doc.splitTextToSize(cleanInsights, 170);
        doc.text(splitText, 20, yPos);
        yPos += (splitText.length * 6) + 15;
      }

      // Check page boundary
      if (yPos > 240) { doc.addPage(); yPos = 20; }

      // Section: Top Clientes
      doc.setFontSize(14);
      doc.setTextColor(217, 119, 6); // Amber
      doc.text("Empresas com Mais Chamados", 20, yPos);
      yPos += 8;
      
      doc.setFontSize(11);
      doc.setTextColor(80);
      topCompaniesData.forEach((comp, idx) => {
        doc.text(`${idx + 1}. ${comp.name}`, 20, yPos);
        doc.text(`${comp.value} chamado(s)`, 150, yPos);
        
        // simple separator line
        doc.setDrawColor(230);
        doc.line(20, yPos + 2, 190, yPos + 2);
        
        yPos += 8;
      });

      yPos += 15;
      if (yPos > 240) { doc.addPage(); yPos = 20; }

      // Section: Resumo Semanal
      doc.setFontSize(14);
      doc.setTextColor(139, 92, 246); // Purple
      doc.text("Volume de Chamados por Semana", 20, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.setTextColor(80);
      weeklyData.forEach((w) => {
        doc.text(`${w.name}`, 20, yPos);
        doc.text(`${w.total} chamado(s)`, 150, yPos);
        
        doc.setDrawColor(230);
        doc.line(20, yPos + 2, 190, yPos + 2);
        
        yPos += 8;
      });

      doc.save(`relatorio-chamados-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Visão Geral</h2>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
              className="w-full sm:w-auto appearance-none bg-white dark:bg-dark-surface border border-zinc-200 dark:border-dark-border rounded-lg pl-9 pr-8 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todo o período</option>
              <option value="this_month">Este mês</option>
              <option value="last_6_months">Últimos 6 meses</option>
              <option value="this_year">Este ano</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="bg-white dark:bg-dark-surface border-zinc-200 dark:border-dark-border flex-shrink-0"
          >
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Exportar PDF
          </Button>
        </div>
      </div>

      <div id="analytics-content" className="space-y-6">
        {/* Insights AI */}
        <div className="ai-card p-6 rounded-3xl text-white shadow-xl overflow-hidden relative bg-blue-600 dark:bg-blue-700">
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
          <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm print:shadow-none print:border-zinc-300">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg print:bg-transparent">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Top Clientes</h3>
            </div>
            <div className="w-full h-[300px] relative">
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
                      backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', 
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      color: theme === 'dark' ? '#f4f4f5' : '#18181b'
                    }}
                    itemStyle={{ color: theme === 'dark' ? '#f4f4f5' : '#18181b' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Agendamentos Mensais */}
          <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm print:shadow-none print:border-zinc-300">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg print:bg-transparent">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Crescimento Mensal</h3>
            </div>
            <div className="w-full h-[300px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#27272a' : '#f1f5f9'} />
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
                    cursor={{ fill: theme === 'dark' ? '#27272a' : '#f8fafc' }}
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', 
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      color: theme === 'dark' ? '#f4f4f5' : '#18181b'
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
        <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm print:shadow-none print:border-zinc-300">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg print:bg-transparent">
              <Calendar className="h-5 w-5 text-purple-500" />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Consistência Semanal</h3>
          </div>
          <div className="w-full h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#27272a' : '#f1f5f9'} />
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
                    backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', 
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    color: theme === 'dark' ? '#f4f4f5' : '#18181b'
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
