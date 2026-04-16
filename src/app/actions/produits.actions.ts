"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getProducts() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        tva: true, // Inclure le taux de TVA
      },
      orderBy: { designation: 'asc' }
    });
    
    // Mapper pour extraire tvaRate
    const mapped = products.map(p => ({
      ...p,
      tvaRate: p.tva?.rate ?? 0
    }));

    return { success: true, data: mapped };
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
        tva: true,
        inventories: {
          include: {
            batch: true,
            warehouse: true
          }
        }
      },
      orderBy: { designation: 'asc' }
    });
    const mapped = products.map(p => ({
      ...p,
      tvaRate: p.tva?.rate ?? 0
    }));
    return { success: true, data: mapped };
  } catch (error) {
    console.error("Erreur récupération stock:", error);
    return { success: false, error: "Erreur récupération" };
  }
}
export async function createProduct(data: any) {
  try {
    // 1. Gérer la TVA (rechercher ou créer une entrée Tva pour ce taux)
    let tvaId = null;
    if (data.tvaRate !== undefined) {
      // Pour éviter de multiplier les entrées identiques, on cherche par taux
      // Note: On utilise un nom par défaut si nouveau
      const tva = await prisma.tva.findFirst({
        where: { rate: data.tvaRate }
      });
      
      if (tva) {
        tvaId = tva.id;
      } else {
        const newTva = await prisma.tva.create({
          data: {
            rate: data.tvaRate,
            name: `TVA ${data.tvaRate}%`
          }
        });
        tvaId = newTva.id;
      }
    }

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
        tvaId: tvaId,
      },
      include: { tva: true }
    });

    revalidatePath("/stock/produits");
    return { 
      success: true, 
      data: { 
        ...product, 
        tvaRate: product.tva?.rate ?? 0 
      } 
    };
  } catch (error) {
    console.error("Erreur création produit:", error);
    return { success: false, error: "Création échouée. Veuillez vérifier la référence (elle doit être unique)." };
  }
}

export async function updateProduct(id: string, data: any) {
  try {
    let tvaId = undefined; // undefined = ne pas toucher si non présent
    if (data.tvaRate !== undefined) {
      const tva = await prisma.tva.findFirst({
        where: { rate: data.tvaRate }
      });
      if (tva) {
        tvaId = tva.id;
      } else {
        const newTva = await prisma.tva.create({
          data: { rate: data.tvaRate, name: `TVA ${data.tvaRate}%` }
        });
        tvaId = newTva.id;
      }
    }

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
        tvaId: tvaId,
      },
      include: { tva: true }
    });

    revalidatePath("/stock/produits");
    return { 
      success: true, 
      data: { 
        ...product, 
        tvaRate: product.tva?.rate ?? 0 
      } 
    };
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
