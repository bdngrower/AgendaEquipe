import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Company, Visit } from '../../types';
import { 
  Building2, 
  Search, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ArrowLeft,
  Calendar,
  Filter,
  FileText,
  Clock,
  MapPin,
  Phone,
  AlertCircle
} from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '../ui';

type FilterType = 'all' | 'week' | 'month' | 'year';

export function CompaniesManager() {
  const { companies, visits, deleteCompany, addCompany } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<FilterType>('month');
  const [isAdding, setIsAdding] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyContact, setNewCompanyContact] = useState('');

  const filteredCompanies = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return companies.filter(c => 
      c.name.toLowerCase().includes(term) ||
      (c.contact && c.contact.toLowerCase().includes(term))
    );
  }, [companies, searchTerm]);

  const selectedCompany = useMemo(() => {
    return companies.find(c => c.id === selectedCompanyId) || null;
  }, [companies, selectedCompanyId]);

  const companyVisits = useMemo(() => {
    if (!selectedCompanyId) return [];
    
    const now = new Date();
    let interval = { start: new Date(0), end: new Date(9999, 11, 31) };

    if (dateFilter === 'week') {
      interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    } else if (dateFilter === 'month') {
      interval = { start: startOfMonth(now), end: endOfMonth(now) };
    } else if (dateFilter === 'year') {
      interval = { start: startOfYear(now), end: endOfYear(now) };
    }

    return visits
      .filter(v => v.companyId === selectedCompanyId)
      .filter(v => {
        if (dateFilter === 'all') return true;
        const vDate = parseISO(v.date);
        return isWithinInterval(vDate, interval);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [visits, selectedCompanyId, dateFilter]);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    
    await addCompany({
      name: newCompanyName.trim(),
      contact: newCompanyContact.trim()
    });
    
    setNewCompanyName('');
    setNewCompanyContact('');
    setIsAdding(false);
  };

  const handleDeleteCompany = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a empresa "${name}"? Isso não excluirá os chamados, mas eles ficarão desassociados.`)) {
      deleteCompany(id);
      if (selectedCompanyId === id) setSelectedCompanyId(null);
    }
  };

  const companyStats = useMemo(() => {
    return {
      total: companyVisits.length,
      completed: companyVisits.filter(v => v.status === 'Concluído').length,
      pending: companyVisits.filter(v => ['Pendente', 'Em andamento'].includes(v.status)).length
    };
  }, [companyVisits]);

  if (selectedCompanyId && selectedCompany) {
    return (
      <div className="p-4 lg:p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button 
          onClick={() => setSelectedCompanyId(null)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-6 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium text-sm">Voltar para a lista</span>
        </button>

        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-zinc-200 dark:border-dark-border shadow-sm overflow-hidden mb-8">
          <div className="p-6 lg:p-8 bg-zinc-50 dark:bg-black/20 border-b border-zinc-200 dark:border-dark-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Building2 className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{selectedCompany.name}</h1>
                  <div className="flex items-center gap-4 mt-1">
                    {selectedCompany.contact ? (
                      <a href={`tel:${selectedCompany.contact.replace(/\D/g, '')}`} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors">
                        <Phone className="h-3.5 w-3.5" />
                        {selectedCompany.contact}
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-sm">
                        <Phone className="h-3.5 w-3.5" /> Sem contato
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-dark-border shadow-sm">
                {(['week', 'month', 'year', 'all'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setDateFilter(f)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      dateFilter === f 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {f === 'week' ? 'Semana' : f === 'month' ? 'Mês' : f === 'year' ? 'Ano' : 'Tudo'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-8">
              <div className="bg-white dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-center">
                <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-1">Total de Chamados</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{companyStats.total}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-center">
                <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-1">Concluídos</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-500">{companyStats.completed}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-center">
                <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-1">Pendentes</span>
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-500">{companyStats.pending}</span>
              </div>
            </div>
          </div>

          <div className="p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <h2 className="font-bold text-zinc-900 dark:text-zinc-100">Histórico de Chamados</h2>
              </div>
            </div>

            {companyVisits.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companyVisits.map((visit) => (
                  <div 
                    key={visit.id}
                    className="p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-dark-border hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(visit.date), "dd 'de' MMMM", { locale: ptBR })}
                        </div>
                        {visit.ticketNumber && (
                          <div className="text-xs font-medium text-purple-600 dark:text-purple-400">
                            Chamado: {visit.ticketNumber}
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        visit.status === 'Concluído' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        visit.status === 'Confirmado' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        visit.status === 'Pendente' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        visit.status === 'Em andamento' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {visit.status}
                      </span>
                    </div>
                    <p className="text-zinc-700 dark:text-zinc-300 text-sm mb-3 font-medium line-clamp-2">
                      {visit.notes || 'Sem observações'}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {visit.time}
                      </div>
                      {visit.contact && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {visit.contact}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col items-center max-w-xs mx-auto">
                  <AlertCircle className="h-10 w-10 text-zinc-300 mb-4" />
                  <p className="text-zinc-500 font-medium">Nenhum chamado encontrado para este período.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">Gerenciar Empresas</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Visualize históricos e organize sua base de clientes.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Nova Empresa</span>
        </button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-zinc-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar por nome ou contato..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-dark-surface border border-zinc-200 dark:border-dark-border rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm text-zinc-900 dark:text-zinc-100"
        />
      </div>

      {isAdding && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-200 dark:border-blue-800/50 animate-in zoom-in-95 duration-200 shadow-sm">
          <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Cadastrar Novo Cliente
          </h3>
          <form onSubmit={handleAddCompany} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              autoFocus
              type="text"
              placeholder="Nome da Empresa"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              className="px-4 py-3 bg-white dark:bg-zinc-900 border border-blue-100 dark:border-blue-900/50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-zinc-900 dark:text-zinc-100"
            />
            <input
              type="text"
              placeholder="Contato (Opcional)"
              value={newCompanyContact}
              onChange={(e) => setNewCompanyContact(e.target.value)}
              className="px-4 py-3 bg-white dark:bg-zinc-900 border border-blue-100 dark:border-blue-900/50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-zinc-900 dark:text-zinc-100"
            />
            <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
              <Button 
                variant="ghost" 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="font-bold text-zinc-600 dark:text-zinc-400"
              >
                Cancelar
              </Button>
              <Button type="submit" className="px-8 font-extrabold shadow-md shadow-blue-600/20">
                Salvar Empresa
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {filteredCompanies.length > 0 ? (
          filteredCompanies.map((company) => (
            <div 
              key={company.id}
              className="group flex items-center justify-between p-4 bg-white dark:bg-dark-surface border border-zinc-200 dark:border-dark-border rounded-2xl hover:border-blue-500 dark:hover:border-blue-500/50 transition-all shadow-sm hover:shadow-md cursor-pointer"
              onClick={() => setSelectedCompanyId(company.id)}
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-zinc-50 dark:bg-black/20 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {company.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {visits.filter(v => v.companyId === company.id).length} chamados
                    </span>
                    {company.contact && (
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {company.contact}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCompany(company.id, company.name);
                  }}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Excluir empresa"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="p-2 text-zinc-300 group-hover:text-blue-400 transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center">
            <p className="text-zinc-400 font-medium">Nenhuma empresa encontrada com esse nome.</p>
          </div>
        )}
      </div>
    </div>
  );
}
