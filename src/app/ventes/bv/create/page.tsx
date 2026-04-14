import React from "react";
import SplitDocumentEditor from "../../split-document-editor";
import { getClients } from "@/app/actions/clients.actions";
import { getProductsWithStock } from "@/app/actions/produits.actions";

export default async function CreateBVPage() {
  const clientsRes = await getClients();
  const productsRes = await getProductsWithStock();

  return (
    <div className="h-screen w-full">
      <SplitDocumentEditor 
        documentType="BV"
        clients={clientsRes.data || []} 
        products={productsRes.data || []} 
      />
    </div>
  );
}
