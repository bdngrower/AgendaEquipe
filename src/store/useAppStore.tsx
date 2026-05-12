import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppData, Reminder, User, Visit } from '../types';
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
  query
} from 'firebase/firestore';

interface AppContextType extends AppData {
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt'>) => void;
  updateReminder: (id: string, updates: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  addVisit: (visit: Omit<Visit, 'id' | 'createdAt'>) => void;
  updateVisit: (id: string, updates: Partial<Visit>) => void;
  deleteVisit: (id: string) => void;
  moveVisit: (id: string, newDate: string) => void;
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
  // Not throwing immediately to prevent breaking the flow for users
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>({
    users: [],
    reminders: [],
    visits: [],
    currentUser: null,
  });
  const [authReady, setAuthReady] = useState(false);
  const seeded = useRef(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Anonymous auth failed", err);
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          const userData: User = {
            id: firebaseUser.uid,
            name: 'Membro da Equipe',
            email: 'equipe@agenda.com',
            createdAt: new Date().toISOString()
          };
          
          if (!userDoc.exists()) {
            await setDoc(userDocRef, userData);
          } else {
             userData.name = userDoc.data().name || userData.name;
             userData.email = userDoc.data().email || userData.email;
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

    const unsubReminders = onSnapshot(query(collection(db, 'reminders')), async (snapshot) => {
      const reminders = snapshot.docs.map(doc => doc.data() as Reminder);
      setData(prev => ({ ...prev, reminders }));
      
      if (!seeded.current && snapshot.empty && data.currentUser) {
        seeded.current = true;
        
        try {
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
            address: 'Rua Principal, 123',
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
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'visits'));

    return () => {
      unsubUsers();
      unsubReminders();
      unsubVisits();
    };
  }, [data.currentUser?.id]);

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


