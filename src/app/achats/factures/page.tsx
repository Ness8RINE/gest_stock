"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getPurchaseInvoices,
  deletePurchaseInvoice
} from "@/app/actions/factures-achats.actions";
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
  Search,
  Printer,
  Trash2,
  RefreshCw,
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit
} from "lucide-react";
import { Input } from "@/components/ui/input";
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

export default function PurchaseInvoicesListPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "date", direction: "desc" });

  const loadDocs = async () => {
    setIsLoading(true);
    const res = await getPurchaseInvoices();
    if (res.success) {
      setDocs(res.data || []);
    } else {
      toast.error(res.error || "Erreur de chargement");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette facture ? Cela annulera la liaison avec le Bon de Réception.")) return;
    const res = await deletePurchaseInvoice(id);
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

  const filteredDocs = sortedDocs.filter(doc =>
    doc.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCumule = filteredDocs.reduce((acc, doc) => acc + (doc.netTotal || 0), 0);

  const SortIcon = ({ column }: { column: SortConfig["key"] }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />;
    return sortConfig.direction === "asc" ? <ArrowUp className="ml-2 h-3 w-3" /> : <ArrowDown className="ml-2 h-3 w-3" />;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
      <div className="p-6 flex justify-between items-center sm:flex-row flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white items-center flex gap-2">
            Factures Fournisseur
          </h1>
          <p className="text-slate-500 text-sm">Consultez et gérez vos factures d'achats</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadDocs}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          {/* Nouveau bouton caché car on créé la facture via BR 
           * <Link href="/achats/factures/create">
           *    <Button size="sm" className="bg-slate-800">Nouvelle Facture</Button>
           * </Link>
           */}
        </div>
      </div>

      <div className="px-6 pb-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher (Référence, Fournisseur)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-lg border border-emerald-100 dark:border-emerald-900/50 font-medium">
          Total: {totalCumule.toLocaleString(undefined, { minimumFractionDigits: 2 })} DA
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => handleSort("reference")}>
                  <div className="flex items-center">Référence <SortIcon column="reference" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => handleSort("date")}>
                  <div className="flex items-center">Date <SortIcon column="date" /></div>
                </TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => handleSort("netTotal")}>
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
                  <TableCell colSpan={6} className="text-center py-20 text-slate-500">Aucune facture trouvée</TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                    <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">{doc.reference}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{new Date(doc.date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="font-medium">{doc.supplier?.name || "Fournisseur Inconnu"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        Validée
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
                            <DropdownMenuLabel>Options Facture</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => generateProformaPDF(doc, 'open')}>
                              <Eye className="h-4 w-4 mr-2 text-slate-400" /> Consulter
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => generateProformaPDF(doc, 'save')}>
                              <Printer className="h-4 w-4 mr-2 text-slate-400" /> Imprimer
                            </DropdownMenuItem>
                            {/* Pas d'édition de factures directes pour l'instant */}
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
      </div>
    </div>
  );
}
