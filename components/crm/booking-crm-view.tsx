"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  t,
  translateCrmKind,
  translateCrmStatus,
  type Locale
} from "@/lib/i18n";
import { formatCurrency, type SupportedCurrency } from "@/lib/utils";
import {
  useBandosUIStore,
  type EditableCrmContact
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

function formatOptionalAmount(value: number | null) {
  return typeof value === "number" ? String(value) : "";
}

const emptyDraft = {
  company: "",
  kind: "venue" as EditableCrmContact["kind"],
  email: "",
  phone: "",
  instagram: "",
  capacity: "",
  city: "",
  country: "",
  dealHistory: "",
  previousShows: "",
  notes: "",
  status: "not contacted" as EditableCrmContact["status"],
  lastContact: "",
  tags: "",
  roomHire: "",
  defaultFee: ""
};

export function BookingCrmView({
  currency,
  locale
}: {
  currency: SupportedCurrency;
  locale: Locale;
}) {
  const crmCatalog = useBandosUIStore((state) => state.crmCatalog);
  const addCrmContact = useBandosUIStore((state) => state.addCrmContact);
  const updateCrmContact = useBandosUIStore((state) => state.updateCrmContact);
  const deleteCrmContact = useBandosUIStore((state) => state.deleteCrmContact);

  const [query, setQuery] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [company, setCompany] = useState(emptyDraft.company);
  const [kind, setKind] = useState<EditableCrmContact["kind"]>(emptyDraft.kind);
  const [email, setEmail] = useState(emptyDraft.email);
  const [phone, setPhone] = useState(emptyDraft.phone);
  const [instagram, setInstagram] = useState(emptyDraft.instagram);
  const [capacity, setCapacity] = useState(emptyDraft.capacity);
  const [city, setCity] = useState(emptyDraft.city);
  const [country, setCountry] = useState(emptyDraft.country);
  const [dealHistory, setDealHistory] = useState(emptyDraft.dealHistory);
  const [previousShows, setPreviousShows] = useState(emptyDraft.previousShows);
  const [notes, setNotes] = useState(emptyDraft.notes);
  const [status, setStatus] = useState<EditableCrmContact["status"]>(emptyDraft.status);
  const [lastContact, setLastContact] = useState(emptyDraft.lastContact);
  const [tags, setTags] = useState(emptyDraft.tags);
  const [roomHire, setRoomHire] = useState(emptyDraft.roomHire);
  const [defaultFee, setDefaultFee] = useState(emptyDraft.defaultFee);
  const [saveMessage, setSaveMessage] = useState("");

  const deferredQuery = useDeferredValue(query);
  const selectedContact =
    crmCatalog.find((contact) => contact.id === selectedContactId) ?? null;
  const modalOpen = isCreating || Boolean(selectedContact);

  const filteredContacts = useMemo(() => {
    const search = deferredQuery.trim().toLowerCase();

    return [...crmCatalog]
      .filter((contact) => {
        if (!search) {
          return true;
        }

        return [
          contact.company,
          contact.kind,
          contact.city,
          contact.country,
          contact.email,
          contact.phone,
          contact.instagram,
          contact.dealHistory,
          contact.previousShows,
          contact.notes,
          contact.status,
          contact.lastContact,
          contact.tags.join(" "),
          String(contact.roomHire ?? ""),
          String(contact.defaultFee ?? "")
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((left, right) => left.company.localeCompare(right.company));
  }, [crmCatalog, deferredQuery]);

  useEffect(() => {
    if (!selectedContact && !isCreating) {
      setCompany(emptyDraft.company);
      setKind(emptyDraft.kind);
      setEmail(emptyDraft.email);
      setPhone(emptyDraft.phone);
      setInstagram(emptyDraft.instagram);
      setCapacity(emptyDraft.capacity);
      setCity(emptyDraft.city);
      setCountry(emptyDraft.country);
      setDealHistory(emptyDraft.dealHistory);
      setPreviousShows(emptyDraft.previousShows);
      setNotes(emptyDraft.notes);
      setStatus(emptyDraft.status);
      setLastContact(emptyDraft.lastContact);
      setTags(emptyDraft.tags);
      setRoomHire(emptyDraft.roomHire);
      setDefaultFee(emptyDraft.defaultFee);
      setSaveMessage("");
      return;
    }

    if (isCreating) {
      setCompany(emptyDraft.company);
      setKind(emptyDraft.kind);
      setEmail(emptyDraft.email);
      setPhone(emptyDraft.phone);
      setInstagram(emptyDraft.instagram);
      setCapacity(emptyDraft.capacity);
      setCity(emptyDraft.city);
      setCountry(emptyDraft.country);
      setDealHistory(emptyDraft.dealHistory);
      setPreviousShows(emptyDraft.previousShows);
      setNotes(emptyDraft.notes);
      setStatus(emptyDraft.status);
      setLastContact(new Date().toISOString().slice(0, 10));
      setTags(emptyDraft.tags);
      setRoomHire(emptyDraft.roomHire);
      setDefaultFee(emptyDraft.defaultFee);
      setSaveMessage("");
      return;
    }

    if (!selectedContact) {
      return;
    }

    setCompany(selectedContact.company);
    setKind(selectedContact.kind);
    setEmail(selectedContact.email);
    setPhone(selectedContact.phone);
    setInstagram(selectedContact.instagram);
    setCapacity(selectedContact.capacity > 0 ? String(selectedContact.capacity) : "");
    setCity(selectedContact.city);
    setCountry(selectedContact.country);
    setDealHistory(selectedContact.dealHistory);
    setPreviousShows(selectedContact.previousShows);
    setNotes(selectedContact.notes);
    setStatus(selectedContact.status);
    setLastContact(selectedContact.lastContact);
    setTags(selectedContact.tags.join(", "));
    setRoomHire(formatOptionalAmount(selectedContact.roomHire));
    setDefaultFee(formatOptionalAmount(selectedContact.defaultFee));
    setSaveMessage("");
  }, [isCreating, selectedContact]);

  function closeModal() {
    setIsCreating(false);
    setSelectedContactId(null);
    setSaveMessage("");
  }

  function openCreateModal() {
    setSelectedContactId(null);
    setIsCreating(true);
  }

  function saveContact() {
    const isBandContact = kind === "band";
    const payload = {
      company: company.trim() || t(locale, "Nouveau contact", "New contact"),
      kind,
      email: email.trim(),
      phone: phone.trim(),
      instagram: instagram.trim(),
      capacity: isBandContact ? 0 : parseInteger(capacity),
      city: city.trim(),
      country: country.trim(),
      dealHistory: dealHistory.trim(),
      previousShows: previousShows.trim(),
      notes: notes.trim(),
      status,
      lastContact: lastContact.trim() || new Date().toISOString().slice(0, 10),
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      roomHire: isBandContact ? null : parseOptionalNumber(roomHire),
      defaultFee: isBandContact ? parseOptionalNumber(defaultFee) : null
    };

    if (isCreating) {
      addCrmContact(payload);
      setSaveMessage(t(locale, "Contact créé.", "Contact created."));
      setIsCreating(false);
      return;
    }

    if (!selectedContact) {
      return;
    }

    updateCrmContact(selectedContact.id, payload);
    setSaveMessage(t(locale, "Contact mis à jour.", "Contact updated."));
  }

  function removeSelectedContact() {
    if (!selectedContact) {
      return;
    }

    deleteCrmContact(selectedContact.id);
    closeModal();
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
                "Recherche libre: nom, ville, mail, téléphone, note, tag, deal…",
                "Free search: name, city, email, phone, note, tag, deal…"
              )}
              className="border-0 bg-transparent px-0"
            />
          </div>
          <Button type="button" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            {t(locale, "Ajouter un contact", "Add contact")}
          </Button>
        </Card>

        {!filteredContacts.length ? (
          <EmptyState
            title={t(
              locale,
              "Aucun contact trouvé",
              "No contacts found"
            )}
            body={t(
              locale,
              "Essaie un autre mot-clé ou crée un nouveau contact.",
              "Try another keyword or create a new contact."
            )}
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="hidden grid-cols-[minmax(0,1.2fr)_140px_140px_120px_150px] gap-3 border-b border-white/8 px-5 py-3 text-xs uppercase tracking-[0.22em] text-mist-300 lg:grid">
              <p>{t(locale, "Contact", "Contact")}</p>
              <p>{t(locale, "Type", "Type")}</p>
              <p>{t(locale, "Ville", "City")}</p>
              <p>{t(locale, "Statut", "Status")}</p>
              <p>{t(locale, "Dernier contact", "Last contact")}</p>
            </div>
            <div className="divide-y divide-white/6">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedContactId(contact.id);
                  }}
                  className="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-coral-500/[0.04] lg:grid lg:grid-cols-[minmax(0,1.2fr)_140px_140px_120px_150px] lg:gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-mist-50">
                      {contact.company}
                    </p>
                    <p className="mt-1 truncate text-sm text-mist-300">
                      {contact.kind === "band" &&
                      typeof contact.defaultFee === "number"
                        ? `${formatCurrency(contact.defaultFee, currency, "GBP")} • ${
                            contact.email || contact.phone || contact.instagram || "—"
                          }`
                        : contact.email || contact.phone || contact.instagram || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm lg:contents">
                    <div className="min-w-[120px]">
                      <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-mist-300 lg:hidden">
                        {t(locale, "Type", "Type")}
                      </p>
                      <p className="text-mist-200">
                        {translateCrmKind(locale, contact.kind)}
                      </p>
                    </div>
                    <div className="min-w-[140px]">
                      <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-mist-300 lg:hidden">
                        {t(locale, "Ville", "City")}
                      </p>
                      <p className="text-mist-200">
                        {[contact.city, contact.country].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-mist-300 lg:hidden">
                        {t(locale, "Statut", "Status")}
                      </p>
                      <Badge tone={contact.status === "confirmed" ? "success" : "accent"}>
                        {translateCrmStatus(locale, contact.status)}
                      </Badge>
                    </div>
                    <div className="min-w-[150px]">
                      <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-mist-300 lg:hidden">
                        {t(locale, "Dernier contact", "Last contact")}
                      </p>
                      <p className="text-sm text-mist-300">{contact.lastContact || "—"}</p>
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
            ? t(locale, "Nouveau contact", "New contact")
            : selectedContact?.company ?? ""
        }
        description={
          isCreating
            ? t(
                locale,
                "Crée un contact booking ou groupe, puis retrouve-le ensuite avec la recherche libre.",
                "Create a booking or band contact, then find it again with free search."
              )
            : selectedContact
              ? `${translateCrmKind(locale, selectedContact.kind)} • ${selectedContact.city}, ${selectedContact.country}`
              : undefined
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Nom", "Name")}
              </span>
              <Input value={company} onChange={(event) => setCompany(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Type de contact", "Contact type")}
              </span>
              <select
                value={kind}
                onChange={(event) =>
                  {
                    const nextKind = event.target.value as EditableCrmContact["kind"];
                    setKind(nextKind);
                    setSaveMessage("");

                    if (nextKind === "band") {
                      setCapacity("");
                      setRoomHire("");
                    } else {
                      setDefaultFee("");
                    }
                  }
                }
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
              >
                <option value="venue" className="bg-graphite-900">
                  {translateCrmKind(locale, "venue")}
                </option>
                <option value="promoter" className="bg-graphite-900">
                  {translateCrmKind(locale, "promoter")}
                </option>
                <option value="festival" className="bg-graphite-900">
                  {translateCrmKind(locale, "festival")}
                </option>
                <option value="booking agent" className="bg-graphite-900">
                  {translateCrmKind(locale, "booking agent")}
                </option>
                <option value="band" className="bg-graphite-900">
                  {translateCrmKind(locale, "band")}
                </option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm text-mist-200">Email</span>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Téléphone", "Phone")}
              </span>
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">Instagram</span>
              <Input
                value={instagram}
                onChange={(event) => setInstagram(event.target.value)}
              />
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
            {kind === "band" ? (
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Cachet du groupe", "Band fee")}
                </span>
                <Input
                  value={defaultFee}
                  onChange={(event) => setDefaultFee(event.target.value)}
                  inputMode="decimal"
                  placeholder="150"
                />
              </label>
            ) : (
              <>
                <label className="space-y-2">
                  <span className="text-sm text-mist-200">
                    {t(locale, "Jauge", "Capacity")}
                  </span>
                  <Input
                    value={capacity}
                    onChange={(event) => setCapacity(event.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-mist-200">
                    {t(locale, "Prix de la salle", "Room hire")}
                  </span>
                  <Input
                    value={roomHire}
                    onChange={(event) => setRoomHire(event.target.value)}
                    inputMode="decimal"
                  />
                </label>
              </>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Statut", "Status")}
              </span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as EditableCrmContact["status"])
                }
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
              >
                <option value="not contacted" className="bg-graphite-900">
                  {translateCrmStatus(locale, "not contacted")}
                </option>
                <option value="contacted" className="bg-graphite-900">
                  {translateCrmStatus(locale, "contacted")}
                </option>
                <option value="replied" className="bg-graphite-900">
                  {translateCrmStatus(locale, "replied")}
                </option>
                <option value="negotiating" className="bg-graphite-900">
                  {translateCrmStatus(locale, "negotiating")}
                </option>
                <option value="confirmed" className="bg-graphite-900">
                  {translateCrmStatus(locale, "confirmed")}
                </option>
                <option value="rejected" className="bg-graphite-900">
                  {translateCrmStatus(locale, "rejected")}
                </option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Dernier contact", "Last contact")}
              </span>
              <Input
                type="date"
                value={lastContact}
                onChange={(event) => setLastContact(event.target.value)}
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm text-mist-200">
              {t(locale, "Historique deal", "Deal history")}
            </span>
            <Input
              value={dealHistory}
              onChange={(event) => setDealHistory(event.target.value)}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-mist-200">
              {t(locale, "Historique shows", "Show history")}
            </span>
            <Input
              value={previousShows}
              onChange={(event) => setPreviousShows(event.target.value)}
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

          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {kind === "band"
                ? t(locale, "Aperçu groupe", "Band snapshot")
                : t(locale, "Aperçu salle", "Venue snapshot")}
            </p>
            <p className="mt-2 text-sm text-mist-50">
              {kind === "band"
                ? company.trim() || t(locale, "Groupe sans nom", "Unnamed band")
                : capacity
                  ? `${parseInteger(capacity)} ${t(locale, "places", "cap")}`
                  : t(locale, "Jauge non renseignée", "Capacity not set")}
            </p>
            <p className="mt-1 text-sm text-mist-300">
              {kind === "band"
                ? parseOptionalNumber(defaultFee) !== null
                  ? formatCurrency(parseOptionalNumber(defaultFee) ?? 0, currency, "GBP")
                  : t(locale, "Cachet non renseigné", "Band fee not set")
                : parseOptionalNumber(roomHire) !== null
                  ? formatCurrency(parseOptionalNumber(roomHire) ?? 0, currency, "GBP")
                  : t(locale, "Prix de salle non renseigné", "Room hire not set")}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!isCreating ? (
              <Button
                type="button"
                variant="secondary"
                onClick={removeSelectedContact}
                className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" />
                {t(locale, "Supprimer ce contact", "Delete contact")}
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-4">
              <p className="text-sm text-emerald-300">{saveMessage}</p>
              <Button type="button" onClick={saveContact}>
                {isCreating
                  ? t(locale, "Créer le contact", "Create contact")
                  : t(locale, "Enregistrer", "Save")}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
