/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calculator, 
  Percent, 
  HelpCircle, 
  Info,
  DollarSign, 
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { calcularFolhaSalario } from '../db_tax';

export default function TaxSimulator() {
  const [salarioBase, setSalarioBase] = useState<number>(25000);
  const [diasFaltas, setDiasFaltas] = useState<number>(0);
  const [dependentes, setDependentes] = useState<number>(2);

  const res = calcularFolhaSalario(salarioBase, diasFaltas, dependentes);

  const salarioBrutoReal = Math.max(0, salarioBase - res.descontoFaltas);
  const percentagemLiquido = salarioBase > 0 ? (res.salarioLiquido / salarioBase) * 100 : 0;
  const percentagemDescontos = salarioBase > 0 ? (res.totalDescontos / salarioBase) * 100 : 0;

  return (
    <div id="simulator_panel" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Simulador Fiscal de Vencimentos (Moçambique)</h2>
        <p className="text-xs text-slate-500">
          Calcule de forma imediata o salário líquido, as deduções de segurança social (INSS) e retenções na fonte de IRPS.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Parameters Form (2/5 size) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-3 flex items-center gap-2">
            <Calculator className="text-blue-900" size={18} />
            Parâmetros de Simulação
          </h3>

          {/* Salário Base */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700">Salário Base Mensal (MT)</label>
              <span className="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                {salarioBase.toLocaleString('pt-MZ')} MT
              </span>
            </div>
            <input
              type="range"
              min="5000"
              max="300000"
              step="1000"
              value={salarioBase}
              onChange={(e) => setSalarioBase(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-900"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>5.000 MT</span>
              <span>150.000 MT</span>
              <span>300.000 MT</span>
            </div>
            <input
              type="number"
              min="0"
              value={salarioBase}
              onChange={(e) => setSalarioBase(Math.max(0, Number(e.target.value) || 0))}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-950"
            />
          </div>

          {/* Faltas no mês */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700">Faltas Injustificadas no Mês (Dias)</label>
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                {diasFaltas} Dias
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={diasFaltas}
              onChange={(e) => setDiasFaltas(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0 Dias (Sem desconto)</span>
              <span>15 Dias</span>
              <span>30 Dias (Desconto Integral)</span>
            </div>
          </div>

          {/* Número Dependentes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">N.º Dependentes / Filhos Declarados</label>
            <select
              value={dependentes}
              onChange={(e) => setDependentes(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950"
            >
              <option value={0}>0 Filhos / Sem dependentes</option>
              <option value={1}>1 Dependente</option>
              <option value={2}>2 Dependentes</option>
              <option value={3}>3 Dependentes</option>
              <option value={4}>4 ou mais Dependentes</option>
            </select>
            <p className="text-[10px] text-slate-400">
              O número de dependentes declarados diminui o imposto IRPS de retenção mensal segundo o regulamento do Ministério das Finanças.
            </p>
          </div>
        </div>

        {/* Dynamic Outputs (3/5 size) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-3 flex items-center gap-2">
              <Percent className="text-emerald-600" size={18} />
              Estrutura de Deduções de Moçambique
            </h3>

            {/* Salary Progress Bar Chart */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Rendimento Líquido Disponível: {percentagemLiquido.toFixed(1)}%</span>
                <span>Deduções Totais: {percentagemDescontos.toFixed(1)}%</span>
              </div>
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentagemLiquido}%` }}
                  className="h-full bg-emerald-500"
                  title="Salário Líquido"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentagemDescontos}%` }}
                  className="h-full bg-rose-500"
                  title="Total Descontado"
                />
              </div>
            </div>

            {/* Bullet list of deductions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Salário Bruto Ajustado */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Bruto Após Faltas</span>
                <span className="text-base font-bold text-slate-800 mt-1 block">
                  {salarioBrutoReal.toLocaleString('pt-MZ')} MT
                </span>
                {res.descontoFaltas > 0 && (
                  <span className="text-[10px] text-red-500 font-medium">
                    Desconto de -{res.descontoFaltas.toLocaleString('pt-MZ')} MT ({res.diasFaltas} dias)
                  </span>
                )}
              </div>

              {/* INSS Desconto Trabalhador */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">INSS Segurança Social (3%)</span>
                <span className="text-base font-bold text-slate-800 mt-1 block">
                  {res.inssTrabalhador.toLocaleString('pt-MZ')} MT
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Encargo Empresa (4%): {res.inssEmpresa.toLocaleString('pt-MZ')} MT
                </span>
              </div>

              {/* IRPS Desconto Trabalhador */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">IRPS Retenção na Fonte</span>
                <span className="text-base font-bold text-slate-800 mt-1 block">
                  {res.irpsConstatado.toLocaleString('pt-MZ')} MT
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Base Tributável: {res.salarioTributavel.toLocaleString('pt-MZ')} MT
                </span>
              </div>

              {/* Salário Líquido Final */}
              <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-emerald-600 font-extrabold block uppercase">Vencimento Líquido Final</span>
                <span className="text-lg font-extrabold text-emerald-600 mt-1 block">
                  {res.salarioLiquido.toLocaleString('pt-MZ')} MT
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Pronto para pagamento por Mobile Money
                </span>
              </div>
            </div>
          </div>

          {/* Educational Footnote */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3">
            <Info className="text-blue-900 shrink-0" size={18} />
            <div className="space-y-1">
              <p className="font-bold text-blue-950 text-xs">Como funciona o cálculo do IRPS?</p>
              <p className="text-[10px] text-blue-900 leading-relaxed">
                O IRPS deduzido calcula-se subtraindo primeiro o INSS (3%) ao salário base. Em seguida, enquadra-se o valor tributável no respetivo escalão da Autoridade Tributária. Aplica-se a taxa do escalão sobre o excedente ao limite mínimo, soma-se o imposto fixo do escalão e subtrai-se a respetiva dedução por dependentes (parcela a abater) definida por lei.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
