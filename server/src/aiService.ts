import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
const openai = deepseekApiKey
  ? new OpenAI({
      apiKey: deepseekApiKey,
      baseURL: 'https://api.deepseek.com',
    })
  : null;

export interface MappingRequest {
  files: {
    fileName: string;
    headers: string[];
  }[];
}

export interface MappingResponse {
  unifiedSchema: string[];
  mappings: {
    fileName: string;
    mapping: Record<string, string | null>;
  }[];
  transformations?: Record<string, string>; // 新增：字段转换逻辑，例如 {"operator": "if (phone.startsWith('134')) return '移动'"}
}

export interface AiCleanRequest {
  prompt: string;
  mappingResult: MappingResponse;
  sampleData: {
    fileName: string;
    rows: any[];
  }[];
}

export interface AiCleanResponse {
  newMappingResult?: MappingResponse;
  message?: string;
}

const canonicalizeHeader = (header: string): string | null => {
  const raw = String(header ?? '').trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();

  const rules: Array<{ match: (s: string) => boolean; field: string }> = [
    { match: (s) => s.includes('customer id') || (s.includes('客户') && s.includes('编号')) || s === 'customer_id', field: 'customer_id' },
    { match: (s) => s.includes('order no') || s.includes('order number') || (s.includes('订单') && s.includes('号')), field: 'order_id' },
    { match: (s) => s.includes('serial') || (s.includes('序列') && s.includes('号')), field: 'serial_number' },
    { match: (s) => s.includes('email') || s.includes('邮箱'), field: 'email' },
    { match: (s) => s.includes('phone') || s.includes('mobile') || s.includes('手机号') || s.includes('电话'), field: 'phone_number' },
    { match: (s) => s === 'name' || s.includes(' full name') || s.includes('姓名'), field: 'name' },
    { match: (s) => s.includes('city') || s.includes('城市'), field: 'city' },
    { match: (s) => s.includes('date') || s.includes('日期') || s.includes('时间'), field: 'date' },
    { match: (s) => s.includes('amount') || s.includes('total') || s.includes('金额') || s.includes('总额'), field: 'amount' },
    { match: (s) => s.includes('invoice') && (s.includes('id') || s.includes('no') || s.includes('number')) || s.includes('发票'), field: 'invoice_id' },
  ];

  for (const rule of rules) {
    if (rule.match(lower)) return rule.field;
  }

  const cleaned = lower
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');

  if (!cleaned) return null;
  if (cleaned.startsWith('unnamed') || cleaned === 'col' || cleaned === 'column') return null;

  return cleaned;
};

