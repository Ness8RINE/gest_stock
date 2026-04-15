"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  FileDown, 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Eye,
  MoreVertical
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

import { getReceiptDocuments } from "@/app/actions/receptions.actions";

export default function ReceptionsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [receptions, setReceptions] = useState<any[]>([]);

  React.useEffect(() => {
    getReceiptDocuments().then(res => {
      if (res.success) setReceptions(res.data || []);
    });
  }, []);

  const filteredReceptions = receptions.filter(r => 
    r.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex-none p-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              <FileDown size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Réceptions & Imports</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Gérez vos bons de réception et dossiers d'approche</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-9 gap-2">
              <Filter className="h-4 w-4" /> Filtres
            </Button>
            <Button size="sm" className="h-9 gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => router.push("/achats/receptions/create")}>
              <Plus className="h-4 w-4" /> Nouveau Dossier
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 pb-4 flex-none">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher par référence..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Dossier / Facture</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Date de réception</TableHead>
                <TableHead className="text-right">Total Valorisé (DA)</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceptions.map(rec => (
                <TableRow key={rec.id}>
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">{rec.reference}</TableCell>
                  <TableCell className="text-slate-500">{rec.orderRef || "Direct"}</TableCell>
                  <TableCell>{rec.supplier?.name || "N/A"}</TableCell>
                  <TableCell>{new Date(rec.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                    {rec.netTotal.toLocaleString()} DA
                  </TableCell>
                  <TableCell>
                    {rec.status === "VALIDATED" 
                      ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">Terminé</Badge>
                      : <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">Brouillon</Badge>
                    }
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 p-0 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 outline-none transition-colors">
                        <MoreVertical className="h-4 w-4 text-slate-500" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem className="cursor-pointer text-indigo-600">
                             <Eye className="mr-2 h-4 w-4" /> Voir le dossier
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
