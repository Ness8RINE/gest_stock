"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  PackageSearch,
  Barcode,
  Layers,
  CircleDollarSign,
  Box,
  Save,
  X,
  Tags,
  Percent
} from "lucide-react";

// The validation schema
const productSchema = z.object({
  reference: z.string().min(2, "La référence est obligatoire (min. 2 caractères)"),
  designation: z.string().min(3, "La désignation est obligatoire"),
  categoryId: z.string().min(1, "Catégorie requise"),
  unit: z.string().min(1, "Unité requise"),
  purchasePrice: z.coerce.number().min(0, "Doit être positif"),
  salePrice: z.coerce.number().min(0, "Doit être positif"),
  tvaRate: z.coerce.number().min(0).max(100).optional(),
  piecesPerCarton: z.coerce.number().int().min(1).optional(),
  boxesPerCarton: z.coerce.number().int().min(1).optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: ProductFormValues;
  onSubmit: (data: ProductFormValues) => void;
  onCancel?: () => void;
  categories: { id: string, name: string }[];
}



function FieldWithIcon({
  icon: Icon,
  label,
  children,
  iconColor = "text-sky-500",
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
  iconColor?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

export function ProductForm({ initialData, categories, onSubmit, onCancel }: ProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: initialData || {
      reference: "",
      designation: "",
      categoryId: "",
      unit: "Pièce",
      purchasePrice: 0,
      salePrice: 0,
      tvaRate: 19, // Standard 19%
      piecesPerCarton: 1,
      boxesPerCarton: 1,
    },
  });

  const handleSubmit = (values: ProductFormValues) => {
    onSubmit(values);
    form.reset();
  };

  return (
    <Form {...(form as any)}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-0 h-full">

        {/* Header Banner - Sky/Blue theme for Products */}
        <div className="relative overflow-hidden rounded-xl mb-6 p-5 bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-500 shadow-lg">
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-xl" />
          <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-cyan-400/20 blur-lg" />
          <div className="relative flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 ring-2 ring-white/30 backdrop-blur-sm">
              <PackageSearch className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {initialData ? "Modifier le produit" : "Nouveau Produit"}
              </h3>
              <p className="text-blue-100 text-sm">Définissez la référence, le prix et le colisage</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 flex-1 overflow-y-auto pr-1">

          {/* Section: Informations générales */}
          <section className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-1 rounded-full bg-blue-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Informations Générales</span>
            </div>

            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FieldWithIcon icon={Tags} label="Désignation du produit *" iconColor="text-blue-600">
                    <FormControl>
                      <Input
                        placeholder="Ex: Ordinateur Portable X200"
                        className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus-visible:ring-blue-500/40 focus-visible:border-blue-400 rounded-lg text-sm font-medium transition-all"
                        {...field}
                      />
                    </FormControl>
                  </FieldWithIcon>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FieldWithIcon icon={Barcode} label="Référence *" iconColor="text-cyan-500">
                      <FormControl>
                        <Input placeholder="Ex: REF-001" className="uppercase h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus-visible:ring-cyan-500/40 focus-visible:border-cyan-400 rounded-lg text-sm transition-all" {...field} />
                      </FormControl>
                    </FieldWithIcon>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FieldWithIcon icon={Layers} label="Type de produit *" iconColor="text-sky-500">
                      <FormControl>
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:ring-offset-slate-950 transition-all text-slate-900 dark:text-slate-100"
                          {...field}
                        >
                          <option value="" disabled>Sélectionnez un type</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </FormControl>
                    </FieldWithIcon>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FieldWithIcon icon={Box} label="Unité de mesure *" iconColor="text-indigo-500">
                    <FormControl>
                      <Input placeholder="Ex: Pièce, Kg, Litre..." className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-400 rounded-lg text-sm transition-all" {...field} />
                    </FormControl>
                  </FieldWithIcon>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {/* Section: Tarification */}
          <section className="rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10 p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-1 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tarification & Taxes</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FieldWithIcon icon={CircleDollarSign} label="Prix d'achat unitaire" iconColor="text-emerald-600">
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-10 border-emerald-200/70 dark:border-emerald-800/30 bg-white dark:bg-slate-950 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-400 rounded-lg text-sm transition-all"
                          {...field}
                        />
                      </FormControl>
                    </FieldWithIcon>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salePrice"
                render={({ field }) => (
                  <FormItem>
                    <FieldWithIcon icon={CircleDollarSign} label="Prix de vente standard" iconColor="text-teal-600">
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-10 border-emerald-200/70 dark:border-emerald-800/30 bg-white dark:bg-slate-950 focus-visible:ring-teal-500/40 focus-visible:border-teal-400 rounded-lg text-sm transition-all"
                          {...field}
                        />
                      </FormControl>
                    </FieldWithIcon>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tvaRate"
                render={({ field }) => (
                  <FormItem>
                    <FieldWithIcon icon={Percent} label="Taux TVA (%)" iconColor="text-emerald-500">
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          max="100"
                          className="h-10 border-emerald-200/70 dark:border-emerald-800/30 bg-white dark:bg-slate-950 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-400 rounded-lg text-sm transition-all pr-8"
                          {...field}
                        />
                      </FormControl>
                    </FieldWithIcon>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>
          
          {/* Section: Colisage */}
          <section className="rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10 p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-1 rounded-full bg-amber-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Colisage & Conditionnement</span>
              <span className="ml-auto text-[10px] font-medium text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">Détails Carton</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="piecesPerCarton"
                render={({ field }) => (
                  <FormItem>
                    <FieldWithIcon icon={Box} label="Nb de pièces / carton" iconColor="text-amber-600">
                      <FormControl>
                        <Input
                          type="number"
                          className="h-10 border-amber-200/70 dark:border-amber-800/30 bg-white dark:bg-slate-950 focus-visible:ring-amber-500/40 focus-visible:border-amber-400 rounded-lg text-sm transition-all"
                          {...field}
                        />
                      </FormControl>
                    </FieldWithIcon>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="boxesPerCarton"
                render={({ field }) => (
                  <FormItem>
                    <FieldWithIcon icon={Box} label="Nb de boites / carton" iconColor="text-orange-500">
                      <FormControl>
                        <Input
                          type="number"
                          className="h-10 border-amber-200/70 dark:border-amber-800/30 bg-white dark:bg-slate-950 focus-visible:ring-orange-500/40 focus-visible:border-orange-400 rounded-lg text-sm transition-all"
                          {...field}
                        />
                      </FormControl>
                    </FieldWithIcon>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-xs text-amber-700/70 dark:text-amber-400/70 leading-relaxed italic">
              Ces informations permettront de calculer automatiquement les volumes d'importation et faciliteront le décompte lors des réceptions de marchandises.
            </p>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 pt-5 mt-2 border-t border-slate-100 dark:border-slate-800">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-10 border-slate-200">
              <X className="mr-2 h-4 w-4" /> Annuler
            </Button>
          )}
          <Button
            type="submit"
            className="flex-1 h-10 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-semibold shadow-md shadow-blue-500/25 transition-all duration-200"
          >
            <Save className="mr-2 h-4 w-4" />
            {initialData ? "Sauvegarder" : "Créer le produit"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
