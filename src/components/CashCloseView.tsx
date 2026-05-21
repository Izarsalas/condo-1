import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Printer, 
  FileText, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  ArrowRightLeft,
  ChevronRight,
  Filter,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { Sale, Transaction, Product, TransactionType } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface CashCloseViewProps {
  sales: Sale[];
  transactions: Transaction[];
  products: Product[];
}

export function CashCloseView({ sales, transactions, products }: CashCloseViewProps) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Create products map for quick lookup
  const productMap = useMemo(() => {
    const map: Record<string, Product> = {};
    products.forEach(p => {
      map[p.id] = p;
    });
    return map;
  }, [products]);

  const filteredData = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    const fSales = sales.filter(s => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });

    const fTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    return { sales: fSales, transactions: fTransactions };
  }, [sales, transactions, startDate, endDate]);

  const stats = useMemo(() => {
    let totalSales = 0;
    let totalCOGS = 0; // Cost of Goods Sold

    filteredData.sales.forEach(sale => {
      totalSales += sale.total;
      sale.items.forEach(item => {
        const prod = productMap[item.productId];
        if (prod) {
          totalCOGS += prod.costPrice * item.quantity;
        }
      });
    });

    let otherIncomeCount = 0;
    let totalOtherIncome = 0;
    let totalExpenses = 0;

    filteredData.transactions.forEach(t => {
      if (t.type === TransactionType.INCOME) {
        totalOtherIncome += t.amount;
        otherIncomeCount++;
      } else {
        totalExpenses += t.amount;
      }
    });

    const totalRevenue = totalSales + totalOtherIncome;
    const totalCosts = totalCOGS + totalExpenses;
    const netProfit = totalRevenue - totalCosts;
    const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalSales,
      totalCOGS,
      totalOtherIncome,
      totalExpenses,
      totalRevenue,
      totalCosts,
      netProfit,
      marginPercent,
      salesCount: filteredData.sales.length,
      incomeCount: otherIncomeCount,
      expenseCount: filteredData.transactions.filter(t => t.type === TransactionType.EXPENSE).length
    };
  }, [filteredData, productMap]);

  const setRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  const setMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const setAnnualRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const setFortnightRange = () => {
    const now = new Date();
    const day = now.getDate();
    let start, end;
    
    if (day <= 15) {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth(), 15);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 16);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const title = 'REPORTE DE CORTE DE CAJA - CONDOBill';
    const period = `Período: ${startDate} al ${endDate}`;
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // deep slate
    doc.text(title, 14, 22);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(period, 14, 30);
    doc.text(`Fecha de Impresión: ${new Date().toLocaleString('es-DO')}`, 14, 36);

    const formatDOP = (amount: number) => {
      return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP',
        minimumFractionDigits: 2
      }).format(amount);
    };

    // Table 1: Financial Summary
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("1. Resumen Financiero General", 14, 46);

    autoTable(doc, {
      startY: 50,
      head: [['Concepto / Indicador', 'Fórmula o Descripción', 'Monto']],
      body: [
        ['Ventas Totales', 'Total facturado en ventas/productos', formatDOP(stats.totalSales)],
        ['Otros Ingresos', 'Cuotas, gas y transacciones de ingresos', formatDOP(stats.totalOtherIncome)],
        ['INGRESOS TOTALES (A)', 'Ventas totales + Otros ingresos', formatDOP(stats.totalRevenue)],
        ['Costo de Mercancía (COGS)', 'Costo de adquisición de productos', formatDOP(stats.totalCOGS)],
        ['Gastos Operativos', 'Egresos generales, reparaciones y servicios', formatDOP(stats.totalExpenses)],
        ['EGRESOS TOTALES (B)', 'Costo mercancía + Gastos operativos', formatDOP(stats.totalCosts)],
        ['UTILIDAD NETA (A - B)', 'Diferencia neta (Ganancia real)', formatDOP(stats.netProfit)],
        ['Margen de Utilidad (%)', 'Utilidad / Ingresos Totales', `${stats.marginPercent.toFixed(2)}%`],
      ],
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 12;

    // Table 2: Detailed Sales (if any)
    if (filteredData.sales.length > 0) {
      if (currentY + 40 > 280) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`2. Detalle de Ventas (${filteredData.sales.length} facturas)`, 14, currentY);
      
      autoTable(doc, {
        startY: currentY + 4,
        head: [['ID Factura', 'Fecha/Hora', 'Cliente', 'Método', 'ITBIS', 'Total']],
        body: filteredData.sales.map(s => [
          s.id,
          new Date(s.date).toLocaleString('es-DO', { hour12: true }),
          s.clientName || 'VENTA MOSTRADOR',
          s.paymentMethod,
          formatDOP(s.itbis),
          formatDOP(s.total)
        ]),
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] }, // Indigo
        margin: { left: 14, right: 14 }
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // Table 3: Other Transactions (if any)
    if (filteredData.transactions.length > 0) {
      if (currentY + 40 > 280) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`3. Otras Transacciones (Ingresos y Egresos Directos)`, 14, currentY);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Descripción', 'Monto']],
        body: filteredData.transactions.map(t => [
          new Date(t.date).toLocaleDateString('es-DO'),
          t.type === TransactionType.INCOME ? 'INGRESO' : 'EGRESO',
          t.category,
          t.concept,
          t.description || '-',
          formatDOP(t.amount)
        ]),
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [13, 148, 136] }, // Teal
        margin: { left: 14, right: 14 }
      });
    }

    doc.save(`Corte_Caja_${startDate}_a_${endDate}.pdf`);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Financial Summary
    const customSummary = [
      ['REPORTE DE CORTE DE CAJA - CONDOBill'],
      ['Desde: ' + startDate, 'Hasta: ' + endDate],
      ['Fecha de Emisión:', new Date().toLocaleString('es-DO')],
      [''],
      ['CONCEPTO', 'MÓDULO / DETALLE', 'MONTO (DOP)'],
      ['Ventas Totales', 'Total facturado en panel de ventas', stats.totalSales],
      ['Otros Ingresos Directos', 'Sueldos, cuotas, gas u otras entradas', stats.totalOtherIncome],
      ['INGRESOS TOTALES (A)', 'Suma de todas las ventas y depósito de ingresos', stats.totalRevenue],
      ['Costo de Mercancía (COGS)', 'Costo total de artículos vendidos', stats.totalCOGS],
      ['Gastos Operativos', 'Servicios, nóminas, reparaciones y egresos', stats.totalExpenses],
      ['EGRESOS TOTALES (B)', 'Costo de mercancía + Gastos operativos', stats.totalCosts],
      ['UTILIDAD NETA (A - B)', 'Margen neto obtenido real', stats.netProfit],
      ['Margen de Utilidad (%)', 'Porcentaje de rentabilidad neta', `${stats.marginPercent.toFixed(2)}%`]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(customSummary);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen Financiero");

    // Sheet 2: Detailed Sales
    if (filteredData.sales.length > 0) {
      const salesRows = filteredData.sales.map(s => ({
        'ID Factura': s.id,
        'Fecha y Hora': new Date(s.date).toLocaleString('es-DO'),
        'Cliente': s.clientName || 'VENTA MOSTRADOR',
        'Método de Pago': s.paymentMethod,
        'Banco/Referencia': s.reference || s.bank || '-',
        'Subtotal (RD$)': s.subtotal,
        'ITBIS (RD$)': s.itbis,
        'Total (RD$)': s.total
      }));
      const wsSales = XLSX.utils.json_to_sheet(salesRows);
      XLSX.utils.book_append_sheet(wb, wsSales, "Historial de Ventas");
    }

    // Sheet 3: Other Transactions
    if (filteredData.transactions.length > 0) {
      const transRows = filteredData.transactions.map(t => ({
        'ID Transacción': t.id,
        'Fecha': new Date(t.date).toLocaleDateString('es-DO'),
        'Tipo': t.type === TransactionType.INCOME ? 'INGRESO' : 'EGRESO',
        'Categoría': t.category,
        'Concepto': t.concept,
        'Descripción': t.description || '-',
        'Monto (RD$)': t.amount
      }));
      const wsTrans = XLSX.utils.json_to_sheet(transRows);
      XLSX.utils.book_append_sheet(wb, wsTrans, "Otras Transacciones");
    }

    XLSX.writeFile(wb, `Corte_Caja_${startDate}_a_${endDate}.xlsx`);
  };

  const handlePrint = () => {
    // Generar ventana limpia con diseño optimizado para impresión
    const printableWindow = window.open('', '_blank');
    if (!printableWindow) {
      // Si el bloqueador de ventanas emergentes interfiere, se recurre al PDF de alta calidad
      exportPDF();
      alert("El navegador bloqueó la ventana emergente de impresión. Se ha descargado automáticamente un reporte PDF de alta resolución.");
      return;
    }
    
    const formatDOP = (amount: number) => {
      return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP',
        minimumFractionDigits: 2
      }).format(amount);
    };

    const logoHtml = `<div style="font-family: 'Inter', sans-serif; font-size: 26px; font-weight: 900; color: #0b1329; tracking: -0.05em;"><span style="color: #3b82f6;">CONDO</span>Bill</div>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Impresión de Corte de Caja - CONDOBill</title>
        <!-- Cargamos Tailwind CSS para asegurar un diseño pulcro, moderno e idéntico al original -->
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            background-color: white;
            color: #1e293b;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0px; margin: 0px; }
          }
        </style>
      </head>
      <body class="p-10 max-w-5xl mx-auto">
        <div class="flex justify-between items-start border-b-2 border-slate-100 pb-6 mb-8">
          <div>
            ${logoHtml}
            <h1 class="text-2xl font-black uppercase tracking-tight text-slate-800 mt-2">REPORTE OFICIAL: CORTE DE CAJA</h1>
            <p class="text-sm font-semibold text-slate-500">Período de Conciliación: ${startDate} al ${endDate}</p>
          </div>
          <div class="text-right flex flex-col items-end">
            <button onclick="window.print()" class="no-print bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-6 rounded-xl shadow-md transition-all text-[11px] uppercase tracking-widest mb-2 flex items-center gap-2">
              🖨️ CONFIRMAR IMPRESIÓN
            </button>
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fecha de Impresión: ${new Date().toLocaleString('es-DO')}</p>
          </div>
        </div>

        <section class="mb-8">
          <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span class="w-2.5 h-2.5 bg-blue-600 rounded-full"></span> 1. RESUMEN EXECUTIVO DE CAJA
          </h2>
          <div class="grid grid-cols-4 gap-4">
            <div class="p-4 border border-slate-100 rounded-2xl bg-slate-50">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider">INGRESOS TOTALES</span>
              <p class="text-xl font-black text-emerald-600 mt-1">${formatDOP(stats.totalRevenue)}</p>
            </div>
            <div class="p-4 border border-slate-100 rounded-2xl bg-slate-50">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider">EGRESOS TOTALES</span>
              <p class="text-xl font-black text-rose-500 mt-1">${formatDOP(stats.totalCosts)}</p>
            </div>
            <div class="p-4 border border-slate-100 rounded-2xl bg-slate-50 border-blue-100 bg-blue-50/20">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider">UTILIDAD NETA RECUPERADA</span>
              <p class="text-xl font-black text-blue-600 mt-1">${formatDOP(stats.netProfit)}</p>
            </div>
            <div class="p-4 border border-slate-100 rounded-2xl bg-slate-50">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider">MARGEN DE UTILIDAD</span>
              <p class="text-xl font-black text-slate-700 mt-1">${stats.marginPercent.toFixed(1)}%</p>
            </div>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span class="w-2.5 h-2.5 bg-slate-800 rounded-full"></span> 2. CONCILIACIÓN DE CUENTAS GENERALES
          </h2>
          <table class="w-full text-left text-xs border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <thead>
              <tr class="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
                <th class="p-4 text-left">Indicador Financiero</th>
                <th class="p-4 text-left">Fórmula Aplicable / Origen</th>
                <th class="p-4 text-right">Monto Neto (DOP)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              <tr class="hover:bg-slate-50/50">
                <td class="p-4 font-bold text-slate-800">Ventas Directas Registradas</td>
                <td class="p-4 text-slate-400">Total facturado en ventas regulares de mercancías y gas</td>
                <td class="p-4 text-right font-black text-slate-800">${formatDOP(stats.totalSales)}</td>
              </tr>
              <tr class="hover:bg-slate-50/50">
                <td class="p-4 font-bold text-slate-800">Otros Ingresos Recibidos</td>
                <td class="p-4 text-slate-400">Cuotas de mantenimiento ordinarias/extraordinarias y depósitos directos</td>
                <td class="p-4 text-right font-black text-slate-800">${formatDOP(stats.totalOtherIncome)}</td>
              </tr>
              <tr class="bg-emerald-50/40 text-emerald-900 font-bold">
                <td class="p-4 text-emerald-800 uppercase tracking-wider text-[11px]">Ingresos Brutos del Período (A)</td>
                <td class="p-4 text-emerald-600 font-medium">Suma acumulativa de todas las entradas y ventas</td>
                <td class="p-4 text-right font-black text-emerald-700 text-sm">${formatDOP(stats.totalRevenue)}</td>
              </tr>
              <tr class="hover:bg-slate-50/50">
                <td class="p-4 font-medium text-slate-800">Costo de Ventas (COGS)</td>
                <td class="p-4 text-slate-400">Costo de adquisición base de insumos y mercadería vendida</td>
                <td class="p-4 text-right font-black text-slate-800">${formatDOP(stats.totalCOGS)}</td>
              </tr>
              <tr class="hover:bg-slate-50/50">
                <td class="p-4 font-medium text-slate-800">Gastos Operativos Registrados</td>
                <td class="p-4 text-slate-400">Servicios básicos, seguridad, nóminas, mantenimientos y compras directas</td>
                <td class="p-4 text-right font-black text-slate-800">${formatDOP(stats.totalExpenses)}</td>
              </tr>
              <tr class="bg-rose-50/40 text-rose-900 font-bold">
                <td class="p-4 text-rose-800 uppercase tracking-wider text-[11px]">Gastos y Costos Consolidados (B)</td>
                <td class="p-4 text-rose-600 font-medium">Costo de mercancía + Gastos generales</td>
                <td class="p-4 text-right font-black text-rose-700 text-sm">${formatDOP(stats.totalCosts)}</td>
              </tr>
              <tr class="bg-blue-100/40 text-blue-900 font-bold border-t-2 border-blue-200">
                <td class="p-4 text-blue-800 uppercase tracking-wider text-[11px]">Flujo de Utilidad Neta (A - B)</td>
                <td class="p-4 text-blue-600 font-medium">Diferencia exacta que representa la ganancia operativa neta</td>
                <td class="p-4 text-right font-black text-blue-600 text-[15px]">${formatDOP(stats.netProfit)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        ${filteredData.sales.length > 0 ? `
        <section class="mb-8">
          <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span class="w-2.5 h-2.5 bg-purple-600 rounded-full"></span> 3. HISTORIAL DE VENTAS DETALLADO
          </h2>
          <table class="w-full text-left text-[11px] border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <thead>
              <tr class="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[9px] border-b border-slate-200">
                <th class="p-3">ID Factura</th>
                <th class="p-3">Fecha / Hora</th>
                <th class="p-3">Cliente</th>
                <th class="p-3">Método Pago</th>
                <th class="p-3 text-right">ITBIS (18%)</th>
                <th class="p-3 text-right">Monto Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-600">
              ${filteredData.sales.map(s => `
                <tr class="hover:bg-slate-50/40">
                  <td class="p-3 font-mono font-bold text-slate-800">${s.id}</td>
                  <td class="p-3 text-slate-500">${new Date(s.date).toLocaleString('es-DO', { hour12: true })}</td>
                  <td class="p-3 font-semibold text-slate-700">${s.clientName || 'VENTA MOSTRADOR'}</td>
                  <td class="p-3 text-slate-500">${s.paymentMethod}</td>
                  <td class="p-3 text-right font-mono text-slate-500">${formatDOP(s.itbis)}</td>
                  <td class="p-3 text-right font-mono font-black text-slate-800">${formatDOP(s.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>
        ` : ''}

        ${filteredData.transactions.length > 0 ? `
        <section class="mb-8">
          <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span class="w-2.5 h-2.5 bg-teal-600 rounded-full"></span> 4. OTRAS ENTREDAS Y SALIDAS DETALLADAS
          </h2>
          <table class="w-full text-left text-[11px] border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <thead>
              <tr class="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[9px] border-b border-slate-200">
                <th class="p-3">Fecha</th>
                <th class="p-3">Tipo</th>
                <th class="p-3">Categoría de Cuenta</th>
                <th class="p-3">Concepto Registrado</th>
                <th class="p-3">Observación</th>
                <th class="p-3 text-right">Monto Neto</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-600">
              ${filteredData.transactions.map(t => `
                <tr class="hover:bg-slate-50/40">
                  <td class="p-3 text-slate-500">${new Date(t.date).toLocaleDateString('es-DO')}</td>
                  <td class="p-3">
                    <span class="inline-block px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                      ${t.type === TransactionType.INCOME ? 'INGRESO' : 'EGRESO'}
                    </span>
                  </td>
                  <td class="p-3 font-semibold text-slate-700">${t.category}</td>
                  <td class="p-3 text-slate-700">${t.concept}</td>
                  <td class="p-3 italic text-slate-400">${t.description || '-'}</td>
                  <td class="p-3 text-right font-mono font-black ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-500'}">
                    ${formatDOP(t.amount)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>
        ` : ''}

        <div class="mt-20 flex justify-between gap-10 text-center text-xs">
          <div class="border-t border-slate-300 pt-4 w-1/3">
            <p class="font-bold text-slate-800">Elaborado por:</p>
            <p class="text-slate-400 mt-2 text-[10px] font-medium tracking-wide uppercase">Firma Responsable Caja</p>
          </div>
          <div class="border-t border-slate-300 pt-4 w-1/3">
            <p class="font-bold text-slate-800">Revisado por:</p>
            <p class="text-slate-400 mt-2 text-[10px] font-medium tracking-wide uppercase">Auditor / Administración</p>
          </div>
          <div class="border-t border-slate-300 pt-4 w-1/3">
            <p class="font-bold text-slate-800">Recibido por:</p>
            <p class="text-slate-400 mt-2 text-[10px] font-medium tracking-wide uppercase">Firma del Presidente / Supervisor</p>
          </div>
        </div>

        <script>
          window.focus();
          setTimeout(() => {
            window.print();
          }, 350);
        </script>
      </body>
      </html>
    `;

    printableWindow.document.write(htmlContent);
    printableWindow.document.close();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Date Range Selection & Actions */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200 print:bg-slate-900 print:text-white print:shadow-none">
               <BarChart3 size={28} />
             </div>
             <div>
               <h2 className="text-2xl font-black text-slate-800 italic uppercase">Corte de Caja</h2>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest print:hidden">Análisis financiero y margen de ganancia</p>
               <p className="text-xs font-bold text-slate-600 uppercase tracking-widest hidden print:block">Período: {startDate} al {endDate}</p>
             </div>
          </div>

          <div className="flex flex-wrap gap-3 print:hidden">
             <button onClick={handlePrint} className="h-12 px-6 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all flex items-center gap-2 shadow-sm">
                <Printer size={16} /> Imprimir
             </button>
             <button onClick={exportPDF} className="h-12 px-6 bg-rose-50 hover:bg-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-600 transition-all flex items-center gap-2 shadow-sm border border-rose-100">
                <FileText size={16} /> Exportar PDF
             </button>
             <button onClick={exportExcel} className="h-12 px-6 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 transition-all flex items-center gap-2 shadow-sm border border-emerald-100">
                <FileSpreadsheet size={16} /> Exportar Excel
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 pt-8 border-t border-slate-100 print:hidden">
          <div className="xl:col-span-2 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Filter size={12} /> Filtros de Fecha Personalizados
            </h4>
            <div className="flex flex-col sm:flex-row items-center gap-4">
               <div className="relative w-full">
                 <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                   type="date" 
                   value={startDate}
                   onChange={(e) => setStartDate(e.target.value)}
                   className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-700 outline-none focus:border-blue-500/30 transition-all"
                 />
               </div>
               <span className="text-slate-300 font-black">-</span>
               <div className="relative w-full">
                 <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                   type="date" 
                   value={endDate}
                   onChange={(e) => setEndDate(e.target.value)}
                   className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-700 outline-none focus:border-blue-500/30 transition-all"
                 />
               </div>
            </div>
          </div>

          <div className="xl:col-span-2 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Clock size={12} /> Periodos Predefinidos
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[
                { label: 'Diario', onClick: () => setRange(0) },
                { label: 'Semanal', onClick: () => setRange(7) },
                { label: 'Quincenal', onClick: setFortnightRange },
                { label: 'Mensual', onClick: setMonthRange },
                { label: 'Trimestral', onClick: () => setRange(90) },
                { label: 'Semestral', onClick: () => setRange(180) },
                { label: 'Anual', onClick: setAnnualRange }
              ].map((period) => (
                <button 
                  key={period.label}
                  onClick={period.onClick}
                  className="h-10 px-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-tight text-slate-500 transition-all border border-slate-200"
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Income Card */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
           <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md">Entradas</span>
              </div>
           </div>
           <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ingresos Totales</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">${stats.totalRevenue.toLocaleString()}</h3>
           </div>
           <div className="pt-4 border-t border-slate-50 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="text-slate-400">De Ventas ({stats.salesCount})</span>
                <span className="text-slate-700 font-mono">${stats.totalSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="text-slate-400">De Otros ({stats.incomeCount})</span>
                <span className="text-slate-700 font-mono">${stats.totalOtherIncome.toLocaleString()}</span>
              </div>
           </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
           <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <TrendingDown size={24} />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-2 py-1 rounded-md">Salidas</span>
              </div>
           </div>
           <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Egresos Totales</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">${stats.totalCosts.toLocaleString()}</h3>
           </div>
           <div className="pt-4 border-t border-slate-50 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="text-slate-400">Costo Mercancía</span>
                <span className="text-slate-700 font-mono">${stats.totalCOGS.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="text-slate-400">Gasto Operativo</span>
                <span className="text-slate-700 font-mono">${stats.totalExpenses.toLocaleString()}</span>
              </div>
           </div>
        </div>

        {/* Profit Card */}
        <div className="bg-blue-600 p-8 rounded-3xl border border-blue-500 shadow-xl shadow-blue-100 space-y-6 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-110 transition-transform duration-500" />
           <div className="relative z-1 space-y-6">
              <div className="flex justify-between items-start">
                 <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center">
                   <Wallet size={24} />
                 </div>
                 <div className="text-right">
                   <span className="text-[10px] font-black text-white uppercase tracking-widest border border-white/20 px-2 py-1 rounded-md">Utilidad</span>
                 </div>
              </div>
              <div>
                 <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Margen de Ganancia</p>
                 <h3 className="text-3xl font-black text-white font-mono tracking-tighter">${stats.netProfit.toLocaleString()}</h3>
              </div>
              <div className="pt-4 border-t border-white/10 flex items-end justify-between">
                 <div>
                   <span className="text-[9px] font-black text-blue-200 uppercase tracking-widest block mb-1">Porcentaje</span>
                   <span className="text-2xl font-black text-white font-mono">{stats.marginPercent.toFixed(1)}%</span>
                 </div>
                 <div className={`flex items-center gap-1 ${stats.marginPercent >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    <TrendingUp size={16} />
                 </div>
              </div>
           </div>
        </div>

        {/* Summary Card */}
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
           <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-white/5 text-blue-400 flex items-center justify-center">
                <ArrowRightLeft size={24} />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded-md">Resumen</span>
              </div>
           </div>
           <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Movimientos</span>
                 <span className="text-lg font-black text-white font-mono">{stats.salesCount + stats.incomeCount + stats.expenseCount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Transacciones Prom.</span>
                 <span className="text-lg font-black text-white font-mono">${((stats.totalRevenue + stats.totalCosts) / (stats.salesCount + stats.incomeCount + stats.expenseCount || 1)).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2 pt-2 text-blue-400 group cursor-pointer">
                 <span className="text-[10px] font-black uppercase tracking-widest">Ver Detalles Completos</span>
                 <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
