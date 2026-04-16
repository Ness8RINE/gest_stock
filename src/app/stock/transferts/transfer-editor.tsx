"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Trash2, Save, Search, ChevronDown, ChevronRight, Plus, Truck, ArrowRight, Box
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { createTransfer } from "@/app/actions/stock.actions";
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
  unit: string;
  inventories: Inventory[];
};

type Warehouse = {
  id: string;
  name: string;
};

type TransferEditorProps = {
  warehouses: Warehouse[];
  products: Product[];
};

type FormValues = {
  reference: string;
  date: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  lines: {
    productId: string;
    designation: string;
    batchId: string;
    batchNumber: string;
    quantity: number;
    maxQuantity: number;
  }[];
};

export default function TransferEditor({ warehouses, products }: TransferEditorProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const { register, control, watch, handleSubmit, setValue } = useForm<FormValues>({
    defaultValues: {
      reference: "",
      date: new Date().toISOString().split("T")[0],
      fromWarehouseId: "",
      toWarehouseId: "",
      lines: []
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  
  const fromWarehouseId = watch("fromWarehouseId");
  const toWarehouseId = watch("toWarehouseId");
  const watchLines = watch("lines");

  const addProductToTransfer = (prd: Product, inv: Inventory) => {
    // Vérifier si déjà ajouté
    if (watchLines.some(l => l.productId === prd.id && l.batchId === inv.batchId)) {
      return toast.info("Ce lot est déjà dans la liste.");
    }

    append({
      productId: prd.id,
      designation: prd.designation,
      batchId: inv.batchId,
      batchNumber: inv.batch.batchNumber,
      quantity: 1,
      maxQuantity: inv.quantity
    });
  };

  const onSubmit = async (data: FormValues) => {
    if (!data.fromWarehouseId || !data.toWarehouseId) return toast.error("Veuillez sélectionner les dépôts source et cible.");
    if (data.fromWarehouseId === data.toWarehouseId) return toast.error("Le dépôt destination doit être différent du dépôt source.");
    if (data.lines.length === 0) return toast.error("Ajoutez au moins un article à transférer.");

    const t = toast.loading("Exécution du transfert...");

    const res = await createTransfer({
      reference: data.reference,
      date: new Date(data.date),
      fromWarehouseId: data.fromWarehouseId,
      toWarehouseId: data.toWarehouseId,
      lines: data.lines.map(l => ({
        productId: l.productId,
        batchId: l.batchId,
        batchNumber: l.batchNumber,
        quantity: l.quantity
      }))
    });

    if (res.success) {
      toast.success("Transfert validé !", { id: t });
      router.push("/stock/transferts");
    } else {
      toast.error(res.error, { id: t });
    }
  };

  // Filtrer les produits qui ont du stock dans le dépôt source
  const productsWithStockInSource = useMemo(() => {
    if (!fromWarehouseId) return [];
    return products.filter(p => 
      p.inventories.some(inv => inv.warehouseId === fromWarehouseId && inv.quantity > 0) &&
      (p.designation.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p.reference.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [fromWarehouseId, products, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900 shadow-inner">
      {/* HEADER ÉTENDU */}
      <div className="p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-5">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
             <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-blue-600 uppercase tracking-tight italic flex items-center gap-2">
              <Truck className="h-5 w-5" /> Bon de Transfert
            </h1>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Mouvement Logistique Inter-Dépôts</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
           <div className="flex bg-slate-100 dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 gap-4">
              <div className="flex flex-col gap-1">
                 <span className="text-[9px] font-black text-slate-400 uppercase px-1">Source</span>
                 <select {...register("fromWarehouseId")} className="h-8 bg-white border-slate-200 rounded-lg text-xs font-bold px-3 outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]">
                    <option value="">Sélectionner source...</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                 </select>
              </div>
              <div className="flex items-center pt-4">
                 <ArrowRight className="h-4 w-4 text-blue-500 animate-pulse" />
              </div>
              <div className="flex flex-col gap-1">
                 <span className="text-[9px] font-black text-slate-400 uppercase px-1 text-right">Destination</span>
                 <select {...register("toWarehouseId")} className="h-8 bg-blue-600 text-white rounded-lg text-xs font-bold px-3 outline-none focus:ring-2 focus:ring-blue-300 min-w-[150px] border-none">
                    <option value="">Sélectionner cible...</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id} className="text-slate-900 bg-white">{w.name}</option>
                    ))}
                 </select>
              </div>
           </div>

           <div className="h-10 w-[1px] bg-slate-200 mx-2 hidden md:block"></div>

           <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-400 uppercase px-1">Référence</span>
              <Input placeholder="Auto" {...register("reference")} className="w-28 h-9 font-mono uppercase bg-slate-50 border-slate-200 text-xs font-bold" />
           </div>

           <Button onClick={handleSubmit(onSubmit)} className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 rounded-xl shadow-lg shadow-blue-600/20 gap-2">
              <Save size={18} /> Valider le Transfert
           </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* PANEL ÉDITION (GAUCHE) */}
        <div className="flex-1 flex flex-col p-6 overflow-auto">
           <div className="max-w-4xl mx-auto w-full space-y-6">
              <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                    <TableRow>
                      <TableHead className="w-[60%] font-black text-[10px] uppercase text-slate-500 p-4">Articles à transférer</TableHead>
                      <TableHead className="w-[30%] text-center font-black text-[10px] uppercase text-slate-500">Quantité</TableHead>
                      <TableHead className="w-[10%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-60 text-center text-slate-400 whitespace-pre-wrap">
                           <Truck className="h-16 w-16 mx-auto mb-4 opacity-10" />
                           <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">Aucun article sélectionné</p>
                           {!fromWarehouseId && <p className="text-[10px] mt-2 font-bold text-blue-500">Choisissez d'abord un dépôt source à droite</p>}
                        </TableCell>
                      </TableRow>
                    ) : fields.map((field, index) => {
                      const line = watchLines[index];
                      return (
                        <TableRow key={field.id} className="border-slate-100 hover:bg-blue-50/10 transition-colors">
                          <TableCell className="p-4">
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-400">
                                   <Box size={16} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                   <span className="font-bold text-slate-900 dark:text-white text-sm truncate uppercase tracking-tight">{line.designation}</span>
                                   <span className="text-[10px] font-mono font-bold text-blue-600 mt-0.5">LOT: {line.batchNumber}</span>
                                </div>
                             </div>
                          </TableCell>
                          <TableCell className="p-4">
                             <div className="flex flex-col items-center gap-1">
                                <Input 
                                   type="number" 
                                   min="1" 
                                   max={line.maxQuantity}
                                   {...register(`lines.${index}.quantity`, { valueAsNumber: true })} 
                                   className="h-10 text-center font-black border-blue-100 focus:border-blue-500 text-blue-700 bg-blue-50/30 rounded-xl"
                                />
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Disponible: {line.maxQuantity}</span>
                             </div>
                          </TableCell>
                          <TableCell className="p-4 text-right">
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8 text-red-200 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
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

        {/* PANEL CATALOGUE (DROITE) */}
        <div className="w-[380px] flex-none border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col shadow-2xl">
           <div className="p-5 border-b border-slate-100 dark:border-slate-900">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <Search size={18} />
                 </div>
                 <span className="font-black text-xs uppercase text-slate-800 dark:text-slate-200 tracking-widest">Choisir les produits</span>
              </div>
              <Input 
                placeholder="Chercher dans le dépôt source..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="h-10 rounded-2xl bg-slate-50 border-slate-200 shadow-inner"
              />
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!fromWarehouseId ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 px-8">
                   <Box size={40} className="mb-4 text-slate-300" />
                   <p className="text-xs font-bold uppercase tracking-widest">Sélectionnez d'abord un dépôt source pour voir le stock disponible</p>
                </div>
              ) : productsWithStockInSource.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs italic">Aucun produit trouvé dans ce dépôt</div>
              ) : productsWithStockInSource.map(prd => {
                 const sourceInv = prd.inventories.find(inv => inv.warehouseId === fromWarehouseId);
                 if (!sourceInv) return null;
                 const isOpen = openItems[prd.id];

                 return (
                   <div key={prd.id} className="bg-slate-50/50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 hover:border-blue-200 transition-all group">
                      <div className="flex justify-between items-start mb-2">
                         <div className="flex flex-col min-w-0 pr-2">
                            <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600">{prd.designation}</span>
                            <span className="text-[9px] text-slate-400 font-mono italic">{prd.reference}</span>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-900 dark:text-white px-2 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                               {sourceInv.quantity} {prd.unit}
                            </span>
                         </div>
                      </div>

                      <div className="flex flex-col gap-1.5 mt-2">
                         {prd.inventories.filter(inv => inv.warehouseId === fromWarehouseId).map((inv, idx) => (
                           <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-800/50 p-2 rounded-xl text-[10px] border border-slate-100 dark:border-slate-800">
                              <span className="font-mono font-bold text-blue-600">LOT: {inv.batch.batchNumber}</span>
                              <Button size="sm" onClick={() => addProductToTransfer(prd, inv)} className="h-6 px-2 text-[9px] bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border-none rounded-lg">
                                Incrémenter
                              </Button>
                           </div>
                         ))}
                      </div>
                   </div>
                 );
              })}
           </div>
        </div>
      </div>
    </div>
  );
}
