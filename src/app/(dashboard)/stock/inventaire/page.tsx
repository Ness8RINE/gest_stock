import React from "react";
import InventoryList from "./inventory-list";
import { getProductsWithStock } from "@/actions/produits.actions";
import { getWarehouses } from "@/actions/depots.actions";
import { getCategories } from "@/actions/categories.actions";

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
