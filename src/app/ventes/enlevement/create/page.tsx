import React from "react";
import SplitDocumentEditor from "../../split-document-editor";
import { getClients } from "@/app/actions/clients.actions";
import { getProductsWithStock } from "@/app/actions/produits.actions";

/**
 * Page serveur pour la création d'un bon d'enlèvement
 */
export default async function CreateDeliveryPage() {
  const [clientsRes, productsRes] = await Promise.all([
    getClients(),
    getProductsWithStock(),
  ]);

  return (
    <div className="h-screen w-full">
      <SplitDocumentEditor 
        documentType="DELIVERY" 
        clients={clientsRes.data || []} 
        products={productsRes.data as any || []} 
      />
    </div>
  );
}
