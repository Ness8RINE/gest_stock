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
  Building2,
  User,
  Phone,
  MapPin,
  Briefcase,
  FileText,
  Tag,
  Hash,
  Save,
  X,
} from "lucide-react";

const clientSchema = z.object({
  name: z.string().min(2, "Le nom est obligatoire (min. 2 caractères)"),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  legalStatus: z.string().optional(),
  rc: z.string().optional(),
  mf: z.string().optional(),
  nis: z.string().optional(),
  ai: z.string().optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  initialData?: ClientFormValues;
  onSubmit: (data: ClientFormValues) => void;
  onCancel?: () => void;
}

function FieldWithIcon({
  icon: Icon,
  label,
  children,
  iconColor = "text-indigo-500",
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

export function ClientForm({ initialData, onSubmit, onCancel }: ClientFormProps) {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: initialData || {
      name: "",
      address: "",
      contactPerson: "",
      phone: "",
      legalStatus: "",
      rc: "",
      mf: "",
      nis: "",
      ai: "",
    },
  });

  const handleSubmit = (values: ClientFormValues) => {
    onSubmit(values);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-0 h-full">

        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-xl mb-6 p-5 bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 shadow-lg">
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-xl" />
          <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-violet-400/20 blur-lg" />
          <div className="relative flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 ring-2 ring-white/30 backdrop-blur-sm">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {initialData ? "Modifier le client" : "Nouveau Client"}
              </h3>
              <p className="text-indigo-200 text-sm">Renseignez les informations complètes du client</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 flex-1 overflow-y-auto pr-1">

          {/* Section: Identité */}
          <section className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-1 rounded-full bg-indigo-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Identité & Contact</span>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FieldWithIcon icon={Building2} label="Raison Sociale *">
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Ex: Société Générale SARL"
                          className="pl-4 h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-400 rounded-lg text-sm font-medium transition-all"
                          {...field}
                        />
                      </div>
                    </FormControl>
                  </FieldWithIcon>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="legalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FieldWithIcon icon={Briefcase} label="Statut Juridique">
                      <FormControl>
                        <Input placeholder="SARL, EURL..." className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-400 rounded-lg text-sm transition-all" {...field} />
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
                        <Input placeholder="055 00 00 00" className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-400 rounded-lg text-sm transition-all" {...field} />
                      </FormControl>
                    </FieldWithIcon>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FieldWithIcon icon={User} label="Personne à contacter" iconColor="text-sky-500">
                    <FormControl>
                      <Input placeholder="Nom et prénom du responsable" className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus-visible:ring-sky-500/40 focus-visible:border-sky-400 rounded-lg text-sm transition-all" {...field} />
                    </FormControl>
                  </FieldWithIcon>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FieldWithIcon icon={MapPin} label="Adresse complète" iconColor="text-rose-500">
                    <FormControl>
                      <Input placeholder="Rue, Ville, Wilaya..." className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus-visible:ring-rose-500/40 focus-visible:border-rose-400 rounded-lg text-sm transition-all" {...field} />
                    </FormControl>
                  </FieldWithIcon>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {/* Section: Fiscale */}
          <section className="rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10 p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-1 rounded-full bg-amber-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Informations Fiscales & Légales</span>
              <span className="ml-auto text-[10px] font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">Optionnel</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "rc" as const, label: "Registre Commerce", placeholder: "N° RC", color: "text-amber-500", ring: "focus-visible:ring-amber-500/40 focus-visible:border-amber-400" },
                { name: "mf" as const, label: "Matricule Fiscal", placeholder: "N° MF", color: "text-orange-500", ring: "focus-visible:ring-orange-500/40 focus-visible:border-orange-400" },
                { name: "nis" as const, label: "N.I.S", placeholder: "N° Identification", color: "text-amber-600", ring: "focus-visible:ring-amber-600/40 focus-visible:border-amber-500" },
                { name: "ai" as const, label: "Article d'Imposition", placeholder: "Code AI", color: "text-yellow-600", ring: "focus-visible:ring-yellow-500/40 focus-visible:border-yellow-400" },
              ].map((item) => (
                <FormField
                  key={item.name}
                  control={form.control}
                  name={item.name}
                  render={({ field }) => (
                    <FormItem>
                      <FieldWithIcon icon={Hash} label={item.label} iconColor={item.color}>
                        <FormControl>
                          <Input
                            placeholder={item.placeholder}
                            className={`h-10 border-amber-200/70 dark:border-amber-800/30 bg-white dark:bg-slate-950 ${item.ring} rounded-lg text-sm transition-all`}
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
            className="flex-1 h-10 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold shadow-md shadow-indigo-500/25 transition-all duration-200"
          >
            <Save className="mr-2 h-4 w-4" />
            {initialData ? "Sauvegarder les modifications" : "Créer le client"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
