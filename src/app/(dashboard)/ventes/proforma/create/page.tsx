import React from "react";
import SplitDocumentEditor from "../../split-document-editor";
import { getClients } from "@/actions/clients.actions";
import { getProductsWithStock } from "@/actions/produits.actions";

export default async function CreateProformaPage() {
  const clientsRes = await getClients();
  const productsRes = await getProductsWithStock();

  return (
    <div className="h-screen w-full">
      <SplitDocumentEditor 
        documentType="PROFORMA"
        clients={clientsRes.data || []} 
        products={productsRes.data || []} 
      />
    </div>
  );
}
