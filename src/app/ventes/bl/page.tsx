"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  getSaleDocuments, 
  deleteDocument, 
  transformDocToDoc,
} from "@/app/actions/ventes.actions";
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
  FileCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { generateProformaPDF } from "@/lib/pdf-generator";
import { useRouter } from "next/navigation";

type SortConfig = {
  key: "reference" | "date" | "netTotal";
  direction: "asc" | "desc" | null;
};

export default function BLListPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "date", direction: "desc" });

  const loadDocs = async () => {
    setIsLoading(true);
    const res = await getSaleDocuments("BL");
    if (res.success) {
      setDocs(res.data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce Bon de Livraison ? Cela restaurera le stock automatiquement.")) return;
    const res = await deleteDocument(id);
    if (res.success) {
      toast.success("Document supprimé");
      loadDocs();
    } else {
      toast.error(res.error);
    }
  };

  const handleTransform = async (id: string) => {
    const t = toast.loading("Transformation en Facture...");
    const res = await transformDocToDoc(id, "INVOICE");
    if (res.success && res.data) {
      toast.success(`Facture créée avec succès : ${res.data?.reference}`, { id: t });
      loadDocs();
    } else {
      toast.error(res.error, { id: t });
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

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
      <div className="p-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bons de Livraison</h1>
          <p className="text-slate-500 text-sm">
            {filteredDocs.length} documents trouvés sur {docs.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadDocs}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Link href="/ventes/bl/create">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau BL
            </Button>
          </Link>
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
                  <TableCell colSpan={6} className="text-center py-10">Chargement...</TableCell>
                </TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500">Aucun document trouvé</TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                    <TableCell className="font-medium text-indigo-600 dark:text-indigo-400">{doc.reference}</TableCell>
                    <TableCell>{new Date(doc.date).toLocaleDateString()}</TableCell>
                    <TableCell>{doc.customer?.name || "Client de passage"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {doc.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} DA
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "h-8 w-8 p-0")}>
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => generateProformaPDF(doc, 'open')}>
                              <Eye className="h-4 w-4 mr-2 text-slate-400" /> Consulter
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => generateProformaPDF(doc, 'save')}>
                              <Printer className="h-4 w-4 mr-2 text-slate-400" /> Imprimer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/ventes/bl/edit/${doc.id}`)}>
                              <Edit className="h-4 w-4 mr-2 text-indigo-500" /> Modifier
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => handleTransform(doc.id)} className="text-amber-600 font-semibold focus:bg-amber-50">
                              <FileCheck className="h-4 w-4 mr-2" /> Facturer (Vers Facture)
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuGroup>
                            <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(doc.id)}>
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
      </div>
    </div>
  );
}
