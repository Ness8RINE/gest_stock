import React from "react";
import SplitReceiptEditor from "../../receptions/split-receipt-editor";
import { getSuppliers } from "@/actions/fournisseurs.actions";
import { getProducts } from "@/actions/produits.actions";
import { getWarehouses } from "@/actions/depots.actions";
import { getPurchaseOrderById } from "@/actions/commandes-fournisseurs.actions";
import { notFound } from "next/navigation";

export default async function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const [suppliersRes, productsRes, warehousesRes, orderRes] = await Promise.all([
    getSuppliers(),
    getProducts(),
    getWarehouses(),
    getPurchaseOrderById(id)
  ]);

  if (!orderRes.success || !orderRes.data) {
    return notFound();
  }

  return (
    <div className="h-screen w-full">
      <SplitReceiptEditor 
        suppliers={suppliersRes.data || []} 
        products={productsRes.data || []} 
        warehouses={warehousesRes.data || []}
        initialData={orderRes.data}
        documentType="PURCHASE_ORDER"
      />
    </div>
  );
}
