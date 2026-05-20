import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { Button } from '../ui';
import { Trophy, TrendingUp, Calendar, Download, Sparkles, FileText, Loader2, Filter, PieChart as PieChartIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

type DateFilterType = 'all' | 'last_7_days' | 'this_month' | 'last_6_months' | 'this_year' | 'custom';

export function AnalyticsDashboard() {
  const { visits, companies, theme } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const filteredVisits = useMemo(() => {
    if (dateFilter === 'all') return visits;
    
    const now = new Date();
    return visits.filter(v => {
      const vDate = new Date(v.date + 'T12:00:00');
      
      if (dateFilter === 'last_7_days') {
        const last7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        return vDate >= last7Days;
      }
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
      if (dateFilter === 'custom') {
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate + 'T00:00:00');
          const end = new Date(customEndDate + 'T23:59:59');
          return vDate >= start && vDate <= end;
        }
        return true;
      }
      return true;
    });
  }, [visits, dateFilter, customStartDate, customEndDate]);

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

  // Status Distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      'Concluído': 0,
      'Pendente': 0,
      'Em andamento': 0,
      'Confirmado': 0,
      'Cancelado': 0
    };
    
    filteredVisits.forEach(v => {
      if (counts[v.status] !== undefined) {
        counts[v.status]++;
      } else {
        counts[v.status] = 1;
      }
    });

    const statusColors: Record<string, string> = {
      'Concluído': '#10b981',     // green-500
      'Pendente': '#f59e0b',      // amber-500
      'Em andamento': '#8b5cf6',  // purple-500
      'Confirmado': '#3b82f6',    // blue-500
      'Cancelado': '#ef4444'      // red-500
    };

    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value, color: statusColors[name] || '#94a3b8' }));
  }, [filteredVisits]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const total = filteredVisits.length;
    const completed = filteredVisits.filter(v => v.status === 'Concluído').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const uniqueCompanies = new Set(filteredVisits.filter(v => v.companyId).map(v => v.companyId)).size;
    
    // SLA metrics
    let totalScheduleDiff = 0;
    let scheduleCount = 0;
    let totalCompleteDiff = 0;
    let completeCount = 0;

    filteredVisits.forEach(v => {
      if (v.createdAt) {
        const created = new Date(v.createdAt).getTime();
        
        if (v.date && v.time) {
          const scheduledDate = new Date(`${v.date}T${v.time}:00`).getTime();
          if (!isNaN(scheduledDate)) {
             // Diff in positive hours from creation to schedule
            totalScheduleDiff += Math.abs(scheduledDate - created);
            scheduleCount++;
          }
        }

        if (v.completedAt) {
          totalCompleteDiff += Math.abs(new Date(v.completedAt).getTime() - created);
          completeCount++;
        }
      }
    });

    const avgScheduleHours = scheduleCount > 0 ? (totalScheduleDiff / scheduleCount) / (1000 * 60 * 60) : 0;
    const avgCompleteHours = completeCount > 0 ? (totalCompleteDiff / completeCount) / (1000 * 60 * 60) : 0;

    return { 
      total, 
      completed, 
      completionRate, 
      uniqueCompanies,
      avgScheduleHours: avgScheduleHours.toFixed(1),
      avgCompleteHours: avgCompleteHours.toFixed(1)
    };
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
      
      const systemPrompt = `
# IDENTIDADE E CONTEXTO
Você é um Analista Especialista em Operações de Suporte Técnico Externo, com expertise em logística de atendimento, otimização de recursos e análise de padrões operacionais. Seu objetivo é transformar dados de chamados técnicos em insights acionáveis para a operação.

# DADOS ATUAIS E REAIS PARA ANÁLISE
Use EXCLUSIVAMENTE os dados abaixo. Ignore os números dos exemplos.
-------------------
${dataSummary}
-------------------

# FRAMEWORK DE ANÁLISE
1. **Volume e Tendências**: Padrões temporais reais (identifique os dias que mais ocorrem na base enviada).
2. **Reincidência**: Empresas com volume atípico, problemas crônicos (veja o Top Empresas).
3. **Eficiência Operacional**: SLAs, gargalos de tempo de resolução ou agendamento de acordo com os dados reais.

# ESTRUTURA DE RESPOSTA
Forneça **3 a 4 insights** operacionais priorizados por impacto, usando EXATAMENTE o formato:

**[Ícone] [Categoria]: [Título do Insight]**
[Descrição resumida com os números extraídos APENAS do texto de "DADOS ATUAIS"]
→ [Ação operacional recomendada baseada no problema real e aplicável]

Categorias: 📊 Volume | 🔄 Reincidência | ⚡ Eficiência | ⚠️ Alerta

# DIRETRIZES CRÍTICAS

**FAZER:**
✅ Usar APENAS os dados contidos na variável "Dados atuais" (números, repetições, empresas). NUNCA copie informações dos exemplos!
✅ Focar em ações logísticas e preventivas (visita técnica de manutenção, realocação de tempo, revisão do tempo de deslocamento).
✅ Explicar o impacto operacional da anomalia encontrada.

**NÃO FAZER:**
❌ NÃO copie ou use os números ilustrativos do "EXEMPLO DE QUALIDADE" (ex: 47 chamados na segunda-feira - isso é apenas um exemplo!). 
❌ NÃO invente informações ou mencione dados que não estão nos "Dados atuais".
❌ NÃO sugira soluções em domingos ou finais de semana (a operação NÃO trabalha aos fins de semana).
❌ NÃO apresente "Oportunidades" genéricas (como "implementar sistema de análise de tendências"). Dê conselhos voltados à prática (distribuição de técnicos, auditoria, ajuste de SLA).
❌ NÃO insira a palavra "**Resposta**" ou qualquer texto introdutório. Comece diretamente com os insights.

# EXEMPLO DE QUALIDADE (NÃO COPIE ESTES NÚMEROS)
**Exemplo Bom**: "📊 Volume: Maior concentração na quarta-feira (45% da semana)."
**Exemplo Excelente**: "⚡ Eficiência: Quarta-feira concentra alto volume, elevando SLA. → Considere reforçar frota na quarta ou rever roteirização técnica da região desse cliente."

# OUTPUT
Apenas o Markdown listando os insights com o formato acima, perfeitamente limpo.
`;

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

  const handleExportCSV = () => {
    try {
      const headers = ['Data', 'Hora', 'Empresa', 'Status', 'Chamado', 'Contato', 'Observações'];
      const csvContent = [
        headers.join(','),
        ...filteredVisits.map(v => 
          [
            v.date,
            v.time,
            `"${(v.customerName || '').replace(/"/g, '""')}"`,
            `"${v.status}"`,
            `"${(v.ticketNumber || '').replace(/"/g, '""')}"`,
            `"${(v.contact || '').replace(/"/g, '""')}"`,
            `"${(v.notes || '').replace(/"/g, '""')}"`
          ].join(',')
        )
      ].join('\n');

      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `chamados-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(error);
      alert("Erro ao exportar CSV.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Visão Geral</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white dark:bg-dark-surface border border-zinc-200 dark:border-dark-border rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-zinc-400 text-sm">até</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white dark:bg-dark-surface border border-zinc-200 dark:border-dark-border rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
              className="w-full sm:w-auto appearance-none bg-white dark:bg-dark-surface border border-zinc-200 dark:border-dark-border rounded-lg pl-9 pr-8 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todo o período</option>
              <option value="last_7_days">Últimos 7 dias</option>
              <option value="this_month">Este mês</option>
              <option value="last_6_months">Últimos 6 meses</option>
              <option value="this_year">Este ano</option>
              <option value="custom">Período Personalizado</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportCSV}
              className="bg-white dark:bg-dark-surface border-zinc-200 dark:border-zinc-700 text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 hover:border-green-300 dark:hover:border-green-700 flex-shrink-0 font-medium"
            >
              <Download className="h-4 w-4 mr-2" />
              Excel (CSV)
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="bg-white dark:bg-dark-surface border-zinc-200 dark:border-dark-border flex-shrink-0 text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:border-red-300 dark:hover:border-red-700 font-medium"
            >
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              PDF
            </Button>
          </div>
        </div>
      </div>

      <div id="analytics-content" className="space-y-6">
        {/* Overall KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-dark-surface p-5 rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm flex flex-col justify-center">
            <span className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">Total de Chamados</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">{kpis.total}</span>
          </div>
          <div className="bg-white dark:bg-dark-surface p-5 rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm flex flex-col justify-center">
            <span className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">Concluídos</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-green-600 dark:text-green-500">{kpis.completed}</span>
          </div>
          <div className="bg-white dark:bg-dark-surface p-5 rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm flex flex-col justify-center">
            <span className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">Taxa Resolvido</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-500">{kpis.completionRate}%</span>
          </div>
          <div className="bg-white dark:bg-dark-surface p-5 rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm flex flex-col justify-center">
            <span className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">Total Empresas</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-500">{kpis.uniqueCompanies}</span>
          </div>
          <div className="bg-white dark:bg-dark-surface p-5 rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm flex flex-col justify-center">
            <span className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">SLA Agendamento</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-500">{kpis.avgScheduleHours}h</span>
          </div>
          <div className="bg-white dark:bg-dark-surface p-5 rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm flex flex-col justify-center">
            <span className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">SLA Resolução</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-teal-600 dark:text-teal-500">{kpis.avgCompleteHours}h</span>
          </div>
        </div>

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
          {/* Distribuição de Status */}
          <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm print:shadow-none print:border-zinc-300">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg print:bg-transparent">
                <PieChartIcon className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Status dos Chamados</h3>
            </div>
            <div className="w-full h-[300px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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
