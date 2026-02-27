import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, Trash2, ArrowRight, Download, Loader2, Edit2, Globe, Sparkles, ShieldCheck, BookOpen, X, LogOut } from 'lucide-react';
import * as XLSX from 'xlsx';
import { translations, type Language } from './i18n';
import { getClientId, submitFeedback, trackEvent } from './telemetry';
import LandingPage from './LandingPage';
import { tutorialSteps } from './tutorialSteps';
import { markTutorialShownSession, setTutorialNeverShow, shouldAutoShowTutorial } from './tutorialPrefs';
import {
  applyTemplateToFiles,
  enforceTemplatesLimit,
  findBestTemplateForFiles,
  loadTemplates,
  markTemplateUsed,
  saveTemplates,
  schemaKeyFromHeaders,
  upsertTemplate,
  type MappingTemplateV1,
} from './mappingTemplates';

const API_ORIGIN = (import.meta as any).env?.VITE_API_BASE || 'http://8.138.35.89';
const API_BASE = `${String(API_ORIGIN).replace(/\/+$/g, '')}/api`;

interface FileData {
  name: string;
  grid: any[][];
  headerRowIndex: number;
  headers: string[];
  data: any[]; 
}

interface MappingResponse {
  unifiedSchema: string[];
  mappings: {
    fileName: string;
    mapping: Record<string, string | null>;
  }[];
  transformations?: Record<string, string>;
}

type MergeMode = 'append' | 'join';

