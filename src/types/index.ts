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

export interface Company {
  id: string;
  name: string;
  address?: string;
  contact?: string;
  createdAt: string;
}

export interface Visit {
  id: string;
  customerName: string;
  companyId?: string;
  address?: string;
  date: string; // ISO format YYYY-MM-DD
  time: string; // HH:mm
  assigneeId?: string;
  status: Status;
  isEmergency?: boolean;
  notes: string;
  contact?: string;
  ticketNumber?: string;
  createdAt: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AppData {
  users: User[];
  companies: Company[];
  reminders: Reminder[];
  visits: Visit[];
  currentUser: User | null;
}
