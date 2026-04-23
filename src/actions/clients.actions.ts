"use server";

import prisma, { getDbPath } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";

export async function getClients() {
  try {
    const clients = await prisma.customer.findMany({
      orderBy: { name: 'asc' }
    });
    console.log(`[ACTION] getClients: Found ${clients.length} clients in ${getDbPath()}`);
    return { success: true, data: clients, debugPath: getDbPath() };
  } catch (error) {
    console.error("Erreur générique lors de la récupération des clients:", error);
    return { success: false, error: "Erreur lors de la récupération des clients" };
  }
}

export async function createClient(data: Omit<any, "id">) {
  try {
    const client = await prisma.customer.create({
      data: {
        name: data.name,
        address: data.address,
        contactPerson: data.contactPerson,
        phone: data.phone,
        legalStatus: data.legalStatus,
        rc: data.rc,
        mf: data.mf,
        nis: data.nis,
        ai: data.ai,
        agreement: data.agreement,
        paymentTerms: data.paymentTerms,
        creditLimit: data.creditLimit,
      },
    });

    revalidatePath("/ventes/clients");
    
    // Log Audit
    await logAction(null, "CREATE_CUSTOMER", `Nouveau client créé: ${data.name}`);
    
    return { success: true, data: client };
  } catch (error) {
    console.error("Erreur création client:", error);
    return { success: false, error: "Erreur lors de la création du client" };
  }
}

export async function updateClient(id: string, data: Partial<any>) {
  try {
    const client = await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        contactPerson: data.contactPerson,
        phone: data.phone,
        legalStatus: data.legalStatus,
        rc: data.rc,
        mf: data.mf,
        nis: data.nis,
        ai: data.ai,
        agreement: data.agreement,
        paymentTerms: data.paymentTerms,
        creditLimit: data.creditLimit,
      },
    });

    revalidatePath("/ventes/clients");
    
    // Log Audit
    await logAction(null, "UPDATE_CUSTOMER", `Client mis à jour: ${data.name}`);
    
    return { success: true, data: client };
  } catch (error) {
    console.error("Erreur mise à jour client:", error);
    return { success: false, error: "Erreur lors de la mise à jour du client" };
  }
}

export async function deleteClient(id: string) {
  try {
    await prisma.customer.delete({
      where: { id },
    });

    revalidatePath("/ventes/clients");
    
    // Log Audit
    await logAction(null, "DELETE_CUSTOMER", `Client supprimé (ID: ${id})`);
    
    return { success: true };
  } catch (error) {
    console.error("Erreur suppression client:", error);
    return { success: false, error: "Suppression échouée." };
  }
}
