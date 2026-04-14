"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DocumentType } from "@prisma/client";

export type ReceiptLineInput = {
  productId: string;
  warehouseId: string;
  batchNumber: string;
  expirationDate?: string;
  quantity: number;
  unitCost: number;
};

export type CreateReceiptInput = {
  reference: string;
  date: Date;
  supplierId: string;
  netTotal: number;
  lines: ReceiptLineInput[];
};

export async function createReceiptDocument(data: CreateReceiptInput) {
  try {
    // 1. Transaction Prisma pour garantir que Lot, Mouvement et Document sont synchronisés
    const result = await prisma.$transaction(async (tx) => {
      // 0. S'assurer qu'un utilisateur "SYSTEM" existe pour la traçabilité
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

      // a. Créer d'abord le Document de Réception (Fournisseur)
      const document = await tx.document.create({
        data: {
          type: "RECEIPT",
          reference: data.reference || `BR-${Date.now()}`,
          date: data.date,
          status: "VALIDATED",
          supplierId: data.supplierId,
          netTotal: data.netTotal,
          grossTotal: data.netTotal,
        }
      });

      // b. Boucler sur chaque ligne pour créer le Lot, l'Inventaire et le Mouvement
      for (const line of data.lines) {
        // - Upsert le Batch (Lot)
        const batch = await tx.batch.upsert({
          where: {
            batchNumber_productId: {
              batchNumber: line.batchNumber,
              productId: line.productId
            }
          },
          update: {
            unitCost: line.unitCost,
            expirationDate: line.expirationDate ? new Date(line.expirationDate) : null
          },
          create: {
            batchNumber: line.batchNumber,
            productId: line.productId,
            unitCost: line.unitCost,
            expirationDate: line.expirationDate ? new Date(line.expirationDate) : null
          }
        });

        // - Lier la ligne au Document
        await tx.documentLine.create({
          data: {
            documentId: document.id,
            productId: line.productId,
            batchId: batch.id,
            quantity: line.quantity,
            unitPrice: line.unitCost // Prix d'achat unitaire
          }
        });

        // - Mettre à jour l'Inventaire (Stock physique)
        const inventory = await tx.inventory.upsert({
          where: {
            productId_batchId_warehouseId: {
              productId: line.productId,
              batchId: batch.id,
              warehouseId: line.warehouseId
            }
          },
          update: {
            quantity: { increment: line.quantity }
          },
          create: {
            productId: line.productId,
            batchId: batch.id,
            warehouseId: line.warehouseId,
            quantity: line.quantity,
            reservedQuantity: 0
          }
        });

        // - Enregistrer la traçabilité (Stock Movement)
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            batchId: batch.id,
            warehouseId: line.warehouseId,
            type: "IN",
            quantity: line.quantity,
            sourceDocumentId: document.id,
            userId: systemUser.id,
            date: data.date
          }
        });
      }

      return document;
    });

    revalidatePath("/achats/receptions");
    revalidatePath("/ventes/bl/create"); // Mettre à jour le catalogue des ventes
    return { success: true, data: result };

  } catch (error) {
    console.error("Erreur création Bon de Réception:", error);
    return { success: false, error: "Impossible de valider le Bon de Réception." };
  }
}
