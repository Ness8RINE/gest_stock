"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Calculator,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Globe2,
  PackageCheck,
  TrendingDown,
  Percent
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FormValues = {
  reference: string;
  supplierId: string;
  currency: string;
  exchangeRate: number; // Cours D10
  
  // Frais Annexes Globales (Charges)
  douane: number;
  transit: number;
  logistique: number;
  fraisSup: number;

  items: {
    designation: string;
    quantity: number;
    unitPriceCur: number;
    marginPct: number; // Marge Souhaitée (%)
  }[];
};

export default function CreateReceptionPage() {
  const router = useRouter();

  const { control, register, watch, handleSubmit, setValue } = useForm<FormValues>({
    defaultValues: {
      reference: "",
      supplierId: "",
      currency: "USD",
      exchangeRate: 130.6008,
      douane: 0,
      transit: 0,
      logistique: 0,
      fraisSup: 0,
      items: [
        { designation: "", quantity: 1, unitPriceCur: 0, marginPct: 20 }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  // Watch values for real-time calculation
  const watchItems = watch("items");
  const watchExchangeRate = watch("exchangeRate") || 0;
  const watchDouane = watch("douane") || 0;
  const watchTransit = watch("transit") || 0;
  const watchLogistique = watch("logistique") || 0;
  const watchFraisSup = watch("fraisSup") || 0;
  const watchCurrency = watch("currency");

  // --- LOGIQUE DE CALCUL DU COMPTABLE ---
  
  // 1. Valeur totale de la facture (USD)
  const totalInvoiceCur = useMemo(() => {
    return watchItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.unitPriceCur || 0)), 0);
  }, [watchItems]);

  // 2. Valeur en douane (DA) = Total USD * Cours D10
  const valeurDouaneDzd = totalInvoiceCur * watchExchangeRate;

  // 3. Charges Globales (DA)
  const chargesGlobalesDzd = Number(watchDouane) + Number(watchTransit) + Number(watchLogistique) + Number(watchFraisSup);

  // 4. Coût de Revient Global (DA) = Valeur en Douane + Charges Globales
  const coutRevientGlobalDzd = valeurDouaneDzd + chargesGlobalesDzd;

  // Soumission
  const onSubmit = async (data: FormValues) => {
    if(!data.reference) return toast.error("La référence du dossier est requise");
    if(data.items.length === 0) return toast.error("Ajoutez au moins un produit");
    
    const loadingToast = toast.loading("Enregistrement du dossier d'import...");
    setTimeout(() => {
      toast.success("✅ Dossier de réception calculé et enregistré !", { id: loadingToast });
      router.push("/achats/receptions");
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 w-full animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex-none p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Calculator className="h-5 w-5" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Simulateur Prix de Revient (Méthode Prorata)</h1>
            </div>
          </div>
          <Button onClick={handleSubmit(onSubmit)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
            <Save className="mr-2 h-4 w-4" /> Sauvegarder le Dossier
          </Button>
        </div>
      </div>

      {/* Main Content Split: Left (Paramètres/Frais) - Right (Produits) */}
      <div className="flex-1 overflow-hidden flex flex-col xl:flex-row">
        
        {/* LEFT COLUMN: Paramètres & Frais */}
        <div className="w-full xl:w-[450px] flex-none border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-y-auto">
          
          <div className="p-5 space-y-6">
            {/* Section A: Informations Dossier */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Globe2 className="h-5 w-5 text-indigo-500" />
                <h2 className="font-semibold text-slate-800 dark:text-slate-200">Paramètres du Dossier</h2>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Réf. Dossier / Facture</label>
                  <Input {...register("reference")} placeholder="Ex: INV-25WLQ052" className="bg-slate-50 dark:bg-slate-900" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Devise</label>
                    <select
                      {...register("currency")}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 transition-all text-slate-900 dark:text-slate-100"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="CNY">CNY</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Taux Change (D10)</label>
                    <Input {...register("exchangeRate", { valueAsNumber: true })} type="number" step="0.0001" className="bg-slate-50 dark:bg-slate-900 font-mono text-indigo-600 font-semibold" />
                  </div>
                </div>
              </div>
            </section>

            {/* Section B: Les Frais d'approche */}
            <section className="space-y-4 pt-4">
              <div className="flex items-center gap-2 border-b border-amber-100 dark:border-amber-900 pb-2">
                <TrendingDown className="h-5 w-5 text-amber-500" />
                <h2 className="font-semibold text-slate-800 dark:text-slate-200">Frais d'approche (en DA)</h2>
              </div>

              <div className="space-y-3">
                <div className="flex bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 items-center justify-between">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Valeur en Douane (DA)</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {valeurDouaneDzd.toLocaleString(undefined, { minimumFractionDigits: 2 })} DA
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Droits de Douane & Taxes (TTC)</label>
                  <Input {...register("douane", { valueAsNumber: true })} type="number" step="0.01" className="font-mono text-amber-700 dark:text-amber-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Frais de Transit</label>
                  <Input {...register("transit", { valueAsNumber: true })} type="number" step="0.01" className="font-mono text-amber-700 dark:text-amber-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Logistique (Transport Maritime, etc.)</label>
                  <Input {...register("logistique", { valueAsNumber: true })} type="number" step="0.01" className="font-mono text-amber-700 dark:text-amber-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Frais Supplémentaires (Libre)</label>
                  <Input {...register("fraisSup", { valueAsNumber: true })} type="number" step="0.01" className="font-mono text-amber-700 dark:text-amber-500" />
                </div>
              </div>
            </section>
          </div>

          <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 mt-auto">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-slate-500">Total Charges (G) :</span>
              <span className="font-mono font-semibold text-amber-600 dark:text-amber-500">
                + {chargesGlobalesDzd.toLocaleString(undefined, { minimumFractionDigits: 2 })} DA
              </span>
            </div>
            <div className="flex justify-between items-center text-lg border-t border-slate-200 dark:border-slate-700 pt-3">
              <span className="font-bold text-slate-800 dark:text-slate-200">Coût Revient Global</span>
              <span className="font-mono font-black text-indigo-700 dark:text-indigo-400">
                {coutRevientGlobalDzd.toLocaleString(undefined, { minimumFractionDigits: 2 })} DA
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Table des Produits */}
        <div className="flex-1 overflow-x-auto flex flex-col bg-slate-50/50 dark:bg-slate-900/50 min-w-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950 shrink-0">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-200">Produits & Calcul du PR</h2>
            </div>
            <Button size="sm" type="button" onClick={() => append({ designation: "", quantity: 1, unitPriceCur: 0, marginPct: 20 })} className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-w-[800px]">
              <Table>
                <TableHeader className="bg-slate-100 dark:bg-slate-800/50">
                  <TableRow>
                    <TableHead className="w-[20%]">Désignation</TableHead>
                    <TableHead className="w-[8%]">Qté</TableHead>
                    <TableHead className="w-[12%]">Prix Un. <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded ml-1">{watchCurrency}</span></TableHead>
                    <TableHead className="text-center w-[10%]">% Facture</TableHead>
                    <TableHead className="text-right w-[15%]">PR Ligne <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded ml-1">DA</span></TableHead>
                    <TableHead className="text-right w-[15%] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-bold">Unitaire Estimé (DA)</TableHead>
                    <TableHead className="w-[10%]">Marge %</TableHead>
                    <TableHead className="text-right w-[15%] text-indigo-700 dark:text-indigo-300">Prix Vente Cons.</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const item = watchItems[index];
                    const qty = item?.quantity || 0;
                    const priceCur = item?.unitPriceCur || 0;
                    const margin = item?.marginPct || 0;
                    
                    // Math Logic for this specific index
                    const valLigneCur = qty * priceCur;
                    const pourcentage = totalInvoiceCur > 0 ? (valLigneCur / totalInvoiceCur) : 0;
                    const coutLigneDzd = coutRevientGlobalDzd * pourcentage;
                    const coutUnitaireDzd = qty > 0 ? (coutLigneDzd / qty) : 0;
                    const prixVenteConseille = coutUnitaireDzd * (1 + (margin / 100));

                    return (
                      <TableRow key={field.id} className="group">
                        <TableCell className="p-2">
                          <Input 
                            {...register(`items.${index}.designation`)}
                            placeholder="Produit"
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input 
                            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                            type="number" min="1"
                            className="h-8 text-sm text-center"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input 
                            {...register(`items.${index}.unitPriceCur`, { valueAsNumber: true })}
                            type="number" step="0.01"
                            className="h-8 text-sm font-mono"
                          />
                        </TableCell>
                        <TableCell className="text-center p-2 text-sm text-slate-500 font-medium bg-slate-50 dark:bg-slate-900/50">
                          {(pourcentage * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right p-2 text-sm font-mono text-slate-600 dark:text-slate-300 pr-4">
                          {coutLigneDzd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        
                        <TableCell className="text-right p-2 pr-4 bg-emerald-50/50 dark:bg-emerald-900/10">
                          <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {coutUnitaireDzd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </TableCell>

                        <TableCell className="p-2">
                          <div className="relative">
                            <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                            <Input 
                              type="number" 
                              {...register(`items.${index}.marginPct`, { valueAsNumber: true })}
                              className="h-8 text-sm pl-6"
                            />
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-right p-2 pr-4">
                           <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {prixVenteConseille.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </TableCell>

                        <TableCell className="p-2 text-right">
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 flex gap-4 text-sm text-slate-500 max-w-[800px]">
               <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-lg flex-1">
                 <strong>Total Facture : </strong> {totalInvoiceCur.toLocaleString()} {watchCurrency}
               </div>
               <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg flex-1">
                 <strong>Total des Frais (G) : </strong> {chargesGlobalesDzd.toLocaleString(undefined, { maximumFractionDigits: 2 })} DA
               </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
