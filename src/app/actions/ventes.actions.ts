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
};

export type CreateDocumentInput = {
  type: "PROFORMA" | "BL" | "BV" | "INVOICE";
  date: Date;
  reference?: string;
  customerId: string;
  paymentMethod?: string;
  warehouseId?: string; // S'il y a une sortie de stock un jour
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
    const nextNum = isNaN(currentNum) ? 1 : currentNum + 1;
    return `${prefix}${nextNum.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error("Error getting next ref:", error);
    return "";
  }
}

export async function deleteDocument(id: string) {
  try {
    await prisma.document.delete({ where: { id } });
    revalidatePath("/ventes/commandes");
    revalidatePath("/ventes/proforma");
    return { success: true };
  } catch (error) {
    console.error("Error deleting doc:", error);
    return { success: false, error: "Impossible de supprimer le document." };
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

    const result = await prisma.$transaction([
      // 1. Créer le nouveau document (BL ou BV)
      prisma.document.create({
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
            }))
          }
        }
      }),
      // 2. Marquer la proforma comme validée
      prisma.document.update({
        where: { id: proformaId },
        data: { status: "VALIDATED" }
      })
    ]);

    revalidatePath("/ventes/commandes");
    revalidatePath("/ventes/proforma");
    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error transforming doc:", error);
    return { success: false, error: "Échec de la transformation." };
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
    // 1. Auto-generate reference if not provided
    let ref = data.reference;
    if (!ref) {
      ref = await getNextReference(data.type);
    }

    // 2. Create the document
    const document = await prisma.document.create({
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

    revalidatePath("/ventes/commandes");
    revalidatePath("/ventes/proforma");
    return { success: true, data: document };
  } catch (error) {
    console.error("Erreur serveur Vente:", error);
    return { success: false, error: "Impossible de créer le document." };
  }
}

export async function getSaleDocuments(typeDoc?: DocumentType) {
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
            }
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
      // 1. Supprimer les anciennes lignes
      await tx.documentLine.deleteMany({
        where: { documentId: id }
      });

      // 2. Mettre à jour le document et recréer les lignes
      const updated = await tx.document.update({
        where: { id },
        data: {
          date: data.date,
          reference: data.reference,
          customerId: data.customerId === "COMPTANT" ? null : data.customerId,
          paymentMethod: data.paymentMethod,
          grossTotal: data.grossTotal,
          discountTotal: data.discountTotal, // Remise globale incluse ici
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
      return updated;
    });

    revalidatePath("/ventes/commandes");
    revalidatePath("/ventes/proforma");
    return { success: true, data: result };
  } catch (error) {
    console.error("Erreur mise à jour document:", error);
    return { success: false, error: "Impossible de mettre à jour le document." };
  }
}
