import React from "react";
import { getSaleDocumentById } from "@/app/actions/ventes.actions";
import { getClients } from "@/app/actions/clients.actions";
import { getProductsWithStock } from "@/app/actions/produits.actions";
import SplitDocumentEditor from "@/app/ventes/split-document-editor";
import { notFound } from "next/navigation";

export default async function EditFacturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const [docRes, clientsRes, productsRes] = await Promise.all([
    getSaleDocumentById(id),
    getClients(),
    getProductsWithStock(),
  ]);

  if (!docRes.success) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <SplitDocumentEditor 
        initialData={docRes.data} 
        documentType="INVOICE" 
        clients={clientsRes.data || []}
        products={productsRes.data as any || []}
      />
    </div>
  );
}
