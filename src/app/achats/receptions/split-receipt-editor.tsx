"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, Trash2, Save, Search, PackageCheck, BriefcaseBusiness, ChevronRight } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { createReceiptDocument, updateReceiptDocument } from "@/app/actions/receptions.actions";
import { createPurchaseOrder, updatePurchaseOrder } from "@/app/actions/commandes-fournisseurs.actions";
import { getNextReferenceAction } from "@/app/actions/sequences.actions";

type Product = {
  id: string;
  designation: string;
  reference: string;
  purchasePrice: number;
  unit: string;
  piecesPerCarton: number | null;
  boxesPerCarton: number | null;
  tvaRate?: number;
};

type Supplier = {
  id: string;
  name: string;
};

type Warehouse = {
  id: string;
  name: string;
};

type SplitReceiptEditorProps = {
  suppliers: Supplier[];
  products: Product[];
  warehouses: Warehouse[];
  initialData?: any;
  documentType?: "PURCHASE_ORDER" | "RECEIPT";
};

type FormValues = {
  id?: string;
  reference: string;
  date: string;
  supplierId: string;
  paymentMethod: string;
  lines: {
    productId: string;
    designation: string;
    warehouseId: string;
    batchNumber: string;
    expirationDate: string;
    colisage: number;
    cartons: number;
    quantity: number;
    unitCost: number;
    taxRate: number;
  }[];
};

