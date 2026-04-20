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
  ChevronDown,
  Trash2,
  RefreshCw,
  ArrowRightLeft,
  Wand2,
  FileEdit
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  getSaleDocuments, 
  deleteDocument, 
  transformDocToDoc, 
  wipeAllProformas 
} from "@/app/actions/ventes.actions";
import { toast } from "sonner";
import { generateProformaPDF } from "@/lib/pdf-generator";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileCheck
} from "lucide-react";

type Doc = {
  id: string;
  type: string;
  status: string;
  reference: string;
  customer?: { 
    name: string;
  };
  netTotal: number;
  date: string;
};

type SortConfig = {
  key: "reference" | "date" | "netTotal";
  direction: "asc" | "desc" | null;
};

export default function ProformaListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "date", direction: "desc" });

  const loadDocs = async () => {
    setIsLoading(true);
    const res = await getSaleDocuments("PROFORMA");
    if (res.success && res.data) {
      setDocs(res.data as any);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette proforma ?")) return;
    const res = await deleteDocument(id);
    if (res.success) {
      toast.success("Document supprimé.");
      loadDocs();
    } else {
      toast.error(res.error);
    }
  };

  const handleTransform = async (id: string, target: "BL" | "BV" | "INVOICE") => {
    const label = target === "BL" ? "Bon de Livraison" : target === "BV" ? "Bon de Vente" : "Facture";
    const t = toast.loading(`Transformation en ${label}...`);
    const res = await transformDocToDoc(id, target);
    if (res.success && res.data) {
      toast.success(`${label} créé avec succès : ${res.data?.reference}`, { id: t });
      loadDocs();
    } else {
      toast.error(res.error, { id: t });
    }
  };

  const handleWipe = async () => {
    if (!confirm("ATTENTION : Cela va supprimer TOUTES les proformas existantes. Continuer ?")) return;
    const res = await wipeAllProformas();
    if (res.success) {
      toast.success("Toutes les proformas ont été supprimées.");
      loadDocs();
    }
  };

  const handleSort = (key: SortConfig["key"]) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const sortedDocs = [...docs].sort((a: any, b: any) => {
    if (!sortConfig.direction) return 0;
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    if (sortConfig.key === "date") {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const filtered = sortedDocs.filter(d => {
    const matchesSearch = (d.reference || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (d.customer?.name || "Comptant").toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(d.date) >= new Date(startDate);
    }
    if (endDate) {
      // Pour inclure toute la journée de fin, on peut ajouter 23:59:59 ou comparer intelligemment
      const dDate = new Date(d.date);
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && dDate <= eDate;
    }

    return matchesSearch && matchesDate;
  });

  const SortIcon = ({ column }: { column: SortConfig["key"] }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />;
    return sortConfig.direction === "asc" ? <ArrowUp className="ml-2 h-3 w-3" /> : <ArrowDown className="ml-2 h-3 w-3" />;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex-none p-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 shadow-md">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Liste des Proformas</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {filtered.length} {filtered.length > 1 ? 'documents trouvés' : 'document trouvé'} sur {docs.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">

            <Button size="sm" variant="outline" className="h-9 gap-2" onClick={loadDocs}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
            </Button>
            <Button size="sm" className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-sm" onClick={() => router.push("/ventes/proforma/create")}>
              <Plus className="h-4 w-4" /> Nouvelle Proforma
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 pb-4 flex flex-wrap items-center gap-4">
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

      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="cursor-pointer hover:text-indigo-600" onClick={() => handleSort("reference")}>
                   <div className="flex items-center">Référence <SortIcon column="reference" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:text-indigo-600" onClick={() => handleSort("date")}>
                   <div className="flex items-center">Date <SortIcon column="date" /></div>
                </TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right cursor-pointer hover:text-indigo-600" onClick={() => handleSort("netTotal")}>
                   <div className="flex items-center justify-end">Montant TTC <SortIcon column="netTotal" /></div>
                </TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center text-slate-500">Chargement des données...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center flex flex-col items-center justify-center gap-2">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                       <FileText size={32} />
                    </div>
                    <span className="text-slate-500 font-medium">Aucune proforma trouvée.</span>
                    <Button variant="link" onClick={() => router.push("/ventes/proforma/create")}>Créer votre première proforma</Button>
                  </TableCell>
                </TableRow>
              ) : filtered.map(doc => (
                <TableRow key={doc.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <TableCell className="font-mono font-bold text-indigo-600 dark:text-indigo-400 underline decoration-indigo-200 underline-offset-4 decoration-2">
                    {doc.reference || "N/A"}
                  </TableCell>
                  <TableCell className="text-slate-500">{new Date(doc.date).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                    {doc.customer?.name || <span className="text-slate-400 italic">Passager (Comptant)</span>}
                  </TableCell>
                  <TableCell>
                     {doc.status === "VALIDATED" ? (
                       <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">TRANSFORMÉ</Badge>
                     ) : (
                       <Badge variant="outline" className="text-slate-500 border-slate-200">BROUILLON</Badge>
                     )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-white">
                    {doc.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} DA
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-indigo-50 hover:text-indigo-600 transition-colors border-none bg-transparent">
                          <ChevronDown className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => generateProformaPDF(doc, 'open')} className="cursor-pointer">
                            <Eye className="mr-2 h-4 w-4 text-slate-400" /> Consulter
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateProformaPDF(doc, 'save')} className="cursor-pointer">
                            <Printer className="mr-2 h-4 w-4 text-slate-400" /> Imprimer PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/ventes/proforma/edit/${doc.id}`)} className="cursor-pointer">
                            <FileEdit className="mr-2 h-4 w-4 text-indigo-500" /> Modifier
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="text-[10px] text-slate-400 font-bold uppercase">Transformation</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleTransform(doc.id, "BL")} className="text-indigo-600 font-semibold focus:bg-indigo-50">
                            <Wand2 className="mr-2 h-4 w-4" /> Transformer en BL
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTransform(doc.id, "BV")} className="text-emerald-600 font-semibold focus:bg-emerald-50">
                            <ArrowRightLeft className="mr-2 h-4 w-4" /> Transformer en BV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTransform(doc.id, "INVOICE")} className="text-amber-600 font-semibold focus:bg-amber-50">
                            <FileCheck className="mr-2 h-4 w-4" /> Transformer en Facture
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => handleDelete(doc.id)} className="text-red-600 focus:bg-red-50">
                            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
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

