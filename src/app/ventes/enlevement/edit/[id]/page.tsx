import React from "react";
import SplitDocumentEditor from "../../../split-document-editor";
import { getClients } from "@/app/actions/clients.actions";
import { getProductsWithStock } from "@/app/actions/produits.actions";
import { getSaleDocumentById } from "@/app/actions/ventes.actions";
import { notFound } from "next/navigation";

export default async function EditDeliveryPage({ params }: { params: { id: string } }) {
  const { id } = params;
  
  const [clientsRes, productsRes, docRes] = await Promise.all([
    getClients(),
    getProductsWithStock(),
    getSaleDocumentById(id)
  ]);

  if (!docRes.success || !docRes.data) {
    notFound();
  }

  return (
    <div className="h-screen w-full">
      <SplitDocumentEditor 
        documentType="DELIVERY" 
        clients={clientsRes.data || []} 
        products={productsRes.data as any || []} 
        initialData={docRes.data as any}
      />
    </div>
  );
}
