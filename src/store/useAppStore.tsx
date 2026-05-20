import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppData, Reminder, User, Visit, Company } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { auth, db } from '../lib/firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  getDoc,
  query,
  orderBy
} from 'firebase/firestore';

interface AppContextType extends AppData {
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt'>) => void;
  updateReminder: (id: string, updates: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  addVisit: (visit: Omit<Visit, 'id' | 'createdAt'>) => void;
  updateVisit: (id: string, updates: Partial<Visit>) => void;
  deleteVisit: (id: string) => void;
  moveVisit: (id: string, newDate: string) => void;
  addCompany: (company: Omit<Company, 'id' | 'createdAt'>) => Promise<string>;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  authReady: boolean;
  dataLoaded: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Not throwing immediately to prevent breaking the flow for users
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>({
    users: [],
    companies: [],
    reminders: [],
    visits: [],
    currentUser: null,
  });
  const [authReady, setAuthReady] = useState(false);
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });
  const [collectionsLoaded, setCollectionsLoaded] = useState({
    users: false,
    companies: false,
    reminders: false,
    visits: false
  });
  const dataLoaded = Object.values(collectionsLoaded).every(Boolean);
  const seeded = useRef(false);

  useEffect(() => {
    // Definimos um usuário padrão para que o sistema funcione sem login explícito
    // conforme solicitado pelo usuário ("não quero usuário nem nada")
    const defaultUser: User = {
      id: 'equipe-global',
      name: 'Membro da Equipe',
      email: 'equipe@agenda.com'
    };
    setData(prev => ({ ...prev, currentUser: defaultUser }));
    setAuthReady(true);

    // Tentamos o login anônimo apenas em segundo plano para manter uma sessão do Firebase,
    // mas não bloqueamos o funcionamento do app com isso.
    signInAnonymously(auth).catch(err => {
      console.warn("Silent anonymous log failure (expected if not enabled):", err.message);
    });
  }, []);

  useEffect(() => {
    // Carregamos os dados independentemente do login agora
    // pois as regras do Firestore foram relaxadas para este applet

    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as User);
      setData(prev => ({ ...prev, users }));
      setCollectionsLoaded(prev => ({ ...prev, users: true }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const unsubCompanies = onSnapshot(query(collection(db, 'companies'), orderBy('name')), (snapshot) => {
      const companies = snapshot.docs.map(doc => doc.data() as Company);
      setData(prev => ({ ...prev, companies }));
      setCollectionsLoaded(prev => ({ ...prev, companies: true }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'companies'));

    const unsubReminders = onSnapshot(query(collection(db, 'reminders')), async (snapshot) => {
      const reminders = snapshot.docs.map(doc => doc.data() as Reminder);
      setData(prev => ({ ...prev, reminders }));
      setCollectionsLoaded(prev => ({ ...prev, reminders: true }));
      
      if (!seeded.current && snapshot.empty && data.currentUser) {
        seeded.current = true;
        
        try {
          const companyId1 = uuidv4();
          await setDoc(doc(db, 'companies', companyId1), {
            id: companyId1,
            name: 'Empresa Alpha',
            contact: '(11) 99999-9999',
            createdAt: new Date().toISOString()
          });

          const reminderId1 = uuidv4();
          await setDoc(doc(db, 'reminders', reminderId1), {
            id: reminderId1,
            title: 'Reunião Geral',
            description: 'Reunião de alinhamento com a equipe',
            date: new Date().toISOString().split('T')[0],
            time: '09:00',
            priority: 'Alta',
            isCompleted: false,
            createdAt: new Date().toISOString(),
            assigneeId: data.currentUser.id
          });
          
          const visitId1 = uuidv4();
          await setDoc(doc(db, 'visits', visitId1), {
            id: visitId1,
            customerName: 'Empresa Alpha',
            companyId: companyId1,
            date: new Date().toISOString().split('T')[0],
            time: '14:00',
            status: 'Pendente',
            notes: 'Visita de demonstração inicial',
            contact: '(11) 99999-9999',
            createdAt: new Date().toISOString(),
            assigneeId: data.currentUser.id
          });
        } catch (e) {
          console.error("Failed to seed initial data", e);
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'reminders'));

    const unsubVisits = onSnapshot(query(collection(db, 'visits')), (snapshot) => {
      const visits = snapshot.docs.map(doc => doc.data() as Visit);
      setData(prev => ({ ...prev, visits }));
      setCollectionsLoaded(prev => ({ ...prev, visits: true }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'visits'));

    return () => {
      unsubUsers();
      unsubCompanies();
      unsubReminders();
      unsubVisits();
    };
  }, []);

  const addReminder = async (reminder: Omit<Reminder, 'id' | 'createdAt'>) => {
    const id = uuidv4();
    const newReminder: Reminder = {
      ...reminder,
      id,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'reminders', id), newReminder);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `reminders/${id}`);
    }
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    try {
      await updateDoc(doc(db, 'reminders', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reminders/${id}`);
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reminders', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reminders/${id}`);
    }
  };

  const addVisit = async (visit: Omit<Visit, 'id' | 'createdAt'>) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const newVisit: Visit = {
      ...visit,
      id,
      createdAt: now,
      scheduledAt: now,
      ...(visit.status === 'Em andamento' ? { startedAt: now } : {}),
      ...(visit.status === 'Concluído' ? { completedAt: now } : {})
    };
    try {
      await setDoc(doc(db, 'visits', id), newVisit);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `visits/${id}`);
    }
  };

  const updateVisit = async (id: string, updates: Partial<Visit>) => {
    try {
      const currentVisit = data.visits.find(v => v.id === id);
      const enhancedUpdates = { ...updates };
      const now = new Date().toISOString();

      if (updates.status && currentVisit && currentVisit.status !== updates.status) {
        if (updates.status === 'Em andamento' && !currentVisit.startedAt) {
          enhancedUpdates.startedAt = now;
        }
        if (updates.status === 'Concluído' && !currentVisit.completedAt) {
          enhancedUpdates.completedAt = now;
        }
      }

      await updateDoc(doc(db, 'visits', id), enhancedUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `visits/${id}`);
    }
  };

  const deleteVisit = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'visits', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `visits/${id}`);
    }
  };

  const moveVisit = (id: string, newDate: string) => {
    updateVisit(id, { date: newDate });
  };

  const addCompany = async (company: Omit<Company, 'id' | 'createdAt'>): Promise<string> => {
    // Check for existing company with same name to prevent duplicates
    const existing = data.companies.find(c => c.name.toLowerCase() === company.name.toLowerCase());
    if (existing) return existing.id;

    const id = uuidv4();
    const newCompany: Company = {
      ...company,
      id,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'companies', id), newCompany);
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `companies/${id}`);
      return id;
    }
  };

  const updateCompany = async (id: string, updates: Partial<Company>) => {
    try {
      await updateDoc(doc(db, 'companies', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${id}`);
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'companies', id));
      
      // Optional: Logic to handle orphan visits? 
      // For now we just delete the company.
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `companies/${id}`);
    }
  };

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
  };

  return (
    <AppContext.Provider
      value={{
        ...data,
        addReminder,
        updateReminder,
        deleteReminder,
        addVisit,
        updateVisit,
        deleteVisit,
        moveVisit,
        addCompany,
        updateCompany,
        deleteCompany,
        authReady,
        dataLoaded,
        theme,
        setTheme,
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


