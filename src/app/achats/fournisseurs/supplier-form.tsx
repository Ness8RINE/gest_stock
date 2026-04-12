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
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Globe,
  Building2,
  User,
  Phone,
  MapPin,
  Briefcase,
  Hash,
  Save,
  X,
} from "lucide-react";

const supplierSchema = z.object({
  name: z.string().min(2, "Le nom est obligatoire (min. 2 caractères)"),
  address: z.string().optional(),
  country: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  legalStatus: z.string().optional(),
  rc: z.string().optional(),
  mf: z.string().optional(),
  nis: z.string().optional(),
  ai: z.string().optional(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SupplierFormProps {
  initialData?: SupplierFormValues;
  onSubmit: (data: SupplierFormValues) => void;
  onCancel?: () => void;
}

function FieldWithIcon({
  icon: Icon,
  label,
  children,
  iconColor = "text-teal-500",
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

export function SupplierForm({ initialData, onSubmit, onCancel }: SupplierFormProps) {
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: initialData || {
      name: "",
      address: "",
      country: "",
      contactPerson: "",
      phone: "",
      legalStatus: "",
      rc: "",
      mf: "",
      nis: "",
      ai: "",
    },
  });

  const handleSubmit = (values: SupplierFormValues) => {
    onSubmit(values);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-0 h-full">

        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-xl mb-6 p-5 bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-600 shadow-lg">
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-xl" />
          <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-cyan-400/20 blur-lg" />
          <div className="relative flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 ring-2 ring-white/30 backdrop-blur-sm">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {initialData ? "Modifier le fournisseur" : "Nouveau Fournisseur"}
              </h3>
              <p className="text-teal-100 text-sm">Renseignez les informations complètes du fournisseur</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 flex-1 overflow-y-auto pr-1">

          {/* Section: Identité */}
          <section className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-1 rounded-full bg-teal-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Identité & Contact</span>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FieldWithIcon icon={Building2} label="Nom / Raison Sociale *" iconColor="text-teal-600">
                    <FormControl>
                      <Input
                        placeholder="Ex: China Imports Co. Ltd"
                        className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus-visible:ring-teal-500/40 focus-visible:border-teal-400 rounded-lg text-sm font-medium transition-all"
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
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FieldWithIcon icon={Globe} label="Pays d'Origine" iconColor="text-cyan-500">
                      <FormControl>
                        <Input placeholder="Chine, Turquie..." className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus-visible:ring-cyan-500/40 focus-visible:border-cyan-400 rounded-lg text-sm transition-all" {...field} />
                      </FormControl>
                    </FieldWithIcon>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="legalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FieldWithIcon icon={Briefcase} label="Statut Juridique" iconColor="text-teal-500">
                      <FormControl>
                        <Input placeholder="LLC, Co. Ltd..." className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus-visible:ring-teal-500/40 focus-visible:border-teal-400 rounded-lg text-sm transition-all" {...field} />
                      </FormControl>
                    </FieldWithIcon>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FieldWithIcon icon={User} label="Personne à contacter" iconColor="text-sky-500">
                      <FormControl>
                        <Input placeholder="Nom du responsable" className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus-visible:ring-sky-500/40 focus-visible:border-sky-400 rounded-lg text-sm transition-all" {...field} />
                      </FormControl>
                    </FieldWithIcon>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FieldWithIcon icon={Phone} label="Téléphone" iconColor="text-emerald-500">
                      <FormControl>
                        <Input placeholder="+86 10 0000 0000" className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-400 rounded-lg text-sm transition-all" {...field} />
                      </FormControl>
                    </FieldWithIcon>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FieldWithIcon icon={MapPin} label="Adresse complète" iconColor="text-rose-500">
                    <FormControl>
                      <Input placeholder="Rue, Ville, Pays..." className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus-visible:ring-rose-500/40 focus-visible:border-rose-400 rounded-lg text-sm transition-all" {...field} />
                    </FormControl>
                  </FieldWithIcon>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {/* Section: Fiscale */}
          <section className="rounded-xl border border-teal-100 dark:border-teal-900/30 bg-teal-50/50 dark:bg-teal-950/10 p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-1 rounded-full bg-teal-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Informations Fiscales & Légales</span>
              <span className="ml-auto text-[10px] font-medium text-teal-700 bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400 px-2 py-0.5 rounded-full">Optionnel</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "rc" as const, label: "Registre Commerce", placeholder: "N° RC", ring: "focus-visible:ring-teal-500/40 focus-visible:border-teal-400", border: "border-teal-200/70 dark:border-teal-800/30" },
                { name: "mf" as const, label: "Matricule Fiscal", placeholder: "N° MF", ring: "focus-visible:ring-cyan-500/40 focus-visible:border-cyan-400", border: "border-teal-200/70 dark:border-teal-800/30" },
                { name: "nis" as const, label: "N.I.S", placeholder: "N° Identification", ring: "focus-visible:ring-teal-600/40 focus-visible:border-teal-500", border: "border-teal-200/70 dark:border-teal-800/30" },
                { name: "ai" as const, label: "Article d'Imposition", placeholder: "Code AI", ring: "focus-visible:ring-emerald-500/40 focus-visible:border-emerald-400", border: "border-teal-200/70 dark:border-teal-800/30" },
              ].map((item) => (
                <FormField
                  key={item.name}
                  control={form.control}
                  name={item.name}
                  render={({ field }) => (
                    <FormItem>
                      <FieldWithIcon icon={Hash} label={item.label} iconColor="text-teal-500">
                        <FormControl>
                          <Input
                            placeholder={item.placeholder}
                            className={`h-10 ${item.border} bg-white dark:bg-slate-950 ${item.ring} rounded-lg text-sm transition-all`}
                            {...field}
                          />
                        </FormControl>
                      </FieldWithIcon>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
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
            className="flex-1 h-10 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold shadow-md shadow-teal-500/25 transition-all duration-200"
          >
            <Save className="mr-2 h-4 w-4" />
            {initialData ? "Sauvegarder les modifications" : "Créer le fournisseur"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
