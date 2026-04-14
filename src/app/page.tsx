"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Package, Truck, FileText, CreditCard } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

const performanceData = [
  { name: 'Lun', sales: 4000 },
  { name: 'Mar', sales: 3000 },
  { name: 'Mer', sales: 5000 },
  { name: 'Jeu', sales: 2780 },
  { name: 'Ven', sales: 8900 },
  { name: 'Sam', sales: 2390 },
  { name: 'Dim', sales: 3490 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Tableau de Bord</h1>
        <p className="text-slate-500 dark:text-slate-400">Bienvenue. Voici l'état de votre activité aujourd'hui.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* KPI Cards */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-700 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-100">Chiffre d'Affaires</CardTitle>
            <FileText className="h-4 w-4 text-indigo-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">124 500,00 DZD</div>
            <p className="text-xs text-indigo-200 mt-1 flex items-center">
              <ArrowUpRight className="mr-1 h-3 w-3" /> +15.2% par rapport au mois dernier
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Valeur d'Inventaire</CardTitle>
            <Package className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">845 200,00 DZD</div>
            <p className="text-xs text-emerald-500 mt-1 flex items-center">
              <ArrowUpRight className="mr-1 h-3 w-3" /> +2.4% valeur PMP globale
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Créances Clients</CardTitle>
            <CreditCard className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12 450,00 DZD</div>
            <p className="text-xs text-rose-500 mt-1 flex items-center">
              <ArrowDownRight className="mr-1 h-3 w-3" /> 3 factures en retard
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Dossiers Import</CardTitle>
            <Truck className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">4 en cours</div>
            <p className="text-xs text-slate-500 mt-1">2 en dédouanement, 2 en transit</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Mouvements Récents</CardTitle>
            <CardDescription>Les opérations logistiques de la journée</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4 pt-2">
                {[
                  { text: "[BL-24001] Sortie de 50x Ordinateur Dell", time: "Il y a 15 min", badge: "Sortie", color: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400" },
                  { text: "[BR-24012] Entrée de 200x Clavier Logitech", time: "Il y a 2h", badge: "Entrée", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" },
                  { text: "[BT-24004] Transfert Dépôt Principal -> Dépôt Oran", time: "Hier", badge: "Transfert", color: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400" },
                  { text: "[Facture-24089] Lettrage Paiement de 15 000 DZD", time: "Hier", badge: "Finance", color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400" },
                ].map((log, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0 last:pb-0">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{log.text}</span>
                      <span className="text-xs text-slate-500">{log.time}</span>
                    </div>
                    <Badge variant="secondary" className={cn("rounded-md font-medium", log.color)}>{log.badge}</Badge>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Évolution des Ventes</CardTitle>
            <CardDescription>Aperçu de la semaine en cours</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] w-full relative">
            <div className="absolute inset-0 p-6">
              <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
