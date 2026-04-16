"use client";

import React, { useState, useEffect } from "react";
import { getCashflowStatus } from "@/app/actions/finance.actions";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  History, 
  PieChart as PieChartIcon,
  Banknote,
  Landmark,
  CreditCard,
  FileCheck
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from "recharts";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

export default function TresoreriePage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const res = await getCashflowStatus();
      if (res.success) {
        setData(res.data);
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Analyse des flux...</p>
        </div>
      </div>
    );
  }

  const chartData = data?.status.map((s: any) => ({
    name: s.method,
    value: s.balance
  })).filter((s: any) => s.value > 0) || [];

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-slate-50">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-600/20 text-white">
            <Wallet size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Trésorerie</h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">État des caisses & banques en temps réel</p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 px-6">
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solde Global</p>
              <h2 className="text-2xl font-black text-indigo-600">{data?.globalBalance.toLocaleString()} DA</h2>
           </div>
           <div className="h-10 w-[1px] bg-slate-100"></div>
           <TrendingUp className="text-emerald-500" size={24} />
        </div>
      </div>

      {/* ASSET CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {data?.status.map((item: any, idx: number) => (
          <CashCard key={item.method} item={item} color={COLORS[idx % COLORS.length]} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CHART SECTION */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <PieChartIcon className="text-indigo-600" size={20} />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Répartition des Disponibilités</h3>
          </div>
          
          <div className="flex-1 min-h-[300px] grid grid-cols-1 md:grid-cols-2 items-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-4 px-4">
              {chartData.map((d: any, idx: number) => (
                 <div key={d.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                       <span className="text-xs font-black text-slate-600">{d.name}</span>
                    </div>
                    <span className="text-xs font-black text-slate-800">{((d.value / data.globalBalance) * 100).toFixed(1)}%</span>
                 </div>
              ))}
            </div>
          </div>
        </div>

        {/* RECENT MOVEMENTS */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
           <div className="flex items-center gap-3 mb-8">
            <History className="text-indigo-600" size={20} />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Activité Récente</h3>
          </div>

          <div className="space-y-4">
            {data?.recentActivity.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                   <div className={cn(
                     "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                     p.type === "IN" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                   )}>
                     {p.type === "IN" ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                   </div>
                   <div>
                      <p className="text-xs font-black text-slate-800 truncate max-w-[120px]">{p.partnerName}</p>
                      <p className="text-[10px] font-bold text-slate-400 capitalize">{p.paymentMethod.toLowerCase()}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className={cn("text-xs font-black", p.type === "IN" ? "text-emerald-600" : "text-rose-600")}>
                      {p.type === "IN" ? "+" : "-"} {p.amount.toLocaleString()}
                   </p>
                   <p className="text-[10px] font-bold text-slate-300">{format(new Date(p.date), "HH:mm")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CashCard({ item, color }: any) {
  const Icon = item.method === "ESPECE" ? Banknote : item.method === "VIREMENT" || item.method === "VERSEMENT" ? Landmark : item.method === "CHEQUE" ? FileCheck : CreditCard;
  
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all">
       <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-2xl bg-slate-50" style={{ color: color }}>
             <Icon size={20} />
          </div>
          <Badge variant="outline" className="text-[8px] font-black uppercase text-slate-400 border-slate-200">
             {item.count} ops
          </Badge>
       </div>
       <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.method}</p>
          <h4 className="text-xl font-black mt-1 text-slate-800 tracking-tight" style={{ color: item.balance < 0 ? '#EF4444' : undefined }}>
            {item.balance.toLocaleString()} 
            <span className="text-[10px] ml-1 opacity-40">DA</span>
          </h4>
          <div className="flex items-center gap-2 mt-2">
             <div className="flex items-center text-[9px] font-bold text-emerald-500">
                <ArrowUpRight size={8} /> {item.totalIn.toLocaleString()}
             </div>
             <div className="w-1 h-1 rounded-full bg-slate-200"></div>
             <div className="flex items-center text-[9px] font-bold text-rose-400">
                <ArrowDownLeft size={8} /> {item.totalOut.toLocaleString()}
             </div>
          </div>
       </div>
    </div>
  );
}
