import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type CardStatus =
  | "active"
  | "inactive"
  | "pending"
  | "expired"
  | "lost"
  | "stolen"
  | "damaged"
  | "replaced";

export type CardKind = "digital" | "physical" | "both";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

type RawCard = Record<string, any>;
type RawTemplate = Record<string, any>;
type RawBatch = Record<string, any>;
type RawVerification = Record<string, any>;

export interface CardRecord {
  id: number;
  memberId: number;
  cardNumber: string;
  cardType: CardKind;
  status: CardStatus;
  templateType?: string | null;
  templateId?: number | null;
  qrCodeData?: string | null;
  digitalCardUrl?: string | null;
  personalizationData?: string | null;
  deliveryMethod?: string | null;
  deliveryAddress?: string | null;
  trackingNumber?: string | null;
  batchId?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  deactivatedAt?: string | null;
  deactivationReason?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CardTemplateRecord {
  id: number;
  companyId?: number | null;
  templateName: string;
  templateType: string;
  templateDescription?: string | null;
  backgroundColor?: string | null;
  foregroundColor?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt?: string | null;
}

export interface CardBatchRecord {
  id: number;
  batchId: string;
  batchName: string;
  batchType: string;
  totalCards: number;
  processedCards: number;
  productionStatus: string;
  trackingNumber?: string | null;
  shippingDate?: string | null;
  completionDate?: string | null;
  createdAt?: string | null;
}

export interface CardVerificationRecord {
  id: number;
  cardId: number;
  memberId: number;
  verifierId?: number | null;
  verificationMethod: string;
  verificationResult: string;
  verificationTimestamp?: string | null;
  fraudRiskScore?: number | null;
  fraudIndicators: string[];
}

export interface CardAnalytics {
  cards: {
    total: number;
    active: number;
    pending: number;
    digital: number;
    physical: number;
  };
  verification: {
    total: number;
    successful: number;
    failed: number;
  };
  recentVerifications: CardVerificationRecord[];
}

export interface CardVerificationResult {
  success: boolean;
  message: string;
  card?: {
    id: number;
    memberId: number;
    cardNumber: string;
    status: string;
    expiryDate: string;
  };
  verification?: {
    id: number;
    method: string;
    result: string;
    fraudRiskScore: number;
    fraudIndicators: string[];
    timestamp: string;
  };
}

const cardKeys = {
  all: ["cards"] as const,
  list: () => [...cardKeys.all, "list"] as const,
  member: (memberId: number) => [...cardKeys.all, "member", memberId] as const,
  history: (cardId: number) => [...cardKeys.all, "history", cardId] as const,
  templates: () => [...cardKeys.all, "templates"] as const,
  batches: () => [...cardKeys.all, "batches"] as const,
  analytics: () => [...cardKeys.all, "analytics"] as const,
};

function toDateString(value: unknown): string | null {
  return typeof value === "string" || value instanceof Date
    ? new Date(value).toISOString()
    : null;
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeCard(raw: RawCard): CardRecord {
  return {
    id: Number(raw.id),
    memberId: Number(raw.memberId ?? raw.member_id),
    cardNumber: String(raw.cardNumber ?? raw.card_number ?? ""),
    cardType: String(raw.cardType ?? raw.card_type ?? "physical") as CardKind,
    status: String(raw.status ?? "pending") as CardStatus,
    templateType: raw.templateType ?? raw.template_type ?? null,
    templateId: raw.templateId ?? raw.template_id ?? null,
    qrCodeData: raw.qrCodeData ?? raw.qr_code_data ?? null,
    digitalCardUrl: raw.digitalCardUrl ?? raw.digital_card_url ?? null,
    personalizationData: raw.personalizationData ?? raw.personalization_data ?? null,
    deliveryMethod: raw.deliveryMethod ?? raw.delivery_method ?? null,
    deliveryAddress: raw.deliveryAddress ?? raw.delivery_address ?? null,
    trackingNumber: raw.trackingNumber ?? raw.tracking_number ?? null,
    batchId: raw.batchId ?? raw.batch_id ?? null,
    issuedAt: toDateString(raw.issueDate ?? raw.issue_date ?? raw.issuedAt ?? raw.activationDate),
    expiresAt: toDateString(raw.expiryDate ?? raw.expiry_date ?? raw.expiresAt),
    lastUsedAt: toDateString(raw.lastUsedAt ?? raw.last_used_at),
    deactivatedAt: toDateString(raw.deactivationDate ?? raw.deactivation_date ?? raw.deactivatedAt),
    deactivationReason: raw.replacementReason ?? raw.replacement_reason ?? null,
    createdAt: toDateString(raw.createdAt ?? raw.created_at),
    updatedAt: toDateString(raw.updatedAt ?? raw.updated_at),
  };
}

function normalizeTemplate(raw: RawTemplate): CardTemplateRecord {
  return {
    id: Number(raw.id),
    companyId: raw.companyId ?? raw.company_id ?? null,
    templateName: String(raw.templateName ?? raw.template_name ?? `Template ${raw.id}`),
    templateType: String(raw.templateType ?? raw.template_type ?? "standard"),
    templateDescription: raw.templateDescription ?? raw.template_description ?? null,
    backgroundColor: raw.backgroundColor ?? raw.background_color ?? null,
    foregroundColor: raw.foregroundColor ?? raw.foreground_color ?? null,
    accentColor: raw.accentColor ?? raw.accent_color ?? null,
    logoUrl: raw.logoUrl ?? raw.logo_url ?? null,
    isActive: Boolean(raw.isActive ?? raw.is_active),
    isDefault: Boolean(raw.isDefault ?? raw.is_default),
    createdAt: toDateString(raw.createdAt ?? raw.created_at),
  };
}

function normalizeBatch(raw: RawBatch): CardBatchRecord {
  return {
    id: Number(raw.id),
    batchId: String(raw.batchId ?? raw.batch_id ?? ""),
    batchName: String(raw.batchName ?? raw.batch_name ?? raw.batchId ?? raw.batch_id ?? ""),
    batchType: String(raw.batchType ?? raw.batch_type ?? "initial_issue"),
    totalCards: Number(raw.totalCards ?? raw.total_cards ?? 0),
    processedCards: Number(raw.processedCards ?? raw.processed_cards ?? 0),
    productionStatus: String(raw.productionStatus ?? raw.production_status ?? "pending"),
    trackingNumber: raw.trackingNumber ?? raw.tracking_number ?? null,
    shippingDate: toDateString(raw.shippingDate ?? raw.shipping_date),
    completionDate: toDateString(raw.completionDate ?? raw.completion_date),
    createdAt: toDateString(raw.createdAt ?? raw.created_at),
  };
}

function normalizeVerification(raw: RawVerification): CardVerificationRecord {
  return {
    id: Number(raw.id),
    cardId: Number(raw.cardId ?? raw.card_id),
    memberId: Number(raw.memberId ?? raw.member_id),
    verifierId: raw.verifierId ?? raw.verifier_id ?? null,
    verificationMethod: String(raw.verificationMethod ?? raw.verification_method ?? ""),
    verificationResult: String(raw.verificationResult ?? raw.verification_result ?? ""),
    verificationTimestamp: toDateString(raw.verificationTimestamp ?? raw.verification_timestamp),
    fraudRiskScore: raw.fraudRiskScore ?? raw.fraud_risk_score ?? null,
    fraudIndicators: parseJsonArray(raw.fraudIndicators ?? raw.fraud_indicators),
  };
}

async function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function fetchMemberCards(memberId: number): Promise<CardRecord[]> {
  const response = await fetch(`/api/cards/member/${memberId}`, { credentials: "include" });
  const payload = (await readJson<ApiEnvelope<RawCard[]>>(response)) as any;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Failed to load member cards");
  }

  return (payload.data ?? payload.cards ?? []).map(normalizeCard);
}

export async function fetchAllCards(): Promise<CardRecord[]> {
  const response = await fetch("/api/cards", { credentials: "include" });
  const payload = (await readJson<ApiEnvelope<RawCard[]>>(response)) as any;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Failed to load cards");
  }

