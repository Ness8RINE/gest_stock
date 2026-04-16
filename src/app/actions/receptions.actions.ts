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
  taxRate?: number;
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
            unitPrice: line.unitCost,
            taxRate: line.taxRate || 0
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

export async function getReceiptDocuments() {
  try {
    const receipts = await prisma.document.findMany({
      where: { type: "RECEIPT" },
      include: {
        supplier: true,
        lines: {
          include: {
            product: true
          }
        },
        _count: { select: { lines: true } }
      },
      orderBy: { date: 'desc' }
    });
    return { success: true, data: receipts };
  } catch (error) {
    console.error("Erreur lecture réceptions:", error);
    return { success: false, error: "Erreur serveur" };
  }
}
export async function getReceiptById(id: string) {
  try {
    const receipt = await prisma.document.findUnique({
      where: { id },
      include: {
        supplier: true,
        lines: {
          include: {
            product: true,
            warehouse: true,
            batch: true
          }
        }
      }
    });
    return { success: true, data: receipt };
  } catch (error) {
    console.error("Erreur lecture réception:", error);
    return { success: false, error: "Erreur serveur" };
  }
}

export async function deleteReceipt(id: string) {
  try {
    const receipt = await prisma.document.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!receipt) return { success: false, error: "Réception introuvable." };

    await prisma.$transaction(async (tx) => {
      // 1. Inverser le stock (Faire un mouvement OUT)
      // On boucle sur chaque ligne pour décrémenter le stock
      for (const line of receipt.lines) {
        if (!line.productId || !line.warehouseId || !line.batchId) continue;

        const inventory = await tx.inventory.findUnique({
          where: {
            productId_batchId_warehouseId: {
              productId: line.productId,
              batchId: line.batchId,
              warehouseId: line.warehouseId
            }
          }
        });

        if (inventory) {
          // Note: On pourrait vérifier si inventory.quantity >= line.quantity
          // Mais pour une suppression de réception, on veut restaurer l'état
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: { decrement: line.quantity } }
          });
        }

        // Créer mouvement de sortie pour annuler l'entrée
        const systemUser = await tx.user.findFirst({ where: { email: "system@geststock.com" } });
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            batchId: line.batchId,
            warehouseId: line.warehouseId,
            type: "OUT",
            quantity: line.quantity,
            date: new Date(),
            userId: systemUser?.id || "SYSTEM",
            sourceDocumentId: receipt.id
          }
        });
      }

      // 2. Supprimer la réception
      await tx.document.delete({ where: { id } });
    });

    revalidatePath("/achats/receptions");
    return { success: true };
  } catch (error: any) {
    console.error("Erreur suppression réception:", error);
    return { success: false, error: error.message || "Échec de la suppression." };
  }
}
export async function updateReceiptDocument(id: string, data: CreateReceiptInput) {
  try {
    const oldReceipt = await prisma.document.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!oldReceipt) return { success: false, error: "Réception introuvable." };

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

      // 1. Inverser l'ancien stock
      for (const line of oldReceipt.lines) {
        if (!line.productId || !line.warehouseId || !line.batchId) continue;
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
        
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            batchId: line.batchId,
            warehouseId: line.warehouseId,
            type: "OUT",
            quantity: line.quantity,
            date: new Date(),
            userId: systemUser.id,
            sourceDocumentId: oldReceipt.id
          }
        });
      }

      // 2. Supprimer les anciennes lignes
      await tx.documentLine.deleteMany({ where: { documentId: id } });

      // 3. Mettre à jour le Document
      const document = await tx.document.update({
        where: { id },
        data: {
          reference: data.reference,
          date: data.date,
          supplierId: data.supplierId,
          netTotal: data.netTotal,
          grossTotal: data.netTotal,
        }
      });

      // 4. Créer les nouvelles lignes et mettre à jour le stock
      for (const line of data.lines) {
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

        await tx.documentLine.create({
          data: {
            documentId: document.id,
            productId: line.productId,
            batchId: batch.id,
            quantity: line.quantity,
            unitPrice: line.unitCost,
            taxRate: line.taxRate || 0
          }
        });

        await tx.inventory.upsert({
          where: {
            productId_batchId_warehouseId: {
              productId: line.productId,
              batchId: batch.id,
              warehouseId: line.warehouseId
            }
          },
          update: { quantity: { increment: line.quantity } },
          create: {
            productId: line.productId, batchId: batch.id, warehouseId: line.warehouseId,
            quantity: line.quantity, reservedQuantity: 0
          }
        });

        await tx.stockMovement.create({
          data: {
            productId: line.productId, batchId: batch.id, warehouseId: line.warehouseId,
            type: "IN", quantity: line.quantity, sourceDocumentId: document.id,
            userId: systemUser.id, date: data.date
          }
        });
      }

      return document;
    });

    revalidatePath("/achats/receptions");
    return { success: true, data: result };
  } catch (error) {
    console.error("Erreur mise à jour réception:", error);
    return { success: false, error: "Erreur serveur lors de la mise à jour." };
  }
}
