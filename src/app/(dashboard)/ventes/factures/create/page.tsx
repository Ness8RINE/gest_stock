"use client";

import React, { useEffect, useState } from "react";
import SplitDocumentEditor from "@/app/(dashboard)/ventes/split-document-editor";
import { getClients } from "@/actions/clients.actions";
import { getProductsWithStock } from "@/actions/produits.actions";
import { toast } from "sonner";

export default function CreateFacturePage() {
  const [data, setData] = useState<{ clients: any[], products: any[] }>({
    clients: [],
    products: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [clientsRes, productsRes] = await Promise.all([
          getClients(),
          getProductsWithStock()
        ]);

        if (clientsRes.success) {
          setData({
            clients: clientsRes.data || [],
            products: productsRes.data || []
          });
        }
      } catch (error) {
        console.error("Failed to load invoice data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium">Initialisation du module Facturation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <SplitDocumentEditor 
        documentType="INVOICE" 
        clients={data.clients}
        products={data.products as any}
      />
    </div>
  );
}
