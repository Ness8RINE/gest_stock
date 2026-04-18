import { MovementType, PrismaClient } from "@prisma/client";

/**
 * Moteur de Stock Centralisé
 * Garantit que chaque mouvement de stock est atomiquement lié à l'inventaire physique.
 */
export async function recordStockMovement(
  tx: any, // Transaction Prisma (OBLIGATOIRE pour l'atomicité)
  data: {
    productId: string;
    warehouseId: string;
    batchId: string;
    type: MovementType;
    quantity: number;
    sourceDocumentId: string;
    userId: string;
    date?: Date;
  }
) {
  // 1. Enregistrer le mouvement Audit
  await tx.stockMovement.create({
    data: {
      productId: data.productId,
      warehouseId: data.warehouseId,
      batchId: data.batchId,
      type: data.type,
      quantity: data.quantity,
      sourceDocumentId: data.sourceDocumentId,
      userId: data.userId,
      date: data.date || new Date(),
    },
  });

  // 2. Mettre à jour l'inventaire physique (Cache d'état)
  if (data.type === "IN") {
    await tx.inventory.upsert({
      where: {
        productId_batchId_warehouseId: {
          productId: data.productId,
          batchId: data.batchId,
          warehouseId: data.warehouseId,
        },
      },
      create: {
        productId: data.productId,
        batchId: data.batchId,
        warehouseId: data.warehouseId,
        quantity: data.quantity,
        reservedQuantity: 0,
      },
      update: {
        quantity: { increment: data.quantity },
      },
    });
  } else if (data.type === "OUT") {
    const inv = await tx.inventory.findUnique({
      where: {
        productId_batchId_warehouseId: {
          productId: data.productId,
          batchId: data.batchId,
          warehouseId: data.warehouseId,
        },
      },
    });

    if (!inv || inv.quantity < data.quantity) {
      // Dans le cas d'une suppression de réception, on peut techniquement tomber à négatif temporairement 
      // si des ventes ont déjà eu lieu (cas métier à discuter), mais par défaut on décrémente.
    }

    await tx.inventory.upsert({
      where: {
        productId_batchId_warehouseId: {
          productId: data.productId,
          batchId: data.batchId,
          warehouseId: data.warehouseId,
        },
      },
      create: {
        productId: data.productId,
        batchId: data.batchId,
        warehouseId: data.warehouseId,
        quantity: -data.quantity,
        reservedQuantity: 0,
      },
      update: {
        quantity: { decrement: data.quantity },
      },
    });
  }
}

/**
 * Inverse tous les mouvements liés à un document
 * Utilisé lors de la suppression ou de la modification d'un document.
 */
export async function rollbackDocumentStock(tx: any, documentId: string) {
  // 1. Trouver tous les mouvements liés
  const movements = await tx.stockMovement.findMany({
    where: { sourceDocumentId: documentId },
  });

  // 2. Inverser chaque mouvement
  for (const m of movements) {
    if (m.type === "IN") {
      // C'était une entrée (+), on fait une sortie inverse (-)
      await tx.inventory.update({
        where: {
          productId_batchId_warehouseId: {
            productId: m.productId,
            batchId: m.batchId,
            warehouseId: m.warehouseId,
          },
        },
        data: { quantity: { decrement: m.quantity } },
      });
    } else if (m.type === "OUT") {
      // C'était une sortie (-), on fait une entrée inverse (+)
      await tx.inventory.update({
        where: {
          productId_batchId_warehouseId: {
            productId: m.productId,
            batchId: m.batchId,
            warehouseId: m.warehouseId,
          },
        },
        data: { quantity: { increment: m.quantity } },
      });
    }
  }

  // 3. Supprimer les mouvements
  await tx.stockMovement.deleteMany({
    where: { sourceDocumentId: documentId },
  });
}
