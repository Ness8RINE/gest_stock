import React from "react";
import SaleReturnEditor from "../sale-return-editor";
import { getClients } from "@/actions/clients.actions";
import { getProductsWithStock } from "@/actions/produits.actions";

export default async function CreateSaleReturnPage() {
  const [clientsRes, productsRes] = await Promise.all([
    getClients(),
    getProductsWithStock()
  ]);

  return (
    <div className="h-screen w-full overflow-hidden">
      <SaleReturnEditor 
        customers={clientsRes.data || []} 
        products={productsRes.data as any || []} 
      />
    </div>
  );
}
