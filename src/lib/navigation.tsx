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
      { title: "Transferts", path: "/stock/transferts" },
      { title: "Lots & Inventaire", path: "/stock/inventaire" },
      { title: "Mouvements", path: "/stock/mouvements" },
    ],
  },
  {
    title: "Achats & Import",
    icon: <Truck size={20} />,
    submenus: [
      { title: "Fournisseurs", path: "/achats/fournisseurs" },
      { title: "Commandes Fournisseur", path: "/achats/commandes" },
      { title: "Bons de Réception", path: "/achats/receptions" },
      { title: "Avoirs Fournisseur", path: "/achats/avoirs" },
      { title: "Factures Fournisseur", path: "/achats/factures" },
    ],
  },
  {
    title: "Ventes",
    icon: <ShoppingCart size={20} />,
    submenus: [
      { title: "Clients", path: "/ventes/clients" },
      { title: "Proformas", path: "/ventes/proforma" },
      { title: "Bons de Livraison", path: "/ventes/bl" },
      { title: "Bons d'Enlèvement", path: "/ventes/enlevement" },
      { title: "Bons de Vente", path: "/ventes/bv" },
      { title: "Bons d'Échange", path: "/ventes/echanges" },
      { title: "Avoirs Clients", path: "/ventes/avoirs" },
      { title: "Factures Clients", path: "/ventes/factures" },
    ],
  },
  {
    title: "Comptabilité",
    icon: <CreditCard size={20} />,
    submenus: [
      { title: "Grand Livre", path: "/comptabilite/grand-livre" },
      { title: "Paiements & Lettrage", path: "/comptabilite/paiements" },
      { title: "Dépenses", path: "/comptabilite/depenses" },
      { title: "Trésorerie", path: "/comptabilite/tresorerie" },
      { title: "TVA", path: "/comptabilite/tva" },
    ],
  },
  {
    title: "Paramètres",
    path: "/parametres",
    icon: <Settings size={20} />,
  },
];
