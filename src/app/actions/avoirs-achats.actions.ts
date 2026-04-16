"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Types pour les entrées d'avoir
 */
export type ReturnLineInput = {
  productId: string;
  warehouseId: string;
  batchId: string;
  quantity: number;
  unitCost: number;
  taxRate?: number;
};

export type CreateReturnInput = {
  reference: string;
  date: Date;
  supplierId: string;
  netTotal: number;
  grossTotal: number;
  taxTotal: number;
  lines: ReturnLineInput[];
};

/**
 * Création d'un bon d'avoir achat avec sortie de stock
 */
export async function createPurchaseReturn(data: CreateReturnInput) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 0. Utilisateur Système pour tracer les mouvements de stock
      const systemUser = await tx.user.upsert({
        where: { email: "system@geststock.com" },
        update: {},
        create: {
          id: "SYSTEM",
          name: "Système",
          email: "system@geststock.com",
          password: "no-password",
          role: "ADMIN"
        }
      });

      // 1. Création du document d'avoir (PURCHASE_RETURN)
      const document = await tx.document.create({
        data: {
          type: "PURCHASE_RETURN",
          reference: data.reference,
          date: data.date,
          status: "VALIDATED",
          supplierId: data.supplierId,
          grossTotal: data.grossTotal,
          taxTotal: data.taxTotal,
          netTotal: data.netTotal,
        }
      });

      // 2. Traitement des lignes et mise à jour du stock
      for (const line of data.lines) {
        // - Vérifier l'existence et la quantité en stock
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_batchId_warehouseId: {
              productId: line.productId,
              batchId: line.batchId,
              warehouseId: line.warehouseId
            }
          }
        });

        if (!inventory || inventory.quantity < line.quantity) {
          throw new Error(`Stock insuffisant pour le produit sélectionné dans le dépôt/lot d'origine.`);
        }

        // - Créer la ligne de document
        await tx.documentLine.create({
          data: {
            documentId: document.id,
            productId: line.productId,
            batchId: line.batchId,
            warehouseId: line.warehouseId,
            quantity: line.quantity,
            unitPrice: line.unitCost,
            taxRate: line.taxRate || 0
          }
        });

        // - Créer le mouvement de stock de type SORTIE (OUT)
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            batchId: line.batchId,
            warehouseId: line.warehouseId,
            type: "OUT",
            quantity: line.quantity,
            sourceDocumentId: document.id,
            userId: systemUser.id,
            date: data.date
          }
        });

        // - Mettre à jour (décrémenter) l'inventaire physique
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: { decrement: line.quantity } }
        });
      }

      return document;
    });

    // Revalidation des chemins concernés
    revalidatePath("/achats/avoirs");
    revalidatePath("/stock/mouvements");
    revalidatePath("/stock/inventaire");
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Erreur création Avoir Achat:", error);
    return { success: false, error: error.message || "Une erreur est survenue lors de la création de l'avoir." };
  }
}

/**
 * Récupération de tous les avoirs achats
 */
export async function getPurchaseReturns() {
  try {
    const docs = await prisma.document.findMany({
      where: { type: "PURCHASE_RETURN" },
      include: {
        supplier: true,
        lines: {
          include: {
            product: true,
            batch: true,
            warehouse: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    return { success: true, data: docs };
  } catch (error) {
    console.error("Erreur lecture avoirs:", error);
    return { success: false, error: "Impossible de récupérer la liste des avoirs." };
  }
}

/**
 * Suppression d'un avoir et restauration du stock
 */
export async function deletePurchaseReturn(id: string) {
  try {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!doc) return { success: false, error: "Avoir introuvable." };

    await prisma.$transaction(async (tx) => {
      const systemUser = await tx.user.findFirst({ where: { email: "system@geststock.com" } });

      // Inverser les mouvements : refaire une entrée en stock (IN)
      for (const line of doc.lines) {
        if (!line.productId || !line.batchId || !line.warehouseId) continue;

        // Ré-incrémenter l'inventaire
        await tx.inventory.update({
          where: {
            productId_batchId_warehouseId: {
              productId: line.productId,
              batchId: line.batchId,
              warehouseId: line.warehouseId
            }
          },
          data: { quantity: { increment: line.quantity } }
        });

        // Mouvement pivot (IN)
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            batchId: line.batchId,
            warehouseId: line.warehouseId,
            type: "IN",
            quantity: line.quantity,
            sourceDocumentId: doc.id,
            userId: systemUser?.id || "SYSTEM",
            date: new Date()
          }
        });
      }

      // Supprimer le document final
      await tx.document.delete({ where: { id } });
    });

    revalidatePath("/achats/avoirs");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Erreur lors de la suppression de l'avoir." };
  }
}