function App() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [mappingResult, setMappingResult] = useState<MappingResponse | null>(null);
  const [matchedTemplate, setMatchedTemplate] = useState<MappingTemplateV1 | null>(null);
  const [templatesCount, setTemplatesCount] = useState(0);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [editingField, setEditingField] = useState<{ unifiedField: string, fileName: string } | null>(null);
  const [mergeMode, setMergeMode] = useState<MergeMode>('join');
  const [joinKeyField, setJoinKeyField] = useState<string>('');
  const [lang, setLang] = useState<Language>(() => {
    // 自动检测语言 / Auto-detect language
    const browserLang = navigator.language.toLowerCase();
    return browserLang.startsWith('zh') ? 'zh' : 'en';
  });
  const [docsOpen, setDocsOpen] = useState(false);
  const [docsStep, setDocsStep] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackEmail, setFeedbackEmail] = useState<string>('');
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showLanding, setShowLanding] = useState(true);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [authToken, setAuthToken] = useState<string>('');
  const [authUser, setAuthUser] = useState<{ id?: string; email?: string; plan?: string; dailyAnalyzeLimit?: number } | null>(null);
  const [userUsage, setUserUsage] = useState<{ analyzeUsed: number } | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMode, setLoginMode] = useState<'code' | 'password'>('code');
  const [loginSending, setLoginSending] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpStatus, setOtpStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const t = translations[lang];
  const TEMPLATE_LIMIT = 50;

  useEffect(() => {
    try {
      if (shouldAutoShowTutorial(localStorage, sessionStorage)) {
        markTutorialShownSession(sessionStorage);
        setDocsStep(0);
        setDocsOpen(true);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    try {
      const k = 'excel_merge_pv_sent';
      if (!sessionStorage.getItem(k)) {
        sessionStorage.setItem(k, '1');
        trackEvent('page_view', { path: location.pathname });
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const cellToString = (value: unknown) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  };

  const pickHeaderRowIndex = (grid: any[][]) => {
    const maxScan = Math.min(20, grid.length);
    for (let i = 0; i < maxScan; i++) {
      const row = grid[i] || [];
      const normalized = row.map(cellToString).filter(Boolean);
      if (normalized.length < 2) continue;
      const unique = new Set(normalized.map((s) => s.toLowerCase()));
      if (unique.size < 2) continue;
      const stringy = normalized.filter((s) => isNaN(Number(s))).length;
      if (stringy / normalized.length < 0.6) continue;
      return i;
    }
    return 0;
  };

  const makeUniqueHeaders = (rawHeaders: string[]) => {
    const seen = new Map<string, number>();
    return rawHeaders.map((h, idx) => {
      const base = (h || '').trim();
      const normalized = base || `unnamed_${idx + 1}`;
      const key = normalized.toLowerCase();
      const count = (seen.get(key) ?? 0) + 1;
      seen.set(key, count);
      return count === 1 ? normalized : `${normalized}_${count}`;
    });
  };

  const buildFromGrid = (grid: any[][], headerRowIndex: number) => {
    const headerRow = (grid[headerRowIndex] || []).map(cellToString);
    const headers = makeUniqueHeaders(headerRow);
    const data: any[] = [];

    for (let r = headerRowIndex + 1; r < grid.length; r++) {
      const row = grid[r] || [];
      const obj: any = {};
      let anyValue = false;
      for (let c = 0; c < headers.length; c++) {
        const key = headers[c];
        const value = row[c] ?? '';
        obj[key] = value;
        if (!anyValue) {
          const str = cellToString(value);
          if (str) anyValue = true;
        }
      }
      if (anyValue) data.push(obj);
    }

    return { headers, data };
  };

  const pickDefaultJoinKey = (unifiedSchema: string[]) => {
    const candidates = [
      'id',
      'uuid',
      'email',
      'phone',
      'phone_number',
      'mobile',
      'serial',
      'serial_number',
      'order_id',
      'invoice_id',
      'customer_id',
      'user_id',
      'member_id',
      'account_id',
      'employee_id',
      'student_id',
      '订单号',
      '编号',
      '序列号',
      '手机号',
      '电话',
      '邮箱',
    ];
    const exact = candidates.find((c) => unifiedSchema.includes(c));
    if (exact) return exact;
    const lower = unifiedSchema.map((s) => s.toLowerCase());
    const idx = candidates
      .map((c) => c.toLowerCase())
      .map((c) => lower.indexOf(c))
      .find((i) => i >= 0);
    return idx !== undefined && idx >= 0 ? unifiedSchema[idx] : unifiedSchema[0] || '';
  };

  const normalizeJoinKey = (value: unknown, fieldName: string = '') => {
    if (value === null || value === undefined) return '';
    const str = String(value).trim();
    
    // 智能标准化逻辑
    const lowerField = fieldName.toLowerCase();
    // 1. 如果是手机号/电话相关字段，只保留数字
    if (lowerField.includes('phone') || lowerField.includes('mobile') || lowerField.includes('电话') || lowerField.includes('手机')) {
      return str.replace(/\D/g, ''); // 移除所有非数字字符，例如 138-0013-8000 -> 13800138000
    }
    
    // 2. 如果是邮箱，转小写并去除空格
    if (lowerField.includes('email') || lowerField.includes('邮箱')) {
      return str.toLowerCase();
    }

    // 3. 通用处理：去除首尾空格
    return str;
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'zh' : 'en');
    trackEvent('toggle_language', { lang: lang === 'en' ? 'zh' : 'en' });
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token') || '';
    const userStr = localStorage.getItem('auth_user');
    if (token) {
      setAuthToken(token);
      if (userStr) {
        try {
          setAuthUser(JSON.parse(userStr));
        } catch {
          localStorage.removeItem('auth_user');
        }
      }
      fetchMe(token);
    }
  }, []);

  useEffect(() => {
    if (files.length < 1) {
      setMatchedTemplate(null);
      setTemplatesCount(0);
      return;
    }
    const templates = loadTemplates(localStorage);
    setTemplatesCount(templates.length);
    const match = findBestTemplateForFiles(
      templates,
      files.map((f) => ({ fileName: f.name, headers: f.headers })),
    );
    setMatchedTemplate(match);
  }, [files]);

  const fetchMe = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuthUser(data.user);
        setUserUsage(data.usage);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      } else if (res.status === 401) {
        setAuthToken('');
        setAuthUser(null);
        setUserUsage(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    } catch (err) {
      console.error('fetchMe failed', err);
    }
  };

  useEffect(() => {
    if (!docsOpen) return;
    trackEvent('open_docs');
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDocsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [docsOpen]);

  useEffect(() => {
    if (!feedbackOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFeedbackOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [feedbackOpen]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      trackEvent('upload', { fileCount: acceptedFiles.length });
    }
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const grid = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
        if (grid.length > 0) {
          const headerRowIndex = pickHeaderRowIndex(grid);
          const built = buildFromGrid(grid, headerRowIndex);
          setFiles((prev) => [
            ...prev,
            {
              name: file.name,
              grid,
              headerRowIndex,
              headers: built.headers,
              data: built.data,
            },
          ]);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    }
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setMappingResult(null); 
  };

  const updateHeaderRowIndex = (index: number, headerRowIndex: number) => {
    setFiles((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        const nextIndex = Math.max(0, Math.min(headerRowIndex, Math.max(0, f.grid.length - 1)));
        const built = buildFromGrid(f.grid, nextIndex);
        return {
          ...f,
          headerRowIndex: nextIndex,
          headers: built.headers,
          data: built.data,
        };
      }),
    );
    setMappingResult(null);
  };

  const applyTemplate = (template: MappingTemplateV1) => {
    const now = Date.now();
    const res = applyTemplateToFiles(
      template,
      files.map((f) => ({ fileName: f.name, headers: f.headers })),
    );
    setMappingResult(res);
    setMergeMode('join');
    setJoinKeyField(pickDefaultJoinKey(res.unifiedSchema));
    const templates = loadTemplates(localStorage);
    const nextTemplate = markTemplateUsed(template, now);
    const next = enforceTemplatesLimit(upsertTemplate(templates, nextTemplate), TEMPLATE_LIMIT);
    saveTemplates(localStorage, next);
    setTemplatesCount(next.length);
    showToast(lang === 'zh' ? '已应用映射模板' : 'Template applied', 'success');
  };

  const handleAnalyze = async (forceAi: boolean = false) => {
    if (!authToken) {
      setLoginOpen(true);
      return;
    }
    if (!forceAi && matchedTemplate) {
      applyTemplate(matchedTemplate);
      trackEvent('analyze_use_template', { templateId: matchedTemplate.id, templatesCount });
      return;
    }
    setLoading(true);
    trackEvent('analyze_start', { fileCount: files.length });
    try {
      const payload = {
        files: files.map(f => ({ fileName: f.name, headers: f.headers }))
      };

      const response = await fetch(`${API_BASE}/suggest-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': getClientId(), 'authorization': `Bearer ${authToken}` },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Analysis failed');
      
      const result = await response.json();
      setMappingResult(result);
      setMergeMode('join');
      setJoinKeyField(pickDefaultJoinKey(result.unifiedSchema));
      trackEvent('analyze_success', { unifiedFields: Array.isArray(result?.unifiedSchema) ? result.unifiedSchema.length : undefined });
      
      // Refresh quota
      if (authToken) fetchMe(authToken);
    } catch (error) {
      console.error(error);
      showToast(t.errorAnalysis, 'error');
      trackEvent('analyze_failure');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = () => {
    if (!mappingResult) return;
    if (files.length < 1) return;
    const defaultName =
      lang === 'zh'
        ? `映射模板 ${new Date().toISOString().slice(0, 10)}`
        : `Mapping template ${new Date().toISOString().slice(0, 10)}`;
    setSaveTemplateName(defaultName);
    setSaveTemplateOpen(true);
  };

  const confirmSaveTemplate = () => {
    if (!mappingResult) return;
    if (files.length < 1) return;
    const name = saveTemplateName.trim();
    if (!name) return;

    const now = Date.now();
    const id = typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${now}-${Math.random().toString(16).slice(2)}`;

    const template: MappingTemplateV1 = {
      version: 1,
      id,
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
      fileSchemas: files.map((f) => ({
        schemaKey: schemaKeyFromHeaders(f.headers),
        headers: f.headers,
      })),
      unifiedSchema: mappingResult.unifiedSchema,
      mappings: files.map((f) => {
        const m = mappingResult.mappings.find((mm) => mm.fileName === f.name);
        return {
          schemaKey: schemaKeyFromHeaders(f.headers),
          mapping: m?.mapping ?? {},
        };
      }),
      transformations: mappingResult.transformations,
      lastUsedAt: now,
      useCount: 1,
    };

    const templates = loadTemplates(localStorage);
    const next = enforceTemplatesLimit(upsertTemplate(templates, template), TEMPLATE_LIMIT);
    saveTemplates(localStorage, next);
    setTemplatesCount(next.length);
    setMatchedTemplate(findBestTemplateForFiles(next, files.map((f) => ({ fileName: f.name, headers: f.headers }))));
    setSaveTemplateOpen(false);
    showToast(
      lang === 'zh'
        ? `模板已保存到本地浏览器（最多保留 ${TEMPLATE_LIMIT} 个）`
        : `Template saved locally (keeps up to ${TEMPLATE_LIMIT})`,
      'success',
    );
    trackEvent('template_saved', { templatesCount: next.length });
  };

  const sendCode = async () => {
    if (!loginEmail || otpCountdown > 0) return;
    setLoginSending(true);
    setOtpStatus(null);
    try {
      const res = await fetch(`${API_BASE}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send code');
      }
      setOtpCountdown(60);
      setOtpStatus({ type: 'success', message: lang === 'zh' ? '验证码已发送，请查收邮件' : 'Code sent, please check your email' });
    } catch (err: any) {
      setOtpStatus({ type: 'error', message: err.message });
    } finally {
      setLoginSending(false);
    }
  };

  const loginWithCode = async () => {
    if (!loginEmail || !loginCode) return;
    setLoginSending(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, code: loginCode })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'login-code failed');
      }
      const data = await res.json();
      const token = String(data?.token || '');
      const user = data?.user || null;
      if (token) {
        localStorage.setItem('auth_token', token);
        setAuthToken(token);
        if (user) {
          localStorage.setItem('auth_user', JSON.stringify(user));
          setAuthUser(user);
        }
        setLoginOpen(false);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoginSending(false);
    }
  };

  const loginWithPassword = async () => {
    if (!loginEmail || !loginPassword) return;
    setLoginSending(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'login failed');
      }
      const data = await res.json();
      const token = String(data?.token || '');
      const user = data?.user || null;
      if (token) {
        localStorage.setItem('auth_token', token);
        setAuthToken(token);
        if (user) {
          localStorage.setItem('auth_user', JSON.stringify(user));
          setAuthUser(user);
        }
        setLoginOpen(false);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoginSending(false);
    }
  };

  const handleUpdateMapping = (fileName: string, unifiedField: string, newOriginalField: string) => {
    if (!mappingResult) return;
    
    const newMappings = mappingResult.mappings.map(m => {
      if (m.fileName === fileName) {
        return {
          ...m,
          mapping: {
            ...m.mapping,
            [unifiedField]: newOriginalField === '' ? null : newOriginalField
          }
        };
      }
      return m;
    });

    setMappingResult({
      ...mappingResult,
      mappings: newMappings
    });
    setEditingField(null);
  };

  const handleAiClean = async () => {
    if (!aiPrompt.trim() || !mappingResult) return;
    setAiProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/ai-clean`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': authToken ? `Bearer ${authToken}` : '',
          'x-client-id': getClientId(),
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          mappingResult: mappingResult,
          // 发送一部分样本数据供 AI 分析，这里取每个文件的前 3 条
          sampleData: files.map(f => ({
            fileName: f.name,
            rows: f.data.slice(0, 3)
          }))
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'AI processing failed');
      }

      const result = await res.json();
      
      // 如果 AI 返回了新的映射关系
      if (result.newMappingResult) {
        setMappingResult(result.newMappingResult);
      }
      
      // 如果 AI 返回了提示信息
      if (result.message) {
        showToast(result.message);
      } else {
        showToast(lang === 'zh' ? 'AI 处理完成' : 'AI processing completed');
      }
      
      trackEvent('ai_clean_run', { prompt: aiPrompt, success: true });
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'AI failed', 'error');
      trackEvent('ai_clean_run', { prompt: aiPrompt, success: false, error: err.message });
    } finally {
      setAiProcessing(false);
    }
  };

  const applyTransformations = (row: any, mappingResult: MappingResponse) => {
    if (!mappingResult.transformations) return row;
    
    const newRow = { ...row };
    Object.entries(mappingResult.transformations).forEach(([field, logic]) => {
      // 简单的内置转换逻辑模拟
      if (field === 'operator' || logic.toLowerCase().includes('operator')) {
        const phone = String(newRow['phone_number'] || '').trim();
        if (phone) {
          if (/^1(3[4-9]|47|5[012789]|78|8[23478]|98)/.test(phone)) newRow[field] = lang === 'zh' ? '中国移动' : 'China Mobile';
          else if (/^1(3[0-2]|45|5[56]|66|7[156]|8[56])/.test(phone)) newRow[field] = lang === 'zh' ? '中国联通' : 'China Unicom';
          else if (/^1(33|49|53|7[37]|8[019]|9[19])/.test(phone)) newRow[field] = lang === 'zh' ? '中国电信' : 'China Telecom';
          else newRow[field] = lang === 'zh' ? '未知运营商' : 'Unknown';
        }
      } else if (logic.toLowerCase().includes('extract') || logic.toLowerCase().includes('format')) {
        // 其他逻辑可以根据需要添加，或者直接显示逻辑描述作为提示
        if (!newRow[field]) newRow[field] = `[AI: ${logic}]`;
      }
    });
    return newRow;
  };

  const handleExport = () => {
    if (!mappingResult) return;

    if (mergeMode === 'append') {
      trackEvent('export', { mode: 'append' });
      let mergedData: any[] = [];

      files.forEach(file => {
        const fileMapping = mappingResult.mappings.find(m => m.fileName === file.name);
        if (!fileMapping) return;

        const mappedRows = file.data.map(row => {
          const newRow: any = { _source_file: file.name };
          mappingResult.unifiedSchema.forEach(unifiedField => {
            const originalField = fileMapping.mapping[unifiedField];
            if (originalField) {
              newRow[unifiedField] = row[originalField] || '';
            } else {
              newRow[unifiedField] = '';
            }
          });
          return applyTransformations(newRow, mappingResult);
        });

        mergedData = [...mergedData, ...mappedRows];
      });

      const worksheet = XLSX.utils.json_to_sheet(mergedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Merged Data");
      XLSX.writeFile(workbook, "cleaned_data_append.xlsx");
      return;
    }

    const joinKey = joinKeyField;
    if (!joinKey) {
      showToast(t.joinKeyRequired, 'error');
      return;
    }

    trackEvent('export', { mode: 'join', key: joinKey });
    const joinIndex = new Map<string, any>();
    const missingKeyFiles: string[] = [];

    const ensureBaseRow = (key: string) => {
      const existing = joinIndex.get(key);
      if (existing) return existing;
      const row: any = { _source_files: '' };
      mappingResult.unifiedSchema.forEach((f) => {
        row[f] = '';
      });
      joinIndex.set(key, row);
      return row;
    };

    const addSourceFile = (row: any, fileName: string) => {
      const current = String(row._source_files || '').trim();
      if (!current) {
        row._source_files = fileName;
        return;
      }
      const parts = current.split(',').map((s) => s.trim()).filter(Boolean);
      if (!parts.includes(fileName)) parts.push(fileName);
      row._source_files = parts.join(',');
    };

    files.forEach((file) => {
      const fileMapping = mappingResult.mappings.find((m) => m.fileName === file.name);
      if (!fileMapping) return;

      const originalKeyField = fileMapping.mapping[joinKey];
      if (!originalKeyField) {
        missingKeyFiles.push(file.name);
        return;
      }

      file.data.forEach((rawRow) => {
        const key = normalizeJoinKey(rawRow[originalKeyField], joinKey);
        if (!key) return;

        const row = ensureBaseRow(key);
        addSourceFile(row, file.name);

        mappingResult.unifiedSchema.forEach((unifiedField) => {
          if (unifiedField === joinKey) {
            if (!row[unifiedField]) row[unifiedField] = key;
            return;
          }
          const originalField = fileMapping.mapping[unifiedField];
          if (!originalField) return;
          const value = rawRow[originalField];
          if (value === null || value === undefined) return;
          const str = String(value).trim();
          if (!str) return;
          if (!row[unifiedField]) row[unifiedField] = str;
        });
      });
    });

    if (missingKeyFiles.length > 0) {
      showToast(t.joinKeyMissingForFiles.replace('{files}', missingKeyFiles.join(', ')), 'error');
      return;
    }

    const mergedData = Array.from(joinIndex.entries()).map(([, row]) => applyTransformations(row, mappingResult));
    const worksheet = XLSX.utils.json_to_sheet(mergedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Joined Data");
    XLSX.writeFile(workbook, "cleaned_data_join.xlsx");
  };

  const joinKeyMissingFiles =
    mappingResult && mergeMode === 'join' && joinKeyField
      ? files
          .filter((f) => {
            const m = mappingResult.mappings.find((mm) => mm.fileName === f.name);
            return !m?.mapping?.[joinKeyField];
          })
          .map((f) => f.name)
      : [];

  const exportDisabled = mergeMode === 'join' ? !joinKeyField || joinKeyMissingFiles.length > 0 : false;

  const logout = () => {
    if (confirm(lang === 'zh' ? '确定要退出登录吗？' : 'Are you sure you want to log out?')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      setAuthToken('');
      setAuthUser(null);
      setUserUsage(null);
    }
  };

  const TutorialOverlay = () => {
    if (!docsOpen) return null;
    const total = tutorialSteps.length;
    const idx = Math.max(0, Math.min(total - 1, docsStep));
    const step = tutorialSteps[idx];
    return (
      <div className="fixed inset-0 z-[100]">
        <button
          type="button"
          className="absolute inset-0 bg-black/70"
          onClick={() => setDocsOpen(false)}
          aria-label="Close tutorial"
        />
        <div className="absolute inset-x-0 top-0 mx-auto mt-6 w-[min(1040px,calc(100%-2rem))] rounded-3xl border border-white/10 bg-zinc-950/95 backdrop-blur shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 bg-black/30">
            <div className="min-w-0">
              <div className="text-xs text-zinc-400">{lang === 'zh' ? '使用教程' : 'Tutorial'}</div>
              <div className="text-sm font-semibold text-zinc-100 truncate">{step.title[lang]}</div>
            </div>
            <button
              type="button"
              onClick={() => setDocsOpen(false)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 transition inline-flex items-center gap-2"
            >
              <X className="h-4 w-4 text-zinc-300" />
              {t.close}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_420px]">
            <div className="p-5 md:p-6">
              <div className="text-[13px] leading-relaxed text-zinc-200">{step.desc[lang]}</div>
              <div className="mt-4 flex items-center gap-2">
                {Array.from({ length: total }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDocsStep(i)}
                    className={[
                      'h-2.5 w-2.5 rounded-full border transition',
                      i === idx ? 'bg-amber-300/90 border-amber-300/60' : 'bg-white/5 border-white/10 hover:bg-white/10',
                    ].join(' ')}
                    aria-label={`Step ${i + 1}`}
                  />
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => setDocsStep((v) => Math.max(0, v - 1))}
                    className={[
                      'rounded-xl border px-3 py-2 text-xs transition',
                      idx === 0 ? 'border-white/10 bg-white/5 text-zinc-500 cursor-not-allowed' : 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10',
                    ].join(' ')}
                  >
                    {lang === 'zh' ? '上一步' : 'Back'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        setTutorialNeverShow(localStorage);
                      } catch {
                      }
                      setDocsOpen(false);
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 transition"
                  >
                    {lang === 'zh' ? '不再显示' : "Don't show again"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (idx >= total - 1) {
                      setDocsOpen(false);
                      return;
                    }
                    setDocsStep((v) => Math.min(total - 1, v + 1));
                  }}
                  className="rounded-2xl bg-amber-400/90 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-300 transition"
                >
                  {idx >= total - 1 ? (lang === 'zh' ? '开始使用' : 'Start') : (lang === 'zh' ? '下一步' : 'Next')}
                </button>
              </div>
            </div>
            <div className="border-t md:border-t-0 md:border-l border-white/10 bg-black/20 p-4 md:p-5">
              <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
                <img src={step.image} alt={step.title[lang]} className="w-full h-[320px] md:h-[360px] object-contain" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (showLanding) {
    return (
      <>
        <LandingPage onStart={() => setShowLanding(false)} lang={lang} setLang={setLang} />
        <TutorialOverlay />
      </>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_-10%,rgba(245,158,11,0.18),transparent_55%),radial-gradient(700px_circle_at_110%_10%,rgba(59,130,246,0.16),transparent_55%),radial-gradient(900px_circle_at_50%_110%,rgba(34,197,94,0.10),transparent_55%)]" />
      <div className="relative h-full p-4 md:p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-400/0 border border-amber-400/25 flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold tracking-tight truncate">{t.title}</h1>
                <p className="text-xs text-zinc-400 truncate">{t.subtitle}</p>
              </div>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-zinc-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              <span>Local-first</span>
              <span className="text-zinc-500">·</span>
              <span>Headers-only to AI</span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {authUser?.plan === 'admin' && authToken && (
              <button
                onClick={() => {
                  const adminUrl = `${String(API_ORIGIN).replace(/\/+$/g, '')}/admin?token=${encodeURIComponent(authToken)}`;
                  window.location.href = adminUrl;
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 transition"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                {t.adminEntry}
              </button>
            )}
            <button
              onClick={() => {
                setDocsStep(0);
                setDocsOpen(true);
              }}
              className="relative inline-flex items-center gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-xs font-medium text-amber-100 hover:bg-amber-400/15 hover:border-amber-400/35 transition shadow-[0_10px_40px_-18px_rgba(245,158,11,0.55)]"
            >
              {(() => {
                try {
                  const never = String(localStorage.getItem('tutorial_never_show') || '').trim();
                  if (never === '1' || never.toLowerCase() === 'true') return false;
                  const shown = String(sessionStorage.getItem('tutorial_shown_session') || '').trim();
                  return !(shown === '1' || shown.toLowerCase() === 'true');
                } catch {
                  return false;
                }
              })() && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300/80 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-300" />
                </span>
              )}
              <BookOpen className="h-4 w-4 text-zinc-300" />
              {t.docs}
            </button>
            <button
              onClick={() => setFeedbackOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 transition"
            >
              <Edit2 className="h-4 w-4 text-zinc-300" />
              {t.feedback}
            </button>
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 transition"
            >
              <Globe className="h-4 w-4 text-zinc-300" />
              {t.language}
            </button>

            {authToken && authUser && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span className="text-zinc-400">{t.quotaLabel}:</span>
                  <span className="font-medium text-zinc-100">
                    {authUser.plan === 'admin' ? '∞' : `${Math.max(0, (authUser.dailyAnalyzeLimit || 20) - (userUsage?.analyzeUsed || 0))}`}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition"
                  title={lang === 'zh' ? '退出登录' : 'Logout'}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </header>

        <TutorialOverlay />

        {saveTemplateOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/70"
              onClick={() => setSaveTemplateOpen(false)}
              aria-label="Close template"
            />
            <div className="relative w-full max-w-[520px] rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-black/30">
                <div className="text-sm font-semibold text-zinc-100">
                  {lang === 'zh' ? '保存映射模板' : 'Save mapping template'}
                </div>
                <button
                  type="button"
                  onClick={() => setSaveTemplateOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form
                className="p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  confirmSaveTemplate();
                }}
              >
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-zinc-300">
                    {lang === 'zh' ? '模板名称' : 'Template name'}
                  </div>
                  <input
                    value={saveTemplateName}
                    onChange={(e) => setSaveTemplateName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
                    autoFocus
                    placeholder={lang === 'zh' ? '例如：订单表 + 发货表 Join' : 'e.g. Orders + Shipments Join'}
                  />
                  <div className="mt-2 text-[11px] text-zinc-500">
                    {lang === 'zh'
                      ? `模板保存在本地浏览器（最多保留 ${TEMPLATE_LIMIT} 个，按最近使用自动清理）`
                      : `Stored locally (keeps up to ${TEMPLATE_LIMIT}, auto-cleans by recency)`}
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSaveTemplateOpen(false)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 transition"
                    >
                      {t.close}
                    </button>
                    <button
                      type="submit"
                      disabled={!saveTemplateName.trim()}
                      className={[
                        'rounded-2xl px-4 py-3 text-sm font-medium flex items-center gap-2 transition',
                        !saveTemplateName.trim()
                          ? 'bg-white/5 border border-white/10 text-zinc-500 cursor-not-allowed'
                          : 'bg-emerald-400 text-zinc-950 hover:bg-emerald-300 shadow-[0_10px_40px_-18px_rgba(52,211,153,0.6)]',
                      ].join(' ')}
                    >
                      {lang === 'zh' ? '保存' : 'Save'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {feedbackOpen && (
          <div className="absolute inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0 bg-black/70"
              onClick={() => setFeedbackOpen(false)}
              aria-label="Close feedback"
            />
            <div className="absolute inset-x-0 top-0 mx-auto mt-4 w-[min(720px,calc(100%-2rem))] rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-black/30">
                <div className="text-sm font-semibold text-zinc-100">{t.feedbackTitle}</div>
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 transition inline-flex items-center gap-2"
                >
                  <X className="h-4 w-4 text-zinc-300" />
                  {t.close}
                </button>
              </div>

              <div className="p-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-zinc-300">{t.ratingLabel}</div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setFeedbackRating(n)}
                          className={[
                            'h-9 w-9 rounded-xl border text-xs font-semibold transition',
                            feedbackRating >= n
                              ? 'border-amber-400/40 bg-amber-400/20 text-amber-200'
                              : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10',
                          ].join(' ')}
                          aria-label={`Rate ${n}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs text-zinc-300">{t.emailOptional}</div>
                    <input
                      value={feedbackEmail}
                      onChange={(e) => setFeedbackEmail(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div className="mt-3">
                    <div className="text-xs text-zinc-300">{t.commentLabel}</div>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      rows={6}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 resize-y"
                      placeholder={lang === 'zh' ? '例如：Join 冲突策略需要支持覆盖/聚合；支持多行表头合并；支持多 sheet...' : 'e.g. Join conflict policy; multi-row headers; multi-sheet support...'}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-[11px] text-zinc-500">{`${String(API_ORIGIN).replace(/\/+$/g, '')}/admin`}</div>
                    <button
                      type="button"
                      disabled={feedbackSubmitting || !feedbackComment.trim()}
                      onClick={async () => {
                        setFeedbackSubmitting(true);
                        try {
                          await submitFeedback(feedbackRating, feedbackComment.trim(), feedbackEmail.trim() || undefined);
                          trackEvent('feedback_submit', { rating: feedbackRating });
                          setFeedbackComment('');
                          setFeedbackEmail('');
                          showToast(t.feedbackThanks);
                          setFeedbackOpen(false);
                        } catch (e) {
                          showToast(e instanceof Error ? e.message : 'Failed', 'error');
                        } finally {
                          setFeedbackSubmitting(false);
                        }
                      }}
                      className={[
                        'shrink-0 rounded-2xl px-4 py-3 text-sm font-medium flex items-center gap-2 transition',
                        feedbackSubmitting || !feedbackComment.trim()
                          ? 'bg-white/5 border border-white/10 text-zinc-500 cursor-not-allowed'
                          : 'bg-emerald-400 text-zinc-950 hover:bg-emerald-300 shadow-[0_10px_40px_-18px_rgba(52,211,153,0.6)]',
                      ].join(' ')}
                    >
                      {feedbackSubmitting ? t.submitting : t.submit}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {loginOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/70"
              onClick={() => setLoginOpen(false)}
              aria-label="Close login"
            />
            <div className="relative w-full max-w-[420px] rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-black/30">
                <div className="text-sm font-semibold text-zinc-100">{t.loginTitle}</div>
                <button
                  type="button"
                  onClick={() => setLoginOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex p-1 rounded-xl bg-black/40 border border-white/10">
                  <button
                    onClick={() => setLoginMode('code')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${loginMode === 'code' ? 'bg-white/10 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {t.loginWithCode}
                  </button>
                  <button
                    onClick={() => setLoginMode('password')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${loginMode === 'password' ? 'bg-white/10 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {t.loginWithPassword}
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-zinc-300 mb-2">{t.emailLabel}</div>
                    <input
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
                      placeholder="you@example.com"
                    />
                  </div>

                  {loginMode === 'code' ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <input
                          value={loginCode}
                          onChange={(e) => setLoginCode(e.target.value)}
                          className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
                          placeholder={t.codeLabel}
                        />
                        <button
                          type="button"
                          onClick={sendCode}
                          disabled={loginSending || !loginEmail || otpCountdown > 0}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 transition disabled:opacity-50 min-w-[100px] justify-center"
                        >
                          {otpCountdown > 0 ? `${otpCountdown}s` : t.sendCode}
                        </button>
                      </div>
                      
                      {otpStatus && (
                        <div className={`text-[11px] ${otpStatus.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {otpStatus.message}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={loginWithCode}
                        disabled={loginSending || !loginEmail || !loginCode}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400 bg-amber-400 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-300 transition disabled:opacity-50 shadow-[0_10px_40px_-18px_rgba(245,158,11,0.5)]"
                      >
                        {loginSending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.loginButton}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-zinc-300 mb-2">{t.passwordLabel}</div>
                        <input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
                          placeholder="••••••••"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={loginWithPassword}
                        disabled={loginSending || !loginEmail || !loginPassword}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400 bg-amber-400 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-300 transition disabled:opacity-50 shadow-[0_10px_40px_-18px_rgba(245,158,11,0.5)]"
                      >
                        {loginSending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.loginButton}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="mt-6 h-[calc(100%-84px)] grid grid-cols-1 lg:grid-cols-12 gap-4">
          <section className="lg:col-span-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <div className="h-6 w-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <Upload className="h-3.5 w-3.5 text-zinc-200" />
                  </div>
                  <span className="font-medium">{t.step1Title}</span>
                </div>
                <p className="mt-2 text-xs text-zinc-400">{t.step1Desc}</p>
              </div>
            </div>

            <div className="mt-4">
              {!mappingResult && (
                <div
                  {...getRootProps()}
                  className={[
                    'group relative rounded-2xl border border-dashed p-6 md:p-8 cursor-pointer transition',
                    isDragActive ? 'border-amber-400/60 bg-amber-400/10' : 'border-white/15 bg-black/20 hover:border-white/25 hover:bg-black/30',
                  ].join(' ')}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Upload className={['h-6 w-6 transition', isDragActive ? 'text-amber-300' : 'text-zinc-200 group-hover:text-amber-200'].join(' ')} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{isDragActive ? t.dropActive : t.dropIdle}</p>
                      <p className="mt-1 text-xs text-zinc-400">{t.dropHint}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4">
                {files.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="text-sm font-medium text-zinc-100">{t.emptyTitle}</p>
                    <p className="mt-1 text-xs text-zinc-400">{t.emptyDesc}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-zinc-400">{t.uploadedFiles} <span className="text-zinc-200 font-medium">({files.length})</span></div>
                      <div className="text-[11px] text-zinc-500">{files.length >= 1 ? t.statusReady : t.statusNeedFile}</div>
                    </div>
                    <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                      {files.map((file, index) => (
                        <div key={index} className="group rounded-xl border border-white/10 bg-black/20 p-3 hover:bg-black/30 transition">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-zinc-100 truncate">{file.name}</div>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[11px] text-zinc-500">{t.headerRowLabel}</span>
                                <select
                                  className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-zinc-100 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/15"
                                  value={file.headerRowIndex + 1}
                                  onChange={(e) => updateHeaderRowIndex(index, Number(e.target.value) - 1)}
                                >
                                  {Array.from({ length: Math.min(20, file.grid.length) }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                      {i + 1}
                                    </option>
                                  ))}
                                </select>
                                <span className="text-[11px] text-zinc-600">{t.headerRowHint}</span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {file.headers.slice(0, 6).map((header, hIndex) => (
                                  <span
                                    key={hIndex}
                                    className="px-2 py-0.5 rounded-full text-[10px] border border-white/10 bg-white/5 text-zinc-200"
                                  >
                                    {header}
                                  </span>
                                ))}
                                {file.headers.length > 6 && (
                                  <span className="px-2 py-0.5 text-[10px] text-zinc-400">+{file.headers.length - 6}</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              className="opacity-0 group-hover:opacity-100 transition text-zinc-500 hover:text-rose-300"
                              aria-label="Remove file"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!mappingResult && (
                <div className="mt-4 space-y-2">
                  {matchedTemplate && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-zinc-200">
                      <div className="font-medium text-zinc-100 truncate">
                        {(lang === 'zh' ? '发现模板' : 'Template found') + ': ' + matchedTemplate.name}
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-400">
                        {lang === 'zh' ? '可直接套用，无需再次分析' : 'Apply it to skip AI analyze'}
                      </div>
                    </div>
                  )}

                  <div className={matchedTemplate ? 'grid grid-cols-2 gap-2' : ''}>
                    <button
                      onClick={() => handleAnalyze()}
                      disabled={files.length < 1 || loading}
                      className={[
                        'w-full rounded-2xl px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition',
                        files.length < 1 || loading
                          ? 'bg-white/5 border border-white/10 text-zinc-500 cursor-not-allowed'
                          : 'bg-amber-400 text-zinc-950 hover:bg-amber-300 shadow-[0_10px_40px_-18px_rgba(245,158,11,0.7)]',
                      ].join(' ')}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t.analyzing}
                        </>
                      ) : matchedTemplate ? (
                        <>
                          <BookOpen className="h-4 w-4" />
                          {lang === 'zh' ? '应用模板' : 'Apply template'}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          {t.analyzeBtn}
                        </>
                      )}
                    </button>

                    {matchedTemplate && (
                      <button
                        onClick={() => handleAnalyze(true)}
                        disabled={files.length < 1 || loading}
                        className={[
                          'w-full rounded-2xl px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition',
                          files.length < 1 || loading
                            ? 'bg-white/5 border border-white/10 text-zinc-500 cursor-not-allowed'
                            : 'bg-white/5 border border-white/10 text-zinc-200 hover:bg-white/10',
                        ].join(' ')}
                      >
                        <Sparkles className="h-4 w-4" />
                        {lang === 'zh' ? '重新分析' : 'Analyze'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <div className="h-6 w-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <Edit2 className="h-3.5 w-3.5 text-zinc-200" />
                  </div>
                  <span className="font-medium">{t.step2Title}</span>
                </div>
                <p className="mt-2 text-xs text-zinc-400">{t.step2Desc}</p>
              </div>

              {mappingResult && (
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={handleSaveTemplate}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 transition"
                  >
                    {lang === 'zh' ? '保存模板' : 'Save template'}
                  </button>
                  <button
                    onClick={() => setMappingResult(null)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 transition"
                  >
                    {t.reset}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 h-[calc(100%-92px)] flex flex-col min-h-0">
              <div className="flex-1 min-h-0">
                {!mappingResult ? (
                  <div className="h-full rounded-2xl border border-white/10 bg-black/20 p-6 flex items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <ArrowRight className="h-5 w-5 text-zinc-300" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-zinc-100">{t.mappingTitle}</p>
                      <p className="mt-1 text-xs text-zinc-400">{t.step2Desc}</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30">
                      <div className="text-sm font-semibold text-zinc-100">{t.mappingTitle}</div>
                      <div className="text-xs text-zinc-400">{t.editTip}</div>
                    </div>

                    <div className="h-[calc(100%-52px)] overflow-auto">
                      <table className="min-w-full text-xs">
                        <thead className="sticky top-0 z-20 bg-black/60 backdrop-blur text-zinc-300">
                          <tr className="border-b border-white/10">
                            <th className="text-left px-4 py-3 sticky left-0 z-30 bg-black/60 backdrop-blur border-r border-white/10">{t.unifiedField}</th>
                            {mappingResult.mappings.map((m) => (
                              <th key={m.fileName} className="text-left px-4 py-3 max-w-[220px] truncate" title={m.fileName}>
                                {m.fileName}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {mappingResult.unifiedSchema.map((field) => (
                            <tr key={field} className="hover:bg-white/5 transition">
                              <td className="px-4 py-3 font-medium text-zinc-100 sticky left-0 z-10 bg-black/40 border-r border-white/10">
                                {field}
                              </td>
                              {mappingResult.mappings.map((m) => {
                                const isEditing = editingField?.unifiedField === field && editingField?.fileName === m.fileName;
                                const originalValue = m.mapping[field] || '';
                                const fileData = files.find((f) => f.name === m.fileName);

                                return (
                                  <td key={m.fileName} className="px-3 py-2">
                                    {isEditing ? (
                                      <select
                                        className="w-full rounded-xl border border-amber-400/30 bg-black/50 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
                                        value={originalValue}
                                        onChange={(e) => handleUpdateMapping(m.fileName, field, e.target.value)}
                                        autoFocus
                                        onBlur={() => setEditingField(null)}
                                      >
                                        <option value="">{t.unmapped}</option>
                                        {fileData?.headers.map((h) => (
                                          <option key={h} value={h}>
                                            {h}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setEditingField({ unifiedField: field, fileName: m.fileName })}
                                        className="w-full text-left rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 flex items-center justify-between gap-3 transition"
                                      >
                                        <span className={originalValue ? 'text-zinc-100 truncate' : 'text-zinc-500'}>
                                          {originalValue || t.unmapped}
                                        </span>
                                        <Edit2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                      </button>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {mappingResult && (
                <div className="pt-4 border-t border-white/10 mt-4 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      <span className="text-xs font-medium text-zinc-300">{t.aiCleaningLabel}</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder={t.aiCleaningPlaceholder}
                        className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
                      />
                      <button
                        onClick={handleAiClean}
                        disabled={aiProcessing || !aiPrompt.trim()}
                        className="shrink-0 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10 transition disabled:opacity-50"
                      >
                        {aiProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.aiCleaningRun}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 shrink-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 p-1">
                          <button
                            type="button"
                            onClick={() => setMergeMode('join')}
                            className={[
                              'px-3 py-1.5 rounded-lg text-xs font-medium transition',
                              mergeMode === 'join' ? 'bg-amber-400 text-zinc-950' : 'text-zinc-300 hover:bg-white/5',
                            ].join(' ')}
                          >
                            {t.modeJoin}
                          </button>
                          <button
                            type="button"
                            onClick={() => setMergeMode('append')}
                            className={[
                              'px-3 py-1.5 rounded-lg text-xs font-medium transition',
                              mergeMode === 'append' ? 'bg-amber-400 text-zinc-950' : 'text-zinc-300 hover:bg-white/5',
                            ].join(' ')}
                          >
                            {t.modeAppend}
                          </button>
                        </div>

                        {mergeMode === 'join' && mappingResult && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400">{t.joinKeyLabel}</span>
                            <select
                              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
                              value={joinKeyField}
                              onChange={(e) => setJoinKeyField(e.target.value)}
                            >
                              {mappingResult.unifiedSchema.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="mt-2 text-xs text-zinc-400">
                        {mergeMode === 'append' ? t.exportHintAppend : t.exportHintJoin}
                        {mergeMode === 'join' && joinKeyMissingFiles.length > 0 && (
                          <span className="ml-2 text-rose-300">
                            {t.joinKeyMissingForFiles.replace('{files}', joinKeyMissingFiles.join(', '))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleExport}
                    disabled={exportDisabled}
                    className={[
                      'shrink-0 rounded-2xl px-4 py-3 text-sm font-medium flex items-center gap-2 transition',
                      exportDisabled
                        ? 'bg-white/5 border border-white/10 text-zinc-500 cursor-not-allowed'
                        : 'bg-emerald-400 text-zinc-950 hover:bg-emerald-300 shadow-[0_10px_40px_-18px_rgba(52,211,153,0.6)]',
                    ].join(' ')}
                  >
                    <Download className="h-4 w-4" />
                    {t.exportBtn}
                  </button>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
      {toast && (
        <div className="fixed inset-x-0 bottom-10 z-[100] flex justify-center px-4 pointer-events-none">
          <div className={`flex max-w-2xl items-start gap-3 rounded-2xl border px-5 py-4 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto ${
            toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' :
            'bg-blue-500/10 border-blue-500/20 text-blue-300'
          }`}>
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' ? <ShieldCheck className="h-5 w-5" /> : 
               toast.type === 'error' ? <X className="h-5 w-5" /> : 
               <Sparkles className="h-5 w-5" />}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium leading-relaxed break-words">{toast.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
