"use client";

import React, { useState, useEffect } from "react";
import { getExpenses, deleteExpense } from "@/actions/finance.actions";
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  FileText, 
  Calendar,
  Tag,
  CreditCard,
  MoreVertical
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import ExpenseEditor from "./expense-editor";

export default function DepensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);

  const loadExpenses = async () => {
    setIsLoading(true);
    const res = await getExpenses();
    if (res.success) {
      setExpenses(res.data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer cette dépense ?")) return;
    const res = await deleteExpense(id);
    if (res.success) {
      setExpenses(prev => prev.filter(e => e.id !== id));
      toast.success("Dépense supprimée");
    }
  };

  const filteredExpenses = expenses.filter(e => 
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-rose-600 rounded-2xl shadow-lg shadow-rose-600/20 text-white">
            <Receipt size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dépenses</h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Frais de fonctionnement & charges</p>
          </div>
        </div>

        <Button 
          onClick={() => { setSelectedExpense(null); setIsEditorOpen(true); }}
          className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-600/20 px-6 font-black uppercase text-xs tracking-widest h-12 gap-2"
        >
          <Plus size={18} /> Nouvelle Dépense
        </Button>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Période</p>
           <h3 className="text-2xl font-black text-rose-600 mt-1">{totalAmount.toLocaleString()} DA</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre d'opérations</p>
             <h3 className="text-2xl font-black text-slate-800 mt-1">{filteredExpenses.length}</h3>
           </div>
           <Tag className="text-slate-200" size={32} />
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Rechercher une catégorie ou description..." 
            className="pl-10 h-11 bg-slate-50 border-none rounded-xl text-sm font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-11 rounded-xl border-slate-200 font-black text-xs uppercase gap-2 px-6">
          <Filter size={16} /> Filtres
        </Button>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-[120px] font-black text-[10px] uppercase text-slate-400">Date</TableHead>
              <TableHead className="font-black text-[10px] uppercase text-slate-400">Catégorie</TableHead>
              <TableHead className="font-black text-[10px] uppercase text-slate-400">Description</TableHead>
              <TableHead className="font-black text-[10px] uppercase text-slate-400">Mode</TableHead>
              <TableHead className="text-right font-black text-[10px] uppercase text-slate-400">Montant (DA)</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                 <TableCell colSpan={6} className="h-64 text-center">
                   <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                 </TableCell>
               </TableRow>
            ) : filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center opacity-20">
                  <Receipt size={48} className="mx-auto mb-2" />
                  <p className="font-black uppercase text-xs">Aucune dépense trouvée</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((expense) => (
                <TableRow key={expense.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-slate-500">
                    {format(new Date(expense.date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-rose-50 text-rose-600 border-none font-black text-[10px] uppercase px-3">
                      {expense.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-bold text-slate-600 truncate max-w-[200px]">
                    {expense.description || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <CreditCard size={14} />
                      {expense.paymentMethod}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-black text-slate-800">
                    {expense.amount.toLocaleString()} <span>DA</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={() => { setSelectedExpense(expense); setIsEditorOpen(true); }}
                      >
                        <Eye size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => handleDelete(expense.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                        <MoreVertical size={16} className="text-slate-300" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ExpenseEditor 
        isOpen={isEditorOpen} 
        onClose={() => setIsEditorOpen(false)} 
        onSuccess={loadExpenses}
        expense={selectedExpense}
      />
    </div>
  );
}
