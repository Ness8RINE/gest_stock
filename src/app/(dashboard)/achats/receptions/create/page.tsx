"use client";

import React, { useEffect, useState } from "react";
import SplitReceiptEditor from "@/app/(dashboard)/achats/receptions/split-receipt-editor";
import { getSuppliers } from "@/actions/fournisseurs.actions";
import { getProducts } from "@/actions/produits.actions";
import { getWarehouses } from "@/actions/depots.actions";
import { toast } from "sonner";

export default function CreateReceiptPage() {
  const [data, setData] = useState<{ suppliers: any[], products: any[], warehouses: any[] }>({
    suppliers: [],
    products: [],
    warehouses: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [suppliersRes, productsRes, warehousesRes] = await Promise.all([
          getSuppliers(),
          getProducts(),
          getWarehouses()
        ]);

        if (suppliersRes.success && productsRes.success && warehousesRes.success) {
          setData({
            suppliers: suppliersRes.data || [],
            products: productsRes.data || [],
            warehouses: warehousesRes.data || []
          });
        }
      } catch (error) {
        console.error("Failed to load receipt data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium tracking-wide">Configuration du module Achats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <SplitReceiptEditor 
        suppliers={data.suppliers}
        products={data.products}
        warehouses={data.warehouses}
      />
    </div>
  );
}
