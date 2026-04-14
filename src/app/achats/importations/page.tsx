"use client";

import React, { useState, useMemo } from "react";
import { Plus, Trash2, Calculator, Save, FileText, ArrowLeft, RefreshCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type SimLine = {
  id: string;
  designation: string;
  qty: number;
  unitPriceUsd: number;
};

export default function SimulateurImportation() {
  // Entête Dossier
  const [dossierRef, setDossierRef] = useState("");
  const [exchangeRate, setExchangeRate] = useState<number>(140); // 1 USD = 140 DA par defaut
  
  // Frais d'approche globaux (en DA)
  const [fraisDouane, setFraisDouane] = useState<number>(0);
  const [fraisTransit, setFraisTransit] = useState<number>(0);
  const [fraisTransport, setFraisTransport] = useState<number>(0);
  const [fraisSup, setFraisSup] = useState<number>(0);

  // Lignes
  const [lines, setLines] = useState<SimLine[]>([
    { id: "1", designation: "", qty: 1, unitPriceUsd: 0 }
  ]);

  const addLine = () => {
    setLines([...lines, { id: crypto.randomUUID(), designation: "", qty: 1, unitPriceUsd: 0 }]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: keyof SimLine, value: any) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  // -------------------------
  // MOTEUR DE CALCUL
  // -------------------------
  
  // 1. Valeur Ligne (USD) : Vi = Qty * Price
  // 2. Total Facture (USD) : Vtotal = Sum(Vi)
  const totalUsd = useMemo(() => lines.reduce((acc, l) => acc + ((l.qty || 0) * (l.unitPriceUsd || 0)), 0), [lines]);
  
  // 3. Charges Globales (DA) : G = Douane + Transit + Transport + Frais Sup
  const chargesGlobalesDA = useMemo(() => (fraisDouane || 0) + (fraisTransit || 0) + (fraisTransport || 0) + (fraisSup || 0), [fraisDouane, fraisTransit, fraisTransport, fraisSup]);

  // Total Valeur Marchandise DA
  const totalMarchandiseDA = totalUsd * exchangeRate;
  const coutDeRevientTotalDA = totalMarchandiseDA + chargesGlobalesDA;

  const handleReset = () => {
    if(confirm("Réinitialiser le simulateur ?")) {
       setLines([{ id: crypto.randomUUID(), designation: "", qty: 1, unitPriceUsd: 0 }]);
       setFraisDouane(0); setFraisTransit(0); setFraisTransport(0); setFraisSup(0);
       setExchangeRate(140);
       setDossierRef("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      
      {/* HEADER */}
      <div className="flex-none p-4 bg-white dark:bg-slate-950 shadow-sm z-10 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30">
            <Calculator className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-orange-700 dark:text-orange-400 uppercase tracking-tight">Simulateur d'Importation</h1>
            <p className="text-xs text-slate-500 font-medium">Répartition au Prorata des frais d'approche (DA)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Input placeholder="Ref Dossier (Ex: IMP-2026)" value={dossierRef} onChange={(e) => setDossierRef(e.target.value)} className="w-56 h-9 font-mono bg-slate-50 border-orange-200" />
          <Button variant="outline" size="sm" onClick={handleReset} className="h-9 gap-2">
            <RefreshCcw className="h-4 w-4" /> Reset
          </Button>
          <Button className="h-9 bg-orange-600 hover:bg-orange-700 text-white gap-2">
            <Save className="h-4 w-4" /> Exporter PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 space-y-6">
        
        {/* PARAMS */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm col-span-1 md:col-span-1 border-t-4 border-t-sky-500">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Taux de Change D10</h3>
            <div className="flex relative items-center">
              <span className="absolute left-3 text-xs text-slate-400 font-mono">1 USD =</span>
              <Input type="number" step="0.01" value={exchangeRate} onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)} className="h-10 pl-16 text-right font-bold text-sky-600 bg-sky-50 dark:bg-sky-900/20 border-sky-200" />
              <span className="ml-2 text-xs font-bold text-slate-600">DA</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm col-span-1 md:col-span-4 border-t-4 border-t-orange-500">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 text-right">Frais d'approche Globaux (Saisis en DA)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Douane + Taxes</label>
                <Input type="number" value={fraisDouane} onChange={(e) => setFraisDouane(parseFloat(e.target.value) || 0)} className="h-9 text-right font-mono" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Transit</label>
                <Input type="number" value={fraisTransit} onChange={(e) => setFraisTransit(parseFloat(e.target.value) || 0)} className="h-9 text-right font-mono" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Transport</label>
                <Input type="number" value={fraisTransport} onChange={(e) => setFraisTransport(parseFloat(e.target.value) || 0)} className="h-9 text-right font-mono" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Frais Sup. (Banque, etc)</label>
                <Input type="number" value={fraisSup} onChange={(e) => setFraisSup(parseFloat(e.target.value) || 0)} className="h-9 text-right font-mono" />
              </div>
            </div>
          </div>
        </div>

        {/* LIGNES MARCHANDISE */}
        <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
           <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Facture d'Origine (USD) & Répartition</h2>
              <Button size="sm" onClick={addLine} variant="outline" className="h-8 gap-2 bg-white"><Plus className="h-3 w-3" /> Nouvelle Ligne</Button>
           </div>
           <div className="overflow-x-auto">
             <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-[200px]">Désignation Produit</TableHead>
                    <TableHead className="text-center w-[100px]">Quantité</TableHead>
                    <TableHead className="text-right w-[120px]">P.U (USD)</TableHead>
                    <TableHead className="text-right w-[150px] bg-slate-100">Total (USD)</TableHead>
                    <TableHead className="text-center w-[100px] text-orange-600 bg-orange-50/50">% Prorata</TableHead>
                    <TableHead className="text-right w-[150px] text-orange-600 bg-orange-50/50">Part Frais (DA)</TableHead>
                    <TableHead className="text-right w-[180px] bg-sky-50 font-bold">Cout Unitaire Final (DA)</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, idx) => {
                    const lineTotalUsd = (line.qty || 0) * (line.unitPriceUsd || 0);
                    // 3. Coefficient Prorata
                    const prorata = totalUsd > 0 ? (lineTotalUsd / totalUsd) : 0;
                    // 4. Part des charges pour la ligne (DA)
                    const lineChargesDA = prorata * chargesGlobalesDA;
                    // 5. Total ligne en DA (Achat + Frais)
                    const lineTotalAchatDA = lineTotalUsd * exchangeRate;
                    const lineTotalCostDA = lineTotalAchatDA + lineChargesDA;
                    // 6. Cout Unitaire Final
                    const coutUnitaireDA = line.qty > 0 ? (lineTotalCostDA / line.qty) : 0;

                    return (
                      <TableRow key={line.id} className="h-12 hover:bg-slate-50/50">
                        <TableCell className="p-2"><Input value={line.designation} onChange={(e) => updateLine(line.id, "designation", e.target.value)} className="h-8 text-xs font-semibold" placeholder={`Produit ${idx+1}`} /></TableCell>
                        <TableCell className="p-2"><Input type="number" min="1" value={line.qty} onChange={(e) => updateLine(line.id, "qty", parseFloat(e.target.value)||0)} className="h-8 text-center text-xs" /></TableCell>
                        <TableCell className="p-2"><Input type="number" step="0.01" value={line.unitPriceUsd} onChange={(e) => updateLine(line.id, "unitPriceUsd", parseFloat(e.target.value)||0)} className="h-8 text-right text-xs" /></TableCell>
                        <TableCell className="p-2 text-right bg-slate-50 font-mono font-medium text-slate-700 text-xs">
                          ${lineTotalUsd.toLocaleString(undefined, {minimumFractionDigits:2})}
                        </TableCell>
                        <TableCell className="p-2 text-center text-orange-600 font-bold text-xs bg-orange-50/20">
                          {(prorata * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell className="p-2 text-right text-orange-600 font-mono text-xs bg-orange-50/20">
                          {lineChargesDA.toLocaleString(undefined, {minimumFractionDigits:2})}
                        </TableCell>
                        <TableCell className="p-2 text-right">
                          <div className="bg-sky-100 text-sky-800 font-bold py-1 px-2 rounded w-full border border-sky-300 font-mono text-xs">
                            {coutUnitaireDA.toLocaleString(undefined, {minimumFractionDigits:2})}
                          </div>
                        </TableCell>
                        <TableCell className="p-2 text-center">
                          <Button variant="ghost" size="icon" onClick={() => removeLine(line.id)} className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-3 w-3" /></Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
             </Table>
           </div>
        </div>

        {/* BILAN FOOTER */}
        <div className="bg-slate-900 rounded-xl shadow-lg p-6 flex flex-col md:flex-row justify-between items-center text-white gap-6">
           <div>
             <h4 className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-1">Résumé Dossier</h4>
             <p className="text-emerald-400 font-bold text-sm">Validité Mathématique (100% Réparti)</p>
           </div>
           <div className="flex gap-8 items-center font-mono">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase">Total Facture Frs.</p>
                <p className="text-xl font-bold text-sky-400">${totalUsd.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
              </div>
              <div className="h-10 w-px bg-slate-700"></div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase">Frais Approche</p>
                <p className="text-xl font-bold text-orange-400">{chargesGlobalesDA.toLocaleString(undefined, {minimumFractionDigits:2})} DA</p>
              </div>
              <div className="h-10 w-px bg-slate-700"></div>
              <div className="text-right bg-slate-800 p-2 px-4 rounded border border-slate-700">
                <p className="text-[10px] text-slate-400 uppercase mb-0.5">Cout de Revient Glob.</p>
                <p className="text-2xl font-black">{coutDeRevientTotalDA.toLocaleString(undefined, {minimumFractionDigits:2})} DA</p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
