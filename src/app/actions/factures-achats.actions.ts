"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getNextReferenceAction } from "./sequences.actions";
import { logAction } from "@/lib/audit";

export async function getPurchaseInvoices() {
  try {
    const invoices = await prisma.document.findMany({
      where: { type: "PURCHASE_INVOICE" },
      orderBy: { date: 'desc' },
      include: {
        supplier: true,
        lines: {
          include: { product: true }
        }
      }
    });
    return { success: true, data: invoices };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePurchaseInvoice(id: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({ where: { id } });
      if (!doc || doc.type !== "PURCHASE_INVOICE") throw new Error("Facture non trouvée.");

      // Libérer le document parent (BR) s'il y en a un
      if (doc.parentId) {
         await tx.document.update({
             where: { id: doc.parentId },
             data: { status: "VALIDATED" } // Re-validé
         });
      }

      await tx.documentLine.deleteMany({ where: { documentId: id } });
      return await tx.document.delete({ where: { id } });
    });

    await logAction(null, "DELETE_PURCHASE_INVOICE", `Facture Fournisseur supprimée: ${result.reference}`);
    revalidatePath("/", "layout");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function transformReceiptToInvoice(sourceId: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const source = await tx.document.findUnique({
        where: { id: sourceId },
        include: { lines: true, childDocuments: true }
      });

      if (!source) throw new Error("Document source introuvable.");
      if (source.type !== "RECEIPT") throw new Error("Le document source doit être un Bon de Réception.");
      
      const hasInvoice = source.childDocuments?.some(doc => doc.type === 'PURCHASE_INVOICE');
      if (hasInvoice) throw new Error("Ce Bon de Réception a déjà été facturé.");

      const newRef = await getNextReferenceAction("PURCHASE_INVOICE");

      const newDoc = await tx.document.create({
        data: {
          type: "PURCHASE_INVOICE",
          reference: newRef,
          date: new Date(),
          status: "VALIDATED",
          supplierId: source.supplierId,
          paymentMethod: source.paymentMethod,
          grossTotal: source.grossTotal,
          discountTotal: source.discountTotal,
          taxTotal: source.taxTotal,
          stampTax: source.stampTax,
          netTotal: source.netTotal,
          parentId: source.id,
          lines: {
            create: source.lines.map(line => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discount: line.discount,
              taxRate: line.taxRate,
              warehouseId: line.warehouseId,
              batchId: line.batchId
            }))
          }
        }
      });

      // Mettre à jour le BR pour indiquer qu'il est facturé
      // Note: On va utiliser le status VALIDATED mais la présence de childDocuments PURCHASE_INVOICE 
      // suffira pour dire qu'il est facturé.

      return newDoc;
    });

    await logAction(null, "TRANSFORM_RECEIPT_TO_INVOICE", `Bon de Réception (${sourceId}) transformé en Facture (${result.reference})`);
    revalidatePath("/", "layout");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Erreur transformation BR vers Facture:", error);
    return { success: false, error: error.message || "Échec de la transformation." };
  }
}
