"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  createExpense, 
  uploadPaymentAttachment 
} from "@/actions/finance.actions";
import { 
  X, 
  Upload, 
  FileText, 
  Trash2, 
  Calendar, 
  CreditCard, 
  Tag,
  AlertCircle
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  "Loyer", 
  "Électricité", 
  "Eau", 
  "Internet/Téléphone", 
  "Carburant", 
  "Entretien", 
  "Salaire", 
  "Fournitures bureau", 
  "Impôts/Taxes", 
  "Achat Divers",
  "Autre"
];

const MODES = ["ESPECE", "CHEQUE", "VIREMENT", "VERSEMENT", "TRAITE"];

const expenseSchema = z.object({
  category: z.string().min(1, "Catégorie requise"),
  amount: z.coerce.number().positive("Montant invalide"),
  paymentMethod: z.string().min(1, "Mode requis"),
  date: z.string().min(1, "Date requise"),
  description: z.string().optional(),
  referenceNumber: z.string().optional(),
});

interface ExpenseEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expense?: any;
}

export default function ExpenseEditor({ isOpen, onClose, onSuccess, expense }: ExpenseEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: "",
      amount: 0,
      paymentMethod: "ESPECE",
      date: new Date().toISOString().split('T')[0],
      description: "",
      referenceNumber: "",
    }
  });

  useEffect(() => {
    if (expense) {
      reset({
        category: expense.category,
        amount: expense.amount,
        paymentMethod: expense.paymentMethod,
        date: new Date(expense.date).toISOString().split('T')[0],
        description: expense.description || "",
        referenceNumber: expense.referenceNumber || "",
      });
    } else {
      reset({
        category: "",
        amount: 0,
        paymentMethod: "ESPECE",
        date: new Date().toISOString().split('T')[0],
        description: "",
        referenceNumber: "",
      });
    }
  }, [expense, reset, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile));
    }
  };

  const onInvalid = (errors: any) => {
    console.error("Validation Errors:", errors);
    toast.error("Veuillez remplir tous les champs obligatoires");
  };

  const onSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      let attachmentUrl = "";
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await uploadPaymentAttachment(formData);
        if (uploadRes.success) {
          attachmentUrl = uploadRes.url || "";
        }
      }

      const res = await createExpense({
        ...values,
        id: expense?.id,
        date: new Date(values.date),
        attachmentUrl: attachmentUrl || expense?.attachmentUrl
      });

      if (res.success) {
        toast.success("Dépense enregistrée !");
        reset();
        setFile(null);
        setFilePreview(null);
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Erreur lors de l'enregistrement");
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
    }
    setIsSubmitting(false);
  };

  const selectedCategory = watch("category");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl w-[95vw] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-slate-50 flex flex-col max-h-[90vh]">
        <div className="bg-white p-10 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                <Tag size={24} />
             </div>
             <div>
                <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">
                  {expense ? "Détails de la Dépense" : "Nouvelle Dépense"}
                </DialogTitle>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                  {expense ? `Identifiant: ${expense.id}` : "Saisie des charges opérationnelles"}
                </p>
             </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-50 h-10 w-10">
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="p-8 space-y-8 overflow-y-auto overflow-x-hidden custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* CATEGORY & AMOUNT */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Catégorie de charge</label>
                <div className="grid grid-cols-2 gap-2">
                   {CATEGORIES.map(cat => (
                     <button
                        key={cat}
                        type="button"
                        onClick={() => setValue("category", cat)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border",
                          selectedCategory === cat 
                            ? "bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-600/20" 
                            : "bg-white border-slate-100 text-slate-500 hover:border-rose-200"
                        )}
                     >
                        {cat}
                     </button>
                   ))}
                </div>
                {errors.category && <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.category.message as string}</p>}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Montant à payer (DA)</label>
                <div className="relative">
                   <Input 
                    {...register("amount")}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    className="h-14 bg-white border-none shadow-sm rounded-2xl text-xl font-black text-slate-800 focus:ring-2 ring-rose-600/20"
                   />
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">DA</div>
                </div>
                {errors.amount && <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.amount.message as string}</p>}
              </div>
            </div>

            {/* DETAILS */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-3 font-bold">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1 mb-1">
                      <Calendar size={10} /> Date
                    </label>
                    <Input 
                      {...register("date")}
                      type="date"
                      className="h-11 bg-white border-none shadow-sm rounded-xl text-xs font-bold"
                    />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1 mb-1">
                      <CreditCard size={10} /> Mode
                    </label>
                    <select 
                      {...register("paymentMethod")}
                      className="w-full h-11 bg-white border-none shadow-sm rounded-xl px-4 text-xs font-bold outline-none ring-offset-background active:ring-2 ring-rose-600/20"
                    >
                      {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                 </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Référence (N° Facture/Reçu)</label>
                <Input 
                  {...register("referenceNumber")}
                  placeholder="EX: INV-2026-001"
                  className="h-11 bg-white border-none shadow-sm rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description / Notes</label>
                <Textarea 
                  {...register("description")}
                  placeholder="Plus de détails sur cette dépense..."
                  className="bg-white border-none shadow-sm rounded-2xl text-xs font-bold min-h-[100px] resize-none"
                />
              </div>

              {/* ATTACHMENT */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Pièce jointe (Justificatif)</label>
                
                {expense?.attachmentUrl && !file && (
                  <div className="mb-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="text-indigo-600" size={16} />
                      <span className="text-[10px] font-black text-indigo-700 uppercase">Justificatif existant</span>
                    </div>
                    <a 
                      href={expense.attachmentUrl} 
                      target="_blank" 
                      className="text-[9px] font-black text-indigo-600 bg-white px-3 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-colors uppercase"
                    >
                      Voir le fichier
                    </a>
                  </div>
                )}

                <div className="relative group">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                  />
                  <div className={cn(
                    "border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center transition-all",
                    file ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white group-hover:border-rose-300 group-hover:bg-rose-50/50"
                  )}>
                    {file ? (
                      <div className="flex items-center gap-3 w-full animate-in fade-in zoom-in duration-300">
                        <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                          <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-emerald-700 truncate">{file.name}</p>
                          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Fichier chargé</p>
                        </div>
                        <Button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); setFile(null); setFilePreview(null); }}
                          variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-100 hover:text-rose-700 rounded-lg shrink-0"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="text-slate-300 mb-2 group-hover:text-rose-400 group-hover:scale-110 transition-all" size={20} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Choisir un fichier</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 shrink-0">
             <Button 
                type="button" 
                variant="ghost" 
                onClick={onClose}
                className="h-12 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100"
             >
                Annuler
             </Button>
             <Button 
                type="submit"
                disabled={isSubmitting}
                className="h-12 px-10 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xl shadow-rose-600/30 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 group"
             >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>{expense ? "Enregistrer les modifications" : "Enregistrer la dépense"} <motion.span initial={{ x: 0 }} whileHover={{ x: 3 }}>→</motion.span></>
                )}
             </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
