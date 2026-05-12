export type Status = 'Pendente' | 'Em andamento' | 'Concluído' | 'Cancelado';
export type Priority = 'Baixa' | 'Média' | 'Alta';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Reminder {
  id: string;
  title: string;
  description: string;
  date: string; // ISO format YYYY-MM-DD
  time: string; // HH:mm
  priority: Priority;
  assigneeId?: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface Visit {
  id: string;
  customerName: string;
  address?: string;
  date: string; // ISO format YYYY-MM-DD
  time: string; // HH:mm
  assigneeId?: string;
  status: Status;
  notes: string;
  contact?: string;
  createdAt: string;
}

export interface AppData {
  users: User[];
  reminders: Reminder[];
  visits: Visit[];
  currentUser: User | null;
}
