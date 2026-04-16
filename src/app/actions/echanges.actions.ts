"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

      // 1. Créer le Document d'Échange
      const document = await tx.document.create({
        data: {
          type: "EXCHANGE",
          reference: data.reference,
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

        // - Mouvement de stock
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            batchId: line.batchId,
            warehouseId: line.warehouseId,
            type: line.type,
            quantity: line.quantity,
            sourceDocumentId: document.id,
            userId: systemUser.id,
            date: data.date
          }
        });

        // - Mise à jour de l'inventaire
        if (line.type === "IN") {
          // Produit rendu par le client -> Augmente notre stock
          await tx.inventory.upsert({
            where: {
              productId_batchId_warehouseId: {
                productId: line.productId,
                batchId: line.batchId,
                warehouseId: line.warehouseId
              }
            },
            create: {
              productId: line.productId,
              batchId: line.batchId,
              warehouseId: line.warehouseId,
              quantity: line.quantity,
              reservedQuantity: 0
            },
            update: {
              quantity: { increment: line.quantity }
            }
          });
        } else {
          // Produit pris par le client -> Diminue notre stock
          const inv = await tx.inventory.findUnique({
            where: {
              productId_batchId_warehouseId: {
                productId: line.productId,
                batchId: line.batchId,
                warehouseId: line.warehouseId
              }
            }
          });

          if (!inv || inv.quantity < line.quantity) {
             throw new Error(`Stock insuffisant pour l'article ${line.productId} (Lot: ${line.batchId})`);
          }

          await tx.inventory.update({
            where: { id: inv.id },
            data: { quantity: { decrement: line.quantity } }
          });
        }
      }

      return document;
    });

    revalidatePath("/ventes/echanges");
    revalidatePath("/stock/inventaire");
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
        // Pour supprimer un échange, on doit inverser TOUS les mouvements liés au document
        const movements = await tx.stockMovement.findMany({
            where: { sourceDocumentId: id }
        });

        for (const m of movements) {
            if (m.type === "IN") {
                // Il était entré, on le ressort
                await tx.inventory.update({
                    where: { productId_batchId_warehouseId: { productId: m.productId, batchId: m.batchId, warehouseId: m.warehouseId } },
                    data: { quantity: { decrement: m.quantity } }
                });
            } else {
                // Il était sorti, on le rerentre
                await tx.inventory.update({
                    where: { productId_batchId_warehouseId: { productId: m.productId, batchId: m.batchId, warehouseId: m.warehouseId } },
                    data: { quantity: { increment: m.quantity } }
                });
            }
        }

        await tx.stockMovement.deleteMany({ where: { sourceDocumentId: id } });
        await tx.documentLine.deleteMany({ where: { documentId: id } });
        await tx.document.delete({ where: { id } });
      });
  
      revalidatePath("/ventes/echanges");
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Erreur suppression" };
    }
}
