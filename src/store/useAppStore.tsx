import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppData, Reminder, User, Visit } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { auth, db } from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  getDoc,
  query
} from 'firebase/firestore';

interface AppContextType extends AppData {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt'>) => void;
  updateReminder: (id: string, updates: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  addVisit: (visit: Omit<Visit, 'id' | 'createdAt'>) => void;
  updateVisit: (id: string, updates: Partial<Visit>) => void;
  deleteVisit: (id: string) => void;
  moveVisit: (id: string, newDate: string) => void;
  migrateLocalData: () => Promise<void>;
  authReady: boolean;
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
  throw new Error(JSON.stringify(errInfo));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>({
    users: [],
    reminders: [],
    visits: [],
    currentUser: null,
  });
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          const userData: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown',
            email: firebaseUser.email || '',
            createdAt: new Date().toISOString()
          };
          
          if (!userDoc.exists()) {
            await setDoc(userDocRef, userData);
          }
          
          setData(prev => ({ ...prev, currentUser: userData }));
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setData(prev => ({ ...prev, currentUser: null }));
      }
      setAuthReady(true);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!data.currentUser) {
      setData(prev => ({ ...prev, users: [], reminders: [], visits: [] }));
      return;
    }

    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as User);
      setData(prev => ({ ...prev, users }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const unsubReminders = onSnapshot(query(collection(db, 'reminders')), (snapshot) => {
      const reminders = snapshot.docs.map(doc => doc.data() as Reminder);
      setData(prev => ({ ...prev, reminders }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'reminders'));

    const unsubVisits = onSnapshot(query(collection(db, 'visits')), (snapshot) => {
      const visits = snapshot.docs.map(doc => doc.data() as Visit);
      setData(prev => ({ ...prev, visits }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'visits'));

    return () => {
      unsubUsers();
      unsubReminders();
      unsubVisits();
    };
  }, [data.currentUser?.id]);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error', error);
    }
  };

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
    const newVisit: Visit = {
      ...visit,
      id,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'visits', id), newVisit);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `visits/${id}`);
    }
  };

  const updateVisit = async (id: string, updates: Partial<Visit>) => {
    try {
      await updateDoc(doc(db, 'visits', id), updates);
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

  const migrateLocalData = async () => {
    const saved = localStorage.getItem('agenda-app-data');
    if (!saved || !data.currentUser) return;
    
    try {
      const parsed = JSON.parse(saved);
      const { currentUser } = data;
      
      if (parsed.reminders && Array.isArray(parsed.reminders)) {
        for (const r of parsed.reminders) {
          const id = r.id || uuidv4();
          try {
             await setDoc(doc(db, 'reminders', String(id)), {
                id: String(id),
                title: r.title || 'Lembrete Migrado',
                description: r.description || '',
                date: r.date || new Date().toISOString().split('T')[0],
                time: r.time || '09:00',
                priority: r.priority || 'Média',
                isCompleted: !!r.isCompleted,
                createdAt: r.createdAt || new Date().toISOString(),
                assigneeId: currentUser.id
             });
          } catch(e) { console.error('Erro migrando lembrete', e); }
        }
      }
      
      if (parsed.visits && Array.isArray(parsed.visits)) {
        for (const v of parsed.visits) {
          const id = v.id || uuidv4();
          try {
             await setDoc(doc(db, 'visits', String(id)), {
                id: String(id),
                customerName: v.customerName || 'Cliente Migrado',
                date: v.date || new Date().toISOString().split('T')[0],
                time: v.time || '09:00',
                status: v.status || 'Pendente',
                notes: v.notes || '',
                createdAt: v.createdAt || new Date().toISOString(),
                address: v.address || '',
                contact: v.contact || '',
                assigneeId: currentUser.id
             });
          } catch(e) { console.error('Erro migrando visita', e); }
        }
      }
      
      localStorage.setItem('agenda-app-data-migrated', saved);
      localStorage.removeItem('agenda-app-data');
      alert('Seus dados antigos foram recuperados e vinculados à sua conta com sucesso!');
    } catch (error) {
      console.error('Migration failed:', error);
      alert('Houve um erro ao tentar recuperar os dados antigos.');
    }
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
        migrateLocalData,
        authReady,
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

