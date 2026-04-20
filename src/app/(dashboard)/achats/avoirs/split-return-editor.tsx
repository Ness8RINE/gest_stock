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
import { createPurchaseReturn } from "@/actions/avoirs-achats.actions";
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
  purchasePrice: number;
  tvaRate?: number;
  unit: string;
  piecesPerCarton: number | null;
  boxesPerCarton: number | null;
  inventories: Inventory[];
};

type Supplier = {
  id: string;
  name: string;
};

type SplitReturnEditorProps = {
  suppliers: Supplier[];
  products: Product[];
};

type FormValues = {
  reference: string;
  date: string;
  supplierId: string;
  lines: {
    productId: string;
    designation: string;
    warehouseId: string;
    batchId: string;
    batchNumber: string;
    colisage: number;
    cartons: number;
    quantity: number;
    unitCost: number;
    taxRate: number;
  }[];
};

export default function SplitReturnEditor({ suppliers, products }: SplitReturnEditorProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [savedDoc, setSavedDoc] = useState<any>(null);

  const { register, control, watch, handleSubmit, setValue } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      reference: "",
      date: new Date().toISOString().split("T")[0],
      supplierId: "",
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
    const uc = Number(line.unitCost) || 0;
    const tr = Number(line.taxRate) || 0;
    const lineHT = qty * uc;
    grossTotal += lineHT;
    taxTotal += lineHT * (tr / 100);
  });
  const netTotal = grossTotal + taxTotal;

  const addProductToReturn = (prd: Product, inv: Inventory) => {
    // Éviter d'ajouter deux fois le même lot/dépôt
    const existing = watchLines.find(l => l.productId === prd.id && l.batchId === inv.batchId && l.warehouseId === inv.warehouseId);
    if (existing) {
        toast.info("Ce lot a déjà été ajouté.");
        return;
    }

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
      unitCost: prd.purchasePrice || 0,
      taxRate: prd.tvaRate ?? 0
    });
  };

  const onSubmit = async (data: FormValues) => {
    if (!data.supplierId) return toast.error("Veuillez sélectionner un fournisseur.");
    if (data.lines.length === 0) return toast.error("Ajoutez au moins un article à retourner.");

    const t = toast.loading("Finalisation du bon d'avoir...");

    const res = await createPurchaseReturn({
      reference: data.reference,
      date: new Date(data.date),
      supplierId: data.supplierId,
      grossTotal,
      taxTotal,
      netTotal,
      lines: data.lines.map(l => ({
        productId: l.productId,
        warehouseId: l.warehouseId,
        batchId: l.batchId,
        quantity: l.quantity,
        unitCost: l.unitCost,
        taxRate: l.taxRate
      }))
    });

    if (res.success) {
      toast.success("Bon d'avoir enregistré !", { id: t });
      setSavedDoc(res.data);
      setTimeout(() => router.push("/achats/avoirs"), 1500);
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
      {/* HEADER ÉTENDU */}
      <div className="flex-none p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-5">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-slate-100">
             <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-orange-600 uppercase tracking-tight">Création Avoir Fournisseur</h1>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Opération de sortie de stock</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
             <span className="text-[10px] font-bold text-slate-400 px-1 uppercase leading-none">Référence</span>
             <Input placeholder="Auto-générée" {...register("reference")} className="w-32 h-9 font-mono uppercase bg-slate-50 border-slate-200 focus:ring-orange-500" />
          </div>
          <div className="flex flex-col gap-1">
             <span className="text-[10px] font-bold text-slate-400 px-1 uppercase leading-none">Date Opération</span>
             <Input type="date" {...register("date")} className="w-40 h-9 border-slate-200" />
          </div>

          <div className="flex flex-col gap-1">
             <span className="text-[10px] font-bold text-slate-400 px-1 uppercase leading-none">Source</span>
             <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md p-1 pr-2">
                <User className="h-4 w-4 ml-2 text-slate-400" />
                <select {...register("supplierId")} className="h-7 bg-transparent text-sm font-semibold outline-none w-[180px]">
                  <option value="">Sélectionner...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
             </div>
          </div>

          <div className="flex items-center gap-2 pt-4">
             <Button onClick={handleSubmit(onSubmit)} className="h-9 bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-600/20 gap-2 border-none">
                <Save className="h-4 w-4" /> Valider l'Avoir
             </Button>

             <Button variant="outline" className="h-9 gap-2 border-slate-200" disabled={!savedDoc} onClick={() => generateProformaPDF(savedDoc, 'open')}>
                <Printer className="h-4 w-4" /> Imprimer PDF
             </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* PANEL CATALOGUE (STOCKS DISPONIBLES) */}
        <div className="w-[380px] flex-none border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-950">
          <div className="p-4 bg-slate-50/80 dark:bg-slate-900/50 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Rechercher un article en stock..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10 border-slate-200 bg-white shadow-inner rounded-xl" />
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
                          {totalStock.toLocaleString()} {prd.unit}
                        </span>
                        <div className="flex items-center text-[9px] text-orange-500 mt-1 uppercase font-black tracking-widest">
                          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-1 pb-1">
                    <div className="bg-slate-100/50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 mt-1 shadow-inner">
                      {prd.inventories.length === 0 && (
                        <div className="p-4 text-[11px] text-center text-slate-400 font-bold uppercase italic tracking-widest opacity-50">Aucun lot disponible</div>
                      )}
                      {prd.inventories.filter(inv => inv.quantity > 0).map((inv, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-white transition-colors">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-500 uppercase leading-none mb-1">Lot</span>
                            <span className="text-xs font-black font-mono text-orange-600">{inv.batch.batchNumber}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col text-right">
                               <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">{inv.warehouse.name}</span>
                               <span className="text-xs font-bold text-slate-700">{inv.quantity} <span className="text-[9px] font-normal">{prd.unit}</span></span>
                            </div>
                            <Button size="sm" onClick={() => addProductToReturn(prd, inv)} className="h-8 w-8 rounded-full bg-orange-600 text-white hover:bg-orange-700 p-0 shadow-md">
                              <Plus className="h-4 w-4" />
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

        {/* PANEL ÉDITION (LIGNES DE L'AVOIR) */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 relative overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
             <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl shadow-slate-100 flex flex-col">
                <Table>
                  <TableHeader className="bg-slate-900 text-white border-none">
                    <TableRow className="hover:bg-slate-900 border-none">
                      <TableHead className="w-[35%] py-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Article / Lot</TableHead>
                      <TableHead className="w-[12%] text-center font-black uppercase text-[10px] tracking-widest text-slate-400">Quantité</TableHead>
                      <TableHead className="w-[18%] text-right font-black uppercase text-[10px] tracking-widest text-slate-400">P.U Achat HT</TableHead>
                      <TableHead className="w-[10%] text-center font-black uppercase text-[10px] tracking-widest text-slate-400">TVA</TableHead>
                      <TableHead className="w-[20%] text-right font-black uppercase text-[10px] tracking-widest text-slate-400">Total HT</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-96 text-center text-slate-300">
                          <div className="flex flex-col items-center justify-center gap-4 opacity-50 scale-110">
                             <PackageCheck className="h-16 w-16 stroke-[1.5]" /> 
                             <p className="font-black uppercase text-xs tracking-[0.2em]">Votre document est vide</p>
                             <p className="text-[10px] font-bold">Sélectionnez des articles à gauche</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : fields.map((field, index) => {
                      const line = watchLines[index];
                      // Trouver le stock max pour la validation
                      const prd = products.find(p => p.id === line.productId);
                      const inv = prd?.inventories.find(i => i.batchId === line.batchId && i.warehouseId === line.warehouseId);
                      const maxQty = inv?.quantity || 0;

                      return (
                        <TableRow key={field.id} className="border-slate-100 hover:bg-orange-50/20 transition-colors">
                          <TableCell className="p-4">
                             <div className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">{line.designation}</div>
                             <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-[9px] font-black border-orange-200 text-orange-600 bg-orange-50 uppercase tracking-widest">LOT: {line.batchNumber}</Badge>
                             </div>
                          </TableCell>
                          <TableCell className="p-4">
                             <div className="flex flex-col gap-1 items-center">
                                <Input 
                                   type="number" 
                                   min="0.01" 
                                   max={maxQty} 
                                   {...register(`lines.${index}.quantity`, { valueAsNumber: true })} 
                                   className="h-10 text-center font-black border-orange-200 focus:border-orange-500 text-orange-700 bg-orange-50/30 rounded-xl"
                                />
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Max: {maxQty}</span>
                             </div>
                          </TableCell>
                          <TableCell className="p-4">
                             <Input 
                                type="number" 
                                step="0.01" 
                                {...register(`lines.${index}.unitCost`, { valueAsNumber: true })} 
                                className="h-10 text-right font-bold border-slate-200 focus:ring-0 focus:border-orange-300 transition-all rounded-xl"
                             />
                          </TableCell>
                          <TableCell className="p-4 text-center">
                             <span className="text-[10px] font-bold text-slate-400 italic">+{line.taxRate}%</span>
                          </TableCell>
                          <TableCell className="p-4 text-right">
                             <div className="font-mono font-black text-slate-900 text-base">
                               {((line.quantity || 0) * (line.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                             </div>
                          </TableCell>
                          <TableCell className="p-4 text-right">
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8 text-red-200 hover:text-red-600 hover:bg-red-50 rounded-full transition-all">
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

          {/* TOTALS FOOTER (TYPE POS) */}
          <div className="flex-none bg-slate-50 dark:bg-slate-900/50 p-6 flex flex-col md:flex-row justify-between items-end gap-6 border-t border-slate-200 dark:border-slate-800">
             <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-3xl bg-orange-600/10 flex items-center justify-center text-orange-600 border border-orange-600/20 shadow-inner">
                   <Undo2 className="h-8 w-8 stroke-[2.5]" />
                </div>
                <div className="flex flex-col">
                   <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Résumé du Document</span>
                   <span className="text-2xl font-black italic text-slate-800">{fields.length} <span className="text-xs font-bold text-slate-500 not-italic uppercase tracking-widest ml-1">Références articles</span></span>
                </div>
             </div>

             <div className="flex flex-col md:flex-row gap-8 items-end">
                <div className="flex items-center gap-8 font-mono">
                   <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Base HT</span>
                      <span className="text-lg font-black text-slate-600">{grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                   </div>
                   <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">TVA Totale</span>
                      <span className="text-lg font-black text-slate-400">+{taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                   </div>
                </div>

                <div className="bg-slate-900 text-white p-4 px-10 rounded-3xl flex flex-col items-end shadow-2xl shadow-orange-900/10 border-t-4 border-orange-600 scale-110 -translate-y-2">
                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500/80 mb-1">Montant à déduire TTC</span>
                   <div className="text-4xl font-black tracking-tighter">
                      {netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm font-bold text-slate-500">DA</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
