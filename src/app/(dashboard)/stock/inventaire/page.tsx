import React from "react";
import InventoryList from "./inventory-list";
import { getProductsWithStock } from "@/actions/produits.actions";
import { getWarehouses } from "@/actions/depots.actions";
import { getCategories } from "@/actions/categories.actions";
import { getDbPath } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EtatStockPage() {
  const [productsRes, warehousesRes, categoriesRes] = await Promise.all([
    getProductsWithStock(),
    getWarehouses(),
    getCategories()
  ]);

  return (
    <div className="h-screen w-full flex flex-col">
       {/* Bandeau de diagnostic orange */}
       <div className="bg-orange-500 text-white text-[10px] px-4 py-1 flex justify-between items-center font-mono shrink-0">
        <span>DB: {getDbPath()}</span>
        <div className="flex gap-4">
          <span>PRODUITS REÇUS: {productsRes.data?.length || 0}</span>
          <span>DEPOTS: {warehousesRes.data?.length || 0}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <InventoryList 
          initialProducts={productsRes.data || []} 
          warehouses={warehousesRes.data || []} 
          categories={categoriesRes.data || []} 
        />
      </div>
    </div>
  );
}
