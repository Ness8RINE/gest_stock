"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DocumentStatus } from "@prisma/client";
import { logAction } from "@/lib/audit";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * Upload un justificatif de paiement
 */
export async function uploadPaymentAttachment(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "Aucun fichier fourni" };

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Création du chemin
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "payments");
    
    // S'assurer que le dossier existe
    await mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    return { 
      success: true, 
      url: `/uploads/payments/${filename}` 
    };
  } catch (error) {
    console.error("Upload Error:", error);
    return { success: false, error: "Erreur lors de l'enregistrement du fichier" };
  }
}

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
        ],
        childDocuments: { none: {} } // Uniquement les documents finaux (non transformés)
      },
      include: {
        paymentMatches: true,
        childDocuments: true
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

    // Log Audit
    await logAction(null, "CREATE_PAYMENT", `Paiement enregistré: ${result.amount} DA via ${result.paymentMethod}`);

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
    
    // Log Audit
    await logAction(null, "DELETE_PAYMENT", `Paiement supprimé (ID: ${paymentId})`);
    
    return { success: true };
  } catch (error) {
    console.error("Delete Payment Error:", error);
    return { success: false, error: "Erreur lors de la suppression du paiement" };
  }
}

/**
 * Récupère les entrées du journal (Grand Livre) pour une période
 */
export async function getJournalEntries(filters: {
  startDate?: string;
  endDate?: string;
  partnerId?: string;
  method?: string;
}) {
  try {
    const paymentWhere: any = {};
    const expenseWhere: any = {};

    if (filters.startDate || filters.endDate) {
      const dateFilter: any = {};
      if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
      if (filters.endDate) dateFilter.lte = new Date(filters.endDate);
      paymentWhere.date = dateFilter;
      expenseWhere.date = dateFilter;
    }

    if (filters.method && filters.method !== "ALL") {
      paymentWhere.paymentMethod = filters.method;
      expenseWhere.paymentMethod = filters.method;
    }

    if (filters.partnerId) {
      paymentWhere.OR = [
        { customerId: filters.partnerId },
        { supplierId: filters.partnerId }
      ];
      // Les dépenses n'ont pas de lien partenaire, donc on n'en retourne aucune si un partenaire est filtré
      expenseWhere.id = { in: [] }; 
    }

    const [payments, expenses] = await Promise.all([
      prisma.payment.findMany({
        where: paymentWhere,
        include: { customer: true, supplier: true },
        orderBy: { date: "asc" }
      }),
      prisma.expense.findMany({
        where: expenseWhere,
        orderBy: { date: "asc" }
      })
    ]);

    // Fusionner et calculer les totaux
    let totalIn = 0;
    let totalOut = 0;
    
    const paymentEntries = payments.map(p => {
      const isIn = !!p.customerId;
      if (isIn) totalIn += p.amount;
      else totalOut += p.amount;
      
      return {
        ...p,
        category: isIn ? "Paiement Client" : "Paiement Fournisseur",
        type: isIn ? "IN" : "OUT",
        partnerName: p.customer?.name || p.supplier?.name || "N/A"
      };
    });

    const expenseEntries = expenses.map(e => {
      totalOut += e.amount;
      return {
        ...e,
        type: "OUT",
        partnerName: `DEP: ${e.category}`,
        description: e.description || e.category
      };
    });

    const entries = [...paymentEntries, ...expenseEntries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return { 
      success: true, 
      data: {
        entries,
        totalIn,
        totalOut,
        netBalance: totalIn - totalOut
      } 
    };
  } catch (error) {
    console.error("Journal Error:", error);
    return { success: false, error: "Erreur lors de la lecture du journal" };
  }
}

/**
 * Récupère l'état de la trésorerie par mode de paiement
 */
export async function getCashflowStatus() {
  try {
    const [payments, expenses] = await Promise.all([
      prisma.payment.findMany({
        include: { customer: true, supplier: true },
        orderBy: { date: "desc" }
      }),
      prisma.expense.findMany({
        orderBy: { date: "desc" }
      })
    ]);

    const modes = ["ESPECE", "CHEQUE", "VIREMENT", "VERSEMENT", "TRAITE"];
    const status = modes.map(mode => {
      const modePayments = payments.filter(p => p.paymentMethod === mode);
      const modeExpenses = expenses.filter(e => e.paymentMethod === mode);
      
      const totalIn = modePayments.filter(p => !!p.customerId).reduce((sum, p) => sum + p.amount, 0);
      const totalOutPayments = modePayments.filter(p => !!p.supplierId).reduce((sum, p) => sum + p.amount, 0);
      const totalOutExpenses = modeExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      return {
        method: mode,
        balance: totalIn - (totalOutPayments + totalOutExpenses),
        totalIn,
        totalOut: totalOutPayments + totalOutExpenses,
        count: modePayments.length + modeExpenses.length
      };
    });

    // Calcul globaux
    const globalTotalIn = status.reduce((sum, s) => sum + s.totalIn, 0);
    const globalTotalOut = status.reduce((sum, s) => sum + s.totalOut, 0);

    return {
      success: true,
      data: {
        status,
        globalBalance: globalTotalIn - globalTotalOut,
        recentActivity: payments.slice(0, 10).map(p => ({
            ...p,
            partnerName: p.customer?.name || p.supplier?.name || "N/A",
            type: p.customerId ? "IN" : "OUT"
        }))
      }
    };
  } catch (error) {
    console.error("Cashflow Error:", error);
    return { success: false, error: "Erreur calcul trésorerie" };
  }
}

/**
 * Récupère la liste des dépenses
 */
export async function getExpenses() {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { date: "desc" }
    });
    return { success: true, data: expenses };
  } catch (error) {
    return { success: false, error: "Erreur lecture dépenses" };
  }
}

/**
 * Enregistre une nouvelle dépense
 */
export async function createExpense(data: {
  id?: string;
  category: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  attachmentUrl?: string;
  date: Date;
  description?: string;
}) {
  try {
    const expenseData = {
      category: data.category,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber,
      attachmentUrl: data.attachmentUrl,
      date: data.date,
      description: data.description
    };

    let expense;
    if (data.id) {
      expense = await prisma.expense.update({
        where: { id: data.id },
        data: expenseData
      });
    } else {
      expense = await prisma.expense.create({
        data: expenseData
      });
    }

    revalidatePath("/comptabilite/depenses");
    revalidatePath("/comptabilite/grand-livre");
    revalidatePath("/comptabilite/tresorerie");
    
    // Log Audit
    await logAction(null, data.id ? "UPDATE_EXPENSE" : "CREATE_EXPENSE", `Dépense ${data.id ? 'mise à jour' : 'créée'}: ${expense.category} - ${expense.amount} DA`);
    
    return { success: true, data: expense };
  } catch (error) {
    console.error("Save Expense Error:", error);
    return { success: false, error: "Erreur lors de l'enregistrement de la dépense" };
  }
}

/**
 * Supprime une dépense
 */
export async function deleteExpense(id: string) {
  try {
    await prisma.expense.delete({ where: { id } });
    revalidatePath("/comptabilite/depenses");
    revalidatePath("/comptabilite/grand-livre");
    revalidatePath("/comptabilite/tresorerie");
    
    // Log Audit
    await logAction(null, "DELETE_EXPENSE", `Dépense supprimée (ID: ${id})`);
    
    return { success: true };
  } catch (error) {
    console.error("Delete Expense Error:", error);
    return { success: false, error: "Erreur suppression dépense" };
  }
}
