import React from "react";
import DocumentEditor from "./document-editor";
import { getClients } from "@/app/actions/clients.actions";
import { getProducts } from "@/app/actions/produits.actions";

export default async function CreateDocumentPage() {
  const clientsRes = await getClients();
  const productsRes = await getProducts();

  return (
    <div className="h-full w-full bg-slate-50 dark:bg-slate-900/50">
      <DocumentEditor 
        clients={clientsRes.data || []} 
        products={productsRes.data || []} 
      />
    </div>
  );
}
