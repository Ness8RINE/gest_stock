import React from "react";
import SplitReceiptEditor from "../../split-receipt-editor";
import { getSuppliers } from "@/app/actions/fournisseurs.actions";
import { getProducts } from "@/app/actions/produits.actions";
import { getWarehouses } from "@/app/actions/depots.actions";
import { getReceiptById } from "@/app/actions/receptions.actions";
import { notFound } from "next/navigation";

export default async function EditReceiptPage({ params }: { params: { id: string } }) {
  const { id } = params;
  
  const [suppliersRes, productsRes, warehousesRes, receiptRes] = await Promise.all([
    getSuppliers(),
    getProducts(),
    getWarehouses(),
    getReceiptById(id)
  ]);

  if (!receiptRes.success || !receiptRes.data) {
    return notFound();
  }

  return (
    <div className="h-screen w-full">
      <SplitReceiptEditor 
        suppliers={suppliersRes.data || []} 
        products={productsRes.data || []} 
        warehouses={warehousesRes.data || []}
        initialData={receiptRes.data}
      />
    </div>
  );
}
