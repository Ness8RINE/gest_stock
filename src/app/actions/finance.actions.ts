"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DocumentStatus } from "@prisma/client";

/**
 * Récupère tous les partenaires (Clients & Fournisseurs)
 */
export async function getPartners() {
  try {
    const [customers, suppliers] = await Promise.all([
      prisma.customer.findMany({ orderBy: { name: "asc" } }),
      prisma.supplier.findMany({ orderBy: { name: "asc" } })
    ]);

    return {
      success: true,
      data: {
        customers,
        suppliers
      }
    };
  } catch (error) {
    return { success: false, error: "Erreur lors de la récupération des partenaires" };
  }
}

/**
 * Récupère les factures non payées pour un partenaire
 */
export async function getUnpaidInvoices(partnerId: string, type: "CUSTOMER" | "SUPPLIER") {
  try {
    const invoices = await prisma.document.findMany({
      where: {
        type: { in: type === "CUSTOMER" ? ["BL", "BV", "INVOICE"] : ["PURCHASE_INVOICE", "RECEIPT"] },
        status: { in: ["VALIDATED", "PARTIAL"] },
        OR: [
          { customerId: partnerId },
          { supplierId: partnerId }
        ]
      },
      include: {
        paymentMatches: true
      },
      orderBy: { date: "asc" }
    });

    // Calculer le reste à payer pour chaque facture
    const formattedInvoices = invoices.map(inv => {
      const alreadyPaid = inv.paymentMatches.reduce((sum, m) => sum + m.amountMatched, 0);
      const remaining = inv.netTotal - alreadyPaid;
      return { ...inv, alreadyPaid, remaining };
    }).filter(inv => inv.remaining > 0);

    return { success: true, data: formattedInvoices };
  } catch (error) {
    return { success: false, error: "Erreur lors de la lecture des factures" };
  }
}

/**
 * Calcule l'état financier global d'un partenaire (Dette totale vs Payé)
 */
export async function getPartnerFinancialSummary(partnerId: string, type: "CUSTOMER" | "SUPPLIER") {
  try {
    // 1. Somme de tout ce qui a été "pris" (Factures et BV uniquement)
    const documents = await prisma.document.findMany({
      where: {
        type: { in: type === "CUSTOMER" ? ["INVOICE", "BV"] : ["PURCHASE_INVOICE"] },
        status: { not: "CANCELLED" },
        OR: [
          { customerId: partnerId },
          { supplierId: partnerId }
        ]
      },
      select: { netTotal: true }
    });

    const totalInvoiced = documents.reduce((sum, doc) => sum + doc.netTotal, 0);

    // 2. Somme de tout ce qui a été payé par ce partenaire (Total des règlements)
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { customerId: partnerId },
          { supplierId: partnerId }
        ]
      },
      select: { amount: true }
    });

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      success: true,
      data: {
        totalInvoiced,
        totalPaid,
        remainingBalance: Math.max(0, totalInvoiced - totalPaid)
      }
    };
  } catch (error) {
    return { success: false, error: "Erreur calcul résumé financier" };
  }
}

export type PaymentMatchInput = {
  documentId: string;
  amountMatched: number;
};

export type CreatePaymentInput = {
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  attachmentUrl?: string;
  date: Date;
  partnerId: string;
  partnerType: "CUSTOMER" | "SUPPLIER";
  matches: PaymentMatchInput[];
};

/**
 * Enregistre un paiement et effectue le lettrage
 */
export async function createPayment(data: CreatePaymentInput) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Créer le Paiement
      const payment = await tx.payment.create({
        data: {
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          referenceNumber: data.referenceNumber,
          attachmentUrl: data.attachmentUrl,
          date: data.date,
          customerId: data.partnerType === "CUSTOMER" ? data.partnerId : undefined,
          supplierId: data.partnerType === "SUPPLIER" ? data.partnerId : undefined,
        }
      });

      // 2. Créer les matches et mettre à jour les statuts de facture
      for (const match of data.matches) {
        await tx.paymentMatch.create({
          data: {
            paymentId: payment.id,
            documentId: match.documentId,
            amountMatched: match.amountMatched
          }
        });

        // Calculer le nouveau statut du document
        const document = await tx.document.findUnique({
          where: { id: match.documentId },
          include: { paymentMatches: true }
        });

        if (document) {
          const totalMatched = document.paymentMatches.reduce((sum, m) => sum + m.amountMatched, 0) + match.amountMatched;
          
          let newStatus: DocumentStatus = "PARTIAL";
          if (totalMatched >= document.netTotal) {
            newStatus = "PAID";
          } else if (totalMatched <= 0) {
            newStatus = "VALIDATED";
          }

          await tx.document.update({
            where: { id: document.id },
            data: { status: newStatus }
          });
        }
      }

      return payment;
    });

    revalidatePath("/comptabilite/paiements");
    revalidatePath("/"); // Dashboard

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Payment Error:", error);
    return { success: false, error: error.message || "Erreur lors de l'enregistrement du paiement." };
  }
}

/**
 * Récupère la liste des paiements
 */
export async function getPayments() {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        customer: true,
        supplier: true,
        matches: {
          include: {
            document: true
          }
        }
      },
      orderBy: { date: "desc" }
    });
    return { success: true, data: payments };
  } catch (error) {
    return { success: false, error: "Erreur lecture paiements" };
  }
}

/**
 * Supprime un paiement et restaure le statut des factures lettrées
 */
export async function deletePayment(paymentId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Récupérer les matches de ce paiement
      const matches = await tx.paymentMatch.findMany({
        where: { paymentId },
        include: { document: true }
      });

      // 2. Supprimer les matches
      await tx.paymentMatch.deleteMany({
        where: { paymentId }
      });

      // 3. Recalculer le statut pour chaque document impacté
      for (const match of matches) {
        // Obtenir le nouveau total payé pour ce document (sans le match supprimé)
        const document = await tx.document.findUnique({
          where: { id: match.documentId },
          include: { paymentMatches: true }
        });

        if (document) {
          const totalPaid = document.paymentMatches.reduce((sum, m) => sum + m.amountMatched, 0);
          
          let newStatus: DocumentStatus = "VALIDATED";
          if (totalPaid >= document.netTotal) {
            newStatus = "PAID";
          } else if (totalPaid > 0) {
            newStatus = "PARTIAL";
          }

          await tx.document.update({
            where: { id: document.id },
            data: { status: newStatus }
          });
        }
      }

      // 4. Supprimer le paiement lui-même
      await tx.payment.delete({
        where: { id: paymentId }
      });
    });

    revalidatePath("/comptabilite/paiements");
    return { success: true };
  } catch (error) {
    console.error("Delete Payment Error:", error);
    return { success: false, error: "Erreur lors de la suppression du paiement" };
  }
}
