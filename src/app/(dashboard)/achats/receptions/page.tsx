"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getReceiptDocuments,
  deleteReceipt
} from "@/actions/receptions.actions";
import { transformReceiptToInvoice } from "@/actions/factures-achats.actions";
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
  Truck,
  Edit,
  FileCheck
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

export default function ReceiptListPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "date", direction: "desc" });

  const loadDocs = async () => {
    setIsLoading(true);
    const res = await getReceiptDocuments();
    if (res.success) {
      setDocs((res.data || []) as any[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce Bon de Réception ? Cela déduira les quantités du stock !")) return;
    const res = await deleteReceipt(id);
    if (res.success) {
      toast.success("Document supprimé et stock mis à jour");
      loadDocs();
    } else {
      toast.error(res.error);
    }
  };

  const handleTransform = async (id: string) => {
    const t = toast.loading("Création de la facture...");
    const res = await transformReceiptToInvoice(id);
    if (res.success && res.data) {
      toast.success(`Facture créée avec succès : ${res.data.reference}`, { id: t });
      loadDocs();
      // Optionnel: router.push('/achats/factures')
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
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
            <Truck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bons de Réception</h1>
            <p className="text-slate-500 text-sm">
               {filteredDocs.length} {filteredDocs.length > 1 ? 'réceptions trouvées' : 'réception trouvée'} sur {docs.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadDocs}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Link href="/achats/receptions/create">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Réception
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
            className="pl-9 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-blue-500"
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
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <RefreshCw className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Montant Total Cumulé</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">{totalCumule.toLocaleString()} DA</p>
          </div>
        </div>

      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
              <TableRow>
                <TableHead className="cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort("reference")}>
                  <div className="flex items-center">Référence <SortIcon column="reference" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort("date")}>
                  <div className="flex items-center">Date <SortIcon column="date" /></div>
                </TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort("netTotal")}>
                  <div className="flex items-center justify-end">Montant Total <SortIcon column="netTotal" /></div>
                </TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-slate-400 font-medium">Récupération des données...</TableCell>
                </TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-slate-500">Aucun bon de réception trouvé</TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => {
                  const isFactured = doc.childDocuments?.some((c: any) => c.type === 'PURCHASE_INVOICE');
                  return (
                  <TableRow key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                    <TableCell className="font-bold text-blue-600 dark:text-blue-400">{doc.reference}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{new Date(doc.date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="font-medium">{doc.supplier?.name || "Fournisseur Inconnu"}</TableCell>
                    <TableCell>
                      {isFactured ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Facturé</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 font-semibold">
                          {doc.status}
                        </Badge>
                      )}
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
                            <DropdownMenuLabel>Options Réception</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => generateProformaPDF(doc, 'open')}>
                              <Eye className="h-4 w-4 mr-2 text-slate-400" /> Consulter
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => generateProformaPDF(doc, 'save')}>
                              <Printer className="h-4 w-4 mr-2 text-slate-400" /> Imprimer
                            </DropdownMenuItem>
                            {!isFactured && (
                              <DropdownMenuItem onClick={() => router.push(`/achats/receptions/edit/${doc.id}`)}>
                                <Edit className="h-4 w-4 mr-2 text-emerald-500" /> Modifier
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuGroup>
                          
                          {!isFactured && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => handleTransform(doc.id)} className="text-amber-600 font-semibold focus:bg-amber-50">
                                  <FileCheck className="h-4 w-4 mr-2" /> Facturer (Vers Facture)
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                              <DropdownMenuSeparator />
                              <DropdownMenuGroup>
                                <DropdownMenuItem className="text-red-500 focus:bg-red-50" onClick={() => handleDelete(doc.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </>
                          )}
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
        <div className="mt-2 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
          Total : {filteredDocs.length} items
        </div>
      </div>
    </div>
  );
}