  return (payload.data ?? payload.cards ?? []).map(normalizeCard);
}

export async function fetchTemplates(): Promise<CardTemplateRecord[]> {
  const response = await fetch("/api/cards/templates?activeOnly=false", { credentials: "include" });
  const payload = (await readJson<ApiEnvelope<RawTemplate[]>>(response)) as any;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Failed to load card templates");
  }

  return (payload.data ?? payload.templates ?? []).map(normalizeTemplate);
}

export async function fetchBatches(): Promise<CardBatchRecord[]> {
  const response = await fetch("/api/cards/batches", { credentials: "include" });
  const payload = (await readJson<ApiEnvelope<RawBatch[]>>(response)) as any;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Failed to load production batches");
  }

  return (payload.data ?? payload.batches ?? []).map(normalizeBatch);
}

export async function fetchCardHistory(cardId: number): Promise<CardVerificationRecord[]> {
  const response = await fetch(`/api/cards/history/${cardId}?limit=10`, { credentials: "include" });
  const payload = (await readJson<ApiEnvelope<RawVerification[]>>(response)) as any;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Failed to load card history");
  }

  return (payload.data ?? payload.events ?? []).map(normalizeVerification).reverse();
}

export async function fetchCardAnalytics(): Promise<CardAnalytics> {
  const response = await fetch("/api/cards/analytics", { credentials: "include" });
  const payload = await readJson<ApiEnvelope<any>>(response);

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error || "Failed to load card analytics");
  }

  const analytics = payload.data;

  return {
    cards: {
      total: Number(analytics.cards?.total ?? analytics.total ?? 0),
      active: Number(analytics.cards?.active ?? analytics.active ?? 0),
      pending: Number(analytics.cards?.pending ?? 0),
      digital: Number(analytics.cards?.digital ?? 0),
      physical: Number(analytics.cards?.physical ?? 0),
    },
    verification: {
      total: Number(analytics.verification?.total ?? 0),
      successful: Number(analytics.verification?.successful ?? 0),
      failed: Number(analytics.verification?.failed ?? 0),
    },
    recentVerifications: (analytics.recentVerifications ?? []).map(normalizeVerification),
  };
}

