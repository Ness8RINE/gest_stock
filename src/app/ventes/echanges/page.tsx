"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getExchanges, deleteExchange } from "@/app/actions/echanges.actions";
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
  Plus, Search, Printer, Trash2, RefreshCw, MoreVertical, Eye, RefreshCcw, Edit
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
import { useRouter } from "next/navigation";

export default function ExchangeListPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadDocs = async () => {
    setIsLoading(true);
    const res = await getExchanges();
    if (res.success) {
      setDocs((res.data || []) as any[]);
    }
    setIsLoading(false);
  };

  useEffect(() => { loadDocs(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet échange ? Les stocks IN/OUT seront annulés !")) return;
    const res = await deleteExchange(id);
    if (res.success) {
      toast.success("Échange supprimé et stocks restaurés.");
      loadDocs();
    } else {
      toast.error(res.error);
    }
  };

  const filteredDocs = docs.filter(doc =>
    doc.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
      <div className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-200">
            <RefreshCcw size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-whitetracking-tight">Bons d'Échange</h1>
            <p className="text-slate-500 text-sm italic font-medium">Gestion des échanges produits clients (IN/OUT)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadDocs} disabled={isLoading} className="bg-white">
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Actualiser
          </Button>
          <Link href="/ventes/echanges/create">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 text-white font-bold gap-2">
              <Plus className="h-4 w-4" />
              Nouvel Échange
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-6 pb-4 flex gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Référence, Client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50 sticky top-0 z-10 border-b">
              <TableRow>
                <TableHead className="font-bold text-xs uppercase text-slate-500">Référence</TableHead>
                <TableHead className="font-bold text-xs uppercase text-slate-500">Date</TableHead>
                <TableHead className="font-bold text-xs uppercase text-slate-500">Client</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase text-slate-500">Flux (Items)</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-slate-500">Différence Nette</TableHead>
                <TableHead className="w-[80px] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-400 font-medium tracking-widest">CHARGEMENT EN COURS...</TableCell></TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-400 font-semibold italic">AUCUN ÉCHANGE ENREGISTRÉ</TableCell></TableRow>
              ) : (
                filteredDocs.map((doc) => (
                  <TableRow key={doc.id} className="group hover:bg-indigo-50/20 transition-colors border-slate-100">
                    <TableCell className="font-black text-indigo-600 dark:text-indigo-400 font-mono text-xs">{doc.reference || `ECH-${doc.id.slice(-4).toUpperCase()}`}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 font-medium">{new Date(doc.date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-slate-200">{doc.customer?.name || "Client de passage"}</TableCell>
                    <TableCell className="text-center">
                       <div className="flex items-center justify-center gap-2">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-black">{doc.lines?.length || 0} ITEMS</Badge>
                       </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-slate-900">
                       <span className={cn(
                          "px-3 py-1 rounded-lg",
                          doc.netTotal >= 0 ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
                       )}>
                          {Math.abs(doc.netTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })} DA
                          <span className="text-[10px] ml-2 opacity-60 uppercase">{doc.netTotal >= 0 ? "RESTE À PAYER" : "À REMBOURSER"}</span>
                       </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity")}>
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Actions Échange</DropdownMenuLabel>
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
      </div>
    </div>
  );
}
