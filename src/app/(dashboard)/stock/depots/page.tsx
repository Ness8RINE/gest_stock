"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Building2, 
  MapPin, 
  Plus, 
  Search, 
  Trash2,
  Edit2,
  Box,
  X,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from "@/actions/depots.actions";

type Warehouse = {
  id: string;
  name: string;
  address: string | null;
  capacity: number | null;
};

export default function DepotsPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Warehouse | null>(null);
  
  const [formData, setFormData] = useState({ name: "", address: "", capacity: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const res = await getWarehouses();
    if(res.success && res.data) {
      setWarehouses(res.data);
    } else {
      toast.error(res.error || "Erreur lors du chargement des dépôts");
    }
    setIsLoading(false);
  };

  const openCreate = () => {
    setEditTarget(null);
    setFormData({ name: "", address: "", capacity: "" });
    setIsDialogOpen(true);
  };

  const openEdit = (depot: Warehouse) => {
    setEditTarget(depot);
    setFormData({ 
      name: depot.name, 
      address: depot.address || "", 
      capacity: depot.capacity ? String(depot.capacity) : "" 
    });
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.name.trim()) return toast.error("Le nom du dépôt est obligatoire");

    const t = toast.loading("Enregistrement...");
    
    const payload = {
      name: formData.name,
      address: formData.address || undefined,
      capacity: formData.capacity ? parseInt(formData.capacity) : undefined
    };

    if (editTarget) {
      const res = await updateWarehouse(editTarget.id, payload);
      if(res.success && res.data) {
        setWarehouses(prev => prev.map(w => w.id === editTarget.id ? res.data : w));
        toast.success("Dépôt modifié", { id: t });
        setIsDialogOpen(false);
      } else {
        toast.error(res.error, { id: t });
      }
    } else {
      const res = await createWarehouse(payload);
      if(res.success && res.data) {
        setWarehouses([...warehouses, res.data]);
        toast.success("Dépôt créé avec succès", { id: t });
        setIsDialogOpen(false);
      } else {
        toast.error(res.error, { id: t });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Êtes-vous sûr de vouloir supprimer ce dépôt ?")) return;
    
    const t = toast.loading("Suppression...");
    const res = await deleteWarehouse(id);
    if(res.success) {
      setWarehouses(prev => prev.filter(w => w.id !== id));
      toast.success("Dépôt supprimé.", { id: t });
    } else {
      toast.error(res.error, { id: t });
    }
  };

  const filtered = warehouses.filter(w => w.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 animate-in fade-in duration-300">
      <div className="flex-none p-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">
              <Building2 size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Dépôts & Magasins</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Gérez vos emplacements de stockage physique</p>
            </div>
          </div>
          <Button size="sm" className="h-9 gap-2 bg-orange-600 hover:bg-orange-700" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nouveau Dépôt
          </Button>
        </div>
      </div>

      <div className="px-6 pb-4 flex-none">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher un dépôt..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow>
                <TableHead>Nom du Dépôt</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Capacité</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500">Chargement...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                 <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500">Aucun dépôt trouvé.</TableCell>
                </TableRow>
              ) : (
                filtered.map(depot => (
                  <TableRow key={depot.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <TableCell className="font-medium flex items-center gap-2">
                       <Box className="h-4 w-4 text-slate-400" /> {depot.name}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {depot.address ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {depot.address}</span> : "-"}
                    </TableCell>
                    <TableCell>
                      {depot.capacity ? `${depot.capacity} Palettes` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(depot)} className="h-8 w-8 text-slate-500 hover:text-indigo-600">
                           <Edit2 className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(depot.id)} className="h-8 w-8 text-slate-500 hover:text-red-600">
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
            <DialogTitle>{editTarget ? "Modifier Dépôt" : "Créer un Dépôt"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nom du Dépôt *</label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Magasin Principal Rouiba" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Adresse / Localisation</label>
              <Input 
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})}
                placeholder="Ex: Zone Industrielle 5" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Capacité Modulaire (Optionnel)</label>
              <Input 
                type="number"
                value={formData.capacity} 
                onChange={e => setFormData({...formData, capacity: e.target.value})}
                placeholder="Capacité max" 
              />
            </div>
            <div className="pt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white">
                 <Save className="h-4 w-4 mr-2" /> Enregistrer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
