import React from "react";
import SplitDocumentEditor from "../../../split-document-editor";
import { getSaleDocumentById } from "@/app/actions/ventes.actions";
import { getClients } from "@/app/actions/clients.actions";
import { getProductsWithStock } from "@/app/actions/produits.actions";
import { notFound } from "next/navigation";

export default async function EditBVPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. Fetch the document
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
    <div className="h-screen w-full">
      <SplitDocumentEditor 
        documentType="BV"
        initialData={docRes.data}
        clients={clientsRes.data || []}
        products={productsRes.data || []}
      />
    </div>
  );
}
