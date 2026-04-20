"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Trash2, Save, Printer, User, Search, ChevronDown, ChevronRight, PackageCheck, Plus, Undo2
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { createSaleReturn } from "@/actions/avoirs-ventes.actions";
import { generateProformaPDF } from "@/lib/pdf-generator";
import { Badge } from "@/components/ui/badge";

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
  tvaRate?: number;
  unit: string;
  piecesPerCarton: number | null;
  boxesPerCarton: number | null;
  inventories: Inventory[];
};

type Customer = {
  id: string;
  name: string;
};

type SaleReturnEditorProps = {
  customers: Customer[];
  products: Product[];
};

type FormValues = {
  reference: string;
  date: string;
  customerId: string;
  lines: {
    productId: string;
    designation: string;
    warehouseId: string;
    batchId: string;
    batchNumber: string;
    colisage: number;
    cartons: number;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }[];
};

export default function SaleReturnEditor({ customers, products }: SaleReturnEditorProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [savedDoc, setSavedDoc] = useState<any>(null);

  const { register, control, watch, handleSubmit, setValue } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      reference: "",
      date: new Date().toISOString().split("T")[0],
      customerId: "",
      lines: []
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watchLines = watch("lines") || [];
  
  // Calculs financiers dynamiques (synchrone au rendu comme dans les proformas)
  let grossTotal = 0;
  let taxTotal = 0;
  watchLines.forEach((line) => {
    const qty = Number(line.quantity) || 0;
    const up = Number(line.unitPrice) || 0;
    const tr = Number(line.taxRate) || 0;
    const lineHT = qty * up;
    grossTotal += lineHT;
    taxTotal += lineHT * (tr / 100);
  });
  const netTotal = grossTotal + taxTotal;

  const addProductToReturn = (prd: Product, inv: Inventory) => {
    const colisage = prd.piecesPerCarton || 1;
    append({
      productId: prd.id,
      designation: prd.designation,
      warehouseId: inv.warehouseId,
      batchId: inv.batchId,
      batchNumber: inv.batch.batchNumber,
      colisage: colisage,
      cartons: 1,
      quantity: colisage,
      unitPrice: prd.salePrice || 0,
      taxRate: prd.tvaRate ?? 0
    });
  };

  const onSubmit = async (data: FormValues) => {
    if (!data.customerId) return toast.error("Veuillez sélectionner un client.");
    if (data.lines.length === 0) return toast.error("Ajoutez au moins un article à retourner.");

    const t = toast.loading("Enregistrement de l'avoir client...");

    const res = await createSaleReturn({
      reference: data.reference,
      date: new Date(data.date),
      customerId: data.customerId,
      grossTotal,
      taxTotal,
      netTotal,
      lines: data.lines.map(l => ({
        productId: l.productId,
        warehouseId: l.warehouseId,
        batchId: l.batchId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRate: l.taxRate
      }))
    });

    if (res.success) {
      toast.success("Avoir Client enregistré !", { id: t });
      setSavedDoc(res.data);
      setTimeout(() => router.push("/ventes/avoirs"), 1500);
    } else {
      toast.error(res.error, { id: t });
    }
  };

  const filteredProducts = (products || []).filter(p => 
    p.designation.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-100/50 dark:bg-slate-900 shadow-inner">
      {/* HEADER */}
      <div className="flex-none p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-5">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
             <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-orange-600 uppercase tracking-tight">Nouvel Avoir Client</h1>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Réintégration en stock et crédit client</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
             <span className="text-[10px] font-bold text-slate-400 px-1 uppercase leading-none">Référence</span>
             <Input placeholder="Auto-générée" {...register("reference")} className="w-32 h-9 font-mono uppercase bg-slate-50 border-slate-200 focus:ring-orange-500" />
          </div>
          <div className="flex flex-col gap-1">
             <span className="text-[10px] font-bold text-slate-400 px-1 uppercase leading-none">Date</span>
             <Input type="date" {...register("date")} className="w-40 h-9 border-slate-200" />
          </div>

          <div className="flex flex-col gap-1">
             <span className="text-[10px] font-bold text-slate-400 px-1 uppercase leading-none">Client</span>
             <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md p-1 pr-2">
                <User className="h-4 w-4 ml-2 text-slate-400" />
                <select {...register("customerId")} className="h-7 bg-transparent text-sm font-semibold outline-none w-[180px]">
                  <option value="">Sélectionner...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
             </div>
          </div>

          <div className="flex items-center gap-2 pt-4">
             <Button onClick={handleSubmit(onSubmit)} className="h-9 bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-600/20 gap-2 border-none">
                <Save className="h-4 w-4" /> Enregistrer l'Avoir
             </Button>

             <Button variant="outline" className="h-9 gap-2 border-slate-200" disabled={!savedDoc} onClick={() => generateProformaPDF(savedDoc, 'open')}>
                <Printer className="h-4 w-4" /> Imprimer
             </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* PANEL CATALOGUE */}
        <div className="w-[380px] flex-none border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-950">
          <div className="p-4 bg-slate-50/80 dark:bg-slate-900/50 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Rechercher un article..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10 border-slate-200 bg-white shadow-inner rounded-xl" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredProducts.map(prd => {
              const totalStock = prd.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
              const isOpen = openItems[prd.id];

              return (
                <Collapsible key={prd.id} open={!!isOpen} onOpenChange={(val) => setOpenItems(prev => ({ ...prev, [prd.id]: val }))}>
                  <CollapsibleTrigger className="w-full">
                    <div className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50/50 transition-all border border-transparent hover:border-orange-100 group">
                      <div className="flex flex-col items-start min-w-0">
                        <span className="font-extrabold text-sm text-slate-800 whitespace-normal leading-tight group-hover:text-orange-600">{prd.designation}</span>
                        <span className="text-[10px] text-slate-400 font-mono italic uppercase tracking-tighter">{prd.reference}</span>
                      </div>
                      <div className="flex flex-col items-end whitespace-nowrap ml-4">
                        <span className="text-xs font-black text-slate-700">
                           {totalStock.toLocaleString()} en stock
                        </span>
                        <div className="flex items-center text-[9px] text-orange-500 mt-1 uppercase font-black tracking-widest">
                          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-1 pb-1">
                    <div className="bg-slate-100/50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 mt-1 shadow-inner">
                      {prd.inventories.filter(inv => inv.quantity > 0).map((inv, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-white transition-colors">
                          <div className="flex flex-col text-left items-start">
                            <span className="text-[10px] font-black text-slate-500 uppercase leading-none mb-1 text-left">Dépôt: {inv.warehouse.name}</span>
                            <span className="text-xs font-black font-mono text-orange-600">Lot: {inv.batch.batchNumber}</span>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className="text-xs font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{inv.quantity} <span className="text-[8px] font-normal uppercase">{prd.unit}</span></span>
                             <Button size="sm" onClick={() => addProductToReturn(prd, inv)} className="h-7 text-[10px] px-3 bg-orange-100 text-orange-700 hover:bg-orange-600 hover:text-white rounded-lg transition-all border-none shadow-sm">
                               <Plus className="h-3 w-3 mr-1" /> Choisir
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

        {/* ZONE D'ÉDITION */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-auto p-4 md:p-8">
             <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                      <TableRow>
                        <TableHead className="w-[45%] font-black text-xs uppercase text-slate-500 p-4">Articles Retournés</TableHead>
                        <TableHead className="w-[15%] text-center font-black text-xs uppercase text-slate-500">Qté Retournée</TableHead>
                        <TableHead className="w-[15%] text-right font-black text-xs uppercase text-slate-500">P.U HT</TableHead>
                        <TableHead className="w-[10%] text-center font-black text-xs uppercase text-slate-500">TVA</TableHead>
                        <TableHead className="w-[15%] text-right font-black text-xs uppercase text-slate-500">Total HT</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-40 text-center text-slate-400 p-8">
                             <PackageCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                             <p className="text-sm font-bold uppercase tracking-widest">Le bon est vide</p>
                             <p className="text-[10px] font-medium mt-1">Sélectionnez les articles à gauche</p>
                          </TableCell>
                        </TableRow>
                      ) : fields.map((field, index) => {
                        const line = watchLines[index];
                        return (
                          <TableRow key={field.id} className="border-slate-100 hover:bg-orange-50/10 transition-colors">
                            <TableCell className="p-4">
                                <div className="font-black text-slate-900 text-sm whitespace-normal leading-tight uppercase tracking-tight">{line.designation}</div>
                               <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-[9px] font-black border-orange-200 text-orange-600 bg-orange-50 uppercase tracking-widest">LOT: {line.batchNumber}</Badge>
                               </div>
                            </TableCell>
                            <TableCell className="p-4">
                               <Input 
                                  type="number" 
                                  min="1" 
                                  {...register(`lines.${index}.quantity`, { valueAsNumber: true })} 
                                  className="h-10 text-center font-black border-orange-200 focus:border-orange-500 text-orange-700 bg-orange-50/30 rounded-xl"
                               />
                            </TableCell>
                            <TableCell className="p-4">
                               <Input 
                                  type="number" 
                                  step="0.01" 
                                  {...register(`lines.${index}.unitPrice`, { valueAsNumber: true })} 
                                  className="h-10 text-right font-bold border-slate-200 rounded-xl"
                               />
                            </TableCell>
                            <TableCell className="p-4 text-center">
                               <span className="text-[10px] font-bold text-slate-400 italic">+{line.taxRate}%</span>
                            </TableCell>
                            <TableCell className="p-4 text-right">
                               <div className="font-mono font-black text-slate-900 text-base">
                                 {((line.quantity || 0) * (line.unitPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                               </div>
                            </TableCell>
                            <TableCell className="p-4 text-right">
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8 text-red-200 hover:text-red-600 rounded-full">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
             </div>
          </div>

          {/* RÉSUMÉ */}
          <div className="flex-none bg-slate-900 p-6 flex flex-col md:flex-row justify-between items-end gap-6 shadow-2xl">
             <div className="flex items-center gap-5 text-white">
                <div className="w-16 h-16 rounded-3xl bg-orange-600 flex items-center justify-center text-white shadow-lg">
                   <Undo2 className="h-8 w-8 stroke-[2.5]" />
                </div>
                <div className="flex flex-col">
                   <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Résumé Avoir</span>
                   <span className="text-2xl font-black italic">{fields.length} <span className="text-xs font-bold text-slate-500 not-italic uppercase tracking-widest ml-1">Lignes</span></span>
                </div>
             </div>

             <div className="flex flex-col md:flex-row gap-8 items-end">
                <div className="flex items-center gap-8 font-mono text-white">
                   <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Base HT</span>
                      <span className="text-lg font-black text-slate-400">{grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                   </div>
                   <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">TVA Totale</span>
                      <span className="text-lg font-black text-slate-500">+{taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                   </div>
                </div>

                 <div className="bg-orange-600 text-white p-3 px-6 rounded-2xl flex flex-col items-end shadow-xl border-t-2 border-white/10">
                   <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-1">Total Crédit Client</span>
                   <div className="text-4xl font-black tracking-tighter">
                      {netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm font-bold opacity-60">DA</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