const generateMappingFallback = (request: MappingRequest): MappingResponse => {
  const perFileCanonical = request.files.map((f) => {
    const map = new Map<string, string>();
    for (const h of f.headers || []) {
      const canonical = canonicalizeHeader(h);
      if (!canonical) continue;
      if (!map.has(canonical)) map.set(canonical, h);
    }
    return { fileName: f.fileName, map };
  });

  const counts = new Map<string, number>();
  for (const f of perFileCanonical) {
    for (const key of f.map.keys()) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const unifiedSchema = Array.from(counts.entries())
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .map(([k]) => k);

  const mappings = perFileCanonical.map((f) => {
    const mapping: Record<string, string | null> = {};
    for (const field of unifiedSchema) {
      mapping[field] = f.map.get(field) ?? null;
    }
    return { fileName: f.fileName, mapping };
  });

  return { unifiedSchema, mappings };
};

export const generateMapping = async (request: MappingRequest): Promise<MappingResponse> => {
  if (!openai) {
    return generateMappingFallback(request);
  }

  const prompt = `
    You are an expert Data Engineer. I have multiple Excel files with different headers but they contain similar data.
    Your task is to:
    1. Analyze the headers from all files, including potential cross-language (English/Chinese) and semantic equivalents.
    2. Propose a "Unified Schema" (a standard set of headers) that covers the most important information.
    3. Map each file's original headers to this Unified Schema.
    
    Input Files:
    ${JSON.stringify(request.files, null, 2)}
    
    Requirements:
    - The unified schema should use snake_case (e.g., "phone_number", "client_name").
    - Use semantic matching: e.g., "Order_Ref" (English) and "订单编号" (Chinese) should map to the same unified field "order_id".
    - "Customer Email" and "邮箱" should map to "email".
    - "Amount_Gross" and "支付金额" should map to "amount".
    - "Phone_Number" and "客户手机" should map to "phone_number".
    - Only map fields that are semantically equivalent.
    - If a field in the unified schema doesn't exist in a file, map it to null.
    - Ignore irrelevant or junk columns (like "Generated At", "Report Date", "Owner").
    
    Output strictly in this JSON format (no markdown, no code blocks):
    {
      "unifiedSchema": ["field1", "field2"],
      "mappings": [
        {
          "fileName": "file1.xlsx",
          "mapping": {
            "field1": "Original Header A",
            "field2": null
          }
        }
      ]
    }
  `;

  try {
    const model = 'deepseek-chat';
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a helpful data mapping assistant. You always output valid JSON.' },
        { role: 'user', content: prompt }
      ],
      model: model,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content from OpenAI');
    }

    // 验证是否包含必要的字段，防止 AI 返回空结构
    const result = JSON.parse(content) as MappingResponse;
    if (!result.unifiedSchema || !Array.isArray(result.unifiedSchema) || result.unifiedSchema.length === 0) {
      console.warn('AI returned empty unifiedSchema, falling back to rule-based mapping');
      return generateMappingFallback(request);
    }

    return result;
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    // 打印更详细的错误信息
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if ('response' in error) {
        console.error('Error response:', (error as any).response?.data || (error as any).response);
      }
    }
    return generateMappingFallback(request);
  }
};

export const generateAiClean = async (request: AiCleanRequest): Promise<AiCleanResponse> => {
  if (!openai) {
    return { message: "AI service not available (no API key)" };
  }

  const prompt = `
    You are an expert Data Engineer. I have a data mapping result and some sample data.
    The user wants to perform additional cleaning or modification based on this prompt: "${request.prompt}"
    
    Current Mapping Result:
    ${JSON.stringify(request.mappingResult, null, 2)}
    
    Sample Data (first 3 rows):
    ${JSON.stringify(request.sampleData, null, 2)}
    
    Your task:
    1. Determine if the "unifiedSchema" or "mappings" need to be updated.
    2. If the user wants to ADD a new derived field (e.g., "Extract operator from phone"), add it to "unifiedSchema".
    3. For derived fields, you MUST provide a "transformations" object where the key is the unified field name and the value is a brief, executable-like pseudo-code or description of how to derive it.
       Example: {"operator": "Identify operator (China Mobile/Unicom/Telecom) from phone_number field"}
    4. If you update the schema, provide the FULL updated "newMappingResult".
    5. Provide a "message" field in Chinese (max 100 chars) explaining what you did.
    
    IMPORTANT: 
    - Keep the "message" concise and user-friendly.
    - If adding a new field, ensure its key in "mappings" is set to null (since it's derived, not from an original column).
    
    Output strictly in this JSON format:
    {
      "newMappingResult": { 
        "unifiedSchema": [...],
        "mappings": [...],
        "transformations": { "field": "logic description" }
      },
      "message": "已为您添加'运营商'识别列，将基于手机号段自动填充。"
    }
  `;

  try {
    const model = 'deepseek-chat';
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a helpful data cleaning assistant. You always output valid JSON.' },
        { role: 'user', content: prompt }
      ],
      model: model,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('No content from OpenAI');

    return JSON.parse(content) as AiCleanResponse;
  } catch (error) {
    console.error('Error calling DeepSeek API for cleaning:', error);
    return { message: "AI cleaning failed due to an error." };
  }
};
