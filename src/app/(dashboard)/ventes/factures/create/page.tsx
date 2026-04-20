import React from "react";
import SplitDocumentEditor from "@/app/ventes/split-document-editor";
import { getClients } from "@/actions/clients.actions";
import { getProductsWithStock } from "@/actions/produits.actions";

export default async function CreateFacturePage() {
  const [clientsRes, productsRes] = await Promise.all([
    getClients(),
    getProductsWithStock(),
  ]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <SplitDocumentEditor 
        documentType="INVOICE" 
        clients={clientsRes.data || []}
        products={productsRes.data as any || []}
      />
    </div>
  );
}
