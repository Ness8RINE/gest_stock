import React from "react";
import SaleReturnEditor from "../sale-return-editor";
import { getClients } from "@/app/actions/clients.actions";
import { getProductsWithStock } from "@/app/actions/produits.actions";

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
