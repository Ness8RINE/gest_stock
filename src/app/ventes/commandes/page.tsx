"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Printer,
  ChevronDown
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSaleDocuments } from "@/app/actions/ventes.actions";

type Doc = {
  id: string;
  type: string;
  status: string;
  customer?: { name: string };
  grossTotal: number;
  netTotal: number;
  createdAt: Date;
  _count: { lines: number };
};

export default function CommandesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    setIsLoading(true);
    const res = await getSaleDocuments();
    if (res.success && res.data) {
      setDocs(res.data as any);
    }
    setIsLoading(false);
  };

  const getBadgeForType = (type: string) => {
    switch (type) {
      case "PROFORMA": return <Badge className="bg-slate-100 text-slate-700 border-slate-200">PROFORMA</Badge>;
      case "BL": return <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">BL (Livraison)</Badge>;
      case "BV": return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">BV (Comptoir)</Badge>;
      case "INVOICE": return <Badge className="bg-sky-100 text-sky-700 border-sky-200">FACTURE</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const filtered = docs.filter(d => 
    d.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (d.customer?.name || "Comptant").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex-none p-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Usine à Documents</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Gérez vos Proformas, Bons de Livraison et Factures</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-9 gap-2">
              <Filter className="h-4 w-4" /> Filtres
            </Button>
            <Button size="sm" className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push("/ventes/commandes/create")}>
              <Plus className="h-4 w-4" /> Nouveau Document
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 pb-4 flex-none">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher (Référence, Client)..." 
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
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-center">Articles</TableHead>
                <TableHead className="text-right">Net à payer (TTC)</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">Chargement...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">Aucun document existant.</TableCell>
                </TableRow>
              ) : filtered.map(doc => (
                <TableRow key={doc.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <TableCell>{getBadgeForType(doc.type)}</TableCell>
                  <TableCell className="text-slate-500">{new Date(doc.createdAt).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                    {doc.customer?.name || <span className="text-slate-400 italic">Passager (Comptant)</span>}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm text-slate-500">
                    {doc._count.lines} ligne(s)
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-white">
                    {doc.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} DA
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 p-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer">
                          <Eye className="mr-2 h-4 w-4" /> Consulter
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Printer className="mr-2 h-4 w-4" /> Imprimer A4
                        </DropdownMenuItem>
                        {doc.type === "PROFORMA" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer text-indigo-600 font-medium">
                              Transformer en BL
                            </DropdownMenuItem>
                          </>
                        )}
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
