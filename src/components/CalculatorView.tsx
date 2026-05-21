import React, { useState, useEffect, useMemo } from 'react';
import { 
  Flame, 
  History, 
  RotateCcw, 
  Info, 
  Plus, 
  Trash2, 
  ArrowRight,
  Settings as SettingsIcon 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GasRate, CalculationResult, Condominio, Unidad, Transaction, TransactionType } from '../types';

const INITIAL_GAS_RATES: GasRate[] = [
  {
    id: 'glp-domestico',
    name: 'GLP Doméstico (Tanque)',
    pricePerGallon: 132.60,
    isCustom: false,
    lastUpdated: new Date().toISOString(),
  }
];

const STORAGE_KEY_GAS_RATES = 'gas_calc_dr_rates_v2';
const STORAGE_KEY_GAS_HISTORY = 'gas_calc_dr_history';

interface CalculatorViewProps {
  condos: Condominio[];
  units: Unidad[];
  onRegisterTransaction: (transaction: Omit<Transaction, 'id'>) => void;
}

export function CalculatorView({ condos, units, onRegisterTransaction }: CalculatorViewProps) {
  const [rates, setRates] = useState<GasRate[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_GAS_RATES);
    return saved ? JSON.parse(saved) : INITIAL_GAS_RATES;
  });

  const [history, setHistory] = useState<CalculationResult[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_GAS_HISTORY);
    return saved ? JSON.parse(saved) : [];
  });

  const [gallons, setGallons] = useState<string>('');
  const [selectedRateId, setSelectedRateId] = useState<string>(rates[0]?.id || '');
  const [selectedCondoId, setSelectedCondoId] = useState<string>(condos[0]?.id || '');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Filter units by selected condo
  const filteredUnits = useMemo(() => 
    units.filter(u => u.condominioId === selectedCondoId),
    [units, selectedCondoId]
  );

  // Reset selected unit if condo changes
  useEffect(() => {
    setSelectedUnitId('');
  }, [selectedCondoId]);

  // Rate form state
  const [isAddingRate, setIsAddingRate] = useState(false);
  const [newRate, setNewRate] = useState<Partial<GasRate>>({
    name: '',
    pricePerGallon: 0
  });

  // Effects
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_GAS_RATES, JSON.stringify(rates));
  }, [rates]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_GAS_HISTORY, JSON.stringify(history));
  }, [history]);

  // Calculations
  const selectedRate = useMemo(() => 
    rates.find(r => r.id === selectedRateId), 
    [rates, selectedRateId]
  );

  const total = useMemo(() => {
    const qty = parseFloat(gallons) || 0;
    const price = selectedRate?.pricePerGallon || 0;
    return qty * price;
  }, [gallons, selectedRate]);

  // Handlers
  const handleCalculate = () => {
    if (!gallons || !selectedRate) return;

    const selectedUnit = filteredUnits.find(u => u.id === selectedUnitId);

    const result: CalculationResult = {
      gallons: parseFloat(gallons),
      rate: selectedRate,
      total: total,
      date: new Date().toLocaleString('es-DO', { 
        timeZone: 'America/Santo_Domingo' 
      }),
      condoId: selectedCondoId,
      unidadId: selectedUnitId,
      unitNumber: selectedUnit?.numero
    };

    setHistory([result, ...history].slice(0, 50));

    // If unit is selected, register transaction
    if (selectedUnitId) {
      onRegisterTransaction({
        condominioId: selectedCondoId,
        type: TransactionType.INCOME,
        category: 'INGRESOS ORDINARIOS',
        concept: 'Consumo de Gas',
        amount: total,
        date: new Date().toISOString(),
        description: `Gas: ${parseFloat(gallons).toFixed(2)} GLS @ RD$ ${selectedRate.pricePerGallon.toFixed(2)} - Unidad ${selectedUnit?.numero}`
      });
      
      setGallons('');
      setSelectedUnitId('');
    }
  };

  const clearInputs = () => {
    setGallons('');
  };

  const addRate = () => {
    if (!newRate.name || !newRate.pricePerGallon) return;

    const rate: GasRate = {
      id: `custom-${Date.now()}`,
      name: newRate.name,
      pricePerGallon: Number(newRate.pricePerGallon),
      isCustom: true,
      lastUpdated: new Date().toISOString()
    };

    setRates([...rates, rate]);
    setNewRate({ name: '', pricePerGallon: 0 });
    setIsAddingRate(false);
  };

  const deleteRate = (id: string) => {
    if (rates.length <= 1) return;
    setRates(rates.filter(r => r.id !== id));
    if (selectedRateId === id) {
      setSelectedRateId(rates.find(r => r.id !== id)?.id || '');
    }
  };

  const updateRatePrice = (id: string, newPrice: number) => {
    setRates(rates.map(r => 
      r.id === id 
        ? { ...r, pricePerGallon: newPrice, lastUpdated: new Date().toISOString() } 
        : r
    ));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-4 w-12 bg-brand-green rounded-full shadow-lg shadow-green-200"></div>
          <div>
            <h3 className="text-3xl font-black text-slate-800 uppercase italic leading-none tracking-tighter">CALCULADORA DE GAS</h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">CONTROL DE CONSUMO DOMÉSTICO (GLP)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setShowHistory(!showHistory);
              setShowSettings(false);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest ${showHistory ? 'bg-brand-blue text-white shadow-xl shadow-blue-200' : 'bg-white border border-slate-200 text-slate-400 hover:text-brand-blue hover:border-brand-blue shadow-sm'}`}
          >
            <History className="w-4 h-4" />
            <span>Ver Historial</span>
          </button>
          <button 
            onClick={() => {
              setShowSettings(!showSettings);
              setShowHistory(false);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest ${showSettings ? 'bg-slate-900 text-white shadow-xl' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 shadow-sm'}`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Configuración</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showHistory ? (
          <motion.section 
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-slate-100 overflow-hidden"
          >
            <div className="p-8 md:p-10 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-brand-blue rounded-xl flex items-center justify-center">
                   <History className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">Historial de Cálculos</h4>
              </div>
              <button 
                onClick={() => setHistory([])}
                className="px-4 py-2 text-[9px] font-black text-slate-300 hover:text-rose-500 uppercase tracking-widest flex items-center gap-2 transition-colors border border-transparent hover:border-rose-100 hover:bg-rose-50 rounded-xl"
              >
                <RotateCcw className="w-3 h-3" />
                Borrar todo
              </button>
            </div>
            <div className="overflow-x-auto min-h-[400px]">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <History className="w-10 h-10 opacity-20" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">Sin registros vigentes</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className="px-10 py-5">Fecha y Hora</th>
                      <th className="px-10 py-5">Tarifa Aplicada</th>
                      <th className="px-10 py-5">Galones</th>
                      <th className="px-10 py-5 text-right">Monto Liquidado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {history.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-10 py-6 text-xs font-bold text-slate-400 group-hover:text-slate-500">{item.date}</td>
                        <td className="px-10 py-6">
                          <span className="text-xs font-black text-slate-800 uppercase italic tracking-tighter">{item.rate.name}</span>
                        </td>
                        <td className="px-10 py-6 text-xs font-black text-slate-600 font-mono italic">{item.gallons.toFixed(2)} GLS</td>
                        <td className="px-10 py-6 text-right">
                          <span className="text-base font-black text-brand-green font-mono">RD$ {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.section>
        ) : showSettings ? (
          <motion.section 
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-4xl mx-auto bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-slate-100 overflow-hidden"
          >
            <div className="p-10 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">Ajustes de Precios</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sincronización con el MICM</p>
              </div>
              {!isAddingRate && (
                <button 
                  onClick={() => setIsAddingRate(true)}
                  className="bg-brand-blue text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl shadow-blue-200/50"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              )}
            </div>

            <div className="p-10 space-y-8">
              {isAddingRate && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="p-8 bg-slate-50 rounded-3xl border-2 border-brand-blue/10 space-y-6 shadow-inner"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de la Tarifa</label>
                      <input 
                        type="text"
                        value={newRate.name}
                        onChange={e => setNewRate({...newRate, name: e.target.value})}
                        placeholder="Ej: GLP Estándar"
                        className="w-full h-12 px-5 bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 font-black text-sm uppercase tracking-tight"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RD$ por Galón</label>
                      <input 
                        type="number"
                        value={newRate.pricePerGallon || ''}
                        onChange={e => setNewRate({...newRate, pricePerGallon: Number(e.target.value)})}
                        placeholder="0.00"
                        className="w-full h-12 px-5 bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 font-black text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 justify-end pt-2">
                    <button 
                      onClick={() => setIsAddingRate(false)}
                      className="px-6 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={addRate}
                      className="bg-brand-blue text-white px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg"
                    >
                      Confirmar
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="space-y-4">
                {rates.map(rate => (
                  <div 
                    key={rate.id}
                    className="group flex items-center justify-between p-6 rounded-[2rem] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 group-hover:border-slate-300 shadow-sm flex items-center justify-center transition-all">
                        <Flame className={`w-7 h-7 ${rate.isCustom ? 'text-brand-blue' : 'text-orange-500'}`} />
                      </div>
                      <div>
                        <p className="text-[15px] font-black text-slate-800 uppercase italic tracking-tighter">{rate.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Precio actual registrado</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex items-center bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm focus-within:ring-2 focus-within:ring-brand-green/20 transition-all">
                        <span className="text-[11px] font-black text-slate-300 mr-3 uppercase tracking-widest">RD$</span>
                        <input 
                          type="number"
                          step="0.01"
                          value={rate.pricePerGallon}
                          onChange={e => updateRatePrice(rate.id, Number(e.target.value))}
                          className="w-24 text-right font-black text-slate-800 focus:outline-none bg-transparent font-mono text-lg"
                        />
                      </div>
                      <button 
                        onClick={() => deleteRate(rate.id)}
                        disabled={rates.length <= 1}
                        className="w-12 h-12 flex items-center justify-center text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl disabled:opacity-0 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        ) : (
          <motion.section 
            key="calculator"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-10"
          >
            <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative" id="calc-card">
              <div className="p-8 md:p-14 relative z-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                  
                  <div className="space-y-10">
                    <div>
                      <div className="inline-flex items-center px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full mb-8">
                         <span className="text-[10px] font-black uppercase tracking-[0.1em]">USO DOMÉSTICO</span>
                      </div>
                      <h2 className="text-5xl font-black text-slate-800 leading-[1.1] tracking-tight">
                        Calcula el <span className="text-emerald-500">gas</span>
                      </h2>
                    </div>

                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">CONDOMINIO</label>
                          <select
                            value={selectedCondoId}
                            onChange={(e) => setSelectedCondoId(e.target.value)}
                            className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-700 focus:border-emerald-500/20 focus:outline-none transition-all shadow-sm"
                          >
                            <option value="">Seleccionar...</option>
                            {condos.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">UNIDAD (OPCIONAL)</label>
                          <select
                            value={selectedUnitId}
                            onChange={(e) => setSelectedUnitId(e.target.value)}
                            className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-700 focus:border-blue-500/20 focus:outline-none transition-all shadow-sm"
                          >
                            <option value="">Solo calcular...</option>
                            {filteredUnits.map(u => (
                              <option key={u.id} value={u.id}>Unidad {u.numero} - {u.ownerName}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">TARIFA SELECCIONADA</label>
                        <div className="space-y-2">
                          {rates.filter(r => r.id === selectedRateId).map(rate => (
                            <div
                              key={rate.id}
                              className="flex items-center justify-between p-7 rounded-[2rem] border-2 border-blue-400/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden"
                            >
                              <div className="flex items-center gap-5">
                                <div className="w-11 h-11 bg-[#3b82f6] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                                  <Flame className="w-6 h-6 fill-current" />
                                </div>
                                <span className="text-lg font-black text-blue-600 leading-tight">
                                  {rate.name.split(' (')[0]} <br />
                                  <span className="text-blue-500/80 font-bold">({rate.name.split(' (')[1]}</span>
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="block text-[10px] uppercase font-black text-slate-300 tracking-tight mb-1">PRECIO</span>
                                <span className="text-xl font-black text-slate-800 font-sans tracking-tight">
                                  <span className="text-slate-400 text-sm mr-1">RD$</span>
                                  {rate.pricePerGallon.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">CANTIDAD DE GALONES</label>
                          <div className="relative group">
                            <input 
                              type="number"
                              inputMode="decimal"
                              value={gallons}
                              onChange={e => setGallons(e.target.value)}
                              placeholder="0.00"
                              className="w-full text-4xl p-10 pb-12 bg-[#f8fafc] rounded-[2.5rem] border-none focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:outline-none transition-all text-slate-700 font-black tracking-tighter shadow-inner text-center"
                            />
                            <div className="absolute right-8 bottom-8 flex flex-col items-center gap-2">
                              <span className="text-slate-300 font-black text-[10px] tracking-widest">GLS</span>
                              <RotateCcw 
                                onClick={clearInputs}
                                className="w-4 h-4 text-slate-300 hover:text-blue-500 cursor-pointer transition-colors" 
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">PRECIO POR GALÓN</label>
                          <div className="relative group">
                            <input 
                              type="number"
                              inputMode="decimal"
                              value={selectedRate?.pricePerGallon || ''}
                              onChange={e => selectedRate && updateRatePrice(selectedRate.id, Number(e.target.value))}
                              placeholder="0.00"
                              className="w-full text-4xl p-10 pb-12 bg-[#f8fafc] rounded-[2.5rem] border-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:outline-none transition-all text-slate-700 font-black tracking-tighter shadow-inner text-center"
                            />
                            <div className="absolute right-8 bottom-10">
                               <span className="text-slate-300 font-black text-[10px] tracking-widest">RD$/GL</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0B1527] rounded-[3.5rem] p-10 md:p-14 text-white shadow-3xl relative overflow-hidden flex flex-col justify-between min-h-[500px]">
                    {/* Background Accents */}
                    <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                       <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full -mr-32 -mt-32 blur-[80px]" />
                       <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500 rounded-full -ml-32 -mb-32 blur-[80px]" />
                    </div>

                    <div className="relative z-1 text-center space-y-2">
                       <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">TOTAL ESTIMADO</p>
                       <div className="flex flex-col items-center w-full overflow-hidden px-2">
                          <span className="text-emerald-500 font-black text-2xl mb-1">RD$</span>
                          <motion.span 
                            key={total}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`${total.toLocaleString().length > 10 ? 'text-3xl md:text-4xl' : 'text-5xl md:text-6xl'} font-black tracking-tight leading-none break-all text-center`}
                          >
                            {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </motion.span>
                       </div>
                    </div>

                    <div className="relative z-1 space-y-4">
                       <div className="flex justify-between items-center py-4 border-t border-white/5">
                          <span className="text-slate-500 font-bold text-sm">Galones</span>
                          <span className="text-2xl font-black font-mono italic">{(parseFloat(gallons) || 0).toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between items-center py-4 border-t border-white/5">
                          <span className="text-slate-500 font-bold text-sm">Precio/gl</span>
                          <span className="text-2xl font-black font-mono text-blue-500 italic">RD$ {selectedRate?.pricePerGallon.toFixed(2)}</span>
                       </div>

                       <button 
                         onClick={handleCalculate}
                         disabled={!gallons || parseFloat(gallons) <= 0}
                         className="w-full h-20 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-20 rounded-[2rem] font-black text-white transition-all flex items-center justify-center text-sm uppercase tracking-widest shadow-xl shadow-emerald-600/20 mt-4"
                       >
                         {(!gallons || parseFloat(gallons) <= 0) ? (
                           "Esperando cantidad..."
                         ) : selectedUnitId ? (
                           "REGISTRAR COBRO A UNIDAD"
                         ) : (
                           "CALCULAR (SIN COBRO)"
                         )}
                       </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-[3rem] p-10 flex items-center gap-8 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-[50%] h-full bg-slate-50 -skew-x-[30deg] translate-x-32 group-hover:translate-x-24 transition-transform duration-1000" />
              <div className="w-16 h-16 bg-blue-50 text-brand-blue rounded-3xl shrink-0 flex items-center justify-center shadow-inner relative z-10">
                 <Info size={32} />
              </div>
              <div className="space-y-2 relative z-10">
                <p className="font-black text-slate-800 uppercase italic tracking-tighter text-lg">Información de Seguridad</p>
                <p className="text-xs text-slate-400 font-bold leading-relaxed max-w-2xl uppercase tracking-tight">
                  Toda la data de cálculos se almacena de forma local en su dispositivo. El precio del <strong className="text-blue-500">GLP</strong> es regulado semanalmente por el MICM. Asegúrese de actualizarlo en el panel de configuración cada viernes.
                </p>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
