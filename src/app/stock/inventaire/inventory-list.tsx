"use client";

import React, { useState, useMemo } from "react";
import { 
  Search, Package, Filter, Warehouse as WarehouseIcon, 
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, History 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InventoryLine = {
  quantity: number;
  batch: {
    batchNumber: string;
    expirationDate: string | null;
    unitCost: number;
  };
  warehouse: {
    name: string;
  };
};

type ProductStock = {
  id: string;
  designation: string;
  reference: string;
  unit: string;
  category: {
    name: string;
  };
  inventories: InventoryLine[];
};

type Props = {
  initialProducts: any[];
  warehouses: any[];
  categories: any[];
};

export default function InventoryList({ initialProducts, warehouses, categories }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Toggle row expansion
  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  // Filtrage et agrégation
  const filteredData = useMemo(() => {
    return (initialProducts as ProductStock[]).filter((p) => {
      const matchesSearch = p.designation.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.reference.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || p.category.name === selectedCategory;
      
      // Si on filtre par dépôt, on doit vérifier s'il a du stock dans ce dépôt précis
      if (selectedWarehouse !== "all") {
        return matchesSearch && matchesCategory && p.inventories.some(inv => inv.warehouse.name === selectedWarehouse);
      }
      
      return matchesSearch && matchesCategory;
    });
  }, [initialProducts, searchTerm, selectedCategory, selectedWarehouse]);

  // Statistiques
  const stats = useMemo(() => {
    let totalQty = 0;
    let totalValue = 0;
    let criticalItems = 0;
    filteredData.forEach(p => {
      const productInventories = selectedWarehouse === "all" 
        ? p.inventories 
        : p.inventories.filter(inv => inv.warehouse.name === selectedWarehouse);

      const sum = productInventories.reduce((acc, inv) => acc + inv.quantity, 0);
      const value = productInventories.reduce((acc, inv) => acc + (inv.quantity * inv.batch.unitCost), 0);
      
      totalQty += sum;
      totalValue += value;
      if (sum > 0 && sum < 10) criticalItems++;
    });
    return {
      totalRefs: filteredData.length,
      totalUnits: totalQty,
      totalValue,
      criticalItems
    };
  }, [filteredData, selectedWarehouse]);

  return (
    <div className="space-y-6">
      {/* HEADER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-md bg-white dark:bg-slate-950">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Références</CardTitle>
            <Package className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRefs}</div>
            <p className="text-xs text-slate-400 mt-1">Produits différents en stock</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white dark:bg-slate-950">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Total Unités</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUnits.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1">Pièces physiques cumulées</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white dark:bg-slate-950">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Alertes Stock Bas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.criticalItems}</div>
            <p className="text-xs text-slate-400 mt-1">Produits avec moins de 10 unités</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-emerald-600 dark:bg-emerald-900/50 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase opacity-80">Valeur Totale Stock</CardTitle>
            <History className="h-4 w-4 text-emerald-200" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalValue.toLocaleString()} DA</div>
            <p className="text-xs text-emerald-100 mt-1 opacity-80">Valorisation (Quantité × PMP)</p>
          </CardContent>
        </Card>
      </div>

      {/* FILTRES */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-950 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher une désignation ou référence..." 
            className="pl-9 bg-slate-50 dark:bg-slate-900 border-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v || "all")}>
              <SelectTrigger className="w-[180px] bg-slate-50 border-none">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes lles catégories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <WarehouseIcon className="h-4 w-4 text-slate-400" />
            <Select value={selectedWarehouse} onValueChange={(v) => setSelectedWarehouse(v || "all")}>
              <SelectTrigger className="w-[180px] bg-slate-50 border-none">
                <SelectValue placeholder="Dépôt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les dépôts</SelectItem>
                {warehouses.map(w => <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="font-bold text-slate-700 dark:text-slate-300">Produit / Référence</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-center">Unité</TableHead>
              <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Quantité Totale</TableHead>
              <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Valeur Totale</TableHead>
              <TableHead className="text-center w-[120px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center text-slate-400 italic">
                  Aucun produit trouvé dans l'inventaire.
                </TableCell>
              </TableRow>
            ) : filteredData.map((p) => {
              // Somme des quantités selon le filtre de dépôt
              const relevantInventories = selectedWarehouse === "all" 
                ? p.inventories 
                : p.inventories.filter(inv => inv.warehouse.name === selectedWarehouse);

              const totalQty = relevantInventories.reduce((acc, inv) => acc + inv.quantity, 0);
              const isExpanded = expandedRows.has(p.id);

              return (
                <React.Fragment key={p.id}>
                  <TableRow className="group hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 cursor-pointer transition-colors" onClick={() => toggleRow(p.id)}>
                    <TableCell className="text-center">
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-emerald-600" /> : <ChevronDown className="h-4 w-4 text-slate-300 group-hover:text-emerald-500" />}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{p.designation}</span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">{p.reference}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 border-none font-medium">
                        {p.category.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-slate-500 text-sm">
                      {p.unit}
                    </TableCell>
                    <TableCell className="text-right">
                       <span className={`text-lg font-black ${totalQty < 10 ? 'text-red-500' : 'text-emerald-700 dark:text-emerald-400'}`}>
                         {totalQty.toLocaleString()}
                       </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">
                       {relevantInventories.reduce((acc, inv) => acc + (inv.quantity * inv.batch.unitCost), 0).toLocaleString()} DA
                    </TableCell>
                    <TableCell className="text-center">
                       {totalQty === 0 ? (
                         <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-none">Rupture</Badge>
                       ) : totalQty < 10 ? (
                         <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Alerte</Badge>
                       ) : (
                         <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Disponible</Badge>
                       )}
                    </TableCell>
                  </TableRow>

                  {/* DETAILS (LOTS) */}
                  {isExpanded && (
                    <TableRow className="bg-slate-50/50 dark:bg-slate-900/30">
                      <TableCell colSpan={7} className="p-0">
                         <div className="p-4 pl-14 flex flex-col gap-2">
                           <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                             <History className="h-3 w-3" /> Répartition par Lots et Dépôts
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                             {relevantInventories.map((inv, idx) => (
                               <div key={idx} className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
                                 <div className="flex justify-between items-start">
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase">{inv.warehouse.name}</span>
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-300">{inv.quantity.toLocaleString()} <span className="text-[10px] font-normal">{p.unit}</span></span>
                                 </div>
                                 <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-50 dark:border-slate-900">
                                    <div className="flex flex-col">
                                       <span className="text-[10px] text-slate-400 uppercase tracking-tighter">PMP (Achat)</span>
                                       <span className="text-xs font-bold text-blue-600">{inv.batch.unitCost.toLocaleString()} DA</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                       <span className="text-[10px] text-slate-400 uppercase tracking-tighter">Sous-total</span>
                                       <span className="text-xs font-bold text-emerald-600">{(inv.quantity * inv.batch.unitCost).toLocaleString()} DA</span>
                                    </div>
                                 </div>
                                 <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                       <span className="text-[10px] text-slate-400">Lot N°</span>
                                       <span className="text-xs font-mono font-bold">{inv.batch.batchNumber}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                       <span className="text-[10px] text-slate-400">Expiration</span>
                                       <span className="text-xs font-medium">
                                          {inv.batch.expirationDate 
                                            ? new Date(inv.batch.expirationDate).toLocaleDateString()
                                            : "N/A"}
                                       </span>
                                    </div>
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
