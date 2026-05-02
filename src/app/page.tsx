"use client";

import React, { useEffect, useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { 
  getDashboardKPIs, 
  getSalesChartData, 
  getTopProducts, 
  getCategoryDistribution, 
  getRecentMovements 
} from "@/app/actions/dashboard.actions";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { 
  ArrowUpRight, 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  History, 
  ShoppingCart,
  Box,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ProfessionalDashboard() {
  const [kpis, setKpis] = useState<any>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    async function init() {
// ...
      setIsLoading(true);
      const [kRes, sRes, tRes, cRes, mRes] = await Promise.all([
        getDashboardKPIs(),
        getSalesChartData(),
        getTopProducts(),
        getCategoryDistribution(),
        getRecentMovements()
      ]);

      if (kRes.success) setKpis(kRes.data);
      if (sRes.success) setSalesData(sRes.data);
      if (tRes.success) setTopProducts(tRes.data);
      if (cRes.success) setCategoryData(cRes.data);
      if (mRes.success) setMovements(mRes.data);
      setIsLoading(false);
    }
    init();
  }, []);

  if (!isMounted || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 py-40">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Initialisation du Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
             <LayoutDashboard className="text-indigo-600" size={32} />
             Tableau de Bord Stratégique
          </h1>
          <p className="text-slate-500 font-medium">Analyse temps réel de la performance de GestStock</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
           <Badge variant="outline" className="border-none bg-emerald-50 text-emerald-700 font-black">LIVE</Badge>
           <span className="text-[10px] pr-3 font-bold uppercase text-slate-400">Dernière mise à jour: {new Date().toLocaleTimeString()}</span>
        </div>
      </header>

      {/* KPI CARDS */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard 
          title="Valeur du Stock" 
          value={`${kpis?.totalStockValue.toLocaleString()} DA`} 
          desc="Valeur PMP globale exploitable" 
          icon={<Package className="text-indigo-600" />}
          gradient="from-indigo-50/50 to-white"
        />
        <KPICard 
          title="Chiffre d'Affaires" 
          value={`${kpis?.monthlyRevenue.toLocaleString()} DA`} 
          desc="Ventes nettes du mois en cours" 
          icon={<TrendingUp className="text-emerald-600" />}
          gradient="from-emerald-50/50 to-white"
        />
        <KPICard 
          title="Transactions" 
          value={kpis?.transactionCount} 
          desc="Bons validés (BL, BV, Factures)" 
          icon={<ShoppingCart className="text-sky-600" />}
          gradient="from-sky-50/50 to-white"
        />
        <KPICard 
          title="Alertes Stock" 
          value={kpis?.lowStockCount} 
          desc="Produits en seuil critique (< 10)" 
          icon={<AlertTriangle className={cn(kpis?.lowStockCount > 0 ? "text-rose-600 animate-pulse" : "text-slate-300")} />}
          gradient={kpis?.lowStockCount > 0 ? "from-rose-50/50 to-white" : "from-slate-50/50 to-white"}
          accentColor={kpis?.lowStockCount > 0 ? "text-rose-600" : ""}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* MAIN CHART - Plein écran horizontal */}
        <Card className="lg:col-span-7 border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-950 rounded-3xl overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black">Évolution des Ventes</CardTitle>
                <CardDescription>Flux de revenus sur les 30 derniers jours</CardDescription>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <ArrowUpRight className="text-emerald-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-0 min-h-[350px]">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={salesData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                  itemStyle={{ color: '#4f46e5', fontWeight: 800 }}
                />
                <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        {/* TOP PRODUCTS */}
        <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-950 rounded-3xl overflow-hidden">
          <CardHeader className="p-8 pb-4">
             <CardTitle className="text-xl font-black">Top 5 Best-Sellers</CardTitle>
             <CardDescription>Volume de vente unitaire par référence</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0">
             <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 40 }}>
                   <XAxis type="number" hide />
                   <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={100}
                    tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} 
                   />
                   <Tooltip cursor={{ fill: 'transparent' }} />
                   <Bar dataKey="val" fill="#4f46e5" radius={[0, 10, 10, 0]} barSize={20} />
                </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ title, value, desc, icon, gradient, accentColor }: any) {
  return (
    <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
      <Card className={cn("border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-950 rounded-3xl overflow-hidden relative")}>
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", gradient)} />
        <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
          <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</CardTitle>
          <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
             {icon}
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className={cn("text-2xl font-black text-slate-900 dark:text-white tracking-tight break-words", accentColor)}>{value}</div>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">
            {desc}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
