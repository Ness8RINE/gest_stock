import React from "react";
import ExchangeEditor from "../exchange-editor";
import { getClients } from "@/app/actions/clients.actions";
import { getProductsWithStock } from "@/app/actions/produits.actions";

/**
 * Page serveur pour la création d'un bon d'échange
 */
export default async function CreateExchangePage() {
  const [clientsRes, productsRes] = await Promise.all([
    getClients(),
    getProductsWithStock(),
  ]);

  return (
    <div className="h-screen w-full overflow-hidden">
      <ExchangeEditor 
        clients={clientsRes.data || []} 
        products={productsRes.data as any || []} 
      />
    </div>
  );
}
