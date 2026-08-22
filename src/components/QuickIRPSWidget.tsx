import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, X, Sparkles, ChevronUp, ChevronDown, Copy, Check, ShieldCheck } from 'lucide-react';
import { calcularFolhaSalario } from '../db_tax';

export function QuickIRPSWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [salarioBruto, setSalarioBruto] = useState<number>(35000);
  const [dependentes, setDependentes] = useState<number>(0);
  const [faltas, setFaltas] = useState<number>(0);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const calc = calcularFolhaSalario(salarioBruto || 0, faltas, dependentes);

  const taxaEfetivaIrps = salarioBruto > 0 ? ((calc.irpsConstatado / salarioBruto) * 100).toFixed(1) : '0.0';
  const taxaEfetivaTotal = salarioBruto > 0 ? ((calc.totalDescontos / salarioBruto) * 100).toFixed(1) : '0.0';

  const handlePreset = (valor: number) => {
    setSalarioBruto(valor);
  };

  const handleCopy = () => {
    const texto = `SIMULAÇÃO RÁPIDA DE SALÁRIO (IRPS MOÇAMBIQUE 2026)\n` +
      `----------------------------------------\n` +
      `Salário Bruto: ${calc.salarioBase.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT\n` +
      `Desconto INSS (3%): -${calc.inssTrabalhador.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT\n` +
      `Salário Tributável IRPS: ${calc.salarioTributavel.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT\n` +
      `Retenção IRPS: -${calc.irpsConstatado.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT\n` +
      `Total de Descontos: -${calc.totalDescontos.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT\n` +
      `----------------------------------------\n` +
      `SALÁRIO LÍQUIDO: ${calc.salarioLiquido.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT\n` +
      `Custo Patronal INSS (4%): ${calc.inssEmpresa.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT\n` +
      `Calculado por Payroll Tech Mz`;

    navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Botão Flutuante Discreto no Canto Inferior */}
      <div className="fixed bottom-5 right-5 z-50">
        {!isOpen && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white hover:bg-slate-950 rounded-2xl shadow-xl border border-slate-700/50 cursor-pointer transition-all group"
            title="Simulação Rápida de IRPS & Salário Líquido"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm group-hover:rotate-12 transition-transform">
              <Calculator size={18} />
            </div>
            <div className="text-left">
              <div className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1">
                <Sparkles size={11} /> Simulador Rápido
              </div>
              <div className="text-xs font-extrabold text-white">IRPS & Salário Líquido</div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse ml-1"></span>
          </motion.button>
        )}
      </div>

      {/* Janela Modal / Widget Expandido Flutuante */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-5 right-5 z-50 w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 font-sans"
          >
            {/* Topo do Widget */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-inner">
                  <Calculator size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                    Simulação Rápida IRPS
                    <span className="text-[9px] bg-blue-500/30 text-blue-300 font-bold px-1.5 py-0.5 rounded border border-blue-400/30">
                      Tabela AT 2026
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium">Cálculo instantâneo de salário líquido</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            {/* Conteúdo do Formulário e Resultados */}
            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Presets Rápidos */}
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1.5">
                  Valores Frequentes (Presets):
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[15000, 25000, 45000, 80000].map((val) => (
                    <button
                      key={val}
                      onClick={() => handlePreset(val)}
                      className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer text-center ${
                        salarioBruto === val
                          ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      {val >= 1000 ? `${val / 1000}k MT` : `${val} MT`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entradas principais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Salário Bruto (MT) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={salarioBruto || ''}
                      onChange={(e) => setSalarioBruto(Math.max(0, Number(e.target.value)))}
                      placeholder="Ex: 35000"
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white"
                      min={0}
                    />
                    <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400">MT</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Dependentes
                  </label>
                  <select
                    value={dependentes}
                    onChange={(e) => setDependentes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white"
                  >
                    <option value={0}>0 dependentes</option>
                    <option value={1}>1 dependente</option>
                    <option value={2}>2 dependentes</option>
                    <option value={3}>3 dependentes</option>
                    <option value={4}>4+ dependentes</option>
                  </select>
                </div>
              </div>

              {/* Resultado Destacado: Salário Líquido */}
              <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-2xl p-4 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <ShieldCheck size={80} />
                </div>
                
                <div className="relative z-10 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    Salário Líquido a Receber
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                    {calc.salarioLiquido.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-bold text-emerald-200">MT</span>
                  </div>
                  <div className="flex items-center gap-3 pt-1 text-[10.5px] text-emerald-100/90 font-medium border-t border-emerald-800/60 mt-2">
                    <span>Taxa Efetiva IRPS: <b className="text-white font-bold">{taxaEfetivaIrps}%</b></span>
                    <span>•</span>
                    <span>Desconto Total: <b className="text-white font-bold">{taxaEfetivaTotal}%</b></span>
                  </div>
                </div>
              </div>

              {/* Resumo de Descontos */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-150 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>INSS Trabalhador (3%):</span>
                  <span className="font-bold font-mono text-rose-700">
                    -{calc.inssTrabalhador.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Retenção de IRPS (AT):</span>
                  <span className="font-bold font-mono text-rose-700">
                    -{calc.irpsConstatado.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </span>
                </div>

                <div className="pt-1 border-t border-slate-200 flex justify-between items-center font-bold text-slate-900">
                  <span>Total Descontos:</span>
                  <span className="font-mono text-rose-800 text-sm">
                    -{calc.totalDescontos.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                  <span>Custo Patronal INSS (4%):</span>
                  <span className="font-mono font-semibold text-blue-900">
                    +{calc.inssEmpresa.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </span>
                </div>
              </div>

              {/* Detalhes Adicionais Sanfona */}
              <div>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-between py-1.5 text-[10.5px] font-bold text-blue-900 hover:text-blue-950 transition-colors"
                >
                  <span>Ver Detalhes do Cálculo Fiscal</span>
                  {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-2 text-[10px] text-slate-600 space-y-1 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100"
                  >
                    <p><b>Base Tributável IRPS:</b> {calc.salarioTributavel.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT (Salário Aderente - 3% INSS)</p>
                    <p><b>Dependente(s) Considerados:</b> {dependentes}</p>
                    <p><b>Conformidade Legal:</b> Tabela de Retenção na Fonte IRPS (Decreto nº 70/2009 e Lei nº 11/2025 AT Moçambique).</p>
                  </motion.div>
                )}
              </div>

              {/* Ações Rápidas */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copied ? 'Copiado!' : 'Copiar Resumo'}</span>
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
