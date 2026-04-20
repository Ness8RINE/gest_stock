"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DocumentType } from "@prisma/client";
import { logAction } from "@/lib/audit";
import { getNextReferenceAction } from "./sequences.actions";
import { recordStockMovement, rollbackDocumentStock } from "@/lib/stock-engine";

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
  paymentMethod?: string;
  lines: ReceiptLineInput[];
};

export async function createReceiptDocument(data: CreateReceiptInput) {
  try {
    // 1. Transaction Prisma pour garantir que Lot, Mouvement et Document sont synchronisés
    const result = await prisma.$transaction(async (tx) => {
      // a. Générer la référence automatique si non fournie
      let ref = data.reference;
      if (!ref) {
        ref = await getNextReferenceAction("RECEIPT");
      }

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

      // a. Calculer les totaux sur le serveur (Sécurité)
      let calculatedGrossTotal = 0;
      let calculatedTaxTotal = 0;

      data.lines.forEach(l => {
        const lineHT = (l.quantity || 0) * (l.unitCost || 0);
        const lineTax = lineHT * ((l.taxRate || 0) / 100);
        calculatedGrossTotal += lineHT;
        calculatedTaxTotal += lineTax;
      });

      const calculatedNetTotal = calculatedGrossTotal + calculatedTaxTotal;

      const document = await tx.document.create({
        data: {
          type: "RECEIPT",
          reference: ref,
          date: data.date,
          status: "VALIDATED",
          supplierId: data.supplierId,
          paymentMethod: data.paymentMethod || "virement",
          grossTotal: calculatedGrossTotal,
          taxTotal: calculatedTaxTotal,
          netTotal: calculatedNetTotal,
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
            warehouseId: line.warehouseId,
            quantity: line.quantity,
            unitPrice: line.unitCost,
            taxRate: line.taxRate || 0
          }
        });

        // - Utiliser le moteur de stock pour enregistrer le mouvement et mettre à jour l'inventaire
        await recordStockMovement(tx, {
          productId: line.productId,
          warehouseId: line.warehouseId,
          batchId: batch.id,
          type: "IN",
          quantity: line.quantity,
          sourceDocumentId: document.id,
          userId: systemUser.id,
          date: data.date
        });
      }

      return document;
    });

    // Log Audit
    await logAction(null, "CREATE_RECEIPT", `Bon de Réception créé: ${result.reference}`);

    revalidatePath("/", "layout");
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
        childDocuments: true,
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
      // 1. Inverser tout le stock lié à ce document via le moteur
      await rollbackDocumentStock(tx, id);

      // 2. Supprimer le document (Cascade supprimera les lignes)
      await tx.document.delete({ where: { id } });

      // Log Audit
      await logAction(null, "DELETE_RECEIPT", `Bon de Réception supprimé: ${receipt.reference}`);
    });

    revalidatePath("/", "layout");
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

      // 1. Restaurer l'ancien stock via le moteur
      await rollbackDocumentStock(tx, id);

      // 2. Supprimer les anciennes lignes
      await tx.documentLine.deleteMany({ where: { documentId: id } });

      // Calculer les totaux (Sécurité serveur)
      let calculatedGrossTotal = 0;
      let calculatedTaxTotal = 0;

      data.lines.forEach(l => {
        const lineHT = (l.quantity || 0) * (l.unitCost || 0);
        const lineTax = lineHT * ((l.taxRate || 0) / 100);
        calculatedGrossTotal += lineHT;
        calculatedTaxTotal += lineTax;
      });

      const calculatedNetTotal = calculatedGrossTotal + calculatedTaxTotal;

      // 3. Mettre à jour le Document
      const document = await tx.document.update({
        where: { id },
        data: {
          reference: data.reference,
          date: data.date,
          supplierId: data.supplierId,
          paymentMethod: data.paymentMethod,
          grossTotal: calculatedGrossTotal,
          taxTotal: calculatedTaxTotal,
          netTotal: calculatedNetTotal,
        }
      });

      // 4. Créer les nouvelles lignes et enregistrer les nouveaux mouvements
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
            warehouseId: line.warehouseId,
            quantity: line.quantity,
            unitPrice: line.unitCost,
            taxRate: line.taxRate || 0
          }
        });

        // Utiliser le moteur pour le nouveau stock
        await recordStockMovement(tx, {
          productId: line.productId,
          warehouseId: line.warehouseId,
          batchId: batch.id,
          type: "IN",
          quantity: line.quantity,
          sourceDocumentId: document.id,
          userId: systemUser.id,
          date: data.date
        });
      }

      return document;
    });

    revalidatePath("/", "layout");
    return { success: true, data: result };
  } catch (error) {
    console.error("Erreur mise à jour réception:", error);
    return { success: false, error: "Erreur serveur lors de la mise à jour." };
  }
}
