import React from "react";
import SplitReceiptEditor from "../split-receipt-editor";
import { getSuppliers } from "@/actions/fournisseurs.actions";
import { getProducts } from "@/actions/produits.actions";
import { getWarehouses } from "@/actions/depots.actions";
export default async function CreateReceiptPage() {
  const suppliersRes = await getSuppliers();
  const productsRes = await getProducts();
  const warehousesRes = await getWarehouses();

  return (
    <div className="h-screen w-full">
      <SplitReceiptEditor 
        suppliers={suppliersRes.data || []} 
        products={productsRes.data || []} 
        warehouses={warehousesRes.data || []}
      />
    </div>
  );
}
