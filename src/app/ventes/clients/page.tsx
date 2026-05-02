"use client";

import React, { useState } from "react";
import { Plus, FileText, FileDown, Upload, Users, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClientForm, ClientFormValues } from "./client-form";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getClients, createClient, updateClient, deleteClient } from "@/app/actions/clients.actions";

// Typage strict du client local
interface Client extends ClientFormValues {
  id: string;
}

const MOCK_CLIENTS: Client[] = [];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const load = async () => {
      const res = await getClients();
      if (res.success && res.data) {
        setClients(res.data as Client[]);
      } else {
        toast.error(res.error || "Erreur chargement clients");
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.rc && c.rc.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openCreate = () => { setEditTarget(null); setShowForm(true); };
  const openEdit = (client: Client) => { setEditTarget(client); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditTarget(null); };

  const handleSave = async (data: ClientFormValues) => {
    const loadingToast = toast.loading("Enregistrement en cours...");
    if (editTarget) {
      const res = await updateClient(editTarget.id, data);
      if (res.success && res.data) {
        setClients(prev => prev.map(c => c.id === editTarget.id ? res.data as Client : c));
        toast.success("✏️ Client modifié avec succès !", { id: loadingToast });
      } else {
        toast.error(res.error, { id: loadingToast });
      }
    } else {
      const res = await createClient(data);
      if (res.success && res.data) {
        setClients(prev => [res.data as Client, ...prev]);
        toast.success("✅ Client créé avec succès !", { id: loadingToast });
      } else {
        toast.error(res.error, { id: loadingToast });
      }
    }
    closeForm();
  };

  const handleDelete = async (client: Client) => {
    const loadingToast = toast.loading("Suppression...");
    const res = await deleteClient(client.id);
    if (res.success) {
      setClients(prev => prev.filter(c => c.id !== client.id));
      toast.success(`🗑️ "${client.name}" supprimé.`, { id: loadingToast });
    } else {
      toast.error(res.error, { id: loadingToast });
    }
    setDeleteTarget(null);
  };

  const handleExportCSV = () => {
    const headers = ["Nom", "Contact", "Téléphone", "Adresse", "Statut", "RC", "MF", "NIS", "AI"];
    const rows = clients.map(c => [c.name, c.contactPerson || "", c.phone || "", c.address || "", c.legalStatus || "", c.rc || "", c.mf || "", c.nis || "", c.ai || ""]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "clients_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export CSV généré !");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Liste des Clients - GestStock", 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [["Nom/Raison Sociale", "Contact", "Téléphone", "Statut", "RC", "MF"]],
      body: clients.map(c => [c.name, c.contactPerson || "-", c.phone || "-", c.legalStatus || "-", c.rc || "-", c.mf || "-"]),
      headStyles: { fillColor: [99, 102, 241] },
    });
    doc.save("clients_export.pdf");
    toast.success("PDF téléchargé !");
  };

  return (
    <div className="space-y-6">
      {/* Drawer form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={closeForm} />
          <div className="w-full max-w-[560px] bg-white dark:bg-slate-950 h-full overflow-y-auto shadow-2xl p-6 border-l border-slate-200 dark:border-slate-800">
            <ClientForm
              initialData={editTarget ?? undefined}
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
            <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-1">Supprimer ce client ?</h3>
            <p className="text-sm text-center text-slate-500 mb-6">
              <strong className="text-slate-700">{deleteTarget.name}</strong> sera supprimé définitivement.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 px-4 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Clients</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {clients.length} client{clients.length > 1 ? "s" : ""} enregistré{clients.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors">
            <FileDown className="h-3.5 w-3.5" /> CSV
          </button>
          <button onClick={handleExportPDF} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
            <FileText className="h-3.5 w-3.5 text-red-500" /> PDF
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold shadow-md shadow-indigo-500/30 transition-all duration-200">
            <Plus className="h-4 w-4" /> Nouveau Client
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <Input placeholder="Rechercher par nom, RC..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-white dark:bg-slate-950 border-slate-200 rounded-lg" />
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/60 to-violet-50/60 dark:from-indigo-950/20 dark:to-violet-950/20">
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">{filteredClients.length} résultat{filteredClients.length > 1 ? "s" : ""}</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70 dark:bg-slate-900/70 hover:bg-transparent border-b border-slate-100 dark:border-slate-800">
              <TableHead className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Raison Sociale</TableHead>
              <TableHead className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Contact</TableHead>
              <TableHead className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Statut</TableHead>
              <TableHead className="font-semibold text-slate-500 text-xs uppercase tracking-wider">RC / MF</TableHead>
              <TableHead className="text-right font-semibold text-slate-500 text-xs uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-36">
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                    <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                    <span className="text-sm">Chargement...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-36">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Users className="h-8 w-8 opacity-30" />
                    <span className="text-sm">Aucun client trouvé</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{client.name}</span>
                      <span className="text-xs text-slate-400 mt-0.5">{client.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 dark:text-slate-300">{client.contactPerson || "—"}</TableCell>
                  <TableCell>
                    <Badge className="bg-indigo-50 border border-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 font-medium text-xs">
                      {client.legalStatus || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs text-slate-500">
                      <span><strong className="font-medium text-slate-600">RC:</strong> {client.rc || "—"}</span>
                      <span><strong className="font-medium text-slate-600">MF:</strong> {client.mf || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(client)}
                        className="p-1.5 rounded-md text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                        title="Modifier"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(client)}
                        className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
