"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getNextReferenceAction } from "./sequences.actions";
import { logAction } from "@/lib/audit";
import { recordStockMovement, rollbackDocumentStock } from "@/lib/stock-engine";

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

      // 1. Génération de référence automatique
      const ref = data.reference || await getNextReferenceAction("PURCHASE_RETURN");

      // 1. Création du document d'avoir (PURCHASE_RETURN)
      const document = await tx.document.create({
        data: {
          type: "PURCHASE_RETURN",
          reference: ref,
          date: data.date,
          status: "VALIDATED",
          supplierId: data.supplierId,
          grossTotal: data.grossTotal,
          taxTotal: data.taxTotal,
          netTotal: data.netTotal,
        }
      });

        // - Utiliser le moteur de stock pour enregistrer la sortie (Avoir fournisseur = Retour marchandise)
        await recordStockMovement(tx, {
          productId: line.productId,
          warehouseId: line.warehouseId,
          batchId: line.batchId,
          type: "OUT",
          quantity: line.quantity,
          sourceDocumentId: document.id,
          userId: systemUser.id,
          date: data.date
        });
      }

      return document;
    });

    // Revalidation des chemins concernés
    revalidatePath("/", "layout");
    
    // Log Audit
    await logAction(null, "CREATE_PURCHASE_RETURN", `Avoir Fournisseur créé: ${result.reference}`);
    
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
      // 1. Inverser le stock via le moteur
      await rollbackDocumentStock(tx, id);

      // 2. Supprimer le document
      await tx.document.delete({ where: { id } });
    });

    revalidatePath("/achats/avoirs");
    revalidatePath("/stock/inventaire");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Erreur lors de la suppression de l'avoir." };
  }
}
