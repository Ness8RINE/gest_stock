"use client";

import SplitDocumentEditor from "@/app/ventes/split-document-editor";

export default function CreateFacturePage() {
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <SplitDocumentEditor 
        documentType="INVOICE" 
        onCancel={() => window.history.back()} 
      />
    </div>
  );
}
