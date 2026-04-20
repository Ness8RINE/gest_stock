import React from "react";
import SplitReturnEditor from "../split-return-editor";
import { getSuppliers } from "@/actions/fournisseurs.actions";
import { getProductsWithStock } from "@/actions/produits.actions";

/**
 * Page serveur pour la création d'un avoir achat
 */
export default async function CreatePurchaseReturnPage() {
  // Chargement initial des données nécessaires (Fournisseurs et Produits avec leurs lots)
  const [suppliersRes, productsRes] = await Promise.all([
    getSuppliers(),
    getProductsWithStock(),
  ]);

  return (
    <div className="h-screen w-full overflow-hidden">
      <SplitReturnEditor 
        suppliers={suppliersRes.data || []} 
        products={productsRes.data as any || []} 
      />
    </div>
  );
}
