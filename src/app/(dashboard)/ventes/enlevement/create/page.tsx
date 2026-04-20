import React from "react";
import SplitDocumentEditor from "../../split-document-editor";
import { getClients } from "@/actions/clients.actions";
import { getProductsWithStock } from "@/actions/produits.actions";

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
