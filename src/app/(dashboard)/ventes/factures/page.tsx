"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  getSaleDocuments, 
  deleteDocument, 
} from "@/actions/ventes.actions";
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
  Edit,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  FileCheck,
  FileDown
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type SortConfig = {
  key: "reference" | "date" | "netTotal";
  direction: "asc" | "desc" | null;
};

export default function FactureListPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "date", direction: "desc" });

  const loadDocs = async () => {
    setIsLoading(true);
    const res = await getSaleDocuments("INVOICE");
    if (res.success) {
      setDocs(res.data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette Facture ? Cela restaurera le stock si elle a été créée directement.")) return;
    const res = await deleteDocument(id);
    if (res.success) {
      toast.success("Facture supprimée");
      loadDocs();
    } else {
      toast.error(res.error);
    }
  };

  const handleSort = (key: SortConfig["key"]) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const sortedDocs = [...docs].sort((a, b) => {
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

  const filteredDocs = sortedDocs.filter(doc => {
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

  const SortIcon = ({ column }: { column: SortConfig["key"] }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />;
    return sortConfig.direction === "asc" ? <ArrowUp className="ml-2 h-3 w-3" /> : <ArrowDown className="ml-2 h-3 w-3" />;
  };

  const handleExportListPDF = () => {
    const doc = new jsPDF();
    const fN = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const now = new Date().toLocaleDateString("fr-FR");

    doc.setFontSize(20);
    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.text("LISTE DES FACTURES CLIENTS", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le: ${now}`, 14, 28);
    doc.text(`Nombre d'items: ${filteredDocs.length}`, 14, 33);

    autoTable(doc, {
      startY: 40,
      head: [["Référence", "Date", "Client", "Statut", "Montant TTC"]],
      body: filteredDocs.map(d => [
        d.reference || "-",
        new Date(d.date).toLocaleDateString("fr-FR"),
        d.customer?.name || "Client de passage",
        d.status,
        `${fN(d.netTotal)} DA`
      ]),
      headStyles: { fillColor: [5, 150, 105], fontSize: 10 },
      styles: { fontSize: 9 },
      columnStyles: {
        4: { halign: "right", fontStyle: "bold" }
      }
    });

    doc.save(`Factures_Clients_${now.replace(/\//g, "-")}.pdf`);
    toast.success("Liste PDF générée !");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
      <div className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
             <FileCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Factures Clients</h1>
            <p className="text-slate-500 text-sm">
               {filteredDocs.length} {filteredDocs.length > 1 ? 'factures trouvées' : 'facture trouvée'} sur {docs.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExportListPDF} className="border-red-200 text-red-600 hover:bg-red-50">
            <FileDown className="h-4 w-4 mr-2" />
            Exporter Liste PDF
          </Button>
          <Button variant="outline" size="sm" onClick={loadDocs}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Link href="/ventes/factures/create">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Facture
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-6 pb-4 flex flex-wrap items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher une facture..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-emerald-500"
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
            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
              <TableRow>
                <TableHead className="cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => handleSort("reference")}>
                  <div className="flex items-center">Référence <SortIcon column="reference" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => handleSort("date")}>
                  <div className="flex items-center">Date <SortIcon column="date" /></div>
                </TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => handleSort("netTotal")}>
                   <div className="flex items-center justify-end">Montant TTC <SortIcon column="netTotal" /></div>
                </TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-slate-400">Chargement des factures...</TableCell>
                </TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-slate-500">Aucune facture trouvée</TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                    <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">{doc.reference}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{new Date(doc.date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="font-medium">{doc.customer?.name || "Client de passage"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 font-semibold">
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
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Options Facture</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => generateProformaPDF(doc, 'open')}>
                              <Eye className="h-4 w-4 mr-2 text-slate-400" /> Consulter
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => generateProformaPDF(doc, 'save')}>
                              <Printer className="h-4 w-4 mr-2 text-slate-400" /> Imprimer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/ventes/factures/edit/${doc.id}`)}>
                              <Edit className="h-4 w-4 mr-2 text-emerald-500" /> Modifier
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
