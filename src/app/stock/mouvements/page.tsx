"use client";

import React, { useEffect, useState } from "react";
import { getStockMovements } from "@/app/actions/stock.actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw,
  Box,
  Truck,
  User,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StockMovementPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadMovements = async () => {
    setIsLoading(true);
    const res = await getStockMovements();
    if (res.success) {
      setMovements(res.data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadMovements();
  }, []);

  const filteredMovements = movements.filter(m => 
    m.product.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.product.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
      <div className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
            <History size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Journal des Mouvements</h1>
            <p className="text-slate-500 text-sm">Audit complet des entrées và sorties de stock</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadMovements}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <div className="px-6 pb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher (Produit, Dépôt, Lot)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
              <TableRow>
                <TableHead>Date & Heure</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Dépôt</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead>Utilisateur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 text-slate-400">Chargement des mouvements...</TableCell>
                </TableRow>
              ) : filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 text-slate-500 font-medium">Aucun mouvement enregistré</TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((move) => (
                  <TableRow key={move.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group px-4">
                    <TableCell className="text-slate-500 text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 opacity-40" />
                        {new Date(move.date).toLocaleString("fr-FR", { 
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{move.product.designation}</span>
                          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">{move.product.reference}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 dark:bg-slate-900 border-slate-200">
                         {move.batch.batchNumber}
                       </Badge>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-semibold">
                          <Box size={14} className="opacity-40" />
                          {move.warehouse.name}
                       </div>
                    </TableCell>
                    <TableCell>
                       {move.type === "IN" ? (
                         <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                            <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                               <ArrowDownLeft size={10} />
                            </div>
                            Entrée
                         </div>
                       ) : (
                         <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest">
                            <div className="p-1 bg-rose-100 dark:bg-rose-900/30 rounded-full">
                               <ArrowUpRight size={10} />
                            </div>
                            Sortie
                         </div>
                       )}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-black text-sm",
                      move.type === "IN" ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {move.type === "IN" ? "+" : "-"}{move.quantity.toLocaleString()}
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2 text-slate-500 text-xs">
                          <User size={12} className="opacity-40" />
                          {move.user?.name || "Système"}
                       </div>
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

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
