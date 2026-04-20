import React from "react";
import SplitDocumentEditor from "../../../split-document-editor";
import { getClients } from "@/actions/clients.actions";
import { getProductsWithStock } from "@/actions/produits.actions";
import { getSaleDocumentById } from "@/actions/ventes.actions";
import { notFound } from "next/navigation";

export default async function EditDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
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
