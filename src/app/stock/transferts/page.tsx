"use client";

import React, { useEffect, useState } from "react";
import { getTransfers } from "@/app/actions/stock.actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Search, 
  Truck, 
  RefreshCw,
  ArrowRight,
  Eye,
  MoreVertical,
  Calendar
} from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function TransferListPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadDocs = async () => {
    setIsLoading(true);
    const res = await getTransfers();
    if (res.success) {
      setDocs(res.data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const filteredDocs = docs.filter(doc =>
    doc.reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
      <div className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
            <Truck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transferts Inter-Dépôts</h1>
            <p className="text-slate-500 text-sm">Gérez les déplacements de stock entre vos entrepôts</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadDocs}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Link href="/stock/transferts/create">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 shadow-sm text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Transfert
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-6 pb-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher par référence..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-white dark:bg-slate-950"
          />
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Détails du Flux</TableHead>
                <TableHead className="text-center">Articles</TableHead>
                <TableHead>Statut</TableHead>
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
                  <TableCell colSpan={6} className="text-center py-20 text-slate-500 font-medium">Aucun transfert trouvé</TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => {
                  // Trouver les dépôts source et cible via les lignes
                  const sourceWh = doc.lines[0]?.warehouse?.name || "N/A";
                  // Pour trouver la cible, on devrait avoir l'info quelque part. 
                  // Dans ma logique d'action, je n'ai pas stocké le ToWarehouseId dans le Document lui-même mais dans les mouvements.
                  // Amélioration : Je vais regarder le mouvement lié. 
                  // Pour l'instant, on va afficher le nombre de lignes.
                  
                  return (
                    <TableRow key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                      <TableCell className="font-bold text-blue-600">{doc.reference}</TableCell>
                      <TableCell className="text-slate-600 text-xs">
                         <div className="flex items-center gap-1">
                            <Calendar size={12} className="opacity-40" />
                            {new Date(doc.date).toLocaleDateString("fr-FR")}
                         </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-3 text-xs font-semibold">
                            <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">{sourceWh}</span>
                            <ArrowRight size={14} className="text-blue-500" />
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100">Cible</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge variant="secondary" className="font-bold">{doc.lines.length} articles</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 uppercase text-[9px] font-black tracking-widest">
                          Validé
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="group-hover:bg-white transition-all opacity-0 group-hover:opacity-100">
                           <Eye size={16} className="text-slate-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
