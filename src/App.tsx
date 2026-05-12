/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useAppStore } from './store/useAppStore';
import { WeeklyBoard } from './components/board/WeeklyBoard';
import { ReminderList } from './components/reminders/ReminderList';
import { Summary } from './components/dashboard/Summary';
import { Calendar, CheckSquare, Settings, Menu, X, Bell, Moon, Sun } from 'lucide-react';
import { Button } from './components/ui';

function MainLayout() {
  const { currentUser, authReady } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  React.useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  };

  if (!authReady || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-dark-bg font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-dark-bg overflow-hidden font-sans">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={() => setSidebarOpen(true)} className="bg-white dark:bg-dark-surface shadow-sm border-zinc-200 dark:border-dark-border">
          <Menu className="h-5 w-5 bg-transparent" />
        </Button>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content - Side by Side layout */}
      <div className="flex w-full h-full">
        {/* Left column: Lembretes */}
        <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:flex w-80 lg:w-96 flex-col border-r border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-surface shadow-sm z-50 transition-transform duration-300 lg:transition-colors lg:duration-200`}>
           <div className="p-5 border-b border-zinc-200 dark:border-dark-border flex items-center justify-between transition-colors duration-200">
             <div className="flex items-center gap-3">
               <div className="bg-blue-600 p-2 rounded-lg text-white shadow-sm ring-1 ring-blue-700/50">
                 <Calendar className="h-5 w-5" />
               </div>
               <span className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 text-lg">Agenda Equipe</span>
             </div>
             <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="lg:hidden rounded-full hover:bg-zinc-200 dark:hover:bg-dark-surface-hover">
               <X className="h-5 w-5 text-zinc-500" />
             </Button>
           </div>
           
           <div className="flex-1 overflow-hidden">
             <ReminderList />
           </div>

           <div className="p-4 border-t border-zinc-200 dark:border-dark-border bg-zinc-50 dark:bg-transparent flex flex-col gap-4">
               <div className="flex items-center justify-between w-full">
                 <div className="flex items-center gap-3">
                   <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-dark-surface-hover flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold border border-blue-200 dark:border-dark-border shadow-sm">
                     {currentUser.name.charAt(0).toUpperCase()}
                   </div>
                   <div className="flex flex-col max-w-[120px]">
                     <span className="text-sm font-semibold tracking-tight leading-tight text-zinc-900 dark:text-zinc-200 truncate">{currentUser.name}</span>
                     <span className="text-xs text-zinc-500 dark:text-zinc-500 font-medium leading-tight truncate">{currentUser.email}</span>
                   </div>
                 </div>
                 <div className="flex gap-1">
                   <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full hover:bg-zinc-200 dark:hover:bg-dark-surface-hover transition-transform active:scale-95" title="Alternar tema">
                     {theme === 'light' ? <Moon className="h-4 w-4 text-zinc-500" /> : <Sun className="h-4 w-4 text-zinc-400" />}
                   </Button>
                 </div>
               </div>
           </div>
        </div>

        {/* Right column: Dashboard and Weekly Board */}
        <div className="flex-1 flex flex-col h-full overflow-hidden custom-scrollbar bg-zinc-50/50 dark:bg-dark-bg border-l border-transparent transition-colors duration-200">
           <div className="pt-16 lg:pt-8 pb-2 px-2">
             <Summary />
           </div>
           <div className="flex-1 overflow-hidden pb-4 px-2">
             <WeeklyBoard />
           </div>
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


