/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  UserPlus, 
  X, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Download,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  Sparkles,
  Loader2,
  Calendar,
  Check,
  Clock,
  ShieldCheck,
  FileCheck,
  Filter,
  DollarSign,
  CheckSquare,
  Info
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Employee, CompanyData } from '../types';
import { calcularFolhaSalario } from '../db_tax';

export function getCarrierInfo(phone: string) {
  const clean = phone.replace(/\s+/g, '').trim();
  if (!clean) return { name: '', wallet: '', valid: true, error: '', color: '' };
  
  if (clean.length !== 9) {
    return { 
      name: '', 
      wallet: '', 
      valid: false, 
      error: 'Telemóvel deve ter exatamente 9 dígitos.',
      color: 'text-amber-700 bg-amber-50 border-amber-200' 
    };
  }
  
  if (!/^\d+$/.test(clean)) {
    return { 
      name: '', 
      wallet: '', 
      valid: false, 
      error: 'Deve conter apenas algarismos.',
      color: 'text-rose-700 bg-rose-50 border-rose-200' 
    };
  }

  const prefix = clean.substring(0, 2);
  if (prefix === '84' || prefix === '85') {
    return { 
      name: 'Vodacom', 
      wallet: 'M-Pesa', 
      valid: true, 
      error: '', 
      color: 'text-red-700 bg-red-50 border-red-100' 
    };
  } else if (prefix === '86' || prefix === '87') {
    return { 
      name: 'Movitel', 
      wallet: 'e-Mola', 
      valid: true, 
      error: '', 
      color: 'text-orange-700 bg-orange-50 border-orange-100' 
    };
  } else if (prefix === '82' || prefix === '83') {
    return { 
      name: 'Tmcel', 
      wallet: 'mKesh', 
      valid: true, 
      error: '', 
      color: 'text-yellow-700 bg-yellow-50 border-yellow-100' 
    };
  } else {
    return { 
      name: 'Desconhecido', 
      wallet: '', 
      valid: false, 
      error: 'Prefixo de operadora inválido. Telemóveis em Moçambique iniciam com 82, 83, 84, 85, 86 ou 87.', 
      color: 'text-rose-700 bg-rose-50 border-rose-200' 
    };
  }
}

export function getNuitInfo(nuitVal: string) {
  const clean = nuitVal.trim();
  if (!clean || clean === 'Isento') return { valid: true, error: '' };
  if (clean.length !== 9 || !/^\d+$/.test(clean)) {
    return { valid: false, error: 'O NUIT deve conter exatamente 9 algarismos numéricos.' };
  }
  return { valid: true, error: '' };
}

export const getPeriodDetails = (period: string) => {
  const mesesMap: { [key: string]: number } = {
    'janeiro': 0, 'fevereiro': 1, 'março': 2, 'abril': 3, 'maio': 4, 'junho': 5,
    'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
  };
  
  const parts = period.trim().split(' ');
  const mesNome = parts[0]?.toLowerCase() || 'janeiro';
  const ano = parseInt(parts[1]) || 2026;
  const mesIndex = mesesMap[mesNome] !== undefined ? mesesMap[mesNome] : 0;
  
  return { mesIndex, ano, mesNome };
};

export const getDayOfWeekName = (day: number, period: string) => {
  const { mesIndex, ano } = getPeriodDetails(period);
  const date = new Date(ano, mesIndex, day);
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return {
    name: weekdays[date.getDay()],
    isWeekend: date.getDay() === 0 || date.getDay() === 6
  };
};

