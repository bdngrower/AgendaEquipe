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
  const { companies, addVisit, updateVisit, deleteVisit, addCompany } = useAppStore();
  
  const [formData, setFormData] = useState<Partial<Visit>>({});
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isNewCompany, setIsNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  useEffect(() => {
    if (visit) {
      setFormData(visit);
      setIsNewCompany(false);
    } else {
      setFormData({
        customerName: '',
        companyId: '',
        date: defaultDate,
        time: '09:00',
        status: 'Pendente',
        notes: '',
      });
      setIsNewCompany(false);
    }
    setNewCompanyName('');
    setRegisterSuccess(false);
    setShowConfirmDelete(false);
  }, [visit, defaultDate, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'companyId') {
      if (value === 'new') {
        setIsNewCompany(true);
        setRegisterSuccess(false);
        setFormData(prev => ({ ...prev, companyId: '', customerName: '' }));
      } else {
        setIsNewCompany(false);
        const selectedCompany = companies.find(c => c.id === value);
        setFormData(prev => ({ 
          ...prev, 
          companyId: value, 
          customerName: selectedCompany?.name || '' 
        }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveNewCompany = async () => {
    if (!newCompanyName.trim() || isRegistering) return;
    
    setIsRegistering(true);
    try {
      const newId = await addCompany({
        name: newCompanyName.trim(),
        contact: formData.contact || ''
      });

      setFormData(prev => ({ 
        ...prev, 
        companyId: newId, 
        customerName: newCompanyName.trim() 
      }));
      
      setRegisterSuccess(true);
      setTimeout(() => {
        setIsNewCompany(false);
        setNewCompanyName('');
        setIsRegistering(false);
        setRegisterSuccess(false);
      }, 1500);
    } catch (error) {
      console.error("Error registering company", error);
      setIsRegistering(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      footer={
        <div className="flex items-center justify-between mt-4">
          {visit ? (
            showConfirmDelete ? (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 p-1.5 rounded-lg border border-red-200/80 dark:border-red-900/40">
                 <span className="text-xs text-red-600 dark:text-red-400 font-medium px-2">Excluir?</span>
                 <Button type="button" variant="ghost" size="sm" className="h-8 text-xs hover:bg-red-100 dark:hover:bg-red-900/50" onClick={() => setShowConfirmDelete(false)}>Não</Button>
                 <Button type="button" variant="danger" size="sm" className="h-8 text-xs" onClick={confirmDelete}>Sim</Button>
              </div>
            ) : (
              <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20" onClick={() => setShowConfirmDelete(true)}>
                Excluir
              </Button>
            )
          ) : <div></div>}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" form="visit-form">Salvar</Button>
          </div>
        </div>
      }
    >
      <form id="visit-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200 mb-1">Empresa</label>
          <Select 
            name="companyId" 
            value={isNewCompany ? 'new' : (formData.companyId || '')} 
            onChange={handleChange}
            required
          >
            <option value="" disabled>Selecione uma empresa...</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value="new">+ Cadastrar nova empresa</option>
          </Select>
        </div>

        {isNewCompany && (
          <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            {registerSuccess ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium py-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Empresa cadastrada com sucesso!
              </div>
            ) : (
              <>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Nome da Nova Empresa</label>
                    <Input 
                      required 
                      value={newCompanyName} 
                      onChange={(e) => setNewCompanyName(e.target.value)} 
                      placeholder="Ex: Empresa Ltda"
                      className="border-blue-200 dark:border-blue-800 focus:ring-blue-500"
                    />
                  </div>
                  <Button 
                    type="button" 
                    onClick={handleSaveNewCompany}
                    disabled={!newCompanyName.trim() || isRegistering}
                    variant="primary"
                    className="h-10 px-4"
                  >
                    {isRegistering ? 'Salvando...' : 'Cadastrar'}
                  </Button>
                </div>
                <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70">
                  * Clique em "Cadastrar" para salvar a empresa permanentemente antes de continuar.
                </p>
              </>
            )}
          </div>
        )}
        
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
      </form>
    </Modal>
  );
}
