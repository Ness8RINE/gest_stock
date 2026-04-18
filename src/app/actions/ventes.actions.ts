"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DocumentType } from "@prisma/client";
import { logAction } from "@/lib/audit";
import { getNextReference } from "@/lib/sequences";

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
  type: "PROFORMA" | "BL" | "BV" | "INVOICE" | "DELIVERY";
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


export async function deleteDocument(id: string) {
  try {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!doc) return { success: false, error: "Document introuvable." };

    await prisma.$transaction(async (tx) => {
      // 1. Restaurer le stock si c'est un BL, BV ou Bon d'Enlèvement
      if (doc.type === "BL" || doc.type === "BV" || doc.type === "DELIVERY") {
        await handleStockMovement(tx, doc.id, doc.lines as any, "IN");
      }

      // 2. Supprimer le document
      await tx.document.delete({ where: { id } });

      // Log Audit
      await logAction(null, "DELETE_SALE_DOC", `Document ${doc.type} supprimé: ${doc.reference}`);
    });

    revalidatePath("/ventes/bl");
    revalidatePath("/ventes/bv");
    revalidatePath("/ventes/enlevement");
    revalidatePath("/ventes/proforma");
    revalidatePath("/ventes/factures");
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

export async function transformDocToDoc(sourceId: string, targetType: "BL" | "BV" | "INVOICE") {
  try {
    const source = await prisma.document.findUnique({
      where: { id: sourceId },
      include: { lines: true }
    });

    if (!source) return { success: false, error: "Document source introuvable." };

    // Définir si on doit impacter le stock lors de cette transformation
    // On impacte le stock seulement si on passe d'une Proforma (sans stock) à un BL/BV/Facture
    // Si on passe d'un BL vers Facture, le stock est déjà déduit, donc on ne le fait PAS ici.
    const shouldImpactStock = source.type === "PROFORMA" && (targetType === "BL" || targetType === "BV" || targetType === "INVOICE" || (targetType as any) === "DELIVERY");

    const nextRef = await getNextReference(targetType);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Créer le nouveau document
      const newDoc = await tx.document.create({
        data: {
          type: targetType,
          reference: nextRef,
          date: new Date(),
          status: "VALIDATED",
          customerId: source.customerId,
          paymentMethod: source.paymentMethod,
          grossTotal: source.grossTotal,
          discountTotal: source.discountTotal,
          taxTotal: source.taxTotal,
          stampTax: source.stampTax,
          netTotal: source.netTotal,
          parentId: source.id,
          lines: {
            create: source.lines.map(line => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discount: line.discount,
              taxRate: line.taxRate,
              warehouseId: line.warehouseId,
              batchId: line.batchId
            }))
          }
        }
      });

      // 2. Gérer le stock seulement si nécessaire
      if (shouldImpactStock) {
        const linesForStock = source.lines.map(l => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount,
          taxRate: l.taxRate,
          warehouseId: l.warehouseId || undefined,
          batchId: l.batchId || undefined
        }));
        await handleStockMovement(tx, newDoc.id, linesForStock, "OUT");
      }

      // 3. Marquer le source comme validé
      await tx.document.update({
        where: { id: sourceId },
        data: { status: "VALIDATED" }
      });

      return newDoc;
    });

    // Log Audit
    await logAction(null, "TRANSFORM_DOC", `Document ${source.type} (${source.reference}) transformé en ${targetType} (${result.reference})`);

    revalidatePath("/ventes/bl");
    revalidatePath("/ventes/bv");
    revalidatePath("/ventes/proforma");
    revalidatePath("/ventes/factures");
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

      // Impact Stock si BL, BV ou Facture directe
      // Impact Stock si BL, BV, Facture directe ou Bon d'Enlèvement
      if (data.type === 'BL' || data.type === 'BV' || data.type === 'INVOICE' || data.type === 'DELIVERY') {
        await handleStockMovement(tx, document.id, data.lines, "OUT");
      }

      return document;
    });

    // Log Audit
    await logAction(null, "CREATE_SALE_DOC", `Document ${data.type} créé: ${result.reference}`);

    revalidatePath("/ventes/bl");
    revalidatePath("/ventes/bv");
    revalidatePath("/ventes/proforma");
    revalidatePath("/ventes/factures");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Erreur serveur Vente:", error);
    return { success: false, error: error.message || "Impossible de créer le document." };
  }
}

export async function getSaleDocuments(typeDoc?: "PROFORMA" | "BL" | "BV" | "INVOICE" | "DELIVERY") {
  try {
    const docs = await prisma.document.findMany({
      where: {
        type: typeDoc ? typeDoc : { in: ["PROFORMA", "BL", "BV", "INVOICE", "DELIVERY"] }
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
    const oldDoc = await prisma.document.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!oldDoc) return { success: false, error: "Document introuvable." };

    const result = await prisma.$transaction(async (tx) => {
      // 1. Restaurer l'ancien stock si c'était un type impactant le stock
      if (oldDoc.type === 'BL' || oldDoc.type === 'BV' || oldDoc.type === 'INVOICE' || oldDoc.type === 'DELIVERY') {
        await handleStockMovement(tx, id, oldDoc.lines as any, "IN");
      }
      
      // 2. Supprimer les anciennes lignes
      await tx.documentLine.deleteMany({
        where: { documentId: id }
      });

      // 3. Mettre à jour le document et créer les nouvelles lignes
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

      // 4. Appliquer le nouveau mouvement de stock
      if (data.type === 'BL' || data.type === 'BV' || data.type === 'INVOICE' || data.type === 'DELIVERY') {
        await handleStockMovement(tx, id, data.lines, "OUT");
      }

      return updated;
    });

    revalidatePath("/ventes/bl");
    revalidatePath("/ventes/bv");
    revalidatePath("/ventes/proforma");
    revalidatePath("/ventes/factures");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Erreur mise à jour document:", error);
    return { success: false, error: error.message || "Impossible de mettre à jour le document." };
  }
}

