"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DocumentType } from "@prisma/client";

export type TransferLineInput = {
  productId: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
};

export type CreateTransferInput = {
  reference: string;
  date: Date;
  fromWarehouseId: string;
  toWarehouseId: string;
  lines: TransferLineInput[];
};

/**
 * Création d'un transfert inter-dépôts
 */
export async function createTransfer(data: CreateTransferInput) {
  try {
    if (data.fromWarehouseId === data.toWarehouseId) {
       throw new Error("Le dépôt source et destination doivent être différents.");
    }

    const result = await prisma.$transaction(async (tx) => {
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

      // 1. Créer le Document de transfert
      const document = await tx.document.create({
        data: {
          type: "TRANSFER" as DocumentType,
          reference: data.reference || `TRF-${Date.now()}`,
          date: data.date,
          status: "VALIDATED",
        }
      });

      // 2. Traiter chaque ligne
      for (const line of data.lines) {
        // - Vérifier stock source
        const sourceInventory = await tx.inventory.findUnique({
          where: {
            productId_batchId_warehouseId: {
              productId: line.productId,
              batchId: line.batchId,
              warehouseId: data.fromWarehouseId
            }
          }
        });

        if (!sourceInventory || sourceInventory.quantity < line.quantity) {
          throw new Error(`Stock insuffisant dans le dépôt source pour le produit ${line.productId} (Lot ${line.batchNumber}).`);
        }

        // - Lier la ligne au Document
        await tx.documentLine.create({
          data: {
            documentId: document.id,
            productId: line.productId,
            batchId: line.batchId,
            warehouseId: data.fromWarehouseId, // On note la source
            quantity: line.quantity,
            unitPrice: 0, // Un transfert n'a pas de prix de vente direct
          }
        });

        // - Mouvement de SORTIE (Source)
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            batchId: line.batchId,
            warehouseId: data.fromWarehouseId,
            type: "OUT",
            quantity: line.quantity,
            sourceDocumentId: document.id,
            userId: systemUser.id,
            date: data.date
          }
        });

        // - Mouvement d'ENTRÉE (Cible)
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            batchId: line.batchId,
            warehouseId: data.toWarehouseId,
            type: "IN",
            quantity: line.quantity,
            sourceDocumentId: document.id,
            userId: systemUser.id,
            date: data.date
          }
        });

        // - Mise à jour physique Source (Décrémenter)
        await tx.inventory.update({
          where: { id: sourceInventory.id },
          data: { quantity: { decrement: line.quantity } }
        });

        // - Mise à jour physique Cible (Incrémenter/Créer)
        await tx.inventory.upsert({
          where: {
            productId_batchId_warehouseId: {
              productId: line.productId,
              batchId: line.batchId,
              warehouseId: data.toWarehouseId
            }
          },
          update: { quantity: { increment: line.quantity } },
          create: {
            productId: line.productId,
            batchId: line.batchId,
            warehouseId: data.toWarehouseId,
            quantity: line.quantity,
            reservedQuantity: 0
          }
        });
      }

      return document;
    });

    revalidatePath("/stock/transferts");
    revalidatePath("/stock/inventaire");
    revalidatePath("/stock/mouvements");
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Erreur transfert:", error);
    return { success: false, error: error.message || "Erreur lors du transfert." };
  }
}

/**
 * Récupérer tous les mouvements de stock (Journal)
 */
export async function getStockMovements() {
  try {
    const movements = await prisma.stockMovement.findMany({
      include: {
        product: true,
        warehouse: true,
        batch: true,
        user: true
      },
      orderBy: { date: 'desc' }
    });
    return { success: true, data: movements };
  } catch (error) {
    console.error("Erreur lecture mouvements:", error);
    return { success: false, error: "Impossible de charger le journal des mouvements." };
  }
}

/**
 * Récupérer les transferts
 */
export async function getTransfers() {
  try {
    const transfers = await prisma.document.findMany({
      where: { type: "TRANSFER" as DocumentType },
      include: {
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
    return { success: true, data: transfers };
  } catch (error) {
    console.error("Erreur lecture transferts:", error);
    return { success: false, error: "Erreur serveur" };
  }
}
