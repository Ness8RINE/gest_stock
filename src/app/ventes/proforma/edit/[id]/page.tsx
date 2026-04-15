import React from "react";
import { getSaleDocumentById } from "@/app/actions/ventes.actions";
import { getClients } from "@/app/actions/clients.actions";
import { getProductsWithStock } from "@/app/actions/produits.actions";
import SplitDocumentEditor from "@/app/ventes/split-document-editor";
import { notFound } from "next/navigation";

export default async function EditProformaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. Fetch the proforma
  const docRes = await getSaleDocumentById(id);
  if (!docRes.success || !docRes.data) {
    return notFound();
  }

  // 2. Fetch clients and products for the editor
  const [clientsRes, productsRes] = await Promise.all([
    getClients(),
    getProductsWithStock()
  ]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <SplitDocumentEditor 
        documentType="PROFORMA"
        clients={clientsRes.data || []}
        products={productsRes.data as any || []}
        initialData={docRes.data}
      />
    </div>
  );
}
