import React from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  CreditCard,
  Truck,
  Box,
  FileText
} from "lucide-react";

export const NAVIGATION = [
  {
    title: "Tableau de bord",
    path: "/",
    icon: <LayoutDashboard size={20} />,
  },
  {
    title: "Stock & Logistique",
    icon: <Box size={20} />,
    submenus: [
      { title: "Dépôts", path: "/stock/depots" },
      { title: "Produits", path: "/stock/produits" },
      { title: "Catégories", path: "/stock/categories" },
      { title: "Lots & Inventaire", path: "/stock/inventaire" },
      { title: "Mouvements", path: "/stock/mouvements" },
    ],
  },
  {
    title: "Achats & Import",
    icon: <Truck size={20} />,
    submenus: [
      { title: "Fournisseurs", path: "/achats/fournisseurs" },
      { title: "Dossiers d'importation", path: "/achats/importations" },
      { title: "Commandes Fournisseur", path: "/achats/commandes" },
      { title: "Bons de Réception", path: "/achats/receptions" },
      { title: "Factures Fournisseur", path: "/achats/factures" },
    ],
  },
  {
    title: "Ventes",
    icon: <ShoppingCart size={20} />,
    submenus: [
      { title: "Clients", path: "/ventes/clients" },
      { title: "Devis & Proforma", path: "/ventes/proforma" },
      { title: "Commandes & BL/BV", path: "/ventes/commandes" },
      { title: "Factures & Avoirs", path: "/ventes/factures" },
    ],
  },
  {
    title: "Comptabilité",
    icon: <CreditCard size={20} />,
    submenus: [
      { title: "Grand Livre", path: "/comptabilite/grand-livre" },
      { title: "Paiements & Lettrage", path: "/comptabilite/paiements" },
      { title: "TVA", path: "/comptabilite/tva" },
      { title: "Trésorerie", path: "/comptabilite/tresorerie" },
    ],
  },
  {
    title: "Paramètres",
    path: "/parametres",
    icon: <Settings size={20} />,
  },
];
