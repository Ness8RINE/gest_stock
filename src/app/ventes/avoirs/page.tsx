"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getSaleReturns,
  deleteSaleReturn
} from "@/app/actions/avoirs-ventes.actions";
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
  Undo2,
  Edit
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
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { generateProformaPDF } from "@/lib/pdf-generator";
import { useRouter } from "next/navigation";

export default function SaleReturnListPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadDocs = async () => {
    setIsLoading(true);
    const res = await getSaleReturns();
    if (res.success) {
      setDocs(res.data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet avoir ? Le stock sera déduit !")) return;
    const res = await deleteSaleReturn(id);
    if (res.success) {
      toast.success("Avoir supprimé");
      loadDocs();
    } else {
      toast.error(res.error);
    }
  };

  const filteredDocs = docs.filter(doc => {
    const matchesSearch = doc.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (startDate) matchesDate = matchesDate && new Date(doc.date) >= new Date(startDate);
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(doc.date) <= eDate;
    }
    return matchesSearch && matchesDate;
  });

  const totalCumule = filteredDocs.reduce((acc, doc) => acc + (doc.netTotal || 0), 0);

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
      <div className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
            <Undo2 size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Avoirs Clients</h1>
            <p className="text-slate-500 text-sm">Gérez les retours de marchandises et remboursements</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadDocs}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Link href="/ventes/avoirs/create">
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 shadow-sm text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nouvel Avoir
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-6 pb-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-4 w-full">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher (Référence, Client)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
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
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setStartDate(""); setEndDate(""); }} className="h-10 text-slate-400 hover:text-slate-600">
                Effacer
              </Button>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-md">
            <Badge variant="outline" className="border-orange-200 text-orange-600 bg-orange-50">Total</Badge>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Montant Total des Avoirs</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">{totalCumule.toLocaleString()} DA</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Montant TTC</TableHead>
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
                  <TableCell colSpan={6} className="text-center py-20 text-slate-500">Aucun avoir trouvé</TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                    <TableCell className="font-bold text-orange-600 dark:text-orange-400">{doc.reference}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{new Date(doc.date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="font-medium">{doc.customer?.name || "Client de passage"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 font-semibold uppercase text-[10px]">
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 dark:text-white">
                      {doc.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} DA
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity")}>
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Options Avoir</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => generateProformaPDF(doc, 'open')}>
                              <Eye className="h-4 w-4 mr-2 text-slate-400" /> Consulter
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
        </div>
        <div className="mt-2 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
          Total : {filteredDocs.length} items
        </div>
      </div>
    </div>
  );
}
