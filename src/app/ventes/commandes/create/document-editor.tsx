"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FileText,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Printer,
  User,
  Box,
  Percent,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createSaleDocument } from "@/app/actions/ventes.actions";

type Product = {
  id: string;
  designation: string;
  reference: string;
  salePrice: number;
  tvaRate: number;
  unit: string;
};

type Customer = {
  id: string;
  name: string;
  rc?: string;
  mf?: string;
  nis?: string;
  ai?: string;
};

type FormValues = {
  type: "PROFORMA" | "BL" | "BV" | "INVOICE";
  customerId: string;
  globalDiscountPct: number;
  lines: {
    productId: string;
    quantity: number;
    unitPrice: number; // Prix de vente
    discount: number; // Remise Ligne %
    taxRate: number;
  }[];
};

export default function DocumentEditor({ clients, products }: { clients: Customer[], products: Product[] }) {
  const router = useRouter();

  const { register, control, watch, handleSubmit, setValue } = useForm<FormValues>({
    defaultValues: {
      type: "PROFORMA",
      customerId: "",
      globalDiscountPct: 0,
      lines: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines"
  });

  const watchLines = watch("lines");
  const watchDiscountPct = watch("globalDiscountPct") || 0;
  const watchCustomerId = watch("customerId");
  const watchType = watch("type");

  // Calculations
  const { grossTotal, taxTotal } = useMemo(() => {
    let grossValue = 0;
    let taxValue = 0;

    watchLines.forEach((line) => {
      const q = line.quantity || 0;
      const p = line.unitPrice || 0;
      const d = line.discount || 0;
      const t = line.taxRate || 0;

      const lineGross = q * p;
      const lineNetOfRabais = lineGross * (1 - d / 100);
      const lineTax = lineNetOfRabais * (t / 100);

      grossValue += lineNetOfRabais;
      taxValue += lineTax;
    });

    return { grossTotal: grossValue, taxTotal: taxValue };
  }, [watchLines]);

  const discountValue = grossTotal * (watchDiscountPct / 100);
  const netTotal = (grossTotal - discountValue) + taxTotal;

  const handleProductSelect = (index: number, productId: string) => {
    const prd = products.find(p => p.id === productId);
    if (prd) {
      setValue(`lines.${index}.unitPrice`, prd.salePrice || 0);
      setValue(`lines.${index}.taxRate`, prd.tvaRate || 19);
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!data.customerId && data.type !== "BV") {
      return toast.error("Veuillez sélectionner un client.");
    }
    if (data.lines.length === 0) {
      return toast.error("Le document est vide.");
    }

    const t = toast.loading("Enregistrement du document...");
    const payload = {
      type: data.type,
      customerId: data.customerId,
      grossTotal,
      discountTotal: discountValue,
      taxTotal,
      netTotal,
      lines: data.lines
    };

    const res = await createSaleDocument(payload);
    if (res.success) {
      toast.success("Document enregistré avec succès !", { id: t });
      router.push("/ventes/commandes");
    } else {
      toast.error(res.error, { id: t });
    }
  };

  // Mocks pour imprimer plus tard
  const handlePrint = () => {
    toast.info("L'impression sera intégrée prochainement (Phase 2B).");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 w-full animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="flex-none p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 text-slate-500">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Éditeur de Document</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ventes et Facturation</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimer
            </Button>
            <Button onClick={handleSubmit(onSubmit)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md gap-2">
              <Save className="h-4 w-4" /> Sauvegarder
            </Button>
          </div>
        </div>

        {/* Global info row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
              <FileText className="h-3 w-3" /> Nature du Document
            </label>
            <select
              {...register("type")}
              className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 font-semibold text-slate-900 dark:text-white"
            >
              <option value="PROFORMA">Facture Proforma (Devis)</option>
              <option value="BL">Bon de Livraison (Soustrait le stock)</option>
              <option value="BV">Bon de Vente Caisse (Soustrait le stock)</option>
            </select>
            {watchType !== "PROFORMA" && (
               <p className="text-[10px] text-amber-600 font-medium">⚠️ Ce document affectera immédiatement votre stock physique.</p>
            )}
          </div>

          <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
              <User className="h-3 w-3" /> Client
            </label>
            <select
              {...register("customerId")}
              className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Sélectionnez un client...</option>
              <option value="COMPTANT" className="font-semibold text-blue-600">Client Passager (Comptant)</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* BODY - Table */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex-none p-4 flex justify-between items-center bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Box className="h-4 w-4 text-indigo-500" /> Articles
          </h2>
          <Button size="sm" type="button" onClick={() => append({ productId: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 19 })} className="h-8 gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400">
            <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden min-w-[800px]">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="w-[30%]">Produit</TableHead>
                  <TableHead className="w-[10%]">Qté</TableHead>
                  <TableHead className="w-[15%]">P.Unitaire <span className="text-[10px] ml-1">DA</span></TableHead>
                  <TableHead className="w-[10%]">Remise %</TableHead>
                  <TableHead className="w-[10%]">TVA %</TableHead>
                  <TableHead className="text-right w-[20%]">Total Ligne <span className="text-[10px] ml-1">DA</span></TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={7} className="h-32 text-center text-slate-500 italic">
                        Le document est vide. Cliquez sur "Ajouter une ligne".
                     </TableCell>
                   </TableRow>
                ) : fields.map((field, index) => {
                  const line = watchLines[index];
                  const q = line?.quantity || 0;
                  const p = line?.unitPrice || 0;
                  const d = line?.discount || 0;
                  
                  const lineTotalDzd = (q * p) * (1 - d/100);

                  return (
                    <TableRow key={field.id} className="group">
                      <TableCell className="p-2">
                        <select
                          {...register(`lines.${index}.productId`)}
                          onChange={(e) => {
                            register(`lines.${index}.productId`).onChange(e);
                            handleProductSelect(index, e.target.value);
                          }}
                          className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                          <option value="">Choisir...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.reference} - {p.designation}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          type="number" min="1"
                          {...register(`lines.${index}.quantity`, { valueAsNumber: true })}
                          className="h-9 text-center bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          type="number" step="0.01"
                          {...register(`lines.${index}.unitPrice`, { valueAsNumber: true })}
                          className="h-9 font-mono text-right bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        />
                      </TableCell>
                      <TableCell className="p-2">
                         <div className="relative">
                            <Input 
                              type="number" min="0" max="100"
                              {...register(`lines.${index}.discount`, { valueAsNumber: true })}
                              className="h-9 pl-6 text-center bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            />
                            <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                         </div>
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          type="number"
                          {...register(`lines.${index}.taxRate`, { valueAsNumber: true })}
                          className="h-9 text-center bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        />
                      </TableCell>
                      <TableCell className="text-right p-2 pr-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {lineTotalDzd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        </div>

        {/* FOOTER TOTALS */}
        <div className="flex-none bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col lg:flex-row justify-end gap-6 lg:gap-12 text-sm">
            <div className="w-[300px] flex justify-between items-center">
              <span className="text-slate-500 font-medium">Total HT :</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} DA
              </span>
            </div>
            <div className="w-[300px] flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <span className="text-slate-500 font-medium">Remise Globale :</span>
                 <Input 
                   type="number" 
                   {...register("globalDiscountPct", { valueAsNumber: true })}
                   className="h-7 w-16 text-center text-xs ml-2" 
                   placeholder="%"
                 />
              </div>
              <span className="font-mono text-red-500">
                 - {discountValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} DA
              </span>
            </div>
            <div className="w-[300px] flex justify-between items-center border-l border-slate-200 dark:border-slate-800 pl-6">
              <span className="text-slate-500 font-medium">TVA Totale :</span>
              <span className="font-mono font-semibold text-slate-600 dark:text-slate-400">
                + {taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} DA
              </span>
            </div>
          </div>
          
          <div className="flex justify-end mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-[400px] flex justify-between items-center text-xl">
              <span className="font-bold text-slate-800 dark:text-slate-200">TOTAL NET (TTC) :</span>
              <span className="font-mono font-black text-indigo-700 dark:text-indigo-400 text-2xl">
                {netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-lg font-normal text-slate-500">DA</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
