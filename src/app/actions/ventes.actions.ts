"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DocumentType } from "@prisma/client";

export type LineItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  warehouseId?: string; // Nouvelle colonne Dépôt
  batchId?: string;     // Nouvelle colonne Lot
};

export type CreateDocumentInput = {
  type: "PROFORMA" | "BL" | "BV" | "INVOICE";
  date: Date;
  reference?: string;
  customerId: string;
  paymentMethod?: string;
  warehouseId?: string; 
  grossTotal: number;
  discountTotal: number;
  taxTotal: number;
  stampTax: number;
  netTotal: number;
  lines: LineItemInput[];
};

export async function getNextReference(type: "PROFORMA" | "BL" | "BV" | "INVOICE") {
  try {
    const lastDoc = await prisma.document.findFirst({
      where: { type },
      orderBy: { reference: 'desc' },
      select: { reference: true }
    });

    const prefix = type === "PROFORMA" ? "PROF-" : type === "BL" ? "BL-" : type === "BV" ? "BV-" : "FACT-";
    
    if (!lastDoc || !lastDoc.reference || !lastDoc.reference.startsWith(prefix)) {
      return `${prefix}01`;
    }

    const currentNum = parseInt(lastDoc.reference.replace(prefix, ""));
    if (isNaN(currentNum)) return `${prefix}01`;
    const nextNum = currentNum + 1;
    return `${prefix}${nextNum.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error("Error getting next ref:", error);
    return "";
  }
}

export async function deleteDocument(id: string) {
  try {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!doc) return { success: false, error: "Document introuvable." };

    await prisma.$transaction(async (tx) => {
      // 1. Restaurer le stock si c'est un BL ou BV
      if (doc.type === "BL" || doc.type === "BV") {
        await handleStockMovement(tx, doc.id, doc.lines as any, "IN");
      }

      // 2. Supprimer le document
      await tx.document.delete({ where: { id } });
    });

    revalidatePath("/ventes/bl");
    revalidatePath("/ventes/bv");
    revalidatePath("/ventes/proforma");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting doc:", error);
    return { success: false, error: error.message || "Impossible de supprimer le document." };
  }
}

// Helper pour traiter les mouvements de stock
async function handleStockMovement(tx: any, docId: string, lines: LineItemInput[], type: "IN" | "OUT") {
  for (const line of lines) {
    if (!line.productId || !line.warehouseId || !line.batchId) continue;

    // 1. Trouver l'inventaire correspondant
    const inventory = await tx.inventory.findUnique({
      where: {
        productId_batchId_warehouseId: {
          productId: line.productId,
          batchId: line.batchId,
          warehouseId: line.warehouseId
        }
      }
    });

    if (type === "OUT") {
      if (!inventory || inventory.quantity < line.quantity) {
        throw new Error(`Stock insuffisant pour le produit dans le dépôt demandé.`);
      }
      // Déduire le stock
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { quantity: { decrement: line.quantity } }
      });
    } else {
      // Pour les retours ou annulations un jour
      if (inventory) {
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: { increment: line.quantity } }
        });
      } else {
        await tx.inventory.create({
          data: {
            productId: line.productId,
            batchId: line.batchId,
            warehouseId: line.warehouseId,
            quantity: line.quantity,
            reservedQuantity: 0
          }
        });
      }
    }

    // 2. Créer le mouvement de stock
    // Note: Pour simplifier ici on utilise un userId fictif ou système si non présent
    // Dans une app réelle, on passerait l'ID de l'utilisateur connecté
    const systemUser = await tx.user.findFirst(); 

    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        batchId: line.batchId,
        warehouseId: line.warehouseId,
        type: type,
        quantity: line.quantity,
        date: new Date(),
        userId: systemUser?.id || "",
        sourceDocumentId: docId
      }
    });
  }
}

export async function transformProformaToDoc(proformaId: string, targetType: "BL" | "BV") {
  try {
    const proforma = await prisma.document.findUnique({
      where: { id: proformaId },
      include: { lines: true }
    });

    if (!proforma) return { success: false, error: "Proforma introuvable." };

    const nextRef = await getNextReference(targetType);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Créer le nouveau document (BL ou BV)
      const newDoc = await tx.document.create({
        data: {
          type: targetType,
          reference: nextRef,
          date: new Date(),
          status: "VALIDATED",
          customerId: proforma.customerId,
          paymentMethod: proforma.paymentMethod,
          grossTotal: proforma.grossTotal,
          discountTotal: proforma.discountTotal,
          taxTotal: proforma.taxTotal,
          stampTax: proforma.stampTax,
          netTotal: proforma.netTotal,
          parentId: proforma.id,
          lines: {
            create: proforma.lines.map(line => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discount: line.discount,
              taxRate: line.taxRate,
              warehouseId: line.warehouseId, // Sera null si non défini dans la proforma
              batchId: line.batchId
            }))
          }
        }
      });

      // 2. Gérer le stock (Si BL ou BV)
      const linesForStock = proforma.lines.map(l => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discount: l.discount,
        taxRate: l.taxRate,
        warehouseId: l.warehouseId || undefined,
        batchId: l.batchId || undefined
      }));
      
      await handleStockMovement(tx, newDoc.id, linesForStock, "OUT");

      // 3. Marquer la proforma comme validée
      await tx.document.update({
        where: { id: proformaId },
        data: { status: "VALIDATED" }
      });

      return newDoc;
    });

    revalidatePath("/ventes/bl");
    revalidatePath("/ventes/bv");
    revalidatePath("/ventes/proforma");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error transforming doc:", error);
    return { success: false, error: error.message || "Échec de la transformation." };
  }
}

export async function wipeAllProformas() {
  try {
    await prisma.document.deleteMany({ where: { type: "PROFORMA" } });
    revalidatePath("/ventes/proforma");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function createSaleDocument(data: CreateDocumentInput) {
  try {
    let ref = data.reference;
    if (!ref) {
      ref = await getNextReference(data.type);
    }

    const result = await prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          type: data.type,
          date: data.date,
          reference: ref,
          status: data.type === 'PROFORMA' ? 'DRAFT' : 'VALIDATED',
          customerId: data.customerId === "COMPTANT" ? null : data.customerId,
          paymentMethod: data.paymentMethod,
          grossTotal: data.grossTotal,
          discountTotal: data.discountTotal,
          taxTotal: data.taxTotal,
          stampTax: data.stampTax,
          netTotal: data.netTotal,
          lines: {
            create: data.lines.map(line => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discount: line.discount,
              taxRate: line.taxRate,
              warehouseId: line.warehouseId,
              batchId: line.batchId
            }))
          }
        },
        include: {
          lines: {
            include: {
              product: true
            }
          }
        }
      });

      // Impact Stock si BL ou BV
      if (data.type === 'BL' || data.type === 'BV') {
        await handleStockMovement(tx, document.id, data.lines, "OUT");
      }

      return document;
    });

    revalidatePath("/ventes/bl");
    revalidatePath("/ventes/bv");
    revalidatePath("/ventes/proforma");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Erreur serveur Vente:", error);
    return { success: false, error: error.message || "Impossible de créer le document." };
  }
}

export async function getSaleDocuments(typeDoc?: "PROFORMA" | "BL" | "BV" | "INVOICE") {
  try {
    const docs = await prisma.document.findMany({
      where: {
        type: typeDoc ? typeDoc : { in: ["PROFORMA", "BL", "BV", "INVOICE"] }
      },
      include: {
        customer: true,
        lines: {
          include: {
            product: true
          }
        },
        _count: {
          select: { lines: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: docs };
  } catch (error) {
    console.error("Erreur lecture factures:", error);
    return { success: false, error: "Erreur serveur" };
  }
}

export async function getSaleDocumentById(id: string) {
  try {
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: {
          include: {
            product: {
              include: {
                inventories: {
                  include: {
                    warehouse: true,
                    batch: true
                  }
                }
              }
            },
            warehouse: true,
            batch: true
          }
        }
      }
    });
    return { success: true, data: document };
  } catch (error) {
    console.error("Erreur lecture document:", error);
    return { success: false, error: "Erreur serveur" };
  }
}

export async function updateSaleDocument(id: string, data: CreateDocumentInput) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Gérer le stock inverse si c'était déjà un BL/BV (très simplifié ici)
      // Note: On devrait réinjecter l'ancien stock avant de retirer le nouveau.
      // Pour cette version, on se concentre sur la création propre.
      
      await tx.documentLine.deleteMany({
        where: { documentId: id }
      });

      const updated = await tx.document.update({
        where: { id },
        data: {
          date: data.date,
          reference: data.reference,
          customerId: data.customerId === "COMPTANT" ? null : data.customerId,
          paymentMethod: data.paymentMethod,
          grossTotal: data.grossTotal,
          discountTotal: data.discountTotal,
          taxTotal: data.taxTotal,
          stampTax: data.stampTax,
          netTotal: data.netTotal,
          lines: {
            create: data.lines.map(line => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discount: line.discount,
              taxRate: line.taxRate,
              warehouseId: line.warehouseId,
              batchId: line.batchId
            }))
          }
        },
        include: {
          lines: {
            include: {
              product: true
            }
          }
        }
      });

      // Mettre à jour stock si BL/BV
      if (data.type === 'BL' || data.type === 'BV') {
        await handleStockMovement(tx, id, data.lines, "OUT");
      }

      return updated;
    });

    revalidatePath("/ventes/bl");
    revalidatePath("/ventes/bv");
    revalidatePath("/ventes/proforma");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Erreur mise à jour document:", error);
    return { success: false, error: error.message || "Impossible de mettre à jour le document." };
  }
}

