import React from "react";
import TransferEditor from "../transfer-editor";
import { getWarehouses } from "@/actions/depots.actions";
import { getProductsWithStock } from "@/actions/produits.actions";

export default async function CreateTransferPage() {
  const [warehousesRes, productsRes] = await Promise.all([
    getWarehouses(),
    getProductsWithStock()
  ]);

  return (
    <div className="h-screen w-full overflow-hidden">
      <TransferEditor 
        warehouses={warehousesRes.data || []} 
        products={productsRes.data as any || []} 
      />
    </div>
  );
}
