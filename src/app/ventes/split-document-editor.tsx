"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText, ArrowLeft, Trash2, Save, Printer, User, Search, Calculator, ChevronDown, ChevronRight, PackageCheck, Layers, Plus
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { createSaleDocument, updateSaleDocument } from "@/app/actions/ventes.actions";
import { getNextReferenceAction } from "@/app/actions/sequences.actions";
import { generateProformaPDF } from "@/lib/pdf-generator";

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

type SplitEditorProps = {
  documentType: "PROFORMA" | "BL" | "BV" | "INVOICE" | "DELIVERY";
  clients: Customer[];
  products: Product[];
  initialData?: any;
};

type FormValues = {
  reference: string;
  date: string;
  customerId: string;
  paymentMethod: string;
  applyStampTax: boolean;
  lines: {
    productId: string;
    designation: string;
    reference?: string;
    warehouseId?: string;
    batchId?: string;
    colisage: number;
    cartons: number;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
  }[];
  globalDiscountPercent: number;
};

export default function SplitDocumentEditor({ documentType, clients, products, initialData }: SplitEditorProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [savedDoc, setSavedDoc] = useState<any>(null);

  const { register, control, watch, handleSubmit, setValue, reset } = useForm<FormValues>({
    defaultValues: {
      reference: initialData?.reference || "",
      date: initialData?.date ? new Date(initialData.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      customerId: initialData?.customerId || "",
      paymentMethod: initialData?.paymentMethod || "ESPECE",
      applyStampTax: !!initialData?.stampTax,
      globalDiscountPercent: 0,
      lines: []
    }
  });

  useEffect(() => {
    if (initialData && initialData.lines) {
      const formattedLines = initialData.lines.map((l: any) => ({
        productId: l.productId,
        designation: l.product?.designation || l.designation,
        reference: l.product?.reference,
        colisage: l.product?.piecesPerCarton || 1,
        cartons: l.quantity / (l.product?.piecesPerCarton || 1),
        quantity: l.quantity,
        warehouseId: l.warehouseId,
        batchId: l.batchId,
        unitPrice: l.unitPrice,
        discount: l.discount || 0,
        taxRate: l.taxRate ?? 0
      }));

      setValue("lines", formattedLines);

      // Calcul intelligent de la remise globale
      // Somme des lignes après remise ligne mais avant remise globale
      let sumLinesNetHT = 0;
      formattedLines.forEach((l: any) => {
        sumLinesNetHT += (l.quantity * l.unitPrice) * (1 - l.discount / 100);
      });

      if (sumLinesNetHT > 0 && initialData.grossTotal < sumLinesNetHT) {
        const diff = sumLinesNetHT - initialData.grossTotal;
        const percent = (diff / sumLinesNetHT) * 100;
        setValue("globalDiscountPercent", Math.round(percent * 100) / 100);
      }
    }
  }, [initialData, setValue]);

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const watchLines = watch("lines");
  const applyStamp = watch("applyStampTax");
  const globalDiscount = watch("globalDiscountPercent");

  // Auto-reference au montage (seulement en création)
  useEffect(() => {
    const fetchRef = async () => {
      const ref = await getNextReferenceAction(documentType);
      setValue("reference", ref);
    };
    if (!initialData && !watch("reference")) {
      fetchRef();
    }
  }, [documentType, setValue, initialData]);

  // Calculations
  const { grossTotalBase, taxTotal, netTotalBeforeStamp, totalLineDiscount } = useMemo(() => {
    let g = 0, t = 0, dLines = 0;
    watchLines.forEach((line) => {
      const lineBrut = (line.quantity || 0) * (line.unitPrice || 0);
      const lineDisc = lineBrut * ((line.discount || 0) / 100);
      const lineNet = lineBrut - lineDisc;

      dLines += lineDisc;
      g += lineNet;
      t += lineNet * ((line.taxRate || 0) / 100);
    });

    // Appliquer la remise globale sur le total HT
    const globalDiscAmount = g * ((globalDiscount || 0) / 100);
    const finalHT = g - globalDiscAmount;
    const finalTax = t * (1 - (globalDiscount || 0) / 100); // Proportionnel

    return {
      grossTotalBase: finalHT,
      taxTotal: finalTax,
      netTotalBeforeStamp: finalHT + finalTax,
      totalLineDiscount: dLines + globalDiscAmount
    };
  }, [watchLines, globalDiscount]);

  const grossTotal = grossTotalBase; // Pour compatibilité avec la suite du code


  const stampValue = applyStamp ? Math.min(netTotalBeforeStamp * 0.01, 2500) : 0; // Algérie standard : 1% max 2500 DA
  const netTotal = netTotalBeforeStamp + stampValue;

  // Add Product to Cart
  const addProductToCart = (prd: Product, batch?: Inventory) => {
    const colisage = prd.piecesPerCarton || 1;
    append({
      productId: prd.id,
      designation: prd.designation + (batch ? ` [Lot: ${batch.batch.batchNumber}]` : ""),
      reference: prd.reference,
      warehouseId: batch?.warehouseId,
      batchId: batch?.batchId,
      colisage: colisage,
      cartons: 1,
      quantity: colisage * 1,
      unitPrice: prd.salePrice || 0,
      discount: 0,
      taxRate: prd.tvaRate ?? 0,
    });
  };

  // Synchronisation dynamique Quantité / Cartons
  const handleQuantityChange = (index: number, newQty: number, colisage: number) => {
    setValue(`lines.${index}.quantity`, newQty);
    setValue(`lines.${index}.cartons`, newQty / colisage, { shouldValidate: true });
  };

  const handleCartonChange = (index: number, newCartons: number, colisage: number) => {
    setValue(`lines.${index}.cartons`, newCartons);
    setValue(`lines.${index}.quantity`, newCartons * colisage, { shouldValidate: true });
  };

  const onSubmit = async (data: FormValues) => {
    if (!data.customerId && documentType !== "BV") return toast.error("Client obligatoire pour ce type de document.");
    if (data.lines.length === 0) return toast.error("Le document est vide.");

    const t = toast.loading(initialData ? "Mise à jour..." : "Enregistrement...");

    const docData = {
      type: documentType,
      reference: data.reference,
      date: new Date(data.date),
      customerId: data.customerId,
      paymentMethod: data.paymentMethod,
      stampTax: stampValue,
      grossTotal: grossTotal,
      discountTotal: totalLineDiscount,
      taxTotal: taxTotal,
      netTotal: netTotal,
      lines: data.lines.map(l => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discount: l.discount,
        taxRate: l.taxRate,
        warehouseId: l.warehouseId,
        batchId: l.batchId
      }))
    };

    const res = initialData
      ? await updateSaleDocument(initialData.id, docData)
      : await createSaleDocument(docData);

    if (res.success) {
      toast.success(initialData ? "Document mis à jour." : "Document enregistré.", { id: t });
      setSavedDoc(res.data);
      if (initialData) {
        setTimeout(() => router.push(`/ventes/${documentType.toLowerCase()}`), 1000);
      }
    } else {
      toast.error(res.error, { id: t });
    }
  };

  const filteredProducts = (products || []).filter(p => p.designation.toLowerCase().includes(searchTerm.toLowerCase()));

  const getDocTitle = () => {
    if (documentType === "PROFORMA") return "Facture Proforma";
    if (documentType === "BL") return "Bon de Livraison";
    if (documentType === "DELIVERY") return "Bon d'Enlèvement";
    return "Bon de Vente";
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">

      {/* HEADER POS */}
      <div className="flex-none p-4 bg-white dark:bg-slate-950 shadow-sm z-10 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-tight">{getDocTitle()}</h1>
            <p className="text-xs text-slate-500 font-medium">{initialData ? "Modification" : "Création"} en cours...</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Input placeholder="N° Document (Auto)" {...register("reference")} className="w-40 h-9 font-mono uppercase bg-slate-50" />
          <Input type="date" {...register("date")} className="w-40 h-9" />

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-1 pr-2">
            <User className="h-4 w-4 ml-2 text-slate-400" />
            <select {...register("customerId")} className="h-7 bg-transparent text-sm font-semibold outline-none w-[180px]">
              <option value="">-- Client --</option>
              <option value="COMPTANT">Passager (Comptant)</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <select {...register("paymentMethod")} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium">
            <option value="ESPECE">Espèce</option>
            <option value="VIREMENT">Virement Bancaire</option>
            <option value="CHEQUE">Chèque</option>
            <option value="A_TERME">À Terme</option>
          </select>

          <Button onClick={handleSubmit(onSubmit)} className="h-9 bg-indigo-600 hover:bg-indigo-700 shadow-lg text-white ml-2 gap-2">
            <Save className="h-4 w-4" /> Sauvegarder
          </Button>

          <Button
            variant="outline"
            className={`h-9 border-indigo-200 gap-2 ${savedDoc ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400'}`}
            disabled={!savedDoc}
            onClick={() => {
              const customer = clients.find(c => c.id === savedDoc.customerId);
              generateProformaPDF({
                ...savedDoc,
                customerName: customer?.name || "Client de passage",
                customerAddress: (customer as any)?.address || "/",
                customerPhone: (customer as any)?.phone || "/",
                customerRC: (customer as any)?.rc || "/",
                customerNIS: (customer as any)?.nis || "/",
                customerMF: (customer as any)?.mf || "/",
                customerAI: (customer as any)?.ai || "/"
              });
            }}
          >
            <Printer className="h-4 w-4" /> Imprimer PDF
          </Button>
        </div>
      </div>

      {/* SPLIT VIEW */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT PANEL: CATALOGUE */}
        <div className="w-[350px] lg:w-[400px] flex-none border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-950">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Rechercher produit..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredProducts.map(prd => {
              const totalGlobal = prd.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
              const isOpen = openItems[prd.id];

              return (
                <Collapsible key={prd.id} open={!!isOpen} onOpenChange={(val) => setOpenItems(prev => ({ ...prev, [prd.id]: val }))}>
                  <CollapsibleTrigger className="w-full text-left bg-transparent p-0 border-none outline-none">
                    <div className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer select-none transition-colors border border-transparent hover:border-slate-200">
                      <div className="flex flex-col items-start text-left flex-1">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 line-clamp-1">{prd.designation}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{prd.reference}</span>
                      </div>
                      <div className="flex flex-col items-end whitespace-nowrap ml-2">
                        <span className={`text-xs font-bold ${totalGlobal > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                          {totalGlobal.toLocaleString()} {prd.unit}
                        </span>
                        <div className="flex items-center text-[10px] text-indigo-500 mt-1 uppercase font-semibold gap-0.5">
                          Voir les lots {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-2 pb-2">
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 mt-1">
                      {prd.inventories.length === 0 && (
                        <div className="p-3 text-xs text-center text-slate-500">Aucun lot en stock.</div>
                      )}
                      {prd.inventories.map((inv, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Lot: <span className="font-mono text-indigo-600 dark:text-indigo-400">{inv.batch.batchNumber}</span>
                            </span>
                            <span className="text-[10px] text-slate-500">{inv.warehouse.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold font-mono bg-white dark:bg-black px-1.5 py-0.5 rounded shadow-sm border border-slate-200">
                              {inv.quantity} {prd.unit}
                            </span>
                            <Button size="sm" onClick={() => addProductToCart(prd, inv)} className="h-6 text-[10px] px-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300">
                              <Plus className="h-3 w-3 mr-1" /> Ajouter
                            </Button>
                          </div>
                        </div>
                      ))}
                      {documentType === "PROFORMA" && (
                        <Button
                          onClick={() => addProductToCart(prd)}
                          variant="ghost"
                          className="w-full h-7 mt-1 text-[10px] text-slate-500"
                        >
                          Ajouter sans spécifier de lot (Devis)
                        </Button>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        </div>

        {/* RIGHT PANEL: FACTURIER */}
        <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 relative min-w-0">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col min-w-0">
            <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 w-full overflow-x-auto min-w-0">
              <Table className="min-w-[1200px] w-full table-fixed">
                <TableHeader className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[20%]">Désignation</TableHead>
                    {(documentType === "BL" || documentType === "BV") && (
                      <>
                        <TableHead className="w-[12%]">Dépôt</TableHead>
                        <TableHead className="w-[10%]">N° Lot</TableHead>
                      </>
                    )}
                    <TableHead className="w-[8%] whitespace-nowrap text-center">Colisage</TableHead>
                    <TableHead className="w-[8%] text-center">Cartons</TableHead>
                    <TableHead className="w-[8%] text-center">Quantité</TableHead>
                    <TableHead className="w-[10%] text-right">P.U HT</TableHead>
                    <TableHead className="w-[7%] text-center">Rem. %</TableHead>
                    <TableHead className="w-[7%] text-center">TVA</TableHead>
                    <TableHead className="w-[10%] text-right">S.Total HT</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="h-64 text-center text-slate-400 italic font-medium"><PackageCheck className="h-10 w-10 mx-auto mb-2 opacity-20" /> Le chariot est vide. Sélectionnez un produit à gauche.</TableCell></TableRow>
                  ) : fields.map((field, index) => {
                    const line = watchLines[index];
                    const q = line?.quantity || 0;
                    const p = line?.unitPrice || 0;
                    const c = line?.cartons || 0;
                    const col = line?.colisage || 1;
                    const d = line?.discount || 0;

                    const lineTotal = (q * p) * (1 - d / 100);

                    return (
                      <TableRow key={field.id} className="group hover:bg-slate-50 h-14">
                        <TableCell className="p-2">
                          <span className="text-xs font-semibold block leading-tight">{line.designation}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{line.reference}</span>
                        </TableCell>

                        {(documentType === "BL" || documentType === "BV") && (
                          <>
                            <TableCell className="p-1">
                              <select 
                                {...register(`lines.${index}.warehouseId`)}
                                className="w-full h-8 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1"
                              >
                                <option value="">Choisir dépôt</option>
                                {[...new Map(
                                  products.find(p => p.id === line.productId)?.inventories.map(inv => [inv.warehouse.id, inv.warehouse])
                                ).values()].map(wh => (
                                  <option key={wh.id} value={wh.id}>
                                    {wh.name}
                                  </option>
                                ))}
                              </select>
                            </TableCell>
                            <TableCell className="p-1">
                              <select 
                                {...register(`lines.${index}.batchId`)}
                                className="w-full h-8 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1"
                              >
                                <option value="">Choisir lot</option>
                                {products.find(p => p.id === line.productId)?.inventories
                                  .filter(inv => !watchLines[index].warehouseId || inv.warehouseId === watchLines[index].warehouseId)
                                  .map(inv => (
                                    <option key={inv.batch.id} value={inv.batch.id}>
                                      {inv.batch.batchNumber} ({inv.quantity})
                                    </option>
                                  ))}
                              </select>
                            </TableCell>
                          </>
                        )}

                        <TableCell className="p-2 text-center text-xs font-mono text-slate-500 bg-slate-50/50 dark:bg-slate-900/30">
                          {col} pcs
                        </TableCell>
                        <TableCell className="p-2">
                          <Input type="number" min="0" step="0.5" value={c} onChange={(e) => handleCartonChange(index, parseFloat(e.target.value) || 0, col)} className="h-8 text-center text-xs border-indigo-200 dark:border-indigo-800 focus-visible:ring-indigo-500" />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input type="number" min="0" value={q} onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 0, col)} className="h-8 text-center text-xs border-sky-200 dark:border-sky-800 focus-visible:ring-sky-500 font-bold" />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input type="number" step="0.01" {...register(`lines.${index}.unitPrice`, { valueAsNumber: true })} className="h-8 text-right text-xs" />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input type="number" min="0" max="100" {...register(`lines.${index}.discount`, { valueAsNumber: true })} className="h-8 text-center text-xs" />
                        </TableCell>
                        <TableCell className="p-2 text-center text-xs font-medium text-slate-500">
                          {line.taxRate}%
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

          {/* FOOTER TOTALS EXACTEMENT COMME DEMANDE */}
          <div className="bg-slate-900 border-t border-slate-700 py-6 px-4 overflow-x-auto custom-scrollbar">
            <div className="min-w-[600px] max-w-6xl w-full mx-auto flex justify-between items-center gap-6">

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2 bg-slate-800 p-2 px-3 rounded-md border border-slate-700">
                  <Checkbox id="timbre" checked={applyStamp} onCheckedChange={(c) => setValue("applyStampTax", c as boolean)} className="border-slate-500 data-[state=checked]:bg-indigo-500" />
                  <label htmlFor="timbre" className="text-xs font-medium text-slate-300 cursor-pointer">
                    Timbre (1%)
                  </label>
                </div>

                <div className="h-8 w-px bg-slate-700"></div>

                <div className="flex items-center gap-2 bg-slate-800 p-1 px-2 rounded-md border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Remise Globale</span>
                  <div className="relative">
                    <Input
                      type="number"
                      {...register("globalDiscountPercent", { valueAsNumber: true })}
                      className="h-7 w-16 bg-slate-950 border-slate-600 text-white text-xs text-center pr-5"
                    />
                    <span className="absolute right-1.5 top-1.5 text-[10px] text-slate-500">%</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-6 lg:gap-10 text-sm font-mono items-center">
                <div className="flex flex-col text-right">
                  <span className="text-slate-400 text-xs uppercase mb-1">Total HT</span>
                  <span className="font-semibold text-lg">{grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="h-8 w-px bg-slate-700 hidden lg:block"></div>
                <div className="flex flex-col text-right">
                  <span className="text-slate-400 text-xs uppercase mb-1">TVA Totale</span>
                  <span className="font-medium text-slate-300">+{taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="h-8 w-px bg-slate-700 hidden lg:block"></div>
                <div className="flex flex-col text-right relative">
                  <span className="text-slate-400 text-xs uppercase mb-1 flex items-center gap-1 justify-end">Timbre</span>
                  <span className="font-medium text-amber-400">{stampValue > 0 ? `+${stampValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</span>
                </div>
                <div className="h-10 w-px bg-slate-700 hidden md:block mx-2"></div>
                <div className="flex flex-col text-right bg-indigo-600 p-2 px-4 rounded-lg shadow-lg border border-indigo-500">
                  <span className="text-indigo-200 text-[10px] font-sans uppercase tracking-widest mb-0.5">Net à Payer (TTC)</span>
                  <span className="font-black text-2xl tracking-tight text-white">{netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm">DA</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
