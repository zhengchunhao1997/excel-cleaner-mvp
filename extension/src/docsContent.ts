export type DocsLanguage = 'en' | 'zh';

export type DocsSectionId =
  | 'quick_start'
  | 'privacy'
  | 'mapping'
  | 'templates'
  | 'export'
  | 'ai_cleaning'
  | 'admin'
  | 'faq';

export type DocsCard = {
  title: string;
  description?: string;
  bullets?: string[];
  steps?: { title: string; detail: string }[];
};

export type DocsSection = {
  id: DocsSectionId;
  title: string;
  subtitle?: string;
  cards: DocsCard[];
};

export type DocsContent = {
  title: string;
  sections: DocsSection[];
};

const zh: DocsContent = {
  title: '使用说明',
  sections: [
    {
      id: 'quick_start',
      title: '快速开始',
      subtitle: '4 步完成一次合并',
      cards: [
        {
          title: '流程',
          steps: [
            { title: '上传文件', detail: '拖入 .xlsx / .csv（MVP：仅第一张 Sheet）。' },
            { title: '确认表头', detail: '把“表头行”调到真正字段所在行（从 1 开始）。' },
            { title: '智能分析', detail: '生成统一字段，并在映射表里手动修正。' },
            { title: '导出结果', detail: '选择 Append 或 Join，导出一份标准表。' },
          ],
        },
      ],
    },
    {
      id: 'privacy',
      title: '隐私与数据流',
      cards: [
        {
          title: '本地优先',
          bullets: [
            '文件数据在本地读取、合并与导出。',
            '发送到服务端用于建议映射的仅包含：文件名 + 表头（headers）。',
          ],
        },
      ],
    },
    {
      id: 'export',
      title: '导出（Append / Join）',
      cards: [
        {
          title: 'Append 追加合并',
          bullets: ['纵向拼接所有行。', '导出文件：cleaned_data_append.xlsx', '包含 _source_file 标记来源文件。'],
        },
        {
          title: 'Join 按主键合并',
          bullets: [
            '横向合并为“一行一条记录”。',
            '必须选择一个主键字段（如 customer_id / phone_number）。',
            '导出文件：cleaned_data_join.xlsx',
            '包含 _source_files 标记合并来源文件。',
          ],
        },
      ],
    },
  ],
};

const en: DocsContent = {
  title: 'User Guide',
  sections: [
    {
      id: 'quick_start',
      title: 'Quick Start',
      subtitle: 'Merge in 4 steps',
      cards: [
        {
          title: 'Workflow',
          steps: [
            { title: 'Upload', detail: 'Drop .xlsx / .csv (MVP: first sheet only).' },
            { title: 'Header row', detail: 'Set “Header row” to the real header (1-based).' },
            { title: 'Analyze & Map', detail: 'Create unified fields and adjust mappings if needed.' },
            { title: 'Export', detail: 'Choose Append or Join and export a clean sheet.' },
          ],
        },
      ],
    },
    {
      id: 'privacy',
      title: 'Privacy & Data Flow',
      cards: [
        {
          title: 'Local-first',
          bullets: [
            'File contents are read, merged, and exported locally.',
            'Only file name + headers are sent to the API for mapping suggestions.',
          ],
        },
      ],
    },
    {
      id: 'export',
      title: 'Export (Append / Join)',
      cards: [
        {
          title: 'Append',
          bullets: ['Append rows into one table.', 'Output: cleaned_data_append.xlsx', 'Adds _source_file for provenance.'],
        },
        {
          title: 'Join',
          bullets: [
            'Merge by your join key into one row per entity (best-effort).',
            'You must select a join key.',
            'Output: cleaned_data_join.xlsx',
            'Adds _source_files for provenance.',
          ],
        },
      ],
    },
  ],
};

export const getDocsContent = (lang: DocsLanguage): DocsContent => (lang === 'zh' ? zh : en);

