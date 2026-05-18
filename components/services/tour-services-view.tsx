"use client";

import Image from "next/image";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Camera, Plus, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { t, type Locale } from "@/lib/i18n";
import { formatCurrency, type SupportedCurrency } from "@/lib/utils";
import {
  useBandosUIStore,
  type VehicleCatalogItem
} from "@/store/ui-store";

function parseOptionalNumber(value: string) {
  const normalized = value.replace(",", ".").trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseInteger(value: string) {
  const parsed = parseOptionalNumber(value);

  if (parsed === null || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function getVehicleTypeLabel(locale: Locale, type: VehicleCatalogItem["type"]) {
  if (type === "van") {
    return t(locale, "Van", "Van");
  }

  if (type === "bus") {
    return t(locale, "Bus", "Bus");
  }

  return t(locale, "Driver only", "Driver only");
}

const emptyDraft = {
  name: "",
  type: "van" as VehicleCatalogItem["type"],
  city: "",
  country: "",
  contact: "",
  website: "",
  estimatedDailyPrice: "",
  fleetSize: "1",
  seats: "",
  bunks: "",
  merchCapacity: "",
  notes: "",
  tags: "",
  vehiclePhotos: [] as string[]
};

export function TourServicesView({
  currency,
  locale
}: {
  currency: SupportedCurrency;
  locale: Locale;
}) {
  const vehicleCatalog = useBandosUIStore((state) => state.vehicleCatalog);
  const addVehicleCatalogItem = useBandosUIStore(
    (state) => state.addVehicleCatalogItem
  );
  const updateVehicleCatalogItem = useBandosUIStore(
    (state) => state.updateVehicleCatalogItem
  );
  const deleteVehicleCatalogItem = useBandosUIStore(
    (state) => state.deleteVehicleCatalogItem
  );

  const [query, setQuery] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState(emptyDraft.name);
  const [type, setType] = useState<VehicleCatalogItem["type"]>(emptyDraft.type);
  const [city, setCity] = useState(emptyDraft.city);
  const [country, setCountry] = useState(emptyDraft.country);
  const [contact, setContact] = useState(emptyDraft.contact);
  const [website, setWebsite] = useState(emptyDraft.website);
  const [estimatedDailyPrice, setEstimatedDailyPrice] = useState(
    emptyDraft.estimatedDailyPrice
  );
  const [fleetSize, setFleetSize] = useState(emptyDraft.fleetSize);
  const [seats, setSeats] = useState(emptyDraft.seats);
  const [bunks, setBunks] = useState(emptyDraft.bunks);
  const [merchCapacity, setMerchCapacity] = useState(emptyDraft.merchCapacity);
  const [notes, setNotes] = useState(emptyDraft.notes);
  const [tags, setTags] = useState(emptyDraft.tags);
  const [vehiclePhotos, setVehiclePhotos] = useState<string[]>(emptyDraft.vehiclePhotos);
  const [saveMessage, setSaveMessage] = useState("");

  const deferredQuery = useDeferredValue(query);
  const selectedVehicle =
    vehicleCatalog.find((item) => item.id === selectedVehicleId) ?? null;
  const modalOpen = isCreating || Boolean(selectedVehicle);

  const filteredVehicles = useMemo(() => {
    const search = deferredQuery.trim().toLowerCase();

    return [...vehicleCatalog]
      .filter((item) => {
        if (!search) {
          return true;
        }

        return [
          item.name,
          item.type,
          item.city,
          item.country,
          item.contact,
          item.website,
          item.notes,
          item.merchCapacity,
          item.tags.join(" "),
          item.seats ?? "",
          item.bunks ?? ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [deferredQuery, vehicleCatalog]);

  useEffect(() => {
    if (isCreating) {
      setName(emptyDraft.name);
      setType(emptyDraft.type);
      setCity(emptyDraft.city);
      setCountry(emptyDraft.country);
      setContact(emptyDraft.contact);
      setWebsite(emptyDraft.website);
      setEstimatedDailyPrice(emptyDraft.estimatedDailyPrice);
      setFleetSize(emptyDraft.fleetSize);
      setSeats(emptyDraft.seats);
      setBunks(emptyDraft.bunks);
      setMerchCapacity(emptyDraft.merchCapacity);
      setNotes(emptyDraft.notes);
      setTags(emptyDraft.tags);
      setVehiclePhotos(emptyDraft.vehiclePhotos);
      setSaveMessage("");
      return;
    }

    if (!selectedVehicle) {
      setSaveMessage("");
      return;
    }

    setName(selectedVehicle.name);
    setType(selectedVehicle.type);
    setCity(selectedVehicle.city);
    setCountry(selectedVehicle.country);
    setContact(selectedVehicle.contact);
    setWebsite(selectedVehicle.website);
    setEstimatedDailyPrice(String(selectedVehicle.estimatedDailyPrice));
    setFleetSize(String(selectedVehicle.fleetSize));
    setSeats(
      typeof selectedVehicle.seats === "number" ? String(selectedVehicle.seats) : ""
    );
    setBunks(
      typeof selectedVehicle.bunks === "number" ? String(selectedVehicle.bunks) : ""
    );
    setMerchCapacity(selectedVehicle.merchCapacity);
    setNotes(selectedVehicle.notes);
    setTags(selectedVehicle.tags.join(", "));
    setVehiclePhotos(selectedVehicle.vehiclePhotos);
    setSaveMessage("");
  }, [isCreating, selectedVehicle]);

  function closeModal() {
    setIsCreating(false);
    setSelectedVehicleId(null);
    setSaveMessage("");
  }

  function openCreateModal() {
    setSelectedVehicleId(null);
    setIsCreating(true);
  }

  function saveVehicle() {
    const payload = {
      name: name.trim() || t(locale, "Nouveau véhicule", "New vehicle"),
      type,
      city: city.trim(),
      country: country.trim(),
      contact: contact.trim(),
      website: website.trim(),
      estimatedDailyPrice: parseOptionalNumber(estimatedDailyPrice) ?? 0,
      fleetSize: Math.max(parseInteger(fleetSize), 1),
      seats: type === "van" ? parseOptionalNumber(seats) : null,
      bunks: type === "bus" ? parseOptionalNumber(bunks) : null,
      merchCapacity: merchCapacity.trim(),
      notes: notes.trim(),
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      vehiclePhotos
    };

    if (isCreating) {
      addVehicleCatalogItem(payload);
      setIsCreating(false);
      setSaveMessage(t(locale, "Véhicule créé.", "Vehicle created."));
      return;
    }

    if (!selectedVehicle) {
      return;
    }

    updateVehicleCatalogItem(selectedVehicle.id, payload);
    setSaveMessage(t(locale, "Véhicule mis à jour.", "Vehicle updated."));
  }

  function removeSelectedVehicle() {
    if (!selectedVehicle) {
      return;
    }

    deleteVehicleCatalogItem(selectedVehicle.id);
    closeModal();
  }

  async function handleVehiclePhotosUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    const images = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          })
      )
    );

    setVehiclePhotos((current) => [...current, ...images.filter(Boolean)]);
    event.target.value = "";
  }

  function removeVehiclePhoto(index: number) {
    setVehiclePhotos((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <>
      <div className="space-y-6">
        <Card className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4">
            <Search className="h-4 w-4 text-mist-300" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t(
                locale,
                "Recherche libre: véhicule, ville, pays, contact, note, tag…",
                "Free search: vehicle, city, country, contact, note, tag…"
              )}
              className="border-0 bg-transparent px-0"
            />
          </div>
          <Button
            type="button"
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4" />
            {t(locale, "Ajouter un véhicule", "Add vehicle")}
          </Button>
        </Card>

        {!filteredVehicles.length ? (
          <EmptyState
            title={t(locale, "Aucun véhicule trouvé", "No vehicle found")}
            body={t(
              locale,
              "Essaie un autre mot-clé ou ajoute un van, bus ou driver.",
              "Try another keyword or add a van, bus, or driver."
            )}
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="hidden grid-cols-[minmax(0,1.2fr)_120px_140px_120px_120px_90px] gap-3 border-b border-white/8 px-5 py-3 text-xs uppercase tracking-[0.22em] text-mist-300 lg:grid">
              <p>{t(locale, "Véhicule", "Vehicle")}</p>
              <p>{t(locale, "Type", "Type")}</p>
              <p>{t(locale, "Ville", "City")}</p>
              <p>{t(locale, "Capacité", "Capacity")}</p>
              <p>{t(locale, "Prix/jour", "Day rate")}</p>
              <p>{t(locale, "Photos", "Photos")}</p>
            </div>
            <div className="divide-y divide-white/6">
              {filteredVehicles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedVehicleId(item.id);
                  }}
                  className="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-coral-500/[0.04] lg:grid lg:grid-cols-[minmax(0,1.2fr)_120px_140px_120px_120px_90px] lg:gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-mist-50">{item.name}</p>
                    <p className="mt-1 truncate text-sm text-mist-300">
                      {item.contact || item.website || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm lg:contents">
                    <div className="min-w-[120px]">
                      <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-mist-300 lg:hidden">
                        {t(locale, "Type", "Type")}
                      </p>
                      <p className="text-mist-200">
                        {getVehicleTypeLabel(locale, item.type)}
                      </p>
                    </div>
                    <div className="min-w-[140px]">
                      <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-mist-300 lg:hidden">
                        {t(locale, "Ville", "City")}
                      </p>
                      <p className="text-mist-200">
                        {[item.city, item.country].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                    <div className="min-w-[120px]">
                      <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-mist-300 lg:hidden">
                        {t(locale, "Capacité", "Capacity")}
                      </p>
                      <p className="text-mist-200">
                        {item.type === "van"
                          ? `${item.seats ?? 0} ${t(locale, "places", "seats")}`
                          : item.type === "bus"
                            ? `${item.bunks ?? 0} ${t(locale, "bunks", "bunks")}`
                            : "—"}
                      </p>
                    </div>
                    <div className="min-w-[120px]">
                      <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-mist-300 lg:hidden">
                        {t(locale, "Prix/jour", "Day rate")}
                      </p>
                      <p className="text-mist-200">
                        {formatCurrency(item.estimatedDailyPrice, currency, "GBP")}
                      </p>
                    </div>
                    <div className="min-w-[90px]">
                      <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-mist-300 lg:hidden">
                        {t(locale, "Photos", "Photos")}
                      </p>
                      <Badge>{item.vehiclePhotos.length}</Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={
          isCreating
            ? t(locale, "Nouveau véhicule", "New vehicle")
            : selectedVehicle?.name ?? ""
        }
        description={
          isCreating
            ? t(
                locale,
                "Ajoute un van, un bus ou un driver avec ses infos opérationnelles.",
                "Add a van, bus, or driver with its operating details."
              )
            : selectedVehicle
              ? `${getVehicleTypeLabel(locale, selectedVehicle.type)} • ${selectedVehicle.city}, ${selectedVehicle.country}`
              : undefined
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Nom", "Name")}
              </span>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Type de véhicule", "Vehicle type")}
              </span>
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as VehicleCatalogItem["type"])
                }
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
              >
                <option value="van" className="bg-graphite-900">
                  {getVehicleTypeLabel(locale, "van")}
                </option>
                <option value="bus" className="bg-graphite-900">
                  {getVehicleTypeLabel(locale, "bus")}
                </option>
                <option value="driver" className="bg-graphite-900">
                  {getVehicleTypeLabel(locale, "driver")}
                </option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Ville", "City")}
              </span>
              <Input value={city} onChange={(event) => setCity(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Pays", "Country")}
              </span>
              <Input
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Prix journalier", "Daily price")}
              </span>
              <Input
                value={estimatedDailyPrice}
                onChange={(event) => setEstimatedDailyPrice(event.target.value)}
                inputMode="decimal"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Taille de flotte", "Fleet size")}
              </span>
              <Input
                value={fleetSize}
                onChange={(event) => setFleetSize(event.target.value)}
                inputMode="numeric"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Contact", "Contact")}
              </span>
              <Input
                value={contact}
                onChange={(event) => setContact(event.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">Website</span>
              <Input
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </label>
          </div>

          {type === "van" ? (
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Places assises", "Seated capacity")}
              </span>
              <Input
                value={seats}
                onChange={(event) => setSeats(event.target.value)}
                inputMode="numeric"
              />
            </label>
          ) : null}

          {type === "bus" ? (
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Bunks de couchage", "Sleeping bunks")}
              </span>
              <Input
                value={bunks}
                onChange={(event) => setBunks(event.target.value)}
                inputMode="numeric"
              />
            </label>
          ) : null}

          <label className="space-y-2">
            <span className="text-sm text-mist-200">Merch</span>
            <Input
              value={merchCapacity}
              onChange={(event) => setMerchCapacity(event.target.value)}
              placeholder={t(
                locale,
                "ex: 4 fly cases",
                "e.g. 4 flight cases"
              )}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-mist-200">
              {t(locale, "Tags", "Tags")}
            </span>
            <Input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder={t(
                locale,
                "sépare par des virgules",
                "separate with commas"
              )}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-mist-200">
              {t(locale, "Notes", "Notes")}
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-50 outline-none transition placeholder:text-mist-300/70 focus:border-coral-500/50 focus:bg-white/[0.07]"
            />
          </label>

          <div className="space-y-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-mist-50">
                  {t(locale, "Photos du véhicule", "Vehicle photos")}
                </p>
                <p className="mt-1 text-sm text-mist-300">
                  {t(
                    locale,
                    "Ajoute des photos pour retrouver rapidement le bon véhicule.",
                    "Add photos so you can quickly identify the right vehicle."
                  )}
                </p>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleVehiclePhotosUpload}
                />
                <span className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100">
                  <Camera className="h-4 w-4" />
                  {t(locale, "Ajouter des photos", "Add photos")}
                </span>
              </label>
            </div>

            {vehiclePhotos.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {vehiclePhotos.map((photo, index) => (
                  <div
                    key={`${photo.slice(0, 20)}-${index}`}
                    className="overflow-hidden rounded-[20px] border border-white/8 bg-black/20"
                  >
                    <Image
                      src={photo}
                      alt={`${name || "vehicle"} ${index + 1}`}
                      width={640}
                      height={360}
                      className="h-36 w-full object-cover"
                    />
                    <div className="flex items-center justify-end p-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => removeVehiclePhoto(index)}
                        className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t(locale, "Retirer", "Remove")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-black/10 p-4 text-sm text-mist-300">
                {t(
                  locale,
                  "Aucune photo ajoutée pour l'instant.",
                  "No photos added yet."
                )}
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Aperçu", "Preview")}
            </p>
            <p className="mt-2 text-sm text-mist-50">
              {getVehicleTypeLabel(locale, type)} • {[city, country].filter(Boolean).join(", ") || "—"}
            </p>
            <p className="mt-1 text-sm text-mist-300">
              {type === "van"
                ? `${parseInteger(seats)} ${t(locale, "places", "seats")}`
                : type === "bus"
                  ? `${parseInteger(bunks)} ${t(locale, "bunks", "bunks")}`
                  : t(locale, "Driver only", "Driver only")}
            </p>
            <p className="mt-1 text-sm text-mist-300">
              {formatCurrency(parseOptionalNumber(estimatedDailyPrice) ?? 0, currency, "GBP")}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!isCreating ? (
              <Button
                type="button"
                variant="secondary"
                onClick={removeSelectedVehicle}
                className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" />
                {t(locale, "Supprimer ce véhicule", "Delete vehicle")}
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-4">
              <p className="text-sm text-emerald-300">{saveMessage}</p>
              <Button type="button" onClick={saveVehicle}>
                {isCreating
                  ? t(locale, "Créer le véhicule", "Create vehicle")
                  : t(locale, "Enregistrer", "Save")}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
