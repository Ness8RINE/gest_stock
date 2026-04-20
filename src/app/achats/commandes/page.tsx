"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getPurchaseOrders,
  deletePurchaseOrder
} from "@/app/actions/commandes-fournisseurs.actions";
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  Edit,
  ArrowRight
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

type SortConfig = {
  key: "reference" | "date" | "netTotal";
  direction: "asc" | "desc" | null;
};

export default function PurchaseOrderListPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "date", direction: "desc" });

  const loadDocs = async () => {
    setIsLoading(true);
    const res = await getPurchaseOrders();
    if (res.success) {
      setDocs((res.data || []) as any[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleDelete = async (id: string, isTransformed: boolean) => {
    if (isTransformed) {
       return toast.error("Impossible de supprimer une commande transformée en Bon de Réception.");
    }
    if (!confirm("Supprimer cette commande fournisseur ?")) return;
    const res = await deletePurchaseOrder(id);
    if (res.success) {
      toast.success("Commande supprimée avec succès");
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
                         doc.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
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

  const SortIcon = ({ column }: { column: SortConfig["key"] }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />;
    return sortConfig.direction === "asc" ? <ArrowUp className="ml-2 h-3 w-3" /> : <ArrowDown className="ml-2 h-3 w-3" />;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
      <div className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Commandes Fournisseur</h1>
            <p className="text-slate-500 text-sm">
               {filteredDocs.length} {filteredDocs.length > 1 ? 'commandes trouvées' : 'commande trouvée'} sur {docs.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadDocs}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Link href="/achats/commandes/create">
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 shadow-sm text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Commande
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-6 pb-4 flex flex-wrap items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher (Référence, Fournisseur)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-orange-500"
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
        <div className="flex items-center gap-4 bg-white dark:bg-slate-950 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Cumulé (Net)</span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-200 tracking-tight">
              {totalCumule.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-medium text-slate-500">DA</span>
            </span>
          </div>
        </div>

      <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col min-h-0">
        <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1 overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1 h-full relative">
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80 sticky top-0 z-10 backdrop-blur-sm">
                <TableRow className="hover:bg-transparent border-b-slate-200 dark:border-b-slate-800">
                  <TableHead className="w-[12%] py-3">Statut</TableHead>
                  <TableHead className="w-[15%] py-3 cursor-pointer hover:text-orange-600 transition-colors" onClick={() => handleSort("reference")}>
                    <div className="flex items-center">Référence <SortIcon column="reference" /></div>
                  </TableHead>
                  <TableHead className="flex-1 py-3 text-left">Fournisseur</TableHead>
                  <TableHead className="w-[12%] py-3 cursor-pointer hover:text-orange-600 transition-colors" onClick={() => handleSort("date")}>
                    <div className="flex items-center">Date <SortIcon column="date" /></div>
                  </TableHead>
                  <TableHead className="w-[8%] py-3 text-center">Nbr. Articles</TableHead>
                  <TableHead className="w-[15%] py-3 text-right cursor-pointer hover:text-orange-600 transition-colors" onClick={() => handleSort("netTotal")}>
                    <div className="flex items-center justify-end">Total TTC <SortIcon column="netTotal" /></div>
                  </TableHead>
                  <TableHead className="w-[80px] py-3 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="p-4"><div className="h-8 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredDocs.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={7} className="h-64 text-center">
                       <span className="text-slate-500 font-medium italic">Aucune commande trouvée</span>
                     </TableCell>
                  </TableRow>
                ) : (
                  filteredDocs.map((doc) => {
                    return (
                    <TableRow key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                      <TableCell className="py-2.5">
                         {doc.status === "VALIDATED" ? (
                           <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Validée</Badge>
                        ) : (
                           <Badge variant="secondary">{doc.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2 font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {doc.reference}
                      </TableCell>
                      <TableCell className="py-2">
                         <div className="font-semibold text-slate-900 dark:text-slate-100">{doc.supplier?.name || "Fournisseur inconnu"}</div>
                      </TableCell>
                      <TableCell className="py-2 text-slate-600 dark:text-slate-400 text-sm">
                        {new Date(doc.date).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <Badge variant="outline" className="bg-slate-100/50">{doc.lines?.length || 0}</Badge>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                         <div className="font-bold text-slate-900 dark:text-slate-100">
                           {(doc.netTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </div>
                      </TableCell>
                        <TableCell className="py-2 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost" }), "h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800")}>
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 font-medium">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel className="text-xs text-slate-400 uppercase tracking-wider">Actions Commande</DropdownMenuLabel>
                                <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/achats/commandes/${doc.id}`)}>
                                  <Edit className="mr-2 h-4 w-4" /> Modifier
                                </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => generateProformaPDF(doc, 'open')}>
                                 <Eye className="mr-2 h-4 w-4 text-slate-500" /> Consulter PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => generateProformaPDF(doc, 'save')}>
                                 <Printer className="mr-2 h-4 w-4 text-slate-500" /> Imprimer
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem className="text-red-500 hover:text-red-600 focus:text-red-600 cursor-pointer focus:bg-red-50 py-2" onClick={() => handleDelete(doc.id, false)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="mt-2 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
          Total : {filteredDocs.length} items
        </div>
      </div>
    </div>
  );
}
