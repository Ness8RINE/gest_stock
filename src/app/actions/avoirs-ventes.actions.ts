"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getNextReference } from "@/lib/sequences";
import { logAction } from "@/lib/audit";

export type SaleReturnLineInput = {
  productId: string;
  warehouseId: string;
  batchId: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
};

export type CreateSaleReturnInput = {
  reference: string;
  date: Date;
  customerId: string;
  netTotal: number;
  grossTotal: number;
  taxTotal: number;
  lines: SaleReturnLineInput[];
};

/**
 * Création d'un bon d'avoir client (Credit Note) avec ENTRÉE en stock
 */
export async function createSaleReturn(data: CreateSaleReturnInput) {
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

      // 1. Génération de référence automatique
      const ref = data.reference || await getNextReference("CREDIT_NOTE");

      // 1. Création du document d'avoir (CREDIT_NOTE)
      const document = await tx.document.create({
        data: {
          type: "CREDIT_NOTE",
          reference: ref,
          date: data.date,
          status: "VALIDATED",
          customerId: data.customerId,
          grossTotal: data.grossTotal,
          taxTotal: data.taxTotal,
          netTotal: data.netTotal,
          paymentMethod: "A_VALOIR" // Méthode de paiement par défaut pour un avoir
        }
      });

      // 2. Traitement des lignes et mise à jour du stock
      for (const line of data.lines) {
        // - Créer la ligne de document
        await tx.documentLine.create({
          data: {
            documentId: document.id,
            productId: line.productId,
            batchId: line.batchId,
            warehouseId: line.warehouseId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxRate: line.taxRate || 0
          }
        });

        // - Créer le mouvement de stock de type ENTRÉE (IN)
        // Note: Un retour client remet la marchandise en stock.
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            batchId: line.batchId,
            warehouseId: line.warehouseId,
            type: "IN",
            quantity: line.quantity,
            sourceDocumentId: document.id,
            userId: systemUser.id,
            date: data.date
          }
        });

        // - Mettre à jour (incrémenter) l'inventaire physique
        await tx.inventory.upsert({
          where: {
            productId_batchId_warehouseId: {
              productId: line.productId,
              batchId: line.batchId,
              warehouseId: line.warehouseId
            }
          },
          update: {
            quantity: { increment: line.quantity }
          },
          create: {
            productId: line.productId,
            batchId: line.batchId,
            warehouseId: line.warehouseId,
            quantity: line.quantity,
            reservedQuantity: 0
          }
        });
      }

      return document;
    });

    revalidatePath("/ventes/avoirs");
    revalidatePath("/stock/inventaire");
    
    // Log Audit
    await logAction(null, "CREATE_SALE_RETURN", `Avoir Client créé: ${result.reference}`);
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Erreur création Avoir Client:", error);
    return { success: false, error: error.message || "Erreur lors de la création de l'avoir." };
  }
}

/**
 * Récupération des avoirs clients
 */
export async function getSaleReturns() {
  try {
    const docs = await prisma.document.findMany({
      where: { type: "CREDIT_NOTE" },
      include: {
        customer: true,
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
    console.error("Erreur lecture avoirs clients:", error);
    return { success: false, error: "Impossible de récupérer les avoirs." };
  }
}

/**
 * Suppression d'un avoir client et retrait du stock
 */
export async function deleteSaleReturn(id: string) {
  try {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!doc) return { success: false, error: "Avoir introuvable." };

    await prisma.$transaction(async (tx) => {
      const systemUser = await tx.user.findFirst({ where: { email: "system@geststock.com" } });

      for (const line of doc.lines) {
        if (!line.productId || !line.batchId || !line.warehouseId) continue;

        // Décrémenter le stock (annuler l'entrée)
        await tx.inventory.update({
          where: {
            productId_batchId_warehouseId: {
              productId: line.productId,
              batchId: line.batchId,
              warehouseId: line.warehouseId
            }
          },
          data: { quantity: { decrement: line.quantity } }
        });

        // Mouvement OUT pour compensation
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            batchId: line.batchId,
            warehouseId: line.warehouseId,
            type: "OUT",
            quantity: line.quantity,
            sourceDocumentId: doc.id,
            userId: systemUser?.id || "SYSTEM",
            date: new Date()
          }
        });
      }

      await tx.document.delete({ where: { id } });
    });

    revalidatePath("/ventes/avoirs");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Erreur lors de la suppression." };
  }
}
