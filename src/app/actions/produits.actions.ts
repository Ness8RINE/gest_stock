"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getProducts() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
      },
      orderBy: { designation: 'asc' }
    });
    return { success: true, data: products };
  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error);
    return { success: false, error: "Erreur récupération produits" };
  }
}

export async function getProductsWithStock() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        inventories: {
          include: {
            batch: true,
            warehouse: true
          }
        }
      },
      orderBy: { designation: 'asc' }
    });
    return { success: true, data: products };
  } catch (error) {
    console.error("Erreur récupération stock:", error);
    return { success: false, error: "Erreur récupération" };
  }
}

export async function createProduct(data: any) {
  try {
    const product = await prisma.product.create({
      data: {
        reference: data.reference,
        designation: data.designation,
        unit: data.unit,
        purchasePrice: data.purchasePrice,
        salePrice: data.salePrice,
        piecesPerCarton: data.piecesPerCarton,
        boxesPerCarton: data.boxesPerCarton,
        categoryId: data.categoryId,
        // TODO: Handle TVA when the VAT logic is fully specified, for now it's null as tvaId is optional in db
      }
    });

    revalidatePath("/stock/produits");
    return { success: true, data: product };
  } catch (error) {
    console.error("Erreur création produit:", error);
    return { success: false, error: "Création échouée. Veuillez vérifier la référence (elle doit être unique)." };
  }
}

export async function updateProduct(id: string, data: any) {
  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        reference: data.reference,
        designation: data.designation,
        unit: data.unit,
        purchasePrice: data.purchasePrice,
        salePrice: data.salePrice,
        piecesPerCarton: data.piecesPerCarton,
        boxesPerCarton: data.boxesPerCarton,
        categoryId: data.categoryId,
      }
    });

    revalidatePath("/stock/produits");
    return { success: true, data: product };
  } catch (error) {
    console.error("Erreur modification produit:", error);
    return { success: false, error: "Modification échouée." };
  }
}

export async function deleteProduct(id: string) {
  try {
    await prisma.product.delete({
      where: { id }
    });

    revalidatePath("/stock/produits");
    return { success: true };
  } catch (error) {
    console.error("Erreur suppression produit:", error);
    return { success: false, error: "Impossible de supprimer ce produit (il est probablement utilisé dans des factures ou dans le stock)." };
  }
}
