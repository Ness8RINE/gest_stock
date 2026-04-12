"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getClients() {
  try {
    const clients = await prisma.customer.findMany({
      orderBy: { name: 'asc' }
    });
    return { success: true, data: clients };
  } catch (error) {
    console.error("Erreur gnrique lors de la rcupration des clients:", error);
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
      }
    });

    revalidatePath("/ventes/clients");
    return { success: true, data: client };
  } catch (error) {
    console.error("Erreur création client:", error);
    return { success: false, error: "Création échouée." };
  }
}

export async function updateClient(id: string, data: Omit<any, "id">) {
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
      }
    });

    revalidatePath("/ventes/clients");
    return { success: true, data: client };
  } catch (error) {
    console.error("Erreur modification client:", error);
    return { success: false, error: "Modification échouée." };
  }
}

export async function deleteClient(id: string) {
  try {
    await prisma.customer.delete({
      where: { id }
    });

    revalidatePath("/ventes/clients");
    return { success: true };
  } catch (error) {
    console.error("Erreur suppression client:", error);
    return { success: false, error: "Suppression échouée." };
  }
}
