/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useAppStore } from './store/useAppStore';
import { WeeklyBoard } from './components/board/WeeklyBoard';
import { ReminderList } from './components/reminders/ReminderList';
import { Summary } from './components/dashboard/Summary';
import { AnalyticsDashboard } from './components/dashboard/AnalyticsDashboard';
import { CompaniesManager } from './components/companies/CompaniesManager';
import { TaskNotificationOverlay } from './components/reminders/TaskNotificationOverlay';
import { Calendar, CheckSquare, Settings, Menu, X, Bell, Moon, Sun, ChevronLeft, ChevronRight, LayoutDashboard, ListTodo, Building2 } from 'lucide-react';
import { Button } from './components/ui';

function MainLayout() {
  const { currentUser, authReady, dataLoaded, theme, setTheme } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'agenda' | 'reports' | 'companies'>('agenda');
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  if (!authReady || !dataLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-dark-bg font-sans flex-col gap-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <img src="/logo.png" alt="ZimTask" className="h-8 w-8 object-contain" />
          </div>
        </div>
        <div className="text-sm text-zinc-500 font-medium animate-pulse">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-dark-bg overflow-hidden font-sans">
      <div className="print:hidden">
        <TaskNotificationOverlay />
      </div>
      {/* Mobile sidebar toggle */}
      {!sidebarOpen && (
        <div className="lg:hidden fixed top-4 left-4 z-50 print:hidden">
          <Button variant="outline" size="icon" onClick={() => setSidebarOpen(true)} className="bg-white dark:bg-dark-surface shadow-sm border-zinc-200 dark:border-dark-border">
            <Menu className="h-5 w-5 bg-transparent" />
          </Button>
        </div>
      )}

      {/* Desktop expand button (visible when collapsed) */}
      {!desktopSidebarOpen && (
        <div className="hidden lg:flex fixed top-4 left-4 z-50 print:hidden">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setDesktopSidebarOpen(true)} 
            className="bg-white dark:bg-dark-surface shadow-md border-zinc-200 dark:border-dark-border rounded-full hover:scale-110 active:scale-95 transition-all"
            title="Expandir Sidebar"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden print:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content - Side by Side layout */}
      <div className="flex w-full h-full">
        {/* Left column: Lembretes */}
        <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 ${desktopSidebarOpen ? 'lg:flex w-80 lg:w-96' : 'lg:hidden w-0'} flex-col border-r border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-surface shadow-sm z-50 transition-all duration-300 lg:transition-colors lg:duration-200 print:hidden`}>
            <div className="p-5 border-b border-zinc-200 dark:border-dark-border flex items-center justify-between transition-colors duration-200">
             <div className="flex items-center gap-3">
               <div className="bg-transparent overflow-hidden">
                 <img src="/logo.png" alt="ZimTask Logo" className="h-8 w-8 object-contain" onError={(e) => {
                   // Fallback para ícone se a imagem falhar
                   e.currentTarget.style.display = 'none';
                   const parent = e.currentTarget.parentElement;
                   if (parent) {
                     parent.className = "bg-blue-600 p-2 rounded-lg text-white shadow-sm ring-1 ring-blue-700/50";
                     const icon = document.createElement('div');
                     icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>';
                     parent.appendChild(icon.firstChild!);
                   }
                 }} />
               </div>
               <span className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 text-lg">ZimTask</span>
             </div>
             <div className="flex items-center gap-1">
               <Button 
                 variant="ghost" 
                 size="icon" 
                 onClick={() => setDesktopSidebarOpen(false)} 
                 className="hidden lg:flex rounded-full hover:bg-zinc-200 dark:hover:bg-dark-surface-hover text-zinc-400 hover:text-zinc-600 transition-colors"
                 title="Recolher Sidebar"
               >
                 <ChevronLeft className="h-5 w-5" />
               </Button>
               <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="lg:hidden rounded-full hover:bg-zinc-200 dark:hover:bg-dark-surface-hover">
                 <X className="h-5 w-5 text-zinc-500" />
               </Button>
             </div>
           </div>
           
           <div className="px-3 py-4 space-y-1">
             <button
               onClick={() => { setActiveTab('agenda'); setSidebarOpen(false); }}
               className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                 activeTab === 'agenda' 
                   ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' 
                   : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-dark-surface-hover'
               }`}
             >
               <ListTodo className="h-5 w-5" />
               <span>Agenda</span>
             </button>
             <button
               onClick={() => { setActiveTab('reports'); setSidebarOpen(false); }}
               className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                 activeTab === 'reports' 
                   ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' 
                   : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-dark-surface-hover'
               }`}
             >
               <LayoutDashboard className="h-5 w-5" />
               <span>Relatórios</span>
             </button>
             <button
               onClick={() => { setActiveTab('companies'); setSidebarOpen(false); }}
               className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                 activeTab === 'companies' 
                   ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' 
                   : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-dark-surface-hover'
               }`}
             >
               <Building2 className="h-5 w-5" />
               <span>Empresas</span>
             </button>
           </div>

           <div className="flex-1 overflow-hidden">
             <ReminderList />
           </div>

           <div className="p-4 border-t border-zinc-200 dark:border-dark-border bg-zinc-50 dark:bg-transparent flex flex-col gap-4">
               <div className="flex items-center justify-end w-full">
                 <div className="flex gap-1">
                   <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full hover:bg-zinc-200 dark:hover:bg-dark-surface-hover transition-transform active:scale-95" title="Alternar tema">
                     {theme === 'light' ? <Moon className="h-4 w-4 text-zinc-500" /> : <Sun className="h-4 w-4 text-zinc-400" />}
                   </Button>
                 </div>
               </div>
               {currentUser?.id === 'guest' && (
                 <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-800">
                   Aviso: Logon anônimo desativado no Firebase. Sincronização limitada.
                 </p>
               )}
           </div>
        </div>

        {/* Right column: Dashboard, Weekly Board or Companies */}
        <div className="flex-1 flex flex-col h-full overflow-hidden custom-scrollbar bg-zinc-50/50 dark:bg-dark-bg border-l border-transparent transition-colors duration-200">
           {activeTab === 'agenda' ? (
             <>
               <div className="pt-16 lg:pt-8 pb-2 px-2 hidden md:block">
                 <Summary />
               </div>
               <div className="flex-1 overflow-hidden pb-4 px-2 pt-16 md:pt-0">
                 <WeeklyBoard />
               </div>
             </>
           ) : activeTab === 'reports' ? (
             <div className="flex-1 overflow-y-auto p-4 lg:p-8 pt-16 lg:pt-8">
               <div className="max-w-6xl mx-auto space-y-8">
                 <div>
                   <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Painel de Relatórios</h1>
                   <p className="text-zinc-500 dark:text-zinc-400">Análise de desempenho e agendamentos</p>
                 </div>
                 <AnalyticsDashboard />
               </div>
             </div>
           ) : (
             <div className="flex-1 overflow-y-auto pt-16 lg:pt-8">
               <CompaniesManager />
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}