export async function verifyCard(payload: {
  qrCodeData: string;
  providerId: string;
  verificationType: "qr_scan" | "manual_entry" | "nfc_tap";
  location?: string;
  deviceInfo?: string;
}): Promise<CardVerificationResult> {
  const methodMap = {
    qr_scan: "qr_scan",
    manual_entry: "card_number",
    nfc_tap: "nfc",
  } as const;

  const response = await apiRequest("POST", "/api/cards/verify", {
    ...payload,
    verificationType: methodMap[payload.verificationType],
  });

  const result = await readJson<ApiEnvelope<CardVerificationResult>>(response);
  if (!result.success || !result.data) {
    throw new Error(result.error || "Verification failed");
  }

  return result.data;
}

export async function updateCardStatus(payload: {
  cardId: number;
  status: CardStatus;
  reason?: string;
}) {
  const response = await apiRequest("PUT", `/api/cards/${payload.cardId}/status`, {
    status: payload.status,
    reason: payload.reason,
  });

  return readJson<ApiEnvelope<any>>(response);
}

export async function generateCard(payload: {
  memberId: number;
  cardType: CardKind;
  templateId?: number;
  expeditedShipping?: boolean;
  deliveryAddress?: string;
}) {
  const response = await apiRequest("POST", "/api/cards/generate", payload);
  return readJson<ApiEnvelope<any>>(response);
}

export async function downloadCardPayload(cardId: number) {
  const response = await fetch(`/api/cards/member/download-card/${cardId}`, { credentials: "include" });
  const payload = await readJson<ApiEnvelope<any>>(response);

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Failed to download digital card");
  }

  return payload.data;
}

export function useMemberCards(memberId: number) {
  return useQuery({
    queryKey: cardKeys.member(memberId),
    queryFn: () => fetchMemberCards(memberId),
    enabled: Number.isFinite(memberId) && memberId > 0,
  });
}

export function useAllCards() {
  return useQuery({
    queryKey: cardKeys.list(),
    queryFn: fetchAllCards,
  });
}

export function useCardTemplates() {
  return useQuery({
    queryKey: cardKeys.templates(),
    queryFn: fetchTemplates,
  });
}

export function useCardBatches() {
  return useQuery({
    queryKey: cardKeys.batches(),
    queryFn: fetchBatches,
  });
}

export function useCardAnalytics() {
  return useQuery({
    queryKey: cardKeys.analytics(),
    queryFn: fetchCardAnalytics,
  });
}

export function useCardHistory(cardId?: number | null) {
  return useQuery({
    queryKey: cardId ? cardKeys.history(cardId) : [...cardKeys.all, "history", "none"],
    queryFn: () => fetchCardHistory(cardId as number),
    enabled: Boolean(cardId),
  });
}

export function useVerifyCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyCard,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: cardKeys.analytics() });
      if (result.card?.id) {
        queryClient.invalidateQueries({ queryKey: cardKeys.history(result.card.id) });
      }
    },
  });
}

export function useUpdateCardStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCardStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.list() });
      queryClient.invalidateQueries({ queryKey: cardKeys.analytics() });
      queryClient.invalidateQueries({ queryKey: cardKeys.all });
    },
  });
}

export function useGenerateCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.list() });
      queryClient.invalidateQueries({ queryKey: cardKeys.analytics() });
      queryClient.invalidateQueries({ queryKey: cardKeys.batches() });
      queryClient.invalidateQueries({ queryKey: cardKeys.all });
    },
  });
}
