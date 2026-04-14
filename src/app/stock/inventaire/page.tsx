import React from "react";
import InventoryList from "./inventory-list";
import { getProductsWithStock } from "@/app/actions/produits.actions";
import { getWarehouses } from "@/app/actions/depots.actions";
import { getCategories } from "@/app/actions/categories.actions";

export default async function EtatStockPage() {
  const [productsRes, warehousesRes, categoriesRes] = await Promise.all([
    getProductsWithStock(),
    getWarehouses(),
    getCategories()
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <InventoryList 
        initialProducts={productsRes.data || []} 
        warehouses={warehousesRes.data || []} 
        categories={categoriesRes.data || []} 
      />
    </div>
  );
}
