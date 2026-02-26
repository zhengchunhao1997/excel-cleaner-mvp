export type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export type MappingTemplateV1 = {
  version: 1
  id: string
  name: string
  createdAt: number
  updatedAt: number
  fileSchemas: Array<{
    schemaKey: string
    headers: string[]
  }>
  unifiedSchema: string[]
  mappings: Array<{
    schemaKey: string
    mapping: Record<string, string | null>
  }>
  transformations?: Record<string, string>
  lastUsedAt?: number
  useCount?: number
}

export type UploadedFileHeaders = {
  fileName: string
  headers: string[]
}

export type MappingResponse = {
  unifiedSchema: string[]
  mappings: Array<{
    fileName: string
    mapping: Record<string, string | null>
  }>
  transformations?: Record<string, string>
}

const STORAGE_KEY = 'excelCleaner.mappingTemplates.v1'

export function canonicalizeHeaders(headers: string[]): string[] {
  return headers.map((h) => h.trim().toLowerCase())
}

export function schemaKeyFromHeaders(headers: string[]): string {
  return canonicalizeHeaders(headers).join('\u001f')
}

export function loadTemplates(storage: StorageLike): MappingTemplateV1[] {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((t): t is MappingTemplateV1 => {
      const o = t as Record<string, unknown>
      return (
        !!t &&
        typeof t === 'object' &&
        o.version === 1 &&
        typeof o.id === 'string' &&
        Array.isArray(o.fileSchemas) &&
        Array.isArray(o.unifiedSchema) &&
        Array.isArray(o.mappings)
      )
    })
  } catch {
    return []
  }
}

export function saveTemplates(storage: StorageLike, templates: MappingTemplateV1[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

export function upsertTemplate(
  templates: MappingTemplateV1[],
  template: MappingTemplateV1,
): MappingTemplateV1[] {
  const idx = templates.findIndex((t) => t.id === template.id)
  if (idx === -1) return [...templates, template]
  const next = templates.slice()
  next[idx] = template
  return next
}

function makeSchemaKeySet(schemaKeys: string[]): string {
  return schemaKeys.slice().sort().join('\u001e')
}

export function findBestTemplateForFiles(
  templates: MappingTemplateV1[],
  files: UploadedFileHeaders[],
): MappingTemplateV1 | null {
  const fileSchemaKeys = files.map((f) => schemaKeyFromHeaders(f.headers))
  const want = makeSchemaKeySet(fileSchemaKeys)

  const exact = templates.find((t) => {
    const have = makeSchemaKeySet(t.fileSchemas.map((s) => s.schemaKey))
    return have === want
  })
  return exact ?? null
}

export function applyTemplateToFiles(
  template: MappingTemplateV1,
  files: UploadedFileHeaders[],
): MappingResponse {
  const mappingBySchemaKey = new Map<string, Record<string, string | null>>(
    template.mappings.map((m) => [m.schemaKey, m.mapping]),
  )

  const nextMappings = files.map((f) => {
    const key = schemaKeyFromHeaders(f.headers)
    const mapping = mappingBySchemaKey.get(key)
    const filled: Record<string, string | null> = {}
    for (const unifiedField of template.unifiedSchema) {
      filled[unifiedField] = mapping?.[unifiedField] ?? null
    }
    return { fileName: f.fileName, mapping: filled }
  })

  return {
    unifiedSchema: template.unifiedSchema,
    mappings: nextMappings,
    transformations: template.transformations,
  }
}

export function markTemplateUsed(template: MappingTemplateV1, now: number): MappingTemplateV1 {
  return {
    ...template,
    lastUsedAt: now,
    useCount: (template.useCount ?? 0) + 1,
    updatedAt: now,
  }
}

export function enforceTemplatesLimit(
  templates: MappingTemplateV1[],
  limit: number,
): MappingTemplateV1[] {
  const capped = Math.max(0, Math.floor(limit))
  if (capped <= 0) return []
  if (templates.length <= capped) {
    return templates
      .slice()
      .sort((a, b) => (b.lastUsedAt ?? b.updatedAt) - (a.lastUsedAt ?? a.updatedAt))
  }
  return templates
    .slice()
    .sort((a, b) => (b.lastUsedAt ?? b.updatedAt) - (a.lastUsedAt ?? a.updatedAt))
    .slice(0, capped)
}
