"use client";

import React, { useEffect, useState } from "react";
import { getPayments } from "@/app/actions/finance.actions";
import { getPartners } from "@/app/actions/finance.actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Search, 
  CreditCard, 
  RefreshCw,
  FileText,
  Paperclip,
  CheckCircle2,
  Clock,
  User,
  ExternalLink,
  Trash2,
  Eye,
  MoreHorizontal,
  ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import PaymentEditor from "./payment-editor";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deletePayment } from "@/app/actions/finance.actions";
import { toast } from "sonner";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [partners, setPartners] = useState<{customers: any[], suppliers: any[]}>({customers: [], suppliers: []});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const loadData = async () => {
    setIsLoading(true);
    const [pRes, partRes] = await Promise.all([
      getPayments(),
      getPartners()
    ]);
    if (pRes.success) setPayments(pRes.data || []);
    if (partRes.success) setPartners(partRes.data as any);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteWithId = async (id: string) => {
    const t = toast.loading("Suppression du règlement...");
    const res = await deletePayment(id);
    if (res.success) {
      toast.success("Règlement supprimé", { id: t });
      loadData();
    } else {
      toast.error(res.error || "Erreur lors de la suppression", { id: t });
    }
  };

  const filteredPayments = payments.filter(p => {
    const pName = (p.customer?.name || p.supplier?.name || "").toLowerCase();
    const ref = (p.referenceNumber || "").toLowerCase();
    return pName.includes(searchTerm.toLowerCase()) || ref.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
      <div className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
            <CreditCard size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Paiements & Lettrage</h1>
            <p className="text-slate-500 text-sm">Gestion des règlements et suivi des factures</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          
          <Dialog open={isEditorOpen} onOpenChange={(open) => {
            setIsEditorOpen(open);
            if (!open) setSelectedPayment(null);
          }}>
            <DialogTrigger render={
              <Button 
                size="sm" 
                className="bg-indigo-600 hover:bg-indigo-700 shadow-sm text-white rounded-xl px-5"
                onClick={() => setSelectedPayment(null)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Enregistrer un Règlement
              </Button>
            } />
            <DialogContent className="max-w-4xl sm:max-w-4xl h-[85vh] p-0 overflow-hidden rounded-3xl border-none flex flex-col">
               <PaymentEditor 
                  partners={partners} 
                  selectedPayment={selectedPayment}
                  onSuccess={() => {
                    setIsEditorOpen(false);
                    setSelectedPayment(null);
                    loadData();
                  }}
                  onCancel={() => {
                    setIsEditorOpen(false);
                    setSelectedPayment(null);
                  }}
               />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="px-6 pb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Chercher par nom ou n° de pièce..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
          />
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Partenaire</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Affectation</TableHead>
                <TableHead className="w-[60px] text-center">PJ</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 text-slate-400 font-medium">Chargement des données financiers...</TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 text-slate-500 font-medium">Aucun paiement enregistré</TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                    <TableCell className="text-slate-500 text-xs font-bold">
                      {new Date(p.date).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black",
                            p.customer ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"
                          )}>
                             {p.customer ? "CL" : "FR"}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white truncate">{p.customer?.name || p.supplier?.name}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <span className="font-mono text-[10px] text-slate-500">{p.referenceNumber || "N/A"}</span>
                    </TableCell>
                    <TableCell>
                       <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize text-[10px]">
                         {p.paymentMethod}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-indigo-600 text-sm">
                      {p.amount.toLocaleString()} DA
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {p.matches.length > 0 ? (
                            p.matches.map((m: any) => (
                              <Badge key={m.id} variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-100 flex items-center gap-1">
                                <CheckCircle2 size={8} /> {m.document.reference}
                              </Badge>
                            ))
                          ) : (
                             <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-100 flex items-center gap-1">
                                <Clock size={8} /> Acompte
                             </Badge>
                          )}
                       </div>
                    </TableCell>
                    <TableCell className="text-center">
                       {p.attachmentUrl ? (
                         <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" onClick={() => window.open(p.attachmentUrl, '_blank')}>
                            <Paperclip size={14} className="text-indigo-600" />
                         </Button>
                       ) : (
                         <span className="text-slate-200 text-[10px]">—</span>
                       )}
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger render={
                             <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100">
                                <MoreHorizontal className="h-4 w-4" />
                             </Button>
                          } />
                          <DropdownMenuContent align="end" className="w-40 rounded-xl border-slate-100 shadow-xl">
                             <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-[10px] uppercase font-black text-slate-400">Options</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-xs font-bold gap-2 focus:bg-indigo-50 focus:text-indigo-600" onClick={() => {
                                  setSelectedPayment(p);
                                  setIsEditorOpen(true);
                                }}>
                                   <Eye className="h-3.5 w-3.5" /> Consulter
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                 className="text-xs font-bold gap-2 text-rose-600 focus:bg-rose-50 focus:text-rose-600"
                                 onClick={() => {
                                   if (window.confirm("Êtes-vous sûr de vouloir supprimer ce règlement ? Cette action est irréversible et annulera le lettrage associé.")) {
                                     handleDeleteWithId(p.id);
                                   }
                                 }}
                                >
                                   <Trash2 className="h-3.5 w-3.5" /> Supprimer
                                </DropdownMenuItem>
                             </DropdownMenuGroup>
                          </DropdownMenuContent>
                       </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
