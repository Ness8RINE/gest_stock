"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getPurchaseReturns,
  deletePurchaseReturn
} from "@/actions/avoirs-achats.actions";
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
  Printer,
  Trash2,
  RefreshCw,
  MoreVertical,
  Eye,
  Undo2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateProformaPDF } from "@/lib/pdf-generator";

export default function PurchaseReturnsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await getPurchaseReturns();
    if (res.success) {
      // Cast explicite pour satisfaire TypeScript et éviter les erreurs de type 'undefined'
      setDocs((res.data || []) as any[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Attention : Supprimer cet avoir va restaurer les quantités en stock. Continuer ?")) return;
    const res = await deletePurchaseReturn(id);
    if (res.success) {
      toast.success("Avoir supprimé et stock restauré avec succès.");
      load();
    } else {
      toast.error(res.error);
    }
  };

  const filtered = docs.filter(d => {
    const matchesSearch = d.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         d.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (startDate) matchesDate = matchesDate && new Date(d.date) >= new Date(startDate);
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(d.date) <= eDate;
    }
    return matchesSearch && matchesDate;
  });

  return (
    <div className="p-6 space-y-6 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 shadow-sm border border-orange-200 dark:border-orange-800">
            <Undo2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Avoirs Fournisseur</h1>
            <p className="text-sm text-slate-500">Gérez les retours marchandise vers vos fournisseurs</p>
          </div>
        </div>

        <Link 
          href="/achats/avoirs/create"
          className={cn(buttonVariants(), "bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20 gap-2 font-bold")}
        >
          <Plus className="h-4 w-4" /> Nouvel Avoir
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher par N° avoir ou fournisseur..." 
            className="pl-10 h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Du</span>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 w-40 bg-white dark:bg-slate-950 border-slate-200" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Au</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 w-40 bg-white dark:bg-slate-950 border-slate-200" />
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={load} disabled={loading} className="h-10 w-10 bg-white dark:bg-slate-950 border-slate-200">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden min-h-[400px]">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[150px] font-bold">Référence</TableHead>
              <TableHead className="w-[150px] font-bold">Date</TableHead>
              <TableHead className="font-bold">Fournisseur</TableHead>
              <TableHead className="text-center text-xs uppercase text-slate-400 font-bold">Lignes</TableHead>
              <TableHead className="text-right font-bold">Total TTC</TableHead>
              <TableHead className="w-[60px] text-right font-bold"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="h-64 text-center text-slate-500 font-medium">Récupération des avoirs...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-64 text-center text-slate-400 italic">Aucun document d'avoir trouvé.</TableCell></TableRow>
            ) : (
              filtered.map((doc) => (
                <TableRow key={doc.id} className="group hover:bg-orange-50/30 dark:hover:bg-orange-900/10 transition-colors">
                  <TableCell className="font-mono text-xs font-black text-orange-600">
                    {doc.reference}
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                     {new Date(doc.date).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-900 dark:text-slate-200">{doc.supplier?.name}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{doc.supplier?.address}</div>
                  </TableCell>
                  <TableCell className="text-center">
                     <Badge variant="outline" className="bg-white dark:bg-slate-900 text-[10px] font-bold border-slate-200">
                        {doc.lines?.length || 0} ITEMS
                     </Badge>
                  </TableCell>
                  <TableCell className="text-right font-black text-slate-900 dark:text-white">
                    {doc.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-400">DA</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity")}>
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Options</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => generateProformaPDF(doc, 'open')}>
                            <Eye className="h-4 w-4 mr-2 text-slate-400" /> Consulter (PDF)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateProformaPDF(doc, 'save')}>
                            <Printer className="h-4 w-4 mr-2 text-slate-400" /> Imprimer
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
              ))
            )}
          </TableBody>
        </Table>
        <div className="mt-2 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 pb-2">
          Total : {filtered.length} items
        </div>
      </div>
    </div>
  );
}
