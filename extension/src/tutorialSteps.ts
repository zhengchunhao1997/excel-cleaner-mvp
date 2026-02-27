import landing from './docs/assets/manual/01-landing.png';
import guide from './docs/assets/manual/02-guide.png';
import workspace from './docs/assets/manual/03-workspace.png';
import appendVsJoin from './docs/assets/manual/04-append-vs-join.svg';
import privacy from './docs/assets/manual/05-privacy.svg';
import workflow from './docs/assets/manual/06-workflow.svg';

export type TutorialStep = {
  title: { zh: string; en: string };
  desc: { zh: string; en: string };
  image: string;
};

export const tutorialSteps: TutorialStep[] = [
  {
    title: { zh: '它能解决什么问题？', en: 'What does it solve?' },
    desc: {
      zh: '把多份“表头不一致”的导出表快速合成一张标准表，用于分析/对账/导入系统。',
      en: 'Merge exports with inconsistent headers into one clean table for analysis, reconciliation, or import.',
    },
    image: workflow,
  },
  {
    title: { zh: '从这里开始', en: 'Start here' },
    desc: {
      zh: '进入首页后，点击“开始免费使用”进入工作区。',
      en: 'On the landing page, click “Get Started Free” to open the workspace.',
    },
    image: landing,
  },
  {
    title: { zh: '工作区长这样', en: 'Workspace overview' },
    desc: {
      zh: '左侧上传文件，右侧校正映射；选择 Append 或 Join 后导出。',
      en: 'Upload files, adjust mappings, then export via Append or Join.',
    },
    image: workspace,
  },
  {
    title: { zh: 'Append vs Join', en: 'Append vs Join' },
    desc: {
      zh: 'Append：把行纵向叠加；Join：按主键把多表横向拼到同一行。',
      en: 'Append stacks rows; Join merges by key into one row per entity.',
    },
    image: appendVsJoin,
  },
  {
    title: { zh: '隐私与安全', en: 'Privacy & security' },
    desc: {
      zh: '数据本地处理并导出；发送到服务端的仅是文件名 + 表头（headers）。',
      en: 'Data stays local for merge/export. Only file names + headers are sent for mapping suggestions.',
    },
    image: privacy,
  },
  {
    title: { zh: '随时可打开教程', en: 'Reopen anytime' },
    desc: {
      zh: '右上角“新手指南”可再次打开教程。若不想下次再弹，请点“不再显示”。',
      en: 'Use the “Guide” button to reopen. Click “Don’t show again” to disable auto-popup.',
    },
    image: guide,
  },
];

