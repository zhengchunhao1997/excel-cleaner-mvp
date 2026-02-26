import { describe, expect, it } from 'vitest'
import {
  applyTemplateToFiles,
  canonicalizeHeaders,
  enforceTemplatesLimit,
  findBestTemplateForFiles,
  schemaKeyFromHeaders,
  type MappingTemplateV1,
  type StorageLike,
  upsertTemplate,
} from './mappingTemplates'

describe('mappingTemplates', () => {
  it('canonicalizeHeaders trims and lowercases', () => {
    expect(canonicalizeHeaders([' Email ', 'PHONE', 'Phone_2'])).toEqual([
      'email',
      'phone',
      'phone_2',
    ])
  })

  it('findBestTemplateForFiles matches by schema keys (order independent)', () => {
    const a = schemaKeyFromHeaders(['email', 'phone'])
    const b = schemaKeyFromHeaders(['mail', 'tel'])
    const t: MappingTemplateV1 = {
      version: 1,
      id: 't1',
      name: 'Orders+Shipments',
      createdAt: 1,
      updatedAt: 1,
      fileSchemas: [
        { schemaKey: a, headers: ['email', 'phone'] },
        { schemaKey: b, headers: ['mail', 'tel'] },
      ],
      unifiedSchema: ['Email', 'Phone'],
      mappings: [
        { schemaKey: a, mapping: { Email: 'email', Phone: 'phone' } },
        { schemaKey: b, mapping: { Email: 'mail', Phone: 'tel' } },
      ],
    }

    const match1 = findBestTemplateForFiles([t], [
      { fileName: 'x.xlsx', headers: ['Email', 'Phone'] },
      { fileName: 'y.xlsx', headers: ['Mail', 'Tel'] },
    ])
    expect(match1?.id).toBe('t1')

    const match2 = findBestTemplateForFiles([t], [
      { fileName: 'y.xlsx', headers: ['Mail', 'Tel'] },
      { fileName: 'x.xlsx', headers: ['Email', 'Phone'] },
    ])
    expect(match2?.id).toBe('t1')
  })

  it('applyTemplateToFiles rewrites mappings to current fileName', () => {
    const a = schemaKeyFromHeaders(['email', 'phone'])
    const b = schemaKeyFromHeaders(['mail', 'tel'])
    const t: MappingTemplateV1 = {
      version: 1,
      id: 't1',
      name: 'Orders+Shipments',
      createdAt: 1,
      updatedAt: 1,
      fileSchemas: [
        { schemaKey: a, headers: ['email', 'phone'] },
        { schemaKey: b, headers: ['mail', 'tel'] },
      ],
      unifiedSchema: ['Email', 'Phone'],
      mappings: [
        { schemaKey: a, mapping: { Email: 'email', Phone: 'phone' } },
        { schemaKey: b, mapping: { Email: 'mail', Phone: 'tel' } },
      ],
    }

    const res = applyTemplateToFiles(t, [
      { fileName: 'orders.xlsx', headers: ['Email', 'Phone'] },
      { fileName: 'shipments.xlsx', headers: ['Mail', 'Tel'] },
    ])

    expect(res.unifiedSchema).toEqual(['Email', 'Phone'])
    expect(res.mappings).toEqual([
      { fileName: 'orders.xlsx', mapping: { Email: 'email', Phone: 'phone' } },
      { fileName: 'shipments.xlsx', mapping: { Email: 'mail', Phone: 'tel' } },
    ])
  })

  it('upsertTemplate updates existing templates', () => {
    const base: MappingTemplateV1 = {
      version: 1,
      id: 't1',
      name: 'A',
      createdAt: 1,
      updatedAt: 1,
      fileSchemas: [{ schemaKey: 'a', headers: ['email'] }],
      unifiedSchema: ['Email'],
      mappings: [{ schemaKey: 'a', mapping: { Email: 'email' } }],
    }
    const next = { ...base, name: 'B', updatedAt: 2 }
    expect(upsertTemplate([base], next)).toEqual([next])
  })

  it('upsertTemplate appends new templates', () => {
    const base: MappingTemplateV1 = {
      version: 1,
      id: 't1',
      name: 'A',
      createdAt: 1,
      updatedAt: 1,
      fileSchemas: [{ schemaKey: 'a', headers: ['email'] }],
      unifiedSchema: ['Email'],
      mappings: [{ schemaKey: 'a', mapping: { Email: 'email' } }],
    }
    const t2 = { ...base, id: 't2' }
    expect(upsertTemplate([base], t2).map((x) => x.id)).toEqual(['t1', 't2'])
  })

  it('storage interface is compatible shape', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
    expect(typeof storage.getItem).toBe('function')
  })

  it('enforceTemplatesLimit keeps most recently used templates', () => {
    const t1: MappingTemplateV1 = {
      version: 1,
      id: 't1',
      name: 't1',
      createdAt: 1,
      updatedAt: 1,
      lastUsedAt: 10,
      useCount: 1,
      fileSchemas: [{ schemaKey: 'a', headers: ['email'] }],
      unifiedSchema: ['Email'],
      mappings: [{ schemaKey: 'a', mapping: { Email: 'email' } }],
    }
    const t2: MappingTemplateV1 = { ...t1, id: 't2', name: 't2', lastUsedAt: 20 }
    const t3: MappingTemplateV1 = { ...t1, id: 't3', name: 't3', lastUsedAt: 30 }

    const kept = enforceTemplatesLimit([t1, t2, t3], 2).map((t) => t.id)
    expect(kept).toEqual(['t3', 't2'])
  })
})