export const getDateString = (day: number, period: string) => {
  const { mesIndex, ano } = getPeriodDetails(period);
  const m = String(mesIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${ano}-${m}-${d}`;
};

export const getDefaultDayStatus = (day: number, period: string): 'Presenca' | 'Falta_Justificada' | 'Falta_Injustificada' | 'Descanso' => {
  const { isWeekend } = getDayOfWeekName(day, period);
  return isWeekend ? 'Descanso' : 'Presenca';
};

interface EmployeeDirectoryProps {
  employees: Employee[];
  company: CompanyData;
  onAdd: (emp: Omit<Employee, 'id'>) => Promise<void>;
  onUpdate: (id: string, emp: Partial<Employee>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  selectedPeriod: string;
  onReload: () => void;
  onReset?: () => Promise<void>;
  onSeed?: () => Promise<void>;
}

export default function EmployeeDirectory({
  employees,
  company,
  onAdd,
  onUpdate,
  onDelete,
  selectedPeriod,
  onReload,
  onReset,
  onSeed
}: EmployeeDirectoryProps) {
  const { showSuccess, showError, showInfo } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [expandedEmpId, setExpandedEmpId] = useState<string | null>(null);

  // HR Sub-Tab state
  const [hrSubTab, setHrSubTab] = useState<'diretorio' | 'timesheet'>('diretorio');

  // Timesheet Justification Modal state
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [justificationEmpId, setJustificationEmpId] = useState<string>('');
  const [justificationDayStart, setJustificationDayStart] = useState<number>(1);
  const [justificationDayEnd, setJustificationDayEnd] = useState<number>(1);
  const [justificationTipo, setJustificationTipo] = useState<'Injustificada' | 'Doenca' | 'Casamento' | 'Nojo' | 'Academica' | 'Maternidade_Paternidade' | 'Outra_Justificada'>('Doenca');
  const [justificationDocRef, setJustificationDocRef] = useState('');
  const [justificationObs, setJustificationObs] = useState('');
  const [isSavingJustification, setIsSavingJustification] = useState(false);
  const [timesheetSearchTerm, setTimesheetSearchTerm] = useState('');
  const [markingAllProcessing, setMarkingAllProcessing] = useState(false);

  // Auto Upload and AI Parsing State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsedCount, setParsedCount] = useState<number | null>(null);

  // New progress & success animation states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState('');
  const [isSuccessState, setIsSuccessState] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    
    // Check file extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isPdf = ext === 'pdf' || file.type === 'application/pdf';
    const isExcelOrCsv = ['csv', 'xlsx', 'xls'].includes(ext || '') || 
      ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'].includes(file.type);

    if (!isPdf && !isExcelOrCsv) {
      setUploadError('Formato inválido. Por favor, envie um ficheiro em formato PDF, Excel (.xlsx, .xls) ou CSV.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setParsedCount(null);
    setIsSuccessState(false);
    setUploadProgress(10);
    setUploadStep('A carregar documento para o servidor...');
    setUploadingFileName(file.name);

    let intervalId: any = null;

    try {
      // Read file to Base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          // Extract only the base64 part, stripping the data:...;base64, header
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = (error) => reject(error);
      });

      setUploadProgress(25);
      setUploadStep('A codificar ficheiro em formato seguro...');

      // Send to backend
      const mimeType = file.type && file.type !== 'application/octet-stream' 
        ? file.type 
        : (isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      setUploadProgress(40);
      setUploadStep('A analisar documento com Inteligência Artificial (Gemini)...');

      // Auto progression of simulated steps during processing
      let progressVal = 40;
      intervalId = setInterval(() => {
        if (progressVal < 92) {
          progressVal += Math.floor(Math.random() * 4) + 1;
          if (progressVal > 92) progressVal = 92;
          setUploadProgress(progressVal);
          if (progressVal > 78) {
            setUploadStep('A estruturar fichas e contratos no ERP...');
          } else if (progressVal > 62) {
            setUploadStep('A extrair salários, NUITs e números de INSS...');
          } else if (progressVal > 48) {
            setUploadStep('A ler tabelas e mapear campos de dados...');
          }
        }
      }, 700);

      const res = await fetch('/api/employees/upload-parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          base64,
          mimeType,
          fileName: file.name
        })
      });

      if (intervalId) clearInterval(intervalId);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar ficheiro com a Inteligência Artificial.');
      }

      if (data.sucesso) {
        setUploadProgress(100);
        setUploadStep('Leitura de dados concluída!');
        
        // Wait for bar animation to reach 100%
        await new Promise(resolve => setTimeout(resolve, 850));
        
        setIsSuccessState(true);
        setParsedCount(data.colaboradores_adicionados.length);
        if (onReload) onReload(); // Reload the list from database
        
        // Keep modal showing the success state for 4.5 seconds
        setTimeout(() => {
          setShowUploadModal(false);
          // Wait for exit transition, then reset all states cleanly
          setTimeout(() => {
            setParsedCount(null);
            setIsSuccessState(false);
            setIsUploading(false);
            setUploadProgress(0);
            setUploadStep('');
            setUploadingFileName('');
          }, 400);
        }, 4500);
      } else {
        throw new Error(data.error || 'Não foi possível carregar os colaboradores.');
      }
    } catch (err: any) {
      if (intervalId) clearInterval(intervalId);
      console.error(err);
      setUploadError(err.message || 'Ocorreu um erro inesperado ao processar o ficheiro.');
      setUploadProgress(0);
      setUploadStep('');
      setIsUploading(false);
    }
  };

  // Form State
  const [nome, setNome] = useState('');
  const [nuit, setNuit] = useState('');
  const [inssNumero, setInssNumero] = useState('');
  const [cargo, setCargo] = useState('');
  const [salarioBase, setSalarioBase] = useState(15000);
  const [numeroDependentes, setNumeroDependentes] = useState(0);
  const [carteiraMovel, setCarteiraMovel] = useState('');

  // Individual calculation results
  const [calcResult, setCalcResult] = useState<any>(null);
  const [loadingPay, setLoadingPay] = useState(false);

  // Search filter
  const filteredEmployees = employees.filter(emp => 
    emp.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.nuit.includes(searchTerm)
  );

  const resetForm = () => {
    setNome('');
    setNuit('');
    setInssNumero('');
    setCargo('');
    setSalarioBase(15000);
    setNumeroDependentes(0);
    setCarteiraMovel('');
  };

  const handleAddFalta = async (emp: Employee, tipo: 'Injustificada' | 'Doenca' | 'Casamento' | 'Nojo' | 'Academica' | 'Maternidade_Paternidade' | 'Outra_Justificada') => {
    const remunerada = tipo !== 'Injustificada';
    const currentHistorico = emp.faltas_historico || [];
    
    const newItem = {
      id: `faltas-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      data: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      tipo,
      remunerada,
      dias: 1
    };

    const updatedHistorico = [...currentHistorico, newItem];

    try {
      await onUpdate(emp.id, { faltas_historico: updatedHistorico });
      onReload();
    } catch (err) {
      console.error("Erro ao registar falta:", err);
    }
  };

  const handleDeleteFalta = async (emp: Employee, faltaId: string) => {
    const currentHistorico = emp.faltas_historico || [];
    const updatedHistorico = currentHistorico.filter(f => f.id !== faltaId);

    try {
      await onUpdate(emp.id, { faltas_historico: updatedHistorico });
      onReload();
    } catch (err) {
      console.error("Erro ao remover falta:", err);
    }
  };

  const handleToggleTimesheetDay = async (emp: Employee, day: number) => {
    const dateStr = getDateString(day, selectedPeriod);
    const currentTimesheet = emp.timesheet || {};
    const currentStatus = currentTimesheet[dateStr] || getDefaultDayStatus(day, selectedPeriod);
    
    let nextStatus: 'Presenca' | 'Falta_Justificada' | 'Falta_Injustificada' | 'Descanso';
    const { isWeekend } = getDayOfWeekName(day, selectedPeriod);
    
    if (isWeekend) {
      if (currentStatus === 'Descanso') nextStatus = 'Presenca';
      else if (currentStatus === 'Presenca') nextStatus = 'Falta_Justificada';
      else if (currentStatus === 'Falta_Justificada') nextStatus = 'Falta_Injustificada';
      else nextStatus = 'Descanso';
    } else {
      if (currentStatus === 'Presenca') nextStatus = 'Falta_Justificada';
      else if (currentStatus === 'Falta_Justificada') nextStatus = 'Falta_Injustificada';
      else if (currentStatus === 'Falta_Injustificada') nextStatus = 'Descanso';
      else nextStatus = 'Presenca';
    }

    const updatedTimesheet = { ...currentTimesheet, [dateStr]: nextStatus };
    const currentHistorico = emp.faltas_historico || [];
    
    // Filtramos qualquer falta existente para este dia específico no histórico
    const updatedHistorico = currentHistorico.filter(f => f.data !== dateStr);
    
    if (nextStatus === 'Falta_Injustificada') {
      updatedHistorico.push({
        id: `faltas-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        data: dateStr,
        tipo: 'Injustificada',
        remunerada: false,
        dias: 1
      });
    } else if (nextStatus === 'Falta_Justificada') {
      updatedHistorico.push({
        id: `faltas-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        data: dateStr,
        tipo: 'Outra_Justificada',
        remunerada: true,
        dias: 1
      });
    }

    try {
      await onUpdate(emp.id, { 
        timesheet: updatedTimesheet, 
        faltas_historico: updatedHistorico 
      });
      onReload();
    } catch (err) {
      console.error("Erro ao atualizar timesheet:", err);
    }
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setNome(emp.nome);
    setNuit(emp.nuit);
    setInssNumero(emp.inss_numero);
    setCargo(emp.cargo);
    setSalarioBase(emp.salario_base);
    setNumeroDependentes(emp.numero_dependentes);
    setCarteiraMovel(emp.carteira_movel);
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !salarioBase || !carteiraMovel) {
      showError('Nome, Salário Base e Telemóvel são obrigatórios.');
      return;
    }

    const carrier = getCarrierInfo(carteiraMovel);
    if (!carrier.valid) {
      showError(`Telemóvel Inválido: ${carrier.error}`);
      return;
    }

    const nuitCheck = getNuitInfo(nuit);
    if (!nuitCheck.valid) {
      showError(`NUIT Inválido: ${nuitCheck.error}`);
      return;
    }

    const payload = {
      nome,
      nuit: nuit || 'Isento',
      inss_numero: inssNumero || `INSS-${Math.floor(10000 + Math.random() * 90000)}-MZ`,
      cargo: cargo || 'Trabalhador',
      salario_base: Number(salarioBase),
      numero_dependentes: Number(numeroDependentes),
      carteira_movel: carteiraMovel
    };

    if (editingEmp) {
      await onUpdate(editingEmp.id, payload);
      showSuccess(`Colaborador ${nome} atualizado com sucesso!`);
    } else {
      await onAdd(payload);
      showSuccess(`Novo colaborador ${nome} adicionado com sucesso!`);
    }

    setShowAddForm(false);
    setEditingEmp(null);
    resetForm();
  };

  const handleProcessIndividual = async (emp: Employee, diasFaltas: number) => {
    setLoadingPay(true);
    setCalcResult(null);
    try {
      const res = await fetch('/api/payroll/process-and-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dadosEmpresa: company,
          dadosFuncionario: emp,
          diasFaltas,
          periodo: selectedPeriod
        })
      });

      const data = await res.json();
      if (data.sucesso) {
        setCalcResult(data);
        onReload(); // reload dashboard stats & history logs
      } else {
        alert(data.error || 'Erro ao liquidar salário.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao processar transferência com o Gateway de Moçambique.');
    } finally {
      setLoadingPay(false);
    }
  };

  const handleFillAllWorkingDays = async (empIdToFill?: string) => {
    setMarkingAllProcessing(true);
    try {
      const { mesIndex, ano } = getPeriodDetails(selectedPeriod);
      const daysInMonth = new Date(ano, mesIndex + 1, 0).getDate();
      const targets = empIdToFill 
        ? employees.filter(e => e.id === empIdToFill)
        : employees;

      for (const emp of targets) {
        let currentTimesheet = { ...(emp.timesheet || {}) };
        let updated = false;

        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = getDateString(day, selectedPeriod);
          const { isWeekend } = getDayOfWeekName(day, selectedPeriod);
          
          if (!isWeekend) {
            if (!currentTimesheet[dateStr]) {
              currentTimesheet[dateStr] = 'Presenca';
              updated = true;
            }
          } else {
            if (!currentTimesheet[dateStr]) {
              currentTimesheet[dateStr] = 'Descanso';
              updated = true;
            }
          }
        }

        if (updated) {
          await onUpdate(emp.id, { timesheet: currentTimesheet });
        }
      }
      onReload();
    } catch (err) {
      console.error("Erro ao preencher presenças:", err);
    } finally {
      setMarkingAllProcessing(false);
    }
  };

  const handleOpenJustificationModal = (empId?: string) => {
    setJustificationEmpId(empId || (employees[0]?.id || ''));
    setJustificationDayStart(1);
    setJustificationDayEnd(1);
    setJustificationTipo('Doenca');
    setJustificationDocRef('');
    setJustificationObs('');
    setShowJustificationModal(true);
  };

  const handleSaveJustificationModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justificationEmpId) {
      alert("Por favor selecione um colaborador.");
      return;
    }

    const emp = employees.find(e => e.id === justificationEmpId);
    if (!emp) return;

    setIsSavingJustification(true);
    try {
      const start = Math.min(justificationDayStart, justificationDayEnd);
      const end = Math.max(justificationDayStart, justificationDayEnd);

      let updatedTimesheet = { ...(emp.timesheet || {}) };
      let updatedHistorico = [...(emp.faltas_historico || [])];

      for (let day = start; day <= end; day++) {
        const dateStr = getDateString(day, selectedPeriod);
        const newStatus = justificationTipo === 'Injustificada' ? 'Falta_Injustificada' : 'Falta_Justificada';
        
        updatedTimesheet[dateStr] = newStatus;
        updatedHistorico = updatedHistorico.filter(f => f.data !== dateStr);

        updatedHistorico.push({
          id: `faltas-${Date.now()}-${day}-${Math.floor(Math.random() * 1000)}`,
          data: dateStr,
          tipo: justificationTipo,
          remunerada: justificationTipo !== 'Injustificada',
          dias: 1,
          documentoRef: justificationDocRef,
          observacao: justificationObs
        });
      }

      await onUpdate(emp.id, {
        timesheet: updatedTimesheet,
        faltas_historico: updatedHistorico
      });

      setShowJustificationModal(false);
      setJustificationDocRef('');
      setJustificationObs('');
      onReload();
    } catch (err) {
      console.error("Erro ao guardar justificação:", err);
      alert("Erro ao guardar justificação de falta.");
    } finally {
      setIsSavingJustification(false);
    }
  };

  const handleExportTimesheetCSV = () => {
    const { mesIndex, ano } = getPeriodDetails(selectedPeriod);
    const daysInMonth = new Date(ano, mesIndex + 1, 0).getDate();
    
    let csv = `\uFEFFRELATÓRIO DE TIME SHEET E CONTROLO DE FALTAS - ${company.nome.toUpperCase()}\n`;
    csv += `Período: ${selectedPeriod};Base Legal: Lei do Trabalho de Moçambique (Lei nº 13/2023)\n\n`;
    
    let header = `Colaborador;Cargo;NUIT;Salário Base (MT);Presenças (P);Faltas Justificadas (FJ);Faltas Injustificadas (FI);Desconto por Faltas (MT);Salário Ajustado (MT);`;
    for (let d = 1; d <= daysInMonth; d++) {
      const { name: wdName } = getDayOfWeekName(d, selectedPeriod);
      header += `${String(d).padStart(2, '0')}/${String(mesIndex + 1).padStart(2, '0')} (${wdName});`;
    }
    csv += header + `\n`;

    employees.forEach(emp => {
      let presencas = 0;
      let fj = 0;
      let fi = 0;
      let dailyDetails = '';

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = getDateString(d, selectedPeriod);
        const status = emp.timesheet?.[dateStr] || getDefaultDayStatus(d, selectedPeriod);
        if (status === 'Presenca') {
          presencas++;
          dailyDetails += 'P;';
        } else if (status === 'Falta_Justificada') {
          fj++;
          dailyDetails += 'FJ;';
        } else if (status === 'Falta_Injustificada') {
          fi++;
          dailyDetails += 'FI;';
        } else {
          dailyDetails += 'D;';
        }
      }

      const valorDiario = emp.salario_base / 30;
      const descontoFaltas = valorDiario * fi;
      const salarioAjustado = Math.max(0, emp.salario_base - descontoFaltas);

      csv += `"${emp.nome}";"${emp.cargo}";"${emp.nuit}";${emp.salario_base.toFixed(2)};${presencas};${fj};${fi};${descontoFaltas.toFixed(2)};${salarioAjustado.toFixed(2)};${dailyDetails}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TimeSheet_${company.nome.replace(/\s+/g, '_')}_${selectedPeriod.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="employees_panel" className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Diretório de Colaboradores</h2>
          <p className="text-xs text-slate-500">Registe, edite e acompanhe os dados dos trabalhadores da microempresa.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors uppercase"
            title="Importar colaboradores automaticamente via PDF, Excel ou CSV com Inteligência Artificial"
          >
            <Sparkles size={14} className="animate-pulse" />
            📥 Importar PDF / Excel (AI)
          </button>
          <button
            onClick={() => {
              setEditingEmp(null);
              resetForm();
              setShowAddForm(true);
            }}
            className="px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <UserPlus size={16} />
            ADICIONAR COLABORADOR
          </button>
        </div>
      </div>

      {/* Floating Modal for Adding / Editing Employee */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-400 animate-pulse" />
                    Importador Inteligente de Colaboradores
                  </h3>
                  <p className="text-[10px] text-slate-400">Extração inteligente com IA via PDF, Excel ou CSV</p>
                </div>
                <button 
                  onClick={() => {
                    if (!isUploading) {
                      setShowUploadModal(false);
                      setUploadError(null);
                      setParsedCount(null);
                    }
                  }}
                  disabled={isUploading}
                  className="text-slate-400 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {!isUploading && !isSuccessState ? (
                  <>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Carregue um ficheiro contendo a lista dos seus funcionários (folha de salários, relatório do INSS, planilha do Excel ou PDF do contrato). A nossa Inteligência Artificial irá mapear e preencher os dados dos funcionários automaticamente!
                    </p>

                    {/* Drag and Drop Zone */}
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${
                        dragActive 
                          ? 'border-emerald-500 bg-emerald-50/50' 
                          : 'border-slate-200 hover:border-emerald-500 hover:bg-slate-50/50'
                      } cursor-pointer`}
                    >
                      <input 
                        type="file" 
                        id="file-upload-input" 
                        className="hidden" 
                        accept=".pdf,.csv,.xlsx,.xls"
                        onChange={handleFileInputChange}
                      />
                      <label 
                        htmlFor="file-upload-input" 
                        className="flex flex-col items-center justify-center cursor-pointer w-full"
                      >
                        <Upload size={40} className="text-slate-400 mb-3 hover:text-emerald-600 transition-colors animate-bounce" />
                        <span className="text-xs font-semibold text-slate-700">
                          Arraste o ficheiro aqui ou clique para selecionar
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">
                          Suporta PDF, Excel (.xlsx, .xls) ou CSV (Max. 15MB)
                        </span>
                      </label>
                    </div>

                    {uploadError && (
                      <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-2.5">
                        <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
                        <span className="text-xs text-rose-700">{uploadError}</span>
                      </div>
                    )}
                  </>
                ) : isUploading && !isSuccessState ? (
                  <div className="space-y-5 py-2">
                    {/* Processing Animation */}
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                          <Loader2 size={30} className="animate-spin text-emerald-600" />
                        </div>
                        <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-1 border-2 border-white shadow-xs">
                          <Sparkles size={11} className="animate-pulse" />
                        </span>
                      </div>
                      <div className="text-center">
                        <h4 className="font-bold text-sm text-slate-800">Leitor Inteligente Ativo</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Ficheiro: {uploadingFileName}</p>
                      </div>
                    </div>

                    {/* Progress Bar with Percentage */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-500">Progresso do Mapeamento</span>
                        <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative border border-slate-200/50">
                        <motion.div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full shadow-inner"
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ type: "spring", stiffness: 60, damping: 15 }}
                        />
                      </div>
                      <p className="text-[11px] text-center text-slate-500 animate-pulse font-medium">
                        {uploadStep}
                      </p>
                    </div>

                    <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 text-[10px] text-slate-400 leading-relaxed flex items-center gap-2">
                      <span className="text-amber-500 shrink-0">💡</span>
                      <span>Nota: O processamento de PDFs/planilhas complexas envolve OCR e mapeamento semântico por Inteligência Artificial (Gemini 3.5), o que pode levar alguns segundos.</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                    {/* Celebratory Checkmark Animation */}
                    <motion.div 
                      initial={{ scale: 0.3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 120, damping: 12, delay: 0.1 }}
                      className="relative"
                    >
                      {/* Pulse Circle Rings */}
                      <div className="absolute inset-0 bg-emerald-100/40 rounded-full animate-ping duration-1000" />
                      <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white border-4 border-white shadow-md relative z-10">
                        <CheckCircle2 size={36} className="text-white" />
                      </div>
                    </motion.div>

                    <div className="space-y-1.5">
                      <h4 className="font-bold text-base text-slate-900 tracking-tight">Extração Concluída com Sucesso!</h4>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {parsedCount && parsedCount > 0 
                          ? `A Inteligência Artificial identificou e cadastrou automaticamente ${parsedCount} novos colaboradores no banco de dados.` 
                          : "O arquivo foi verificado com sucesso, no entanto, nenhum novo trabalhador elegível foi inserido."
                        }
                      </p>
                    </div>

                    {/* Final Status Bar showing 100% finished */}
                    <div className="w-full max-w-xs space-y-1">
                      <div className="w-full bg-emerald-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full w-full" />
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Fichas e contratos gerados com IA</span>
                    </div>

                    {/* Integrated benefits notification */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-left max-w-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800">
                        <Sparkles size={11} />
                        <span>INTERLIGAÇÃO AUTOMÁTICA</span>
                      </div>
                      <p className="text-[9px] text-emerald-600/90 leading-relaxed">
                        Os novos colaboradores foram integrados na lista do <b>SISSMO / INSS</b> e no <b>Directório</b>. Também foram geradas as minutas de contrato em formato "Indeterminado" na aba de Contratos!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadError(null);
                    setParsedCount(null);
                    setIsSuccessState(false);
                    setIsUploading(false);
                    setUploadProgress(0);
                    setUploadStep('');
                    setUploadingFileName('');
                  }}
                  disabled={isUploading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showAddForm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">
                    {editingEmp ? 'Editar Ficha do Colaborador' : 'Registar Novo Colaborador'}
                  </h3>
                  <p className="text-[10px] text-slate-400">Payroll Tech Mz - ERP ERP de Gestão</p>
                </div>
                <button 
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingEmp(null);
                    resetForm();
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Arnaldo Mangue"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Função / Cargo</label>
                    <input
                      type="text"
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      placeholder="Ex: Técnico de Armazém"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Nº Telemóvel (M-Pesa/e-Mola) *</label>
                    <input
                      type="text"
                      required
                      value={carteiraMovel}
                      onChange={(e) => setCarteiraMovel(e.target.value)}
                      placeholder="Ex: 841234567"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950"
                    />
                    {/* Carrier dynamic indicator */}
                    {carteiraMovel.trim() !== "" && (() => {
                      const carrier = getCarrierInfo(carteiraMovel);
                      return (
                        <div className={`mt-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${carrier.color || 'bg-slate-50 text-slate-600'}`}>
                          {carrier.valid ? (
                            <span className="flex items-center gap-1">
                              🟢 Carteira Ativa: {carrier.name} ({carrier.wallet})
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-700">
                              ⚠️ {carrier.error}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">NUIT (Fiscal)</label>
                    <input
                      type="text"
                      value={nuit}
                      onChange={(e) => setNuit(e.target.value)}
                      placeholder="Ex: 100234567"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950"
                    />
                    {/* NUIT dynamic checker */}
                    {nuit.trim() !== "" && (() => {
                      const check = getNuitInfo(nuit);
                      return !check.valid ? (
                        <div className="mt-1 text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                          ⚠️ {check.error}
                        </div>
                      ) : (
                        <div className="mt-1 text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          ✓ NUIT Válido (9 algarismos)
                        </div>
                      );
                    })()}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Nº de Segurança Social (INSS)</label>
                    <input
                      type="text"
                      value={inssNumero}
                      onChange={(e) => setInssNumero(e.target.value)}
                      placeholder="Ex: INSS-77654-MZ"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Salário Base Acordado (MT) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={salarioBase}
                      onChange={(e) => setSalarioBase(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-950"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Dependentes / Filhos (IRPS)</label>
                    <select
                      value={numeroDependentes}
                      onChange={(e) => setNumeroDependentes(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950"
                    >
                      <option value={0}>0 Filhos / Dependentes</option>
                      <option value={1}>1 Dependente</option>
                      <option value={2}>2 Dependentes</option>
                      <option value={3}>3 Dependentes</option>
                      <option value={4}>4 ou mais Dependentes</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 justify-end border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingEmp(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    {editingEmp ? 'Salvar Alterações' : 'Gravar Colaborador'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Justification Modal */}
      <AnimatePresence>
        {showJustificationModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden z-50"
            >
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-400" />
                    Registar Justificação de Falta / Licença
                  </h3>
                  <p className="text-[10px] text-slate-400">Conforme a Lei do Trabalho de Moçambique (Lei nº 13/2023)</p>
                </div>
                <button
                  onClick={() => setShowJustificationModal(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveJustificationModal} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Colaborador *</label>
                  <select
                    value={justificationEmpId}
                    onChange={(e) => setJustificationEmpId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950"
                  >
                    <option value="">Selecione o colaborador...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nome} ({emp.cargo})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Dia Inicial do Mês *</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={justificationDayStart}
                      onChange={(e) => setJustificationDayStart(Number(e.target.value))}
                      required
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Dia Final do Mês *</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={justificationDayEnd}
                      onChange={(e) => setJustificationDayEnd(Number(e.target.value))}
                      required
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Tipo & Justificação Legal *</label>
                  <select
                    value={justificationTipo}
                    onChange={(e) => setJustificationTipo(e.target.value as any)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950"
                  >
                    <option value="Injustificada">Falta Injustificada (Com Desconto no Salário)</option>
                    <option value="Doenca">Doença com Atestado Médico (Paga - Sem Desconto)</option>
                    <option value="Casamento">Casamento (Até 5 dias pagos - Art. 101)</option>
                    <option value="Nojo">Luto / Nojo (Falecimento Parente - Até 5 dias pagos)</option>
                    <option value="Academica">Prestação de Exames / Provas Acadêmicas (Paga)</option>
                    <option value="Maternidade_Paternidade">Licença Maternidade (90d) / Paternidade (7d) (Paga)</option>
                    <option value="Outra_Justificada">Outra Falta Justificada Autorizada (Paga)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">N.º do Documento / Comprovativo (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Atestado Médico nº 402/2026, Certidão nº 12"
                    value={justificationDocRef}
                    onChange={(e) => setJustificationDocRef(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Observações do Gestor</label>
                  <textarea
                    rows={2}
                    placeholder="Detalhes relevantes para o arquivo da folha..."
                    value={justificationObs}
                    onChange={(e) => setJustificationObs(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950"
                  />
                </div>

                <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowJustificationModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingJustification}
                    className="px-5 py-2 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    {isSavingJustification ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        A guardar...
                      </>
                    ) : (
                      '⚡ APLICAR NO TIME SHEET'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HR Sub-Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2">
        <button
          type="button"
          onClick={() => setHrSubTab('diretorio')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            hrSubTab === 'diretorio'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users size={16} />
          Diretório de Colaboradores ({employees.length})
        </button>
        <button
          type="button"
          onClick={() => setHrSubTab('timesheet')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            hrSubTab === 'timesheet'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Calendar size={16} />
          Time Sheet & Controlo de Faltas
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black tracking-wide">
            LEI 13/2023
          </span>
        </button>
      </div>

      {hrSubTab === 'timesheet' ? (
        <div className="space-y-6">
          {/* Timesheet Top Legal Header */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black tracking-tight">Time Sheet & Gestão de Presenças</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-800/80 border border-blue-700/80 text-blue-200 text-[10px] font-mono font-bold">
                    República de Moçambique
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                  Gestão diária de assiduidade do pessoal. Conforme a Lei do Trabalho nº 13/2023, as faltas injustificadas abatem 1/30 do salário base por cada dia de ausência. Faltas justificadas (doença, nojo, casamento, maternidade) mantêm a remuneração integral.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleFillAllWorkingDays()}
                  disabled={markingAllProcessing}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Preenche presenças em dias úteis para colaboradores sem registo"
                >
                  {markingAllProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckSquare size={14} />}
                  ⚡ Preencher Mês Útil
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenJustificationModal()}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShieldCheck size={14} />
                  + Registar Justificação
                </button>
                <button
                  type="button"
                  onClick={handleExportTimesheetCSV}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={14} />
                  Exportar CSV / Excel
                </button>
              </div>
            </div>

            {/* Summary KPI Cards inside Timesheet */}
            {(() => {
              const { mesIndex, ano } = getPeriodDetails(selectedPeriod);
              const daysInMonth = new Date(ano, mesIndex + 1, 0).getDate();

              let presencasTotal = 0;
              let fjTotal = 0;
              let fiTotal = 0;
              let descontoTotalMzn = 0;

              employees.forEach(emp => {
                for (let d = 1; d <= daysInMonth; d++) {
                  const dateStr = getDateString(d, selectedPeriod);
                  const status = emp.timesheet?.[dateStr] || getDefaultDayStatus(d, selectedPeriod);
                  if (status === 'Presenca') presencasTotal++;
                  else if (status === 'Falta_Justificada') fjTotal++;
                  else if (status === 'Falta_Injustificada') fiTotal++;
                }
                const fiEmp = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(d => {
                  const dateStr = getDateString(d, selectedPeriod);
                  return (emp.timesheet?.[dateStr] || getDefaultDayStatus(d, selectedPeriod)) === 'Falta_Injustificada';
                }).length;
                descontoTotalMzn += (emp.salario_base / 30) * fiEmp;
              });

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Colaboradores no Time Sheet</p>
                    <p className="text-lg font-black text-white">{employees.length} Ativos</p>
                  </div>
                  <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/50">
                    <p className="text-[10px] text-emerald-300 uppercase font-bold">Dias com Presença (P)</p>
                    <p className="text-lg font-black text-emerald-400">{presencasTotal} dias</p>
                  </div>
                  <div className="bg-amber-950/40 p-3 rounded-xl border border-amber-800/50">
                    <p className="text-[10px] text-amber-300 uppercase font-bold">Faltas Justificadas (FJ)</p>
                    <p className="text-lg font-black text-amber-400">{fjTotal} dias (Sem Desconto)</p>
                  </div>
                  <div className="bg-rose-950/40 p-3 rounded-xl border border-rose-800/50">
                    <p className="text-[10px] text-rose-300 uppercase font-bold">Faltas Injustificadas & Desconto</p>
                    <p className="text-lg font-black text-rose-400">
                      {fiTotal} dias <span className="text-xs font-normal text-rose-300">({descontoTotalMzn.toLocaleString('pt-MZ', { maximumFractionDigits: 0 })} MT)</span>
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Search & Legend Controls */}
          <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Filtrar por nome ou cargo..."
                value={timesheetSearchTerm}
                onChange={(e) => setTimesheetSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-950"
              />
            </div>

            {/* Badges Legend */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
              <span className="text-slate-400 uppercase mr-1">Legenda:</span>
              <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span> P = Presença
              </span>
              <span className="px-2 py-1 rounded bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span> FJ = Falta Justificada (Remunerada)
              </span>
              <span className="px-2 py-1 rounded bg-rose-100 text-rose-900 border border-rose-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span> FI = Falta Injustificada (-1/30 Salário)
              </span>
              <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span> D = Descanso / Fim-de-semana
              </span>
            </div>
          </div>

          {/* Interactive Time Sheet Matrix Grid Table */}
          {(() => {
            const { mesIndex, ano } = getPeriodDetails(selectedPeriod);
            const daysInMonth = new Date(ano, mesIndex + 1, 0).getDate();
            const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

            const filteredStaff = employees.filter(e =>
              e.nome.toLowerCase().includes(timesheetSearchTerm.toLowerCase()) ||
              e.cargo.toLowerCase().includes(timesheetSearchTerm.toLowerCase())
            );

            return (
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden space-y-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                        <th className="p-3 sticky left-0 z-20 bg-slate-900 border-r border-slate-800 min-w-[180px]">
                          Colaborador / Cargo
                        </th>
                        {daysArray.map(d => {
                          const { name: wdName, isWeekend } = getDayOfWeekName(d, selectedPeriod);
                          return (
                            <th
                              key={d}
                              className={`p-1 text-center border-r border-slate-800 min-w-[34px] ${
                                isWeekend ? 'bg-slate-800/80 text-slate-300' : ''
                              }`}
                            >
                              <div className="text-[9px] text-slate-400 font-normal">{wdName}</div>
                              <div className="text-xs font-black">{String(d).padStart(2, '0')}</div>
                            </th>
                          );
                        })}
                        <th className="p-2 text-center border-r border-slate-800 min-w-[45px] bg-emerald-950 text-emerald-200">
                          P
                        </th>
                        <th className="p-2 text-center border-r border-slate-800 min-w-[45px] bg-amber-950 text-amber-200">
                          FJ
                        </th>
                        <th className="p-2 text-center border-r border-slate-800 min-w-[45px] bg-rose-950 text-rose-200">
                          FI
                        </th>
                        <th className="p-2 text-center border-r border-slate-800 min-w-[100px] bg-slate-950 text-rose-300">
                          Desconto (MT)
                        </th>
                        <th className="p-2 text-center border-r border-slate-800 min-w-[100px] bg-slate-950 text-emerald-300">
                          Salário Ajustado
                        </th>
                        <th className="p-2 text-center min-w-[70px]">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredStaff.length === 0 ? (
                        <tr>
                          <td colSpan={daysInMonth + 7} className="p-8 text-center text-slate-400">
                            Nenhum colaborador encontrado para o Time Sheet.
                          </td>
                        </tr>
                      ) : (
                        filteredStaff.map(emp => {
                          let pCount = 0;
                          let fjCount = 0;
                          let fiCount = 0;

                          daysArray.forEach(d => {
                            const dateStr = getDateString(d, selectedPeriod);
                            const status = emp.timesheet?.[dateStr] || getDefaultDayStatus(d, selectedPeriod);
                            if (status === 'Presenca') pCount++;
                            else if (status === 'Falta_Justificada') fjCount++;
                            else if (status === 'Falta_Injustificada') fiCount++;
                          });

                          const valorDiario = emp.salario_base / 30;
                          const descontoFaltas = valorDiario * fiCount;
                          const salarioAjustado = Math.max(0, emp.salario_base - descontoFaltas);

                          return (
                            <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 sticky left-0 z-10 bg-white border-r border-slate-200 shadow-xs">
                                <p className="font-bold text-slate-900 leading-tight">{emp.nome}</p>
                                <p className="text-[10px] text-slate-500 font-medium">{emp.cargo}</p>
                                <p className="text-[10px] font-mono text-emerald-700 font-bold mt-0.5">
                                  {emp.salario_base.toLocaleString('pt-MZ')} MT
                                </p>
                              </td>

                              {daysArray.map(d => {
                                const dateStr = getDateString(d, selectedPeriod);
                                const status = emp.timesheet?.[dateStr] || getDefaultDayStatus(d, selectedPeriod);
                                const { isWeekend } = getDayOfWeekName(d, selectedPeriod);

                                let cellBg = "";
                                let cellText = "";
                                let statusCode = "";

                                if (status === 'Presenca') {
                                  cellBg = "bg-emerald-50 hover:bg-emerald-100 border-emerald-200";
                                  cellText = "text-emerald-800 font-bold";
                                  statusCode = "P";
                                } else if (status === 'Falta_Justificada') {
                                  cellBg = "bg-amber-50 hover:bg-amber-100 border-amber-200";
                                  cellText = "text-amber-800 font-bold";
                                  statusCode = "FJ";
                                } else if (status === 'Falta_Injustificada') {
                                  cellBg = "bg-rose-50 hover:bg-rose-100 border-rose-200";
                                  cellText = "text-rose-800 font-extrabold";
                                  statusCode = "FI";
                                } else {
                                  cellBg = isWeekend ? "bg-slate-100/70 border-slate-200" : "bg-slate-50 border-slate-200";
                                  cellText = "text-slate-400 font-medium";
                                  statusCode = "D";
                                }

                                return (
                                  <td key={d} className="p-0.5 border-r border-slate-100 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTimesheetDay(emp, d)}
                                      title={`Dia ${d}: Clique para alternar estado (${statusCode})`}
                                      className={`w-full h-9 rounded border flex items-center justify-center text-[10px] transition-all cursor-pointer ${cellBg} ${cellText}`}
                                    >
                                      {statusCode}
                                    </button>
                                  </td>
                                );
                              })}

                              <td className="p-2 text-center border-r border-slate-100 font-extrabold text-emerald-700 bg-emerald-50/30">
                                {pCount}
                              </td>
                              <td className="p-2 text-center border-r border-slate-100 font-extrabold text-amber-700 bg-amber-50/30">
                                {fjCount}
                              </td>
                              <td className="p-2 text-center border-r border-slate-100 font-extrabold text-rose-700 bg-rose-50/30">
                                {fiCount}
                              </td>
                              <td className="p-2 text-center border-r border-slate-100 font-extrabold text-rose-600 bg-rose-50/20 whitespace-nowrap">
                                {descontoFaltas > 0 ? `-${descontoFaltas.toLocaleString('pt-MZ', { maximumFractionDigits: 2 })} MT` : '0 MT'}
                              </td>
                              <td className="p-2 text-center border-r border-slate-100 font-black text-slate-900 bg-slate-50/50 whitespace-nowrap">
                                {salarioAjustado.toLocaleString('pt-MZ', { maximumFractionDigits: 2 })} MT
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleOpenJustificationModal(emp.id)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                                  title="Registar justificação formal de faltas / atestado"
                                >
                                  📝 Justificar
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <span className="flex items-center gap-1">
                    <Info size={13} className="text-blue-900" />
                    Clique em qualquer quadrado na tabela para alternar diretamente o estado diário (Presença → Falta Justificada → Falta Injustificada → Descanso).
                  </span>
                  <span className="font-mono text-slate-400">
                    Descontos calculados automaticamente com base em {company.nome} ({selectedPeriod})
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* Main Grid View */
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <Search className="text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar por nome, cargo ou NUIT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none text-slate-800"
            />
          </div>

        {/* Directory List */}
        <div className="space-y-3">
          {filteredEmployees.length === 0 ? (
            <div className="bg-white rounded-xl py-12 text-center border border-slate-100 text-slate-500 text-sm">
              Nenhum colaborador corresponde à pesquisa.
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const isExpanded = expandedEmpId === emp.id;
              // Pre-calculate instant standard summary using registered unjustified absences
              const numInjustificadas = emp.faltas_historico?.filter(f => f.tipo === 'Injustificada').reduce((acc, curr) => acc + curr.dias, 0) || 0;
              const calculoPadrao = calcularFolhaSalario(emp.salario_base, numInjustificadas, emp.numero_dependentes);

              return (
                <div 
                  key={emp.id} 
                  className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden transition-all duration-200"
                >
                  {/* Top Header Card */}
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm shrink-0 uppercase">
                        {emp.nome.substring(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{emp.nome}</h3>
                        <p className="text-slate-500 text-xs font-medium">{emp.cargo}</p>
                        <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] text-slate-400 font-mono">
                          <span>NUIT: {emp.nuit}</span>
                          <span>|</span>
                          <span>INSS: {emp.inss_numero}</span>
                          <span>|</span>
                          <span>Telemóvel: {emp.carteira_movel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-50 pt-3 sm:pt-0">
                      <div>
                        <p className="text-[10px] text-slate-400 text-left sm:text-right font-medium">Salário Base Mensal</p>
                        <p className="text-sm font-extrabold text-slate-800 text-left sm:text-right">
                          {emp.salario_base.toLocaleString('pt-MZ')} MT
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg hover:text-slate-800 cursor-pointer transition-colors"
                          title="Editar"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Tem a certeza que deseja remover ${emp.nome}?`)) {
                              onDelete(emp.id);
                            }
                          }}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg hover:text-red-800 cursor-pointer transition-colors"
                          title="Remover"
                        >
                          <Trash2 size={15} />
                        </button>
                        <button
                          onClick={() => setExpandedEmpId(isExpanded ? null : emp.id)}
                          className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                            isExpanded ? 'bg-blue-900 border-blue-900 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-100'
                          }`}
                          title="Cálculo e Recibo"
                        >
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Custom Interactive Calculator Panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-slate-50 border-t border-slate-100 px-5 py-6 space-y-4 text-xs overflow-hidden"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                            Simulação Individual & Emissão de Recibo
                          </h4>
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded">
                            {selectedPeriod}
                          </span>
                        </div>

                        {/* Interactive deductions breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Col 1: Vencimento e Faltas */}
                          <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3">
                            <h5 className="font-bold text-slate-700 pb-1.5 border-b border-slate-100">Cálculo de Remuneração</h5>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Salário Contratual:</span>
                                <span className="font-semibold text-slate-800">{emp.salario_base.toLocaleString('pt-MZ')} MT</span>
                              </div>
                              <div className="space-y-1">
                                <label className="text-slate-500 block">Indicar Faltas do Colaborador (Dias):</label>
                                <input
                                  type="number"
                                  id={`faltas_${emp.id}`}
                                  key={`faltas_input_${emp.id}_${numInjustificadas}`}
                                  min="0"
                                  max="30"
                                  defaultValue={numInjustificadas}
                                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-900"
                                  onChange={(e) => {
                                    const value = Math.max(0, parseInt(e.target.value) || 0);
                                    const recalc = calcularFolhaSalario(emp.salario_base, value, emp.numero_dependentes);
                                    // Trigger simple visual update on client by saving locally
                                    const currentFaltasInput = document.getElementById(`faltas_${emp.id}`) as HTMLInputElement;
                                    const currentNetDisplay = document.getElementById(`net_val_${emp.id}`);
                                    const currentInssDisplay = document.getElementById(`inss_val_${emp.id}`);
                                    const currentIrpsDisplay = document.getElementById(`irps_val_${emp.id}`);
                                    const currentDeducFaltasDisplay = document.getElementById(`faltas_ded_val_${emp.id}`);
                                    
                                    if (currentNetDisplay) currentNetDisplay.innerText = `${recalc.salarioLiquido.toLocaleString('pt-MZ')} MT`;
                                    if (currentInssDisplay) currentInssDisplay.innerText = `${recalc.inssTrabalhador.toLocaleString('pt-MZ')} MT`;
                                    if (currentIrpsDisplay) currentIrpsDisplay.innerText = `${recalc.irpsConstatado.toLocaleString('pt-MZ')} MT`;
                                    if (currentDeducFaltasDisplay) {
                                      currentDeducFaltasDisplay.innerText = `${recalc.descontoFaltas.toLocaleString('pt-MZ')} MT`;
                                      if (recalc.descontoFaltas > 0) {
                                        currentDeducFaltasDisplay.parentElement?.classList.remove('hidden');
                                      } else {
                                        currentDeducFaltasDisplay.parentElement?.classList.add('hidden');
                                      }
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Col 2: Descontos */}
                          <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-2">
                            <h5 className="font-bold text-slate-700 pb-1.5 border-b border-slate-100">Deduções Fiscais Moçambique</h5>
                            <div className="space-y-1.5 text-slate-600">
                              <div className={`flex justify-between ${calculoPadrao.descontoFaltas > 0 ? '' : 'hidden'}`} id={`row_faltas_ded_${emp.id}`}>
                                <span>Dedução de Faltas:</span>
                                <span className="font-semibold text-red-600" id={`faltas_ded_val_${emp.id}`}>
                                  {calculoPadrao.descontoFaltas.toLocaleString('pt-MZ')} MT
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>INSS Segurança Social (3%):</span>
                                <span className="font-semibold text-slate-800" id={`inss_val_${emp.id}`}>
                                  {calculoPadrao.inssTrabalhador.toLocaleString('pt-MZ')} MT
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>IRPS Retenção na Fonte:</span>
                                <span className="font-semibold text-slate-800" id={`irps_val_${emp.id}`}>
                                  {calculoPadrao.irpsConstatado.toLocaleString('pt-MZ')} MT
                                </span>
                              </div>
                              <div className="flex justify-between pt-1 text-[10px] text-slate-400 font-mono">
                                <span>INSS Patronal (4% Extra):</span>
                                <span>{calculoPadrao.inssEmpresa.toLocaleString('pt-MZ')} MT</span>
                              </div>
                            </div>
                          </div>

                          {/* Col 3: Liquidação Final */}
                          <div className="bg-white p-4 rounded-xl border border-emerald-100 flex flex-col justify-between space-y-4">
                            <div>
                              <h5 className="font-bold text-slate-700 pb-1.5 border-b border-slate-100">Montante Líquido a Receber</h5>
                              <div className="pt-2">
                                <p className="text-2xl font-extrabold text-emerald-600" id={`net_val_${emp.id}`}>
                                  {calculoPadrao.salarioLiquido.toLocaleString('pt-MZ')} MT
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  Valor total que será debitado da empresa e creditado para a carteira {emp.carteira_movel}.
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                const input = document.getElementById(`faltas_${emp.id}`) as HTMLInputElement;
                                const diasFaltas = input ? (parseInt(input.value) || 0) : 0;
                                handleProcessIndividual(emp, diasFaltas);
                              }}
                              disabled={loadingPay}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold rounded-lg shadow-sm cursor-pointer text-xs transition-all"
                            >
                              {loadingPay ? 'A transferir fundos...' : '⚡ LIQUIDAR & GERAR RECIBO'}
                            </button>
                          </div>

                          {/* Seção Completa de Faltas - 1 clique e histórico */}
                          <div className="col-span-1 md:col-span-3 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                              <div>
                                <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles size={14} className="text-blue-900 animate-pulse" />
                                  Marcação de Faltas em 1-Clique (Lei do Trabalho de Moçambique)
                                </h5>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  Selecione o tipo de falta para registar de imediato no histórico do colaborador. Faltas injustificadas abatem diretamente o salário.
                                </p>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">Lei n.º 13/2023</span>
                            </div>

                            {/* botões de marcação */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                              <button
                                type="button"
                                onClick={() => handleAddFalta(emp, 'Injustificada')}
                                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-rose-100 bg-rose-50 hover:bg-rose-100 text-rose-800 transition-colors text-center cursor-pointer space-y-1"
                              >
                                <span className="font-bold text-[10px] uppercase">Injustificada</span>
                                <span className="text-[9px] text-rose-600 font-medium">Desconto de 1 Dia</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddFalta(emp, 'Doenca')}
                                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-amber-100 bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors text-center cursor-pointer space-y-1"
                              >
                                <span className="font-bold text-[10px] uppercase">Doença</span>
                                <span className="text-[9px] text-amber-600 font-medium">Paga (Médico)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddFalta(emp, 'Casamento')}
                                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 transition-colors text-center cursor-pointer space-y-1"
                              >
                                <span className="font-bold text-[10px] uppercase">Casamento</span>
                                <span className="text-[9px] text-indigo-600 font-medium">Até 5 dias pagos</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddFalta(emp, 'Nojo')}
                                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-purple-100 bg-purple-50 hover:bg-purple-100 text-purple-800 transition-colors text-center cursor-pointer space-y-1"
                              >
                                <span className="font-bold text-[10px] uppercase">Nojo (Óbito)</span>
                                <span className="text-[9px] text-purple-600 font-medium">Até 5 dias pagos</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddFalta(emp, 'Academica')}
                                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-sky-100 bg-sky-50 hover:bg-sky-100 text-sky-800 transition-colors text-center cursor-pointer space-y-1"
                              >
                                <span className="font-bold text-[10px] uppercase">Estudos</span>
                                <span className="text-[9px] text-sky-600 font-medium">Paga (Provas)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddFalta(emp, 'Maternidade_Paternidade')}
                                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-pink-100 bg-pink-50 hover:bg-pink-100 text-pink-800 transition-colors text-center cursor-pointer space-y-1"
                              >
                                <span className="font-bold text-[10px] uppercase">Maternidade/P.</span>
                                <span className="text-[9px] text-pink-600 font-medium">M: 90 dias pagos</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddFalta(emp, 'Outra_Justificada')}
                                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors text-center cursor-pointer space-y-1"
                              >
                                <span className="font-bold text-[10px] uppercase">Outra Justif.</span>
                                <span className="text-[9px] text-slate-600 font-medium">Remunerada</span>
                              </button>
                            </div>

                            {/* --- NOVA FOLHA DE PONTO & TIMESHEET MENSAL INTERATIVO --- */}
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                <div>
                                  <h6 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                                    <Calendar size={14} className="text-blue-950" />
                                    Folha de Ponto & Timesheet Mensal ({selectedPeriod})
                                  </h6>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    Clique em qualquer dia do mês para alternar o estado de trabalho com um clique. As faltas injustificadas reduzem automaticamente o salário bruto mensal.
                                  </p>
                                </div>
                                
                                {/* Legendas dos Estados */}
                                <div className="flex flex-wrap gap-2 text-[9px] font-bold">
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Presença (P)
                                  </span>
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Justificada (FJ)
                                  </span>
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Injustificada (FI)
                                  </span>
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Descanso (D)
                                  </span>
                                </div>
                              </div>

                              {(() => {
                                const { mesIndex, ano } = getPeriodDetails(selectedPeriod);
                                const daysInMonth = new Date(ano, mesIndex + 1, 0).getDate();
                                const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

                                let presencas = 0;
                                let justif = 0;
                                let injustif = 0;
                                let descansos = 0;

                                daysArray.forEach(d => {
                                  const dateStr = getDateString(d, selectedPeriod);
                                  const status = emp.timesheet?.[dateStr] || getDefaultDayStatus(d, selectedPeriod);
                                  if (status === 'Presenca') presencas++;
                                  else if (status === 'Falta_Justificada') justif++;
                                  else if (status === 'Falta_Injustificada') injustif++;
                                  else descansos++;
                                });

                                return (
                                  <div className="space-y-3">
                                    {/* Métricas rápidas da folha de ponto */}
                                    <div className="grid grid-cols-4 gap-2 bg-blue-50/30 p-2.5 rounded-lg border border-blue-100/50 text-center text-[10px]">
                                      <div>
                                        <span className="text-slate-400 block font-semibold uppercase">Presenças</span>
                                        <span className="text-emerald-700 font-extrabold text-xs">{presencas} dias</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block font-semibold uppercase">Faltas Justif.</span>
                                        <span className="text-amber-700 font-extrabold text-xs">{justif} dias</span>
                                      </div>
                                      <div className="border-l border-r border-slate-200">
                                        <span className="text-slate-400 block font-semibold uppercase">Faltas Injustif.</span>
                                        <span className="text-rose-700 font-extrabold text-xs">{injustif} dias</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block font-semibold uppercase">Descanso/FDS</span>
                                        <span className="text-slate-600 font-extrabold text-xs">{descansos} dias</span>
                                      </div>
                                    </div>

                                    {/* Grelha de Dias */}
                                    <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-10 gap-1.5">
                                      {daysArray.map((d) => {
                                        const dateStr = getDateString(d, selectedPeriod);
                                        const status = emp.timesheet?.[dateStr] || getDefaultDayStatus(d, selectedPeriod);
                                        const { name: wdName } = getDayOfWeekName(d, selectedPeriod);

                                        // Styling based on status
                                        let btnClass = "";
                                        let statusLabel = "";
                                        if (status === 'Presenca') {
                                          btnClass = "bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-800";
                                          statusLabel = "P";
                                        } else if (status === 'Falta_Justificada') {
                                          btnClass = "bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-800";
                                          statusLabel = "FJ";
                                        } else if (status === 'Falta_Injustificada') {
                                          btnClass = "bg-rose-50 hover:bg-rose-100/80 border-rose-200 text-rose-800";
                                          statusLabel = "FI";
                                        } else {
                                          btnClass = "bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-500";
                                          statusLabel = "D";
                                        }

                                        return (
                                          <button
                                            key={d}
                                            type="button"
                                            onClick={() => handleToggleTimesheetDay(emp, d)}
                                            title={`Clique para alterar - Dia ${d} (${wdName}): ${
                                              status === 'Presenca' ? 'Presença' :
                                              status === 'Falta_Justificada' ? 'Falta Justificada' :
                                              status === 'Falta_Injustificada' ? 'Falta Injustificada' : 'Descanso'
                                            }`}
                                            className={`flex flex-col items-center justify-between py-1 px-1 rounded border text-center transition-all cursor-pointer h-12 ${btnClass}`}
                                          >
                                            <span className="text-[10px] font-bold tracking-tight">{String(d).padStart(2, '0')}</span>
                                            <span className="text-[7px] text-slate-400 uppercase font-bold">{wdName}</span>
                                            <span className="text-[9px] font-extrabold">{statusLabel}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Histórico do Colaborador */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wide flex items-center gap-1.5">
                                Histórico de Faltas & Ausências do Período:
                              </p>
                              {emp.faltas_historico && emp.faltas_historico.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {emp.faltas_historico.map((f) => (
                                    <div key={f.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px] text-slate-700">
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                          <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                                            f.tipo === 'Injustificada' ? 'bg-red-100 text-red-700' :
                                            f.tipo === 'Doenca' ? 'bg-amber-100 text-amber-700' :
                                            f.tipo === 'Casamento' ? 'bg-indigo-100 text-indigo-700' :
                                            f.tipo === 'Nojo' ? 'bg-purple-100 text-purple-700' :
                                            f.tipo === 'Academica' ? 'bg-sky-100 text-sky-700' :
                                            f.tipo === 'Maternidade_Paternidade' ? 'bg-pink-100 text-pink-700' : 'bg-slate-200 text-slate-700'
                                          }`}>
                                            {f.tipo === 'Injustificada' ? 'Injustificada' :
                                             f.tipo === 'Doenca' ? 'Doença' :
                                             f.tipo === 'Casamento' ? 'Casamento' :
                                             f.tipo === 'Nojo' ? 'Nojo' :
                                             f.tipo === 'Academica' ? 'Estudos' :
                                             f.tipo === 'Maternidade_Paternidade' ? 'Licença' : 'Outra Justif.'}
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-mono font-bold">
                                            {f.remunerada ? 'PAGA' : 'DESCONTO'}
                                          </span>
                                        </div>
                                        <p className="text-slate-500 font-medium text-[10px]">
                                          {f.dias} {f.dias === 1 ? 'dia' : 'dias'} em {f.data}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteFalta(emp, f.id)}
                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                        title="Excluir registo de falta"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 text-center py-2.5 bg-slate-50/50 rounded-lg border border-dashed border-slate-150">
                                  Nenhuma ausência registada para este colaborador no período atual. Use os botões acima para registar.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Individual feedback container */}
                        {calcResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-2.5">
                              <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
                              <div>
                                <p className="font-bold text-emerald-900 text-[11px]">{calcResult.mensagem}</p>
                                <p className="text-[10px] text-emerald-700">O colaborador foi liquidado e a folha foi actualizada.</p>
                              </div>
                            </div>
                            <a
                              href={calcResult.linkFicheiro}
                              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-lg flex items-center gap-1 shrink-0"
                            >
                              <Download size={14} /> DESCARREGAR RECIBO (PDF)
                            </a>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>
      )}
    </div>
  );
}