export default function SplitReceiptEditor({ suppliers, products, warehouses, initialData, documentType = "RECEIPT" }: SplitReceiptEditorProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const { register, control, watch, handleSubmit, setValue } = useForm<FormValues>({
    defaultValues: {
      id: initialData?.id,
      reference: initialData?.reference || "",
      date: initialData?.date ? new Date(initialData.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      supplierId: initialData?.supplierId || "",
      paymentMethod: initialData?.paymentMethod || "virement",
      lines: initialData?.lines?.map((l: any) => ({
        productId: l.productId,
        designation: l.product?.designation || "",
        warehouseId: l.warehouseId || "",
        batchNumber: l.batch?.batchNumber || l.batchNumber || "",
        expirationDate: (l.batch?.expirationDate || l.expirationDate) ? new Date((l.batch?.expirationDate || l.expirationDate)).toISOString().split("T")[0] : "",
        colisage: l.product?.piecesPerCarton || 1,
        cartons: l.quantity / (l.product?.piecesPerCarton || 1),
        quantity: l.quantity,
        unitCost: l.unitPrice,
        taxRate: l.taxRate || 0
      })) || []
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watchLines = watch("lines");

  // Calculs synchrones
  let totalHT = 0;
  let totalTVA = 0;
  watchLines.forEach((line) => {
    const lineHT = (line.quantity || 0) * (line.unitCost || 0);
    const lineTVA = lineHT * ((line.taxRate || 0) / 100);
    totalHT += lineHT;
    totalTVA += lineTVA;
  });
  const netTotal = totalHT + totalTVA;

  // Chargement automatique de la référence pour un nouveau bon/commande
  useEffect(() => {
    if (!initialData?.id) {
       const loadRef = async () => {
         const nextRef = await getNextReferenceAction(documentType);
         if (nextRef) setValue("reference", nextRef);
       };
       loadRef();
    }
  }, [initialData, setValue, documentType]);

  const addProductToReceipt = (prd: Product) => {
    const defaultWarehouseId = warehouses.length > 0 ? warehouses[0].id : "";
    const colisage = prd.piecesPerCarton || 1;
    append({
      productId: prd.id,
      designation: prd.designation,
      warehouseId: defaultWarehouseId,
      batchNumber: "",
      expirationDate: "",
      colisage: colisage,
      cartons: 1,
      quantity: colisage * 1,
      unitCost: prd.purchasePrice || 0,
      taxRate: prd.tvaRate ?? 0,
    });
  };

  const handleQuantityChange = (index: number, newQty: number, colisage: number) => {
    setValue(`lines.${index}.quantity`, newQty);
    setValue(`lines.${index}.cartons`, newQty / colisage, { shouldValidate: true });
  };

  const handleCartonChange = (index: number, newCartons: number, colisage: number) => {
    setValue(`lines.${index}.cartons`, newCartons);
    setValue(`lines.${index}.quantity`, newCartons * colisage, { shouldValidate: true });
  };

  const onSubmit = async (data: FormValues) => {
    if (!data.supplierId) return toast.error("Fournisseur obligatoire.");
    if (data.lines.length === 0) return toast.error("Le document est vide.");
    
    // Validation des lignes (Lot et Dépôt obligatoires UNIQUEMENT pour Réception)
    for (let i = 0; i < data.lines.length; i++) {
        const line = data.lines[i];
        if (documentType === "RECEIPT") {
          if (!line.warehouseId) return toast.error(`Ligne ${i+1}: Dépôt obligatoire.`);
          if (!line.batchNumber.trim()) return toast.error(`Ligne ${i+1}: N° de Lot obligatoire.`);
        }
        if (line.quantity <= 0) return toast.error(`Ligne ${i+1}: Quantité invalide.`);
    }

    const isOrder = documentType === "PURCHASE_ORDER";
    const t = toast.loading(data.id ? "Mise à jour..." : (isOrder ? "Création de la commande..." : "Création du Bon et Stock..."));
    
    const payload = {
      reference: data.reference,
      date: new Date(data.date),
      supplierId: data.supplierId,
      paymentMethod: data.paymentMethod,
      lines: data.lines.map(l => ({
        productId: l.productId,
        warehouseId: isOrder ? undefined : l.warehouseId,
        batchNumber: isOrder ? undefined : l.batchNumber,
        expirationDate: isOrder ? undefined : (l.expirationDate || undefined),
        quantity: l.quantity,
        unitCost: l.unitCost,
        taxRate: l.taxRate
      }))
    };

    let res;
    if (isOrder) {
      res = data.id
        ? await updatePurchaseOrder(data.id, payload as any)
        : await createPurchaseOrder(payload as any);
    } else {
      res = data.id 
        ? await updateReceiptDocument(data.id, payload as any)
        : await createReceiptDocument(payload as any);
    }

    if (res.success) {
      toast.success(data.id ? "Document mis à jour !" : "Document validé !", { id: t });
      router.push(isOrder ? `/achats/commandes` : `/achats/receptions`);
    } else {
      toast.error(res.error, { id: t });
    }
  };

  const filteredProducts = products.filter(p => p.designation.toLowerCase().includes(searchTerm.toLowerCase()));

  const getDocTitle = () => {
    if (documentType === "PURCHASE_ORDER") return initialData?.id ? `Modifier Commande ${initialData.reference}` : "Nouvelle Commande Fournisseur";
    return initialData?.id ? `Modifier Bon ${initialData.reference}` : "Nouveau Bon de Réception";
  };
  const getDocSubtitle = () => {
    if (documentType === "PURCHASE_ORDER") return "Prévisionnel, aucun impact sur le stock.";
    return "Entrée physique de marchandise au stock";
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      
      {/* HEADER */}
      <div className="flex-none p-4 bg-white dark:bg-slate-950 shadow-sm z-10 flex flex-wrap gap-4 items-center justify-between border-b border-emerald-500/20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-emerald-700 dark:text-emerald-500 uppercase tracking-tight">
               {getDocTitle()}
            </h1>
            <p className="text-xs text-slate-500 font-medium">{getDocSubtitle()}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Input placeholder="N° Bon / N° Facture Frs." {...register("reference")} className="w-56 h-9 font-mono uppercase bg-slate-50" />
          <Input type="date" {...register("date")} className="w-40 h-9" />
          
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-1 pr-2">
             <span className="text-[10px] uppercase font-bold text-slate-400 ml-2">Paiement</span>
             <select {...register("paymentMethod")} className="h-7 bg-transparent text-sm font-semibold outline-none w-[120px]">
               <option value="espece">Espèces</option>
               <option value="virement">Virement</option>
               <option value="cheque">Chèque</option>
               <option value="a_terme">À terme</option>
             </select>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-1 pr-2">
             <BriefcaseBusiness className="h-4 w-4 ml-2 text-slate-400" />
             <select {...register("supplierId")} className="h-7 bg-transparent text-sm font-semibold outline-none w-[180px]">
               <option value="">-- Sélectionnez un Fournisseur --</option>
               {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
             </select>
          </div>
          
          <Button onClick={handleSubmit(onSubmit)} className="h-9 bg-emerald-600 hover:bg-emerald-700 shadow-lg text-white gap-2 px-6">
            <PackageCheck className="h-4 w-4" /> Valider & Entrer le stock
          </Button>
        </div>
      </div>

      {/* SPLIT VIEW */}
      <div className="flex-1 flex min-h-0">
        
        {/* LEFT PANEL: CATALOGUE VIERGE */}
        <div className="w-[300px] lg:w-[350px] flex-none border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-950">
           <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
             <div className="relative">
               <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
               <Input placeholder="Chercher un produit à réceptionner..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 border-slate-200 dark:border-slate-700" />
             </div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-2 space-y-1">
             {filteredProducts.map(prd => (
               <div key={prd.id} onClick={() => addProductToReceipt(prd)} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer select-none transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800">
                 <div className="flex flex-col items-start text-left flex-1 pr-2">
                   <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 whitespace-normal leading-tight">{prd.designation}</span>
                   <span className="text-[10px] text-slate-500 font-mono mt-0.5">{prd.reference} | {prd.piecesPerCarton} pcs/carton</span>
                 </div>
                 <ChevronRight className="h-4 w-4 text-emerald-500 opacity-50" />
               </div>
             ))}
           </div>
        </div>

        {/* RIGHT PANEL: RECEPTION LINES */}
        <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden">
          <div className="flex-1 overflow-x-auto overflow-y-auto p-4">
            <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 w-max min-w-full">
              <Table>
                <TableHeader className="bg-emerald-50/50 dark:bg-emerald-950/20">
                  <TableRow>
                    <TableHead className="w-[15%]">Produit</TableHead>
                    {documentType !== "PURCHASE_ORDER" && <TableHead className="w-[12%]">Dépôt Destination</TableHead>}
                    {documentType !== "PURCHASE_ORDER" && <TableHead className="w-[12%]">Lot N°</TableHead>}
                    {documentType !== "PURCHASE_ORDER" && <TableHead className="w-[10%]">Date d'Exp.</TableHead>}
                    <TableHead className="w-[8%] text-center">Colis. (pcs)</TableHead>
                    <TableHead className="w-[8%] text-center">Cartons</TableHead>
                    <TableHead className="w-[8%] text-center">Pièces</TableHead>
                    <TableHead className="w-[10%] text-right">Prix Revient (Unité)</TableHead>
                    <TableHead className="w-[12%] text-right">Montant Total</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.length === 0 ? (
                    <TableRow><TableCell colSpan={documentType === "PURCHASE_ORDER" ? 7 : 10} className="h-64 text-center text-slate-400 italic font-medium"><PackageCheck className="h-10 w-10 mx-auto mb-2 opacity-20 text-emerald-500" /> Cliquez sur un produit à gauche pour l'ajouter.</TableCell></TableRow>
                  ) : fields.map((field, index) => {
                    const line = watchLines[index];
                    const q = line?.quantity || 0;
                    const c = line?.cartons || 0;
                    const col = line?.colisage || 1;
                    const p = line?.unitCost || 0;
                    const lineTotal = q * p;

                    return (
                      <TableRow key={field.id} className="group hover:bg-emerald-50/30 h-14">
                        <TableCell className="p-2">
                          <span className="text-xs font-bold block text-slate-700 dark:text-slate-200 whitespace-normal leading-tight">{line.designation}</span>
                        </TableCell>
                        {documentType !== "PURCHASE_ORDER" && (
                          <>
                            <TableCell className="p-2">
                               <select {...register(`lines.${index}.warehouseId`)} className="h-8 w-full text-xs rounded border-slate-200 bg-white">
                                 <option value="" disabled>-- Dépôt --</option>
                                 {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                               </select>
                            </TableCell>
                            <TableCell className="p-2">
                               <Input placeholder="L-10A2" {...register(`lines.${index}.batchNumber`)} className="h-8 text-xs font-mono uppercase border-emerald-200 focus-visible:ring-emerald-500" />
                            </TableCell>
                            <TableCell className="p-2">
                               <Input type="date" {...register(`lines.${index}.expirationDate`)} className="h-8 text-xs" />
                            </TableCell>
                          </>
                        )}
                        <TableCell className="p-2 text-center text-xs font-mono text-slate-500 bg-slate-50 dark:bg-slate-900/30">
                          {col}
                        </TableCell>
                        <TableCell className="p-2">
                          <Input type="number" min="0" step="0.5" value={c} onChange={(e) => handleCartonChange(index, parseFloat(e.target.value)||0, col)} className="h-8 text-center text-xs border-indigo-200 dark:border-indigo-800 focus-visible:ring-indigo-500" />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input type="number" min="0" value={q} onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value)||0, col)} className="h-8 text-center text-xs border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500 font-bold bg-emerald-50" />
                        </TableCell>
                        <TableCell className="p-2">
                           <Input type="number" step="0.01" {...register(`lines.${index}.unitCost`, { valueAsNumber: true })} className="h-8 text-right text-xs" />
                        </TableCell>
                        <TableCell className="p-2 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="p-2 text-right">
                           <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100">
                             <Trash2 className="h-3 w-3" />
                           </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex-none bg-slate-900 text-white p-4 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.5)] z-20 layout-footer">
             <div className="w-full flex justify-between items-center gap-6 px-4">
                <div className="text-sm text-emerald-400 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> 
                  <span className="opacity-80">Remplissez les lots. Le calcul est basé sur le nombre total de PIÈCES.</span>
                </div>
                <div className="flex gap-8 items-center">
                  <div className="flex flex-col text-right">
                    <span className="text-slate-400 text-[10px] uppercase tracking-widest">Total H.T</span>
                    <span className="font-bold text-lg text-white">{totalHT.toLocaleString()} <span className="text-[10px]">DA</span></span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-slate-400 text-[10px] uppercase tracking-widest">TVA (19%)</span>
                    <span className="font-bold text-lg text-emerald-400">{totalTVA.toLocaleString()} <span className="text-[10px]">DA</span></span>
                  </div>
                  <div className="flex flex-col text-right bg-white/10 px-4 py-1 rounded-lg border border-white/10">
                    <span className="text-emerald-400 text-[10px] uppercase font-black tracking-widest">NET À PAYER (TTC)</span>
                    <span className="font-black text-2xl tracking-tight text-white">{netTotal.toLocaleString()} <span className="text-sm">DA</span></span>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
