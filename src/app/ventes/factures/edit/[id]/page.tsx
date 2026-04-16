"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSaleDocumentById } from "@/app/actions/ventes.actions";
import SplitDocumentEditor from "@/app/ventes/split-document-editor";
import { Loader2 } from "lucide-react";

export default function EditFacturePage() {
  const params = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await getSaleDocumentById(params.id as string);
      if (res.success) {
        setDoc(res.data);
      } else {
        router.push("/ventes/factures");
      }
      setLoading(false);
    };
    load();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <SplitDocumentEditor 
        initialData={doc} 
        documentType="INVOICE" 
        onCancel={() => router.push("/ventes/factures")} 
      />
    </div>
  );
}
