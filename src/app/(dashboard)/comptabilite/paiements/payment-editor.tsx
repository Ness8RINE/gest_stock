"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { 
  createPayment, 
  getUnpaidInvoices,
  getPartnerFinancialSummary,
  uploadPaymentAttachment
} from "@/actions/finance.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Check, 
  X, 
  DollarSign, 
  Wallet, 
  Paperclip,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  MoreVertical
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Partner = { id: string; name: string };

type PaymentEditorProps = {
  partners: {
    customers: Partner[];
    suppliers: Partner[];
  };
  selectedPayment?: any;
  onSuccess: () => void;
  onCancel: () => void;
};

type FormValues = {
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  date: string;
  partnerId: string;
  partnerType: "CUSTOMER" | "SUPPLIER";
  selectedInvoices: {
    documentId: string;
    reference: string;
    total: number;
    remaining: number;
    toApply: number;
    selected: boolean;
  }[];
};

export default function PaymentEditor({ partners, selectedPayment, onSuccess, onCancel }: PaymentEditorProps) {
  const isViewMode = !!selectedPayment;
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isSearchingInvoices, setIsSearchingInvoices] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [isSearchingSummary, setIsSearchingSummary] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { register, control, watch, handleSubmit, setValue, reset } = useForm<FormValues>({
    defaultValues: {
      amount: selectedPayment?.amount || 0,
      paymentMethod: selectedPayment?.paymentMethod || "ESPECE",
      referenceNumber: selectedPayment?.referenceNumber || "",
      date: selectedPayment?.date ? new Date(selectedPayment.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      partnerType: selectedPayment?.customer ? "CUSTOMER" : "SUPPLIER",
      partnerId: selectedPayment?.customerId || selectedPayment?.supplierId || "",
      selectedInvoices: []
    }
  });

  const { fields, replace } = useFieldArray({ control, name: "selectedInvoices" });
  
  const watchedPartnerId = watch("partnerId");
  const watchedPartnerType = watch("partnerType");
  const watchedAmount = watch("amount");
  const watchedInvoices = watch("selectedInvoices");

  // Charger les factures impayées quand le partenaire change
  useEffect(() => {
    if (watchedPartnerId) {
      async function loadData() {
        setIsSearchingInvoices(true);
        setIsSearchingSummary(true);
        
        const [invRes, sumRes] = await Promise.all([
          getUnpaidInvoices(watchedPartnerId, watchedPartnerType),
          getPartnerFinancialSummary(watchedPartnerId, watchedPartnerType)
        ]);

        if (invRes.success) {
          const formatted = (invRes.data || []).map(inv => {
            // Si on est en mode consultation, on cherche si cette facture a été lettrée par ce paiement
            const existingMatch = selectedPayment?.matches?.find((m: any) => m.documentId === inv.id);
            
            return {
              documentId: inv.id,
              reference: inv.reference || "",
              total: inv.netTotal,
              remaining: inv.remaining,
              toApply: existingMatch ? existingMatch.amountMatched : 0,
              selected: !!existingMatch
            };
          });

          // En mode consultation, on s'assure d'inclure les factures qui ont été payées par ce règlement
          // même si elles n'apparaissent plus dans "getUnpaidInvoices" (car elles sont PAID)
          if (isViewMode && selectedPayment.matches) {
             selectedPayment.matches.forEach((m: any) => {
                if (!formatted.find(f => f.documentId === m.documentId)) {
                   formatted.push({
                      documentId: m.documentId,
                      reference: m.document.reference || "",
                      total: m.document.netTotal,
                      remaining: 0,
                      toApply: m.amountMatched,
                      selected: true
                   });
                }
             });
          }

          replace(formatted);
        }

        if (sumRes.success) {
          setSummary(sumRes.data);
        }

        setIsSearchingInvoices(false);
        setIsSearchingSummary(false);
      }
      loadData();
    } else {
      replace([]);
      setSummary(null);
    }
  }, [watchedPartnerId, watchedPartnerType, replace, isViewMode, selectedPayment]);

  // Logique d'auto-lettrage (distribution automatique du montant saisi)
  const distributeAmount = () => {
    let budget = watchedAmount;
    const newInvoices = watchedInvoices.map(inv => {
      if (budget <= 0) return { ...inv, toApply: 0, selected: false };
      
      const amountToApply = Math.min(budget, inv.remaining);
      budget -= amountToApply;
      
      return { 
        ...inv, 
        toApply: amountToApply, 
        selected: amountToApply > 0 
      };
    });
    replace(newInvoices);
    toast.success("Montant ventilé automatiquement sur les factures les plus anciennes.");
  };

  const onSubmit = async (data: FormValues) => {
    if (data.amount <= 0) return toast.error("Veuillez saisir un montant supérieur à 0.");
    if (!data.partnerId) return toast.error("Veuillez sélectionner un partenaire.");

    const matches = data.selectedInvoices
      .filter(inv => inv.selected && inv.toApply > 0)
      .map(inv => ({
        documentId: inv.documentId,
        amountMatched: inv.toApply
      }));

    const totalMatched = matches.reduce((sum, m) => sum + m.amountMatched, 0);
    if (totalMatched > data.amount) {
      return toast.error("Le montant ventilé dépasse le montant total du règlement.");
    }

    let attachmentUrl = "";
    if (selectedFile) {
       const formData = new FormData();
       formData.append("file", selectedFile);
       const uploadRes = await uploadPaymentAttachment(formData);
       if (uploadRes.success) {
          attachmentUrl = uploadRes.url || "";
       } else {
          toast.error("Erreur lors de l'envoi du justificatif");
          return;
       }
    }

    const t = toast.loading("Enregistrement du paiement...");
    const res = await createPayment({
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber,
      attachmentUrl: attachmentUrl || undefined,
      date: new Date(data.date),
      partnerId: data.partnerId,
      partnerType: data.partnerType,
      matches
    });

    if (res.success) {
      toast.success("Paiement enregistré et lettré !", { id: t });
      onSuccess();
    } else {
      toast.error(res.error, { id: t });
    }
  };

  const currentPartnerList = watchedPartnerType === "CUSTOMER" ? partners.customers : partners.suppliers;

  return (
    <div className="flex flex-col bg-white dark:bg-slate-950 h-full">
      <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-indigo-600">
         <div className="flex items-center gap-4 text-white">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
               <Wallet size={24} />
            </div>
            <div>
               <h2 className="text-xl font-black uppercase tracking-tight italic">
                  {isViewMode ? "Détails du Règlement" : "Nouveau Règlement"}
               </h2>
               <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                  {isViewMode ? `Règlement #${selectedPayment.id.slice(0,8)}` : "Enregistrement & Lettrage automatique"}
               </p>
            </div>
         </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8 flex-1 overflow-y-auto min-h-0">
        {/* ÉTAPE UNIQUE: ÉTAT FINANCIER DU PARTENAIRE */}
        <AnimatePresence>
          {summary && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
               <StatCard 
                 label="Total Facturé" 
                 value={summary.totalInvoiced} 
                 color="text-slate-600" 
                 desc="Factures & BV Validés"
                 isLoading={isSearchingSummary}
               />
               <StatCard 
                 label="Total Payé" 
                 value={summary.totalPaid} 
                 color="text-emerald-600" 
                 desc="Historique des règlements"
                 isLoading={isSearchingSummary}
               />
               <StatCard 
                 label="Reste à Payer Global" 
                 value={summary.remainingBalance} 
                 color="text-rose-600" 
                 desc="Dette actuelle du partenaire"
                 highlight
                 isLoading={isSearchingSummary}
               />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ÉTAPE 1: INFORMATIONS GÉNÉRALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase px-1">Type de Partenaire</label>
              <div className="flex bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                 <button 
                  type="button" 
                  disabled={isViewMode}
                  onClick={() => setValue("partnerType", "CUSTOMER")}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-black transition-all",
                    watchedPartnerType === "CUSTOMER" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-slate-400 hover:text-slate-600"
                  )}
                 >CLIENTS</button>
                 <button 
                  type="button" 
                  disabled={isViewMode}
                  onClick={() => setValue("partnerType", "SUPPLIER")}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-black transition-all",
                    watchedPartnerType === "SUPPLIER" ? "bg-orange-600 text-white shadow-md shadow-orange-600/20" : "text-slate-400 hover:text-slate-600"
                  )}
                 >FOURNISSEURS</button>
              </div>
           </div>

           <div className="space-y-2 lg:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase px-1">Sélectionner le Partenaire</label>
              <select 
                {...register("partnerId")} 
                disabled={isViewMode}
                className="w-full h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none disabled:bg-slate-50"
              >
                <option value="">Choisir un {watchedPartnerType === "CUSTOMER" ? "client" : "fournisseur"}...</option>
                {currentPartnerList.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase px-1">
                {watchedPartnerType === "CUSTOMER" ? "Montant Reçu (DA)" : "Montant Payé (DA)"}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                <Input 
                  type="number" 
                  step="0.01"
                  disabled={isViewMode}
                  placeholder="0.00" 
                  {...register("amount", { valueAsNumber: true })} 
                  className="pl-9 h-11 bg-white border-emerald-100 dark:border-emerald-900 focus:border-emerald-500 font-black text-lg text-emerald-600 rounded-xl disabled:bg-emerald-50" 
                />
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase px-1">Mode de Paiement</label>
              <select 
                {...register("paymentMethod")} 
                disabled={isViewMode}
                className="w-full h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm font-bold shadow-sm outline-none disabled:bg-slate-50"
              >
                <option value="ESPECE">Espèces</option>
                <option value="CHEQUE">Chèque</option>
                <option value="VIREMENT">Virement Bancaire</option>
                <option value="VERSEMENT">Versement</option>
                <option value="TRAITE">Traite</option>
              </select>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase px-1">N° Référence / Pièce</label>
              <Input 
                placeholder="Ex: N° Chèque" 
                disabled={isViewMode}
                {...register("referenceNumber")} 
                className="h-11 bg-white border-slate-200 rounded-xl text-sm font-mono disabled:bg-slate-50" 
              />
           </div>

           {!isViewMode && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Justificatif (PDF/Image)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "h-11 border-2 border-dashed rounded-xl flex items-center px-4 cursor-pointer transition-all",
                    selectedFile ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-200 hover:border-indigo-400"
                  )}
                >
                   <Paperclip size={14} className={cn("mr-2", selectedFile ? "text-indigo-600" : "text-slate-400")} />
                   <span className={cn("text-[11px] truncate font-bold", selectedFile ? "text-indigo-600" : "text-slate-400")}>
                      {selectedFile ? selectedFile.name : "Joindre une pièce..."}
                   </span>
                   <input 
                     type="file" 
                     ref={fileInputRef} 
                     onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                     className="hidden" 
                     accept="application/pdf,image/*"
                   />
                </div>
              </div>
           )}
        </div>

        {/* ÉTAPE 2: LETTRAGE */}
        <div className="space-y-4">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                    <FileText size={18} />
                 </div>
                 <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Affectation aux factures (Lettrage)</h3>
              </div>
              <Button 
                type="button" 
                size="sm" 
                variant="outline"
                disabled={watchedAmount <= 0 || fields.length === 0 || isViewMode}
                onClick={distributeAmount}
                className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
              >
                 Ventiler automatiquement
              </Button>
           </div>

           <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg overflow-hidden min-h-[200px]">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-400">Facture</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase text-slate-400">Reste à payer</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase text-slate-400">Montant à lettrer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isSearchingInvoices ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-40 text-center text-slate-400 text-xs font-bold animate-pulse">Recherche des factures en cours...</TableCell>
                    </TableRow>
                  ) : fields.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-40 text-center p-8">
                         <AlertCircle size={32} className="mx-auto mb-2 text-slate-200" />
                         <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                           {watchedPartnerId ? "Aucune facture impayée pour ce partenaire" : "Sélectionnez un partenaire pour voir ses factures"}
                         </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    fields.map((field, index) => (
                      <TableRow key={field.id} className={cn(watchedInvoices[index]?.selected ? "bg-indigo-50/30" : "")}>
                        <TableCell>
                           <input 
                              type="checkbox" 
                              disabled={isViewMode}
                              {...register(`selectedInvoices.${index}.selected`)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 disabled:opacity-50"
                           />
                        </TableCell>
                        <TableCell>
                           <div className="flex flex-col">
                              <span className="font-black text-slate-800 dark:text-white text-xs">{watchedInvoices[index]?.reference}</span>
                              <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Total: {watchedInvoices[index]?.total.toLocaleString()} DA</span>
                           </div>
                        </TableCell>
                        <TableCell className="text-right">
                           <Badge variant="outline" className="text-[10px] font-black text-slate-500 border-slate-200">
                             {watchedInvoices[index]?.remaining.toLocaleString()} DA
                           </Badge>
                        </TableCell>
                        <TableCell className="text-right p-4">
                           <Input 
                              type="number" 
                              step="0.01"
                              disabled={!watchedInvoices[index]?.selected || isViewMode}
                              {...register(`selectedInvoices.${index}.toApply`, { valueAsNumber: true })}
                              className="w-32 h-9 text-right font-black text-indigo-600 bg-white border-slate-200 rounded-xl ml-auto disabled:bg-slate-50"
                           />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
           </div>
        </div>

        {/* SUMMARY & SUBMIT */}
        <div className="flex items-center justify-between p-6 bg-slate-100 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Récapitulatif</span>
              <div className="flex items-center gap-4 mt-2">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 italic">Total Paiement</span>
                    <span className="text-lg font-black text-indigo-600">{watchedAmount.toLocaleString()} DA</span>
                 </div>
                 <div className="h-8 w-[1px] bg-slate-300"></div>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 italic">Total Lettré</span>
                    <span className="text-lg font-black text-emerald-600">
                       {watchedInvoices.filter(i => i.selected).reduce((sum, i) => sum + (Number(i.toApply) || 0), 0).toLocaleString()} DA
                    </span>
                 </div>
              </div>
           </div>

           <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={onCancel} className="font-bold text-slate-400 hover:text-slate-600">
                Fermer
              </Button>
              {!isViewMode && (
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-10 rounded-2xl shadow-lg shadow-indigo-600/20 h-12 uppercase tracking-widest text-xs">
                  Valider Réglement
                </Button>
              )}
           </div>
        </div>
      </form>
    </div>
  );
}

function StatCard({ label, value, color, desc, highlight, isLoading }: any) {
  return (
    <div className={cn(
      "p-5 rounded-3xl border shadow-sm transition-all",
      highlight ? "bg-white border-rose-100 shadow-rose-100/50" : "bg-white border-slate-100 shadow-slate-100/50"
    )}>
       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
       {isLoading ? (
          <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-md mt-1"></div>
       ) : (
          <p className={cn("text-xl font-black mt-1", color)}>{value.toLocaleString()} DA</p>
       )}
       <p className="text-[9px] font-bold text-slate-400 italic mt-0.5">{desc}</p>
    </div>
  );
}
