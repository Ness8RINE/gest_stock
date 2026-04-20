"use client";

import React, { useEffect, useState } from "react";
import { getTransfers, deleteTransfer } from "@/app/actions/stock.actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { 
  Plus, 
  Search, 
  Truck, 
  RefreshCw,
  ArrowRight,
  Eye,
  MoreVertical,
  Calendar,
  Trash2,
  Package,
  MapPin
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function TransferListPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const loadDocs = async () => {
    setIsLoading(true);
    const res = await getTransfers();
    if (res.success) {
      setDocs(res.data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce transfert ? Le stock sera restauré dans le dépôt source.")) return;
    const t = toast.loading("Suppression du transfert...");
    const res = await deleteTransfer(id);
    if (res.success) {
      toast.success("Transfert supprimé avec succès", { id: t });
      loadDocs();
    } else {
      toast.error(res.error || "Erreur lors de la suppression", { id: t });
    }
  };

  const handleView = (doc: any) => {
    setSelectedDoc(doc);
    setIsViewOpen(true);
  };

  const filteredDocs = docs.filter(doc =>
    doc.reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
      <div className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
            <Truck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transferts Inter-Dépôts</h1>
            <p className="text-slate-500 text-sm">Gérez les déplacements de stock entre vos entrepôts</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadDocs}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Link href="/stock/transferts/create">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 shadow-sm text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Transfert
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-6 pb-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher par référence..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-white dark:bg-slate-950"
          />
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Détails du Flux</TableHead>
                <TableHead className="text-center">Articles</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-slate-400">Chargement...</TableCell>
                </TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-slate-500 font-medium">Aucun transfert trouvé</TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => {
                  const sourceWh = doc.lines[0]?.warehouse?.name || "N/A";
                  return (
                    <TableRow key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                      <TableCell className="font-bold text-blue-600">{doc.reference}</TableCell>
                      <TableCell className="text-slate-600 text-xs">
                         <div className="flex items-center gap-1">
                            <Calendar size={12} className="opacity-40" />
                            {new Date(doc.date).toLocaleDateString("fr-FR")}
                         </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-3 text-xs font-semibold">
                            <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">{sourceWh}</span>
                            <ArrowRight size={14} className="text-blue-500" />
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100">
                             {doc.stockMovements?.[0]?.warehouse?.name || "Inconnu"}
                            </span>
                         </div>
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge variant="secondary" className="font-bold">{doc.lines.length} articles</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 uppercase text-[9px] font-black tracking-widest">
                          Validé
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "h-8 w-8 p-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity")}>
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Options Transfert</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleView(doc)}>
                                <Eye className="h-4 w-4 mr-2 text-slate-400" /> Consulter
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem className="text-red-500 focus:bg-red-50" onClick={() => handleDelete(doc.id)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal de Consultation */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-950 rounded-3xl overflow-hidden border-none p-0">
          <DialogHeader className="p-8 bg-blue-600 text-white">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Truck size={24} />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight italic">
                  Détails du Transfert
                </DialogTitle>
                <DialogDescription className="text-xs font-bold text-white/70 uppercase tracking-widest">
                  Référence: {selectedDoc?.reference}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner">
               <div className="flex flex-col items-center gap-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase">Depuis</span>
                 <div className="flex items-center gap-2 text-blue-600">
                    <MapPin size={14} />
                    <span className="text-sm font-black">{selectedDoc?.lines?.[0]?.warehouse?.name}</span>
                 </div>
               </div>

               <ArrowRight className="text-blue-500" />

               <div className="flex flex-col items-center gap-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase">Vers</span>
                 <div className="flex items-center gap-2 text-emerald-600">
                    <MapPin size={14} />
                    <span className="text-sm font-black">{selectedDoc?.stockMovements?.[0]?.warehouse?.name}</span>
                 </div>
               </div>
            </div>

            <div className="space-y-4">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Package size={14} /> Liste des Articles
               </h4>
               <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                      <TableRow>
                        <TableHead className="font-bold text-xs uppercase">Produit</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Lot</TableHead>
                        <TableHead className="text-right font-bold text-xs uppercase">Quantité</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedDoc?.lines?.map((line: any) => (
                        <TableRow key={line.id}>
                          <TableCell className="font-bold text-xs">{line.product?.designation}</TableCell>
                          <TableCell className="text-xs font-mono">{line.batch?.batchNumber || "-"}</TableCell>
                          <TableCell className="text-right font-black text-blue-600">{line.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
               </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setIsViewOpen(false)} variant="outline" className="rounded-xl font-bold uppercase text-[10px] tracking-widest">
                Fermer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
