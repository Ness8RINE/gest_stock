"use client";

import React, { useState, useEffect } from "react";
import { 
  getJournalEntries, 
  getPartners 
} from "@/app/actions/finance.actions";
import { 
  BookOpen, 
  Search, 
  Download, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet,
  Calendar,
  User,
  MoreHorizontal,
  FileText
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
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function GrandLivrePage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalIn: 0, totalOut: 0, netBalance: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [partners, setPartners] = useState<{ customers: any[], suppliers: any[] }>({ customers: [], suppliers: [] });

  // Filters
  const [filters, setFilters] = useState({
    startDate: format(new Date().setDate(1), "yyyy-MM-dd"), // Début du mois
    endDate: format(new Date(), "yyyy-MM-dd"),
    partnerId: "",
    method: "ALL"
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    const now = format(new Date(), "dd/MM/yyyy HH:mm");

    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text("GRAND LIVRE", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Période: ${format(new Date(filters.startDate), "dd/MM/yyyy")} au ${format(new Date(filters.endDate), "dd/MM/yyyy")}`, 14, 30);
    doc.text(`Généré le: ${now}`, 14, 35);

    // Summary Box
    doc.setDrawColor(230);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(14, 42, 182, 25, 3, 3, "FD");
    
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text("TOTAL ENCAISSEMENTS", 20, 50);
    doc.text("TOTAL DECAISSEMENTS", 80, 50);
    doc.text("SOLDE NET", 145, 50);

    doc.setFontSize(12);
    doc.setTextColor(5, 150, 105); // Emerald
    doc.text(`${stats.totalIn.toLocaleString()} DA`, 20, 58);
    doc.setTextColor(225, 29, 72); // Rose
    doc.text(`${stats.totalOut.toLocaleString()} DA`, 80, 58);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text(`${stats.netBalance.toLocaleString()} DA`, 145, 58);

    // Table
    autoTable(doc, {
      startY: 75,
      head: [["Date", "Partenaire", "Type", "Mode", "Référence", "Montant (DA)"]],
      body: entries.map(e => [
        format(new Date(e.date), "dd/MM/yyyy"),
        e.partnerName,
        e.type === "IN" ? "Encaissement" : "Décaissement",
        e.paymentMethod,
        e.referenceNumber || "-",
        `${e.type === "IN" ? "+" : "-"} ${e.amount.toLocaleString()}`
      ]),
      headStyles: { fillColor: [79, 70, 229], fontSize: 10, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        5: { halign: "right", fontStyle: "bold" }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const val = data.cell.text[0];
          if (val.startsWith("+")) data.cell.styles.textColor = [5, 150, 105];
          if (val.startsWith("-")) data.cell.styles.textColor = [225, 29, 72];
        }
      }
    });

    doc.save(`Grand_Livre_${filters.startDate}_${filters.endDate}.pdf`);
  };

  const loadData = async () => {
    setIsLoading(true);
    const res = await getJournalEntries(filters);
    if (res.success && res.data) {
      setEntries(res.data.entries);
      setStats({
        totalIn: res.data.totalIn,
        totalOut: res.data.totalOut,
        netBalance: res.data.netBalance
      });
    } else {
      toast.error(res.error || "Erreur lors du chargement des données");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    async function loadPartners() {
      const res = await getPartners();
      if (res.success && res.data) {
        setPartners(res.data);
      }
    }
    loadPartners();
  }, []);

  useEffect(() => {
    loadData();
  }, [filters.startDate, filters.endDate, filters.partnerId, filters.method]);

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20 text-white">
            <BookOpen size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Grand Livre</h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1 italic">Journal des flux de trésorerie</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="rounded-xl font-bold gap-2 border-slate-200"
            onClick={exportToPDF}
            disabled={entries.length === 0}
          >
            <Download size={16} /> Exporter PDF
          </Button>
          <Button onClick={loadData} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20 px-6 font-black uppercase text-xs tracking-widest">
            Actualiser
          </Button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Encaissements" 
          value={stats.totalIn} 
          icon={<ArrowUpRight size={20} className="text-emerald-500" />}
          bgColor="bg-emerald-50"
          textColor="text-emerald-700"
          desc="Entrées d'argent (Clients)"
        />
        <StatCard 
          label="Décaissements" 
          value={stats.totalOut} 
          icon={<ArrowDownLeft size={20} className="text-rose-500" />}
          bgColor="bg-rose-50"
          textColor="text-rose-700"
          desc="Sorties d'argent (Fournisseurs)"
        />
        <StatCard 
          label="Solde Net" 
          value={stats.netBalance} 
          icon={<Wallet size={20} className="text-indigo-500" />}
          bgColor="bg-indigo-50"
          textColor="text-indigo-700"
          desc="Net sur la période sélectionnée"
          isBalance
        />
      </div>

      {/* FILTERS BAR */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap gap-6 items-end">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase px-1 flex items-center gap-1">
            <Calendar size={10} /> Date Début
          </label>
          <Input 
            type="date" 
            value={filters.startDate}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            className="h-10 bg-slate-50 border-none rounded-xl text-xs font-bold w-40"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase px-1 flex items-center gap-1">
            <Calendar size={10} /> Date Fin
          </label>
          <Input 
            type="date" 
            value={filters.endDate}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            className="h-10 bg-slate-50 border-none rounded-xl text-xs font-bold w-40"
          />
        </div>
        <div className="space-y-2 flex-1 min-w-[200px]">
          <label className="text-[10px] font-black text-slate-400 uppercase px-1 flex items-center gap-1">
            <User size={10} /> Partenaire
          </label>
          <select 
            value={filters.partnerId}
            onChange={(e) => setFilters(prev => ({ ...prev, partnerId: e.target.value }))}
            className="w-full h-10 bg-slate-50 border-none rounded-xl px-4 text-xs font-bold outline-none"
          >
            <option value="">Tous les partenaires</option>
            <optgroup label="Clients">
              {partners.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
            <optgroup label="Fournisseurs">
              {partners.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </optgroup>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase px-1 flex items-center gap-1">
            <Filter size={10} /> Mode
          </label>
          <select 
            value={filters.method}
            onChange={(e) => setFilters(prev => ({ ...prev, method: e.target.value }))}
            className="w-full h-10 bg-slate-50 border-none rounded-xl px-4 text-xs font-bold outline-none"
          >
            <option value="ALL">Tous les modes</option>
            <option value="ESPECE">Espèces</option>
            <option value="CHEQUE">Chèque</option>
            <option value="VIREMENT">Virement</option>
            <option value="VERSEMENT">Versement</option>
          </select>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-[120px] font-black text-[10px] uppercase text-slate-400">Date</TableHead>
              <TableHead className="font-black text-[10px] uppercase text-slate-400">Partenaire</TableHead>
              <TableHead className="font-black text-[10px] uppercase text-slate-400">Type / Flux</TableHead>
              <TableHead className="font-black text-[10px] uppercase text-slate-400">Mode</TableHead>
              <TableHead className="font-black text-[10px] uppercase text-slate-400">Référence</TableHead>
              <TableHead className="text-right font-black text-[10px] uppercase text-slate-400">Montant (DA)</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Lecture des écritures...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-2 opacity-20">
                    <BookOpen size={48} />
                    <p className="text-xs font-black uppercase">Aucune écriture sur cette période</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-slate-500">
                    {format(new Date(entry.date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black",
                        entry.type === "IN" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                      )}>
                        {entry.partnerName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-700 text-sm">{entry.partnerName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      "text-[9px] font-black border-none uppercase",
                      entry.type === "IN" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {entry.type === "IN" ? "Encaissement" : "Décaissement"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-bold text-slate-500">{entry.paymentMethod}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-slate-400">{entry.referenceNumber || "-"}</span>
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-black text-sm",
                    entry.type === "IN" ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {entry.type === "OUT" ? "-" : "+"} {entry.amount.toLocaleString()} 
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                      <MoreHorizontal className="h-4 w-4 text-slate-400" />
                    </Button>
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

function StatCard({ label, value, icon, bgColor, textColor, desc, isBalance = false }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className={cn("p-3 rounded-2xl", bgColor)}>
          {icon}
        </div>
        <Badge className={cn("rounded-full border-none font-black text-[9px] uppercase", bgColor, textColor)}>
          Direct
        </Badge>
      </div>
      <div className="mt-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <h3 className={cn("text-2xl font-black mt-1 tracking-tight", isBalance && (value < 0 ? "text-rose-600" : "text-indigo-600"))}>
          {value.toLocaleString()} <span className="text-sm font-bold opacity-60">DA</span>
        </h3>
        <p className="text-[9px] font-bold text-slate-400 italic mt-1">{desc}</p>
      </div>
    </div>
  );
}
