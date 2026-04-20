"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Trash2, Save, Printer, User, Search, ChevronDown, ChevronRight, ArrowUpRight, ArrowDownLeft, RefreshCcw, Plus
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { createExchange } from "@/actions/echanges.actions";
import { generateProformaPDF } from "@/lib/pdf-generator";
import { cn } from "@/lib/utils";

type Inventory = {
  batchId: string;
  warehouseId: string;
  quantity: number;
  warehouse: { id: string, name: string };
  batch: { id: string, batchNumber: string, expirationDate: Date | null };
};

type Product = {
  id: string;
  designation: string;
  reference: string;
  salePrice: number;
  unit: string;
  piecesPerCarton: number | null;
  inventories: Inventory[];
};

type Customer = {
  id: string;
  name: string;
};

type ExchangeEditorProps = {
  clients: Customer[];
  products: Product[];
};

type ExchangeLine = {
  productId: string;
  designation: string;
  warehouseId: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  type: "IN" | "OUT";
};

type FormValues = {
  reference: string;
  date: string;
  customerId: string;
  lines: ExchangeLine[];
};

export default function ExchangeEditor({ clients, products }: ExchangeEditorProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [savedDoc, setSavedDoc] = useState<any>(null);

  const { register, control, watch, handleSubmit, setValue } = useForm<FormValues>({
    defaultValues: {
      reference: "",
      date: new Date().toISOString().split("T")[0],
      customerId: "",
      lines: []
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watchLines = watch("lines");

  // Séparation des lignes pour l'affichage
  const linesIN = watchLines.filter(l => l.type === "IN");
  const linesOUT = watchLines.filter(l => l.type === "OUT");

  // Calculs financiers
  const totalIN = useMemo(() => linesIN.reduce((acc, l) => acc + (l.quantity * l.unitPrice), 0), [linesIN]);
  const totalOUT = useMemo(() => linesOUT.reduce((acc, l) => acc + (l.quantity * l.unitPrice), 0), [linesOUT]);
  const netDiff = totalOUT - totalIN;

  const addLine = (prd: Product, inv: Inventory, type: "IN" | "OUT") => {
    append({
      productId: prd.id,
      designation: prd.designation,
      warehouseId: inv.warehouseId,
      batchId: inv.batchId,
      batchNumber: inv.batch.batchNumber,
      quantity: 1,
      unitPrice: prd.salePrice || 0,
      type
    });
    toast.success(`${type === "IN" ? "Retour" : "Sortie"} ajouté : ${prd.designation}`);
  };

  const onSubmit = async (data: FormValues) => {
    if (!data.customerId) return toast.error("Veuillez choisir un client.");
    if (data.lines.length === 0) return toast.error("L'échange est vide.");

    const t = toast.loading("Enregistrement de l'échange...");

    const res = await createExchange({
      reference: data.reference,
      date: new Date(data.date),
      customerId: data.customerId,
      netDiff,
      lines: data.lines
    });

    if (res.success) {
      toast.success("Bon d'Échange créé avec succès !", { id: t });
      setSavedDoc(res.data);
      setTimeout(() => router.push("/ventes/echanges"), 1500);
    } else {
      toast.error(res.error, { id: t });
    }
  };

  const filteredProducts = (products || []).filter(p => 
    p.designation.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* HEADER POS STYLE */}
      <div className="flex-none p-4 bg-white dark:bg-slate-950 border-b border-indigo-100 flex flex-wrap gap-4 items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-indigo-600 uppercase tracking-tight">Bon d'Échange Client</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Double Flux (Rendus / Pris)</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Input placeholder="Référence (Optionnel)" {...register("reference")} className="w-36 h-9 font-mono uppercase bg-slate-50" />
          <Input type="date" {...register("date")} className="w-40 h-9" />

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md p-1 pr-2">
            <User className="h-4 w-4 ml-2 text-slate-400" />
            <select {...register("customerId")} className="h-7 bg-transparent text-sm font-semibold outline-none w-[200px]">
              <option value="">-- Choisir Client --</option>
              <option value="COMPTANT">Passager (Comptant)</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <Button onClick={handleSubmit(onSubmit)} className="h-9 bg-indigo-600 hover:bg-indigo-700 shadow-lg text-white gap-2 font-bold px-6">
            <Save className="h-4 w-4" /> Valider l'Échange
          </Button>

          <Button variant="outline" className="h-9 gap-2 border-indigo-200" disabled={!savedDoc} onClick={() => generateProformaPDF(savedDoc, 'open')}>
            <Printer className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* CATALOGUE (GAUCHE) */}
        <div className="w-[360px] flex-none border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-950">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Chercher article..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10 rounded-xl" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredProducts.map(prd => {
              const totalStock = prd.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
              const isOpen = openItems[prd.id];

              return (
                <Collapsible key={prd.id} open={!!isOpen} onOpenChange={(val) => setOpenItems(prev => ({ ...prev, [prd.id]: val }))}>
                  <CollapsibleTrigger className="w-full text-left bg-transparent p-0 border-none outline-none">
                    <div className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50/50 cursor-pointer transition-all border border-transparent hover:border-indigo-100 group">
                      <div className="flex flex-col items-start min-w-0">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200 line-clamp-1">{prd.designation}</span>
                        <span className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{prd.reference}</span>
                      </div>
                      <div className="flex flex-col items-end whitespace-nowrap ml-2">
                        <span className="text-xs font-black text-slate-600">
                          {totalStock.toLocaleString()} {prd.unit}
                        </span>
                        <div className="flex items-center text-[10px] text-indigo-500 mt-1 uppercase font-bold gap-1">
                          Lots {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-2 pb-2">
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 mt-1 shadow-inner">
                      {prd.inventories.map((inv, idx) => (
                        <div key={idx} className="flex flex-col p-3 gap-3">
                          <div className="flex justify-between items-center">
                             <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-700">Lot: <span className="font-mono text-indigo-600">{inv.batch.batchNumber}</span></span>
                                <span className="text-[10px] text-slate-500 italic">{inv.warehouse.name}</span>
                             </div>
                             <span className="text-xs font-black text-slate-400">{inv.quantity} dispo</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                             <Button size="sm" onClick={() => addLine(prd, inv, "IN")} className="h-7 text-[9px] uppercase font-black bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none rounded-lg shadow-sm">
                                <ArrowDownLeft className="h-3 w-3 mr-1" /> Client Rend
                             </Button>
                             <Button size="sm" onClick={() => addLine(prd, inv, "OUT")} className="h-7 text-[9px] uppercase font-black bg-orange-100 text-orange-700 hover:bg-orange-200 border-none rounded-lg shadow-sm">
                                <ArrowUpRight className="h-3 w-3 mr-1" /> Client Prend
                             </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>

        {/* ZONE D'ÉDITION (CENTRE) */}
        <div className="flex-1 flex flex-col bg-slate-100/30 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* RÉCAP RENDUS (IN) */}
            <div className="space-y-3">
               <div className="flex items-center gap-2 px-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                     <ArrowDownLeft className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-black text-emerald-700 uppercase tracking-widest">Produits Rendus par le Client <span className="text-slate-400 text-[10px] font-medium">(Entrée Stock)</span></h3>
               </div>
               <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader className="bg-emerald-50/50">
                      <TableRow>
                        <TableHead className="w-[45%] font-bold text-xs uppercase text-emerald-700">Article / Lot</TableHead>
                        <TableHead className="w-[15%] text-center font-bold text-xs uppercase text-emerald-700">Qté</TableHead>
                        <TableHead className="w-[20%] text-right font-bold text-xs uppercase text-emerald-700">P.U Estimé</TableHead>
                        <TableHead className="w-[20%] text-right font-bold text-xs uppercase text-emerald-700">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linesIN.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="h-20 text-center text-slate-300 italic text-sm">Aucun article rendu sélectionné</TableCell></TableRow>
                      ) : fields.map((field, index) => {
                        const line = watchLines[index];
                        if (!line || line.type !== "IN") return null;
                        return (
                          <TableRow key={field.id} className="hover:bg-emerald-50/30">
                            <TableCell className="py-3">
                               <div className="font-bold text-slate-900 text-xs">{line.designation}</div>
                               <div className="text-[10px] font-mono font-bold text-emerald-600 mt-1">LOT: {line.batchNumber}</div>
                            </TableCell>
                            <TableCell className="py-2">
                               <Input type="number" {...register(`lines.${index}.quantity`, { valueAsNumber: true })} className="h-8 text-center font-bold border-emerald-100 focus:border-emerald-500" />
                            </TableCell>
                            <TableCell className="py-2">
                               <Input type="number" step="0.01" {...register(`lines.${index}.unitPrice`, { valueAsNumber: true })} className="h-8 text-right font-bold border-emerald-100" />
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono font-black text-emerald-700">
                               {((line.quantity || 0) * (line.unitPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-7 w-7 text-emerald-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
               </div>
            </div>

            {/* SYMBOL ÉCHANGE */}
            <div className="flex justify-center -my-2 relative z-10">
               <div className="bg-indigo-600 text-white p-2 rounded-full shadow-xl animate-pulse">
                  <RefreshCcw className="h-6 w-6" />
               </div>
            </div>

            {/* RÉCAP PRIS (OUT) */}
            <div className="space-y-3 pb-12">
               <div className="flex items-center gap-2 px-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-lg">
                     <ArrowUpRight className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-black text-orange-700 uppercase tracking-widest">Nouveaux Produits Pris <span className="text-slate-400 text-[10px] font-medium">(Sortie Stock)</span></h3>
               </div>
               <div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader className="bg-orange-50/50">
                      <TableRow>
                        <TableHead className="w-[45%] font-bold text-xs uppercase text-orange-700">Article / Lot</TableHead>
                        <TableHead className="w-[15%] text-center font-bold text-xs uppercase text-orange-700">Qté</TableHead>
                        <TableHead className="w-[20%] text-right font-bold text-xs uppercase text-orange-700">P.U Vente</TableHead>
                        <TableHead className="w-[20%] text-right font-bold text-xs uppercase text-orange-700">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linesOUT.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="h-20 text-center text-slate-300 italic text-sm">Aucun article pris sélectionné</TableCell></TableRow>
                      ) : fields.map((field, index) => {
                        const line = watchLines[index];
                        if (!line || line.type !== "OUT") return null;
                        return (
                          <TableRow key={field.id} className="hover:bg-orange-50/30">
                            <TableCell className="py-3">
                               <div className="font-bold text-slate-900 text-xs">{line.designation}</div>
                               <div className="text-[10px] font-mono font-bold text-orange-600 mt-1">LOT: {line.batchNumber}</div>
                            </TableCell>
                            <TableCell className="py-2">
                               <Input type="number" {...register(`lines.${index}.quantity`, { valueAsNumber: true })} className="h-8 text-center font-bold border-orange-100 focus:border-orange-500" />
                            </TableCell>
                            <TableCell className="py-2">
                               <Input type="number" step="0.01" {...register(`lines.${index}.unitPrice`, { valueAsNumber: true })} className="h-8 text-right font-bold border-orange-100" />
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono font-black text-orange-700">
                               {((line.quantity || 0) * (line.unitPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-7 w-7 text-orange-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
               </div>
            </div>
          </div>

          {/* RÉSUMÉ FINANCIER ÉCHANGE (BAS) */}
          <div className="bg-slate-900 p-6 flex justify-between items-center text-white border-t border-slate-700">
             <div className="flex gap-12 items-center">
                <div className="flex flex-col">
                   <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-1">Valeur Rendue</span>
                   <span className="text-xl font-bold font-mono">{totalIN.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px]">DA</span></span>
                </div>
                <div className="text-slate-600 font-black text-2xl">-</div>
                <div className="flex flex-col">
                   <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest mb-1">Valeur Prise</span>
                   <span className="text-xl font-bold font-mono">{totalOUT.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px]">DA</span></span>
                </div>
             </div>

             <div className="flex items-center gap-8">
                <div className="flex flex-col items-end">
                   <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Solde de l'opération</span>
                   <div className={cn(
                     "text-3xl font-black tracking-tighter p-4 px-10 rounded-2xl shadow-inner border",
                     netDiff >= 0 
                      ? "bg-orange-600/20 text-orange-500 border-orange-500/30" 
                      : "bg-emerald-600/20 text-emerald-500 border-emerald-500/30"
                   )}>
                      {Math.abs(netDiff).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm font-bold opacity-60">DA</span>
                      <span className="block text-[10px] font-black uppercase tracking-[0.2em] mt-1 opacity-80 text-center">
                         {netDiff >= 0 ? "À Payer par Client" : "À Rembourser Client"}
                      </span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
