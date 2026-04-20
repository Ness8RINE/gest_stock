"use client";

import React, { useState } from "react";
import { Plus, FileText, FileDown, Upload, PackageSearch, Pencil, Trash2, Box, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProductForm, ProductFormValues } from "./product-form";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/actions/produits.actions";
import { getCategories } from "@/actions/categories.actions";

// Typage strict
interface Product extends ProductFormValues {
  id: string;
}

const MOCK_PRODUCTS: Product[] = [];

export default function ProduitsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, { label: string, color: string }>>({});
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const load = async () => {
      // 1. Charger les atégories
      const catRes = await getCategories();
      if (catRes.success && catRes.data) {
        setCategories(catRes.data as {id: string, name: string}[]);
        const map: Record<string, { label: string, color: string }> = {};
        const colors = [
          "bg-blue-100 text-blue-700 border-blue-200", 
          "bg-amber-100 text-amber-700 border-amber-200",
          "bg-emerald-100 text-emerald-700 border-emerald-200",
          "bg-purple-100 text-purple-700 border-purple-200",
          "bg-pink-100 text-pink-700 border-pink-200",
          "bg-rose-100 text-rose-700 border-rose-200",
        ];
        catRes.data.forEach((c: any, index: number) => {
          map[c.id] = {
            label: c.name,
            color: colors[index % colors.length] + " dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
          };
        });
        setCategoryMap(map);
      }

      // 2. Charger les produits
      const prodRes = await getProducts();
      if (prodRes.success && prodRes.data) {
        setProducts(prodRes.data as Product[]);
      } else {
        toast.error(prodRes.error || "Erreur chargement produits");
      }
      setIsLoading(false);
    };
    load();
  }, []);
  const openCreate = () => { setEditTarget(null); setShowForm(true); };
  const openEdit = (p: Product) => { setEditTarget(p); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditTarget(null); };

  const filtered = products.filter(p =>
    p.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (data: ProductFormValues) => {
    const loadingToast = toast.loading("Enregistrement en cours...");
    if (editTarget) {
      const res = await updateProduct(editTarget.id, data);
      if (res.success && res.data) {
        setProducts(prev => prev.map(p => p.id === editTarget.id ? res.data as Product : p));
        toast.success("✏️ Produit modifié avec succès !", { id: loadingToast });
      } else {
        toast.error(res.error, { id: loadingToast });
      }
    } else {
      const res = await createProduct(data);
      if (res.success && res.data) {
        setProducts(prev => [res.data as Product, ...prev]);
        toast.success("✅ Produit créé avec succès !", { id: loadingToast });
      } else {
        toast.error(res.error, { id: loadingToast });
      }
    }
    closeForm();
  };

  const handleDelete = async (p: Product) => {
    const loadingToast = toast.loading("Suppression...");
    const res = await deleteProduct(p.id);
    if (res.success) {
      setProducts(prev => prev.filter(item => item.id !== p.id));
      toast.success(`🗑️ "${p.designation}" supprimé.`, { id: loadingToast });
    } else {
      toast.error(res.error, { id: loadingToast });
    }
    setDeleteTarget(null);
  };

  const handleExportCSV = () => {
    const headers = ["Référence", "Désignation", "Prix Achat", "Prix Vente", "TVA", "Pièces/Carton", "Boites/Carton"];
    const rows = products.map(p => [p.reference, p.designation, p.purchasePrice, p.salePrice, p.tvaRate, p.piecesPerCarton, p.boxesPerCarton]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "produits_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export CSV généré !");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Catalogue Produits - GestStock", 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [["Réf", "Désignation", "U.", "Colisage", "Prix Vente HT"]],
      body: products.map(p => [p.reference, p.designation, p.unit, `${p.piecesPerCarton || "-"} pcs`, `${p.salePrice} DZD`]),
      headStyles: { fillColor: [14, 165, 233] }, // Sky blue
    });
    doc.save("produits_export.pdf");
    toast.success("PDF téléchargé !");
  };

  const formatPrice = (p: number) => new Intl.NumberFormat("fr-DZ", { style: "currency", currency: "DZD" }).format(p).replace("DZD", "DA");

  return (
    <div className="space-y-6">
      {/* Drawer form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={closeForm} />
          <div className="w-full max-w-[560px] bg-white dark:bg-slate-950 h-full overflow-y-auto shadow-2xl p-6 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right-5 duration-200">
            <ProductForm
              initialData={editTarget ?? undefined}
              categories={categories}
              onSubmit={handleSave}
              onCancel={closeForm}
            />
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-1">Supprimer ce produit ?</h3>
            <p className="text-sm text-center text-slate-500 mb-6">
              <strong className="text-slate-700 dark:text-slate-200">{deleteTarget.designation}</strong> sera retiré du catalogue.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 px-4 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteTarget)} className="flex-1 py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 shadow-lg shadow-sky-500/30">
            <PackageSearch className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Catalogue Produits</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {products.length} produit{products.length > 1 ? "s" : ""} référencé{products.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition-colors">
            <FileDown className="h-3.5 w-3.5" /> CSV
          </button>
          <button onClick={handleExportPDF} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
            <FileText className="h-3.5 w-3.5 text-red-500" /> PDF
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white text-sm font-semibold shadow-md shadow-sky-500/30 transition-all duration-200">
            <Plus className="h-4 w-4" /> Nouveau Produit
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <Input placeholder="Rechercher par désignation ou référence..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-white dark:bg-slate-950 border-slate-200 rounded-lg" />
        </div>

      </div>

      {/* Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50/60 to-sky-50/60 dark:from-blue-950/20 dark:to-sky-950/20">
          <p className="text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-widest">{filtered.length} produit{filtered.length > 1 ? "s" : ""}</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70 dark:bg-slate-900/70 hover:bg-transparent border-b border-slate-100 dark:border-slate-800">
              <TableHead className="font-semibold text-slate-500 text-xs uppercase tracking-wider w-16">Réf.</TableHead>
              <TableHead className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Désignation</TableHead>
              <TableHead className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Type / Unité</TableHead>
              <TableHead className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Colisage</TableHead>
              <TableHead className="font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Prix de Vente</TableHead>
              <TableHead className="text-right font-semibold text-slate-500 text-xs uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-36">
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                    <span className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></span>
                    <span className="text-sm">Chargement...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-36">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Box className="h-8 w-8 opacity-30" />
                    <span className="text-sm">Aucun produit trouvé</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const badgeInfo = categoryMap[p.categoryId] || { label: "INCONNU", color: "bg-slate-100 text-slate-700 border-slate-200" };
                return (
                  <TableRow key={p.id} className="hover:bg-sky-50/30 dark:hover:bg-sky-950/10 transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0 group">
                    <TableCell>
                      <span className="text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                        {p.reference}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">{p.designation}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${badgeInfo.color}`}>
                          {badgeInfo.label}
                        </span>
                        <span className="text-xs text-slate-500">{p.unit}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Box className="h-4 w-4 text-amber-500/70" />
                        <div className="flex flex-col text-xs text-slate-600 dark:text-slate-400 font-medium">
                          <span>{p.piecesPerCarton} Pièces/Carton</span>
                          <span className="opacity-70">{p.boxesPerCarton} Boite(s)/Carton</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-bold text-sky-700 dark:text-sky-400">{formatPrice(p.salePrice)}</span>
                        <div className="flex items-center gap-1.5 opacity-60">
                          <Info className="h-3 w-3" />
                          <span className="text-[10px] font-mono whitespace-nowrap">TVA {p.tvaRate}%</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-md text-sky-600 hover:text-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
