import React from "react";
import SplitDocumentEditor from "../../split-document-editor";
import { getClients } from "@/actions/clients.actions";
import { getProductsWithStock } from "@/actions/produits.actions";

export default async function CreateBLPage() {
  const clientsRes = await getClients();
  const productsRes = await getProductsWithStock();

  return (
    <div className="h-screen w-full">
      <SplitDocumentEditor 
        documentType="BL"
        clients={clientsRes.data || []} 
        products={productsRes.data || []} 
      />
    </div>
  );
}
