import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppData, Reminder, User, Visit } from '../types';
import { v4 as uuidv4 } from 'uuid';

const initialData: AppData = {
  users: [
    { id: '1', name: 'Admin', email: 'admin@equipe.com' },
    { id: '2', name: 'João Técnico', email: 'joao@equipe.com' },
    { id: '3', name: 'Maria Silva', email: 'maria@equipe.com' },
  ],
  reminders: [],
  visits: [],
  currentUser: { id: '1', name: 'Admin', email: 'admin@equipe.com' },
};

interface AppContextType extends AppData {
  login: (email: string) => void;
  logout: () => void;
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt'>) => void;
  updateReminder: (id: string, updates: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  addVisit: (visit: Omit<Visit, 'id' | 'createdAt'>) => void;
  updateVisit: (id: string, updates: Partial<Visit>) => void;
  deleteVisit: (id: string) => void;
  moveVisit: (id: string, newDate: string) => void; // for drag and drop
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('agenda-app-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.users && parsed.reminders && parsed.visits) return parsed;
      } catch (e) {
        console.error('Error parsing local storage data', e);
      }
    }
    return initialData;
  });

  useEffect(() => {
    localStorage.setItem('agenda-app-data', JSON.stringify(data));
  }, [data]);

  const login = (email: string) => {
    const user = data.users.find((u) => u.email === email);
    if (user) {
      setData((prev) => ({ ...prev, currentUser: user }));
    } else {
      // Auto-register for demo purposes
      const newUser = { id: uuidv4(), name: email.split('@')[0], email };
      setData((prev) => ({
        ...prev,
        users: [...prev.users, newUser],
        currentUser: newUser,
      }));
    }
  };

  const logout = () => setData((prev) => ({ ...prev, currentUser: null }));

  const addReminder = (reminder: Omit<Reminder, 'id' | 'createdAt'>) => {
    const newReminder: Reminder = {
      ...reminder,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, reminders: [...prev.reminders, newReminder] }));
  };

  const updateReminder = (id: string, updates: Partial<Reminder>) => {
    setData((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  };

  const deleteReminder = (id: string) => {
    setData((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((r) => r.id !== id),
    }));
  };

  const addVisit = (visit: Omit<Visit, 'id' | 'createdAt'>) => {
    const newVisit: Visit = {
      ...visit,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, visits: [...prev.visits, newVisit] }));
  };

  const updateVisit = (id: string, updates: Partial<Visit>) => {
    setData((prev) => ({
      ...prev,
      visits: prev.visits.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    }));
  };

  const deleteVisit = (id: string) => {
    setData((prev) => ({
      ...prev,
      visits: prev.visits.filter((v) => v.id !== id),
    }));
  };

  const moveVisit = (id: string, newDate: string) => {
    updateVisit(id, { date: newDate });
  };

  return (
    <AppContext.Provider
      value={{
        ...data,
        login,
        logout,
        addReminder,
        updateReminder,
        deleteReminder,
        addVisit,
        updateVisit,
        deleteVisit,
        moveVisit,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used within AppProvider');
  return context;
};
