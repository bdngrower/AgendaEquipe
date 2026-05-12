import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Button } from '../ui';
import { useAppStore } from '../../store/useAppStore';
import { Status, Visit } from '../../types';
import { format } from 'date-fns';

interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit?: Visit;
  defaultDate: string;
}

const statusOptions: Status[] = ['Pendente', 'Em andamento', 'Concluído', 'Cancelado'];

export function VisitModal({ isOpen, onClose, visit, defaultDate }: VisitModalProps) {
  const { users, addVisit, updateVisit, deleteVisit, currentUser } = useAppStore();
  
  const [formData, setFormData] = useState<Partial<Visit>>({});
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (visit) {
      setFormData(visit);
    } else {
      setFormData({
        customerName: '',
        date: defaultDate,
        time: '09:00',
        status: 'Pendente',
        notes: '',
      });
    }
    setShowConfirmDelete(false);
  }, [visit, defaultDate, isOpen, currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (visit) {
      updateVisit(visit.id, formData);
    } else {
      addVisit(formData as Omit<Visit, 'id' | 'createdAt'>);
    }
    onClose();
  };

  const confirmDelete = () => {
    if (visit) {
      deleteVisit(visit.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={visit ? 'Editar Visita' : 'Nova Visita'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200 mb-1">Cliente</label>
          <Input required name="customerName" value={formData.customerName || ''} onChange={handleChange} placeholder="Nome do cliente ou empresa" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200 mb-1">Data</label>
            <Input required type="date" name="date" value={formData.date || ''} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200 mb-1">Horário</label>
            <Input required type="time" name="time" value={formData.time || ''} onChange={handleChange} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200 mb-1">Status</label>
          <Select name="status" value={formData.status || 'Pendente'} onChange={handleChange}>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium tracking-wide text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1">Observações</label>
          <textarea 
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            rows={3}
            className="flex w-full rounded-xl border border-zinc-200/80 dark:border-dark-border bg-white dark:bg-dark-surface px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50 dark:focus:ring-blue-500/50 focus:border-blue-600 dark:focus:border-blue-500 transition-all duration-200"
            placeholder="Detalhes adicionais..."
          />
        </div>

        <div className="flex items-center justify-between pt-5 border-t border-zinc-100 dark:border-dark-border mt-6">
          {visit ? (
            showConfirmDelete ? (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 p-1.5 rounded-lg border border-red-200/80 dark:border-red-900/40">
                 <span className="text-xs text-red-600 dark:text-red-400 font-medium px-2">Excluir visita?</span>
                 <Button type="button" variant="ghost" size="sm" className="h-8 text-xs hover:bg-red-100 dark:hover:bg-red-900/50" onClick={() => setShowConfirmDelete(false)}>Não</Button>
                 <Button type="button" variant="danger" size="sm" className="h-8 text-xs" onClick={confirmDelete}>Sim, excluir</Button>
              </div>
            ) : (
              <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20" onClick={() => setShowConfirmDelete(true)}>
                Excluir
              </Button>
            )
          ) : <div></div>}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
