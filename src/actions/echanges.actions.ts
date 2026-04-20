"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getNextReferenceAction } from "./sequences.actions";
import { logAction } from "@/lib/audit";
import { recordStockMovement, rollbackDocumentStock } from "@/lib/stock-engine";

export type ExchangeLineInput = {
  productId: string;
  warehouseId: string;
  batchId: string;
  quantity: number;
  unitPrice: number;
  type: "IN" | "OUT"; // IN = produit rendu, OUT = produit pris
};

export type CreateExchangeInput = {
  reference: string;
  date: Date;
  customerId: string;
  netDiff: number; // Différence à payer ou à rembourser
  lines: ExchangeLineInput[];
};

export async function createExchange(data: CreateExchangeInput) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 0. Utilisateur Système
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
      const ref = data.reference || await getNextReferenceAction("EXCHANGE");

      // 1. Créer le Document d'Échange
      const document = await tx.document.create({
        data: {
          type: "EXCHANGE",
          reference: ref,
          date: data.date,
          status: "VALIDATED",
          customerId: data.customerId === "COMPTANT" ? null : data.customerId,
          netTotal: data.netDiff, // On stocke la différence nette
          grossTotal: 0,
          taxTotal: 0
        }
      });

      // 2. Traiter les lignes
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
            taxRate: 0,
            lineType: line.type // "IN" ou "OUT"
          }
        });

        // - Utiliser le moteur de stock pour enregistrer le mouvement (ENTRÉE ou SORTIE)
        await recordStockMovement(tx, {
          productId: line.productId,
          warehouseId: line.warehouseId,
          batchId: line.batchId,
          type: line.type,
          quantity: line.quantity,
          sourceDocumentId: document.id,
          userId: systemUser.id,
          date: data.date
        });
      }

      return document;
    });

    revalidatePath("/ventes/echanges");
    revalidatePath("/stock/inventaire");
    
    // Log Audit
    await logAction(null, "CREATE_EXCHANGE", `Bon d'Échange créé: ${result.reference}`);
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Erreur création Échange:", error);
    return { success: false, error: error.message || "Erreur lors de l'échange." };
  }
}

export async function getExchanges() {
  try {
    const docs = await prisma.document.findMany({
      where: { type: "EXCHANGE" },
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
    return { success: false, error: "Erreur lecture" };
  }
}

export async function deleteExchange(id: string) {
    try {
      const doc = await prisma.document.findUnique({
        where: { id },
        include: { lines: true }
      });
  
      if (!doc) return { success: false, error: "Échange introuvable." };
  
      await prisma.$transaction(async (tx) => {
        // 1. Inverser tout le stock lié à ce document via le moteur
        await rollbackDocumentStock(tx, id);

        // 2. Supprimer les lignes et le document
        await tx.documentLine.deleteMany({ where: { documentId: id } });
        await tx.document.delete({ where: { id } });
      });
  
      revalidatePath("/ventes/echanges");
      revalidatePath("/stock/inventaire");
      revalidatePath("/");
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Erreur suppression" };
    }
}
