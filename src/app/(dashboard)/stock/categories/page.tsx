"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Layers, 
  Plus, 
  Search, 
  Trash2,
  Edit2,
  Save
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/actions/categories.actions";

type Category = {
  id: string;
  name: string;
  description: string | null;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const res = await getCategories();
    if(res.success && res.data) {
      setCategories(res.data);
    } else {
      toast.error(res.error || "Erreur chargement catégories");
    }
    setIsLoading(false);
  };

  const openCreate = () => {
    setEditTarget(null);
    setFormData({ name: "", description: "" });
    setIsDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    setFormData({ name: cat.name, description: cat.description || "" });
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.name.trim()) return toast.error("Le nom est obligatoire");

    const t = toast.loading("Enregistrement...");
    const payload = { name: formData.name, description: formData.description || undefined };

    if (editTarget) {
      const res = await updateCategory(editTarget.id, payload);
      if(res.success && res.data) {
        setCategories(prev => prev.map(c => c.id === editTarget.id ? res.data : c));
        toast.success("Catégorie modifiée", { id: t });
        setIsDialogOpen(false);
      } else {
        toast.error(res.error, { id: t });
      }
    } else {
      const res = await createCategory(payload);
      if(res.success && res.data) {
        setCategories([...categories, res.data]);
        toast.success("Catégorie créée", { id: t });
        setIsDialogOpen(false);
      } else {
        toast.error(res.error, { id: t });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Êtes-vous sûr ? Les produits liés pourraient poser problème.")) return;
    
    const t = toast.loading("Suppression...");
    const res = await deleteCategory(id);
    if(res.success) {
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success("Catégorie supprimée.", { id: t });
    } else {
      toast.error(res.error, { id: t });
    }
  };

  const filtered = categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 animate-in fade-in duration-300">
      <div className="flex-none p-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              <Layers size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Catégories de Produits</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Gérez les familles de produits</p>
            </div>
          </div>
          <Button size="sm" className="h-9 gap-2 bg-blue-600 hover:bg-blue-700" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nouvelle Catégorie
          </Button>
        </div>
      </div>

      <div className="px-6 pb-4 flex-none">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-white dark:bg-slate-950 border-slate-200"
          />
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow>
                <TableHead>Nom Famille</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="h-32 text-center text-slate-500">Chargement...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                 <TableRow><TableCell colSpan={3} className="h-32 text-center text-slate-500">Aucune catégorie trouvée.</TableCell></TableRow>
              ) : (
                filtered.map(cat => (
                  <TableRow key={cat.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <TableCell className="font-semibold">{cat.name}</TableCell>
                    <TableCell className="text-slate-500">{cat.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} className="h-8 w-8 text-slate-500 hover:text-indigo-600">
                           <Edit2 className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} className="h-8 w-8 text-slate-500 hover:text-red-600">
                           <Trash2 className="h-4 w-4"/>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Modifier" : "Créer"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom de Catégorie *</label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Consommable Médical" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-blue-600 text-white"><Save className="h-4 w-4 mr-2" /> Valider</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
