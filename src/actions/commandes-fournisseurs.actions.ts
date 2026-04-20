"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getNextReferenceAction } from "./sequences.actions";
import { logAction } from "@/lib/audit";

export type PurchaseOrderLineInput = {
  productId: string;
  quantity: number;
  unitCost: number;
  taxRate?: number;
  discount?: number;
};

export type CreatePurchaseOrderInput = {
  reference: string;
  date: Date;
  supplierId: string;
  paymentMethod?: string;
  lines: PurchaseOrderLineInput[];
};

/**
 * Créer un document Commande Fournisseur (Aucun impact stock)
 */
export async function createPurchaseOrder(data: CreatePurchaseOrderInput) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      let ref = data.reference;
      if (!ref) {
        ref = await getNextReferenceAction("PURCHASE_ORDER");
      }

      // Calcul Serveur Sécurisé
      let calculatedGrossTotal = 0;
      let calculatedTaxTotal = 0;
      let calculatedDiscountTotal = 0;

      data.lines.forEach(l => {
        const lineHTBrut = (l.quantity || 0) * (l.unitCost || 0);
        const lineDisc = lineHTBrut * ((l.discount || 0) / 100);
        const lineHTNet = lineHTBrut - lineDisc;
        const lineTax = lineHTNet * ((l.taxRate || 0) / 100);

        calculatedGrossTotal += lineHTNet;
        calculatedDiscountTotal += lineDisc;
        calculatedTaxTotal += lineTax;
      });

      const calculatedNetTotal = calculatedGrossTotal + calculatedTaxTotal;

      const document = await tx.document.create({
        data: {
          type: "PURCHASE_ORDER",
          reference: ref,
          date: data.date,
          status: "VALIDATED",
          supplierId: data.supplierId,
          paymentMethod: data.paymentMethod || "virement",
          grossTotal: calculatedGrossTotal,
          discountTotal: calculatedDiscountTotal,
          taxTotal: calculatedTaxTotal,
          netTotal: calculatedNetTotal,
          lines: {
            create: data.lines.map(line => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitCost, // Stocké as unitPrice selon schema
              taxRate: line.taxRate || 0,
              discount: line.discount || 0
            }))
          }
        },
        include: {
          lines: {
            include: { product: true }
          },
          supplier: true
        }
      });

      return document;
    });

    await logAction(null, "CREATE_PURCHASE_ORDER", `Commande Fournisseur créée: ${result.reference}`);
    revalidatePath("/", "layout");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Erreur création Commande Fournisseur:", error);
    return { success: false, error: error.message || "Impossible de créer la commande." };
  }
}

/**
 * Mettre à jour une Commande Fournisseur
 */
export async function updatePurchaseOrder(id: string, data: CreatePurchaseOrderInput) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.document.findUnique({ where: { id }, include: { childDocuments: true } });
      if (!existing || existing.type !== "PURCHASE_ORDER") throw new Error("Commande non trouvée.");
      if (existing.childDocuments.length > 0) throw new Error("Impossible de modifier une commande déjà transformée.");

      let calculatedGrossTotal = 0;
      let calculatedTaxTotal = 0;
      let calculatedDiscountTotal = 0;

      data.lines.forEach(l => {
        const lineHTBrut = (l.quantity || 0) * (l.unitCost || 0);
        const lineDisc = lineHTBrut * ((l.discount || 0) / 100);
        const lineHTNet = lineHTBrut - lineDisc;
        const lineTax = lineHTNet * ((l.taxRate || 0) / 100);

        calculatedGrossTotal += lineHTNet;
        calculatedDiscountTotal += lineDisc;
        calculatedTaxTotal += lineTax;
      });

      const calculatedNetTotal = calculatedGrossTotal + calculatedTaxTotal;

      await tx.documentLine.deleteMany({ where: { documentId: id } });

      const document = await tx.document.update({
        where: { id },
        data: {
          reference: data.reference,
          date: data.date,
          supplierId: data.supplierId,
          paymentMethod: data.paymentMethod || "virement",
          grossTotal: calculatedGrossTotal,
          discountTotal: calculatedDiscountTotal,
          taxTotal: calculatedTaxTotal,
          netTotal: calculatedNetTotal,
          lines: {
            create: data.lines.map(line => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitCost,
              taxRate: line.taxRate || 0,
              discount: line.discount || 0
            }))
          }
        },
        include: {
          lines: { include: { product: true } },
          supplier: true
        }
      });

      return document;
    });

    await logAction(null, "UPDATE_PURCHASE_ORDER", `Commande Fournisseur modifiée: ${result.reference}`);
    revalidatePath("/", "layout");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Erreur MàJ Commande Fournisseur:", error);
    return { success: false, error: error.message || "Impossible de modifier la commande." };
  }
}

/**
 * Récupérer toutes les commandes fournisseurs
 */
export async function getPurchaseOrders() {
  try {
    const orders = await prisma.document.findMany({
      where: { type: "PURCHASE_ORDER" },
      orderBy: { date: 'desc' },
      include: {
        supplier: true,
        lines: {
          include: { product: true }
        },
        childDocuments: true
      }
    });
    return { success: true, data: orders };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Récupérer une commande fournisseur par ID
 */
export async function getPurchaseOrderById(id: string) {
  try {
    const order = await prisma.document.findUnique({
      where: { id, type: "PURCHASE_ORDER" },
      include: {
        supplier: true,
        lines: {
          include: { product: true }
        },
        childDocuments: true
      }
    });
    if (!order) return { success: false, error: "Commande non trouvée." };
    return { success: true, data: order };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Supprimer une commande fournisseur
 */
export async function deletePurchaseOrder(id: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.document.findUnique({ where: { id }, include: { childDocuments: true } });
      if (!order) throw new Error("Commande non trouvée.");
      if (order.type !== "PURCHASE_ORDER") throw new Error("Type de document invalide.");
      if (order.childDocuments.length > 0) throw new Error("Impossible de supprimer une commande transformée.");

      await tx.documentLine.deleteMany({ where: { documentId: id } });
      return await tx.document.delete({ where: { id } });
    });

    await logAction(null, "DELETE_PURCHASE_ORDER", `Commande Fournisseur supprimée: ${result.reference}`);
    revalidatePath("/", "layout");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
