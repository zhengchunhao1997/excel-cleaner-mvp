import React from 'react';
import bgImage from './assets/gw.png';
import { 
  FileSpreadsheet, 
  Sparkles, 
  Layers, 
  Zap, 
  ShieldCheck, 
  ArrowRight,
  Globe
} from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  lang: 'en' | 'zh';
  setLang: (lang: 'en' | 'zh') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, lang, setLang }) => {
  const isZh = lang === 'zh';

  const content = {
    zh: {
      title: "让混乱的表格，瞬间归于统一",
      subtitle: "execelMerge 是一款专为数据分析师和行政财务设计的智能表格清洗工具。通过 DeepSeek AI 技术，自动识别跨语言、跨格式的异构表头，一键完成数据纵向追加或横向关联。",
      startBtn: "开始免费使用",
      features: [
        {
          title: "智能表头映射",
          desc: "AI 自动识别语义。无论你的表头是 '手机号'、'Mobile' 还是 'Phone'，我们都能自动将其映射到统一字段。",
          icon: <Sparkles className="h-6 w-6 text-amber-400" />,
        },
        {
          title: "复杂数据关联",
          desc: "支持 '追加合并' 与 '按主键合并'。自动处理主键冲突与多表关联，让异构数据无缝对接。",
          icon: <Layers className="h-6 w-6 text-blue-400" />,
        },
        {
          title: "AI 数据清洗",
          desc: "只需一句指令，AI 即可完成运营商识别、格式标准化、敏感信息提取等复杂清洗任务。",
          icon: <Zap className="h-6 w-6 text-emerald-400" />,
        },
        {
          title: "隐私安全保证",
          desc: "数据本地处理，仅发送表头信息给 AI。我们尊重您的隐私，绝不上传原始业务数据。",
          icon: <ShieldCheck className="h-6 w-6 text-indigo-400" />,
        }
      ],
      steps: [
        { title: "上传文件", desc: "拖入多个异构 Excel/CSV 文件" },
        { title: "AI 分析", desc: "AI 自动生成统一映射模型" },
        { title: "指令清洗", desc: "通过对话完成深层数据处理" },
        { title: "导出结果", desc: "一键获取标准化的干净数据" }
      ]
    },
    en: {
      title: "Unify Messy Sheets in Seconds",
      subtitle: "execelMerge is an AI-powered table cleaning tool designed for data analysts. Powered by DeepSeek, it automatically recognizes cross-language, heterogeneous headers and completes data union or join with one click.",
      startBtn: "Get Started Free",
      features: [
        {
          title: "Smart Schema Mapping",
          desc: "AI-driven semantic recognition. Whether your header is 'Phone', 'Mobile', or '手机号', we map them to a unified field automatically.",
          icon: <Sparkles className="h-6 w-6 text-amber-400" />,
        },
        {
          title: "Complex Data Join",
          desc: "Supports 'Append' and 'Join' modes. Automatically handles key conflicts and multi-table associations for seamless data integration.",
          icon: <Layers className="h-6 w-6 text-blue-400" />,
        },
        {
          title: "AI Data Cleaning",
          desc: "One prompt is all you need. AI handles operator recognition, formatting, and data extraction tasks effortlessly.",
          icon: <Zap className="h-6 w-6 text-emerald-400" />,
        },
        {
          title: "Privacy First",
          desc: "Local-first processing. Only headers are sent to AI. We respect your privacy and never upload your raw business data.",
          icon: <ShieldCheck className="h-6 w-6 text-indigo-400" />,
        }
      ],
      steps: [
        { title: "Upload", desc: "Drop multiple heterogeneous files" },
        { title: "AI Analysis", desc: "AI generates unified mapping" },
        { title: "Clean with Prompt", desc: "Perform deep cleaning via instruction" },
        { title: "Export", desc: "Get standardized clean data instantly" }
      ]
    }
  };

  const c = content[lang];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-amber-400/30 relative overflow-hidden">
      {/* Background image and gradients */}
      <div className="fixed inset-0 z-0">
         <img 
           src={bgImage} 
           alt="Background" 
           className="w-full h-full object-cover opacity-30"
         />
         <div className="absolute inset-0 bg-zinc-950/40" />
         <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/60 to-zinc-950" />
         <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_-10%,rgba(245,158,11,0.15),transparent_55%),radial-gradient(700px_circle_at_110%_10%,rgba(59,130,246,0.12),transparent_55%)]" />
       </div>

      {/* Nav */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-2 shadow-lg shadow-amber-500/20">
            <FileSpreadsheet className="h-full w-full text-zinc-950" />
          </div>
          <span className="text-xl font-bold tracking-tight">execelMerge</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLang(isZh ? 'en' : 'zh')}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
          >
            <Globe className="h-4 w-4" />
            {isZh ? "English" : "中文"}
          </button>
          <button 
            onClick={onStart}
            className="rounded-xl bg-zinc-50 px-5 py-2 text-sm font-bold text-zinc-950 transition hover:bg-zinc-200"
          >
            {c.startBtn}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 pt-20 pb-32">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/5 px-4 py-1.5 text-xs font-medium text-amber-400 mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Powered by DeepSeek AI</span>
          </div>
          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight md:text-7xl leading-tight">
            {c.title.split(',').map((part, i) => (
              <React.Fragment key={i}>
                {i === 1 ? <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">{part}</span> : part}
                {i === 0 && ","}
              </React.Fragment>
            ))}
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-zinc-400 leading-relaxed">
            {c.subtitle}
          </p>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button 
              onClick={onStart}
              className="group relative inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-10 text-lg font-bold text-zinc-950 transition-all hover:bg-amber-300 hover:shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)] active:scale-95"
            >
              {c.startBtn}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Product Demo Screenshot */}
          <div className="mt-24 relative mx-auto max-w-5xl rounded-3xl border border-white/10 bg-zinc-900/50 p-2 backdrop-blur-xl shadow-2xl">
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-zinc-950/50 aspect-[16/9] flex items-center justify-center relative group">
              <img 
                src={bgImage} 
                alt="Product Demo"
                className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/40 via-transparent to-transparent opacity-60" />
            </div>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="relative z-10 border-y border-white/5 bg-zinc-900/20 py-32 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
            {c.features.map((f, i) => (
              <div key={i} className="group flex flex-col gap-4 rounded-3xl border border-white/5 bg-white/[0.02] p-8 transition hover:bg-white/[0.05] hover:border-white/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="relative z-10 py-32">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold mb-20">{isZh ? "使用流程" : "How it works"}</h2>
          <div className="relative">
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 -translate-y-1/2 hidden lg:block" />
            <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
              {c.steps.map((s, i) => (
                <div key={i} className="relative z-10 flex flex-col items-center text-center group">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-zinc-900 text-2xl font-black text-amber-400 shadow-xl group-hover:scale-110 group-hover:border-amber-400/50 transition">
                    {i + 1}
                  </div>
                  <h4 className="mb-2 text-lg font-bold">{s.title}</h4>
                  <p className="text-sm text-zinc-500">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 pb-32">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[3rem] bg-gradient-to-br from-amber-400 to-amber-600 p-1">
          <div className="flex flex-col items-center justify-center rounded-[2.9rem] bg-zinc-950 py-20 px-10 text-center">
            <h2 className="text-3xl font-bold md:text-5xl">{isZh ? "准备好提升效率了吗？" : "Ready to boost your efficiency?"}</h2>
            <p className="mt-6 text-lg text-zinc-400">{isZh ? "无需注册，立即体验 AI 智能表格合并" : "No registration required. Try AI smart merging now."}</p>
            <button 
              onClick={onStart}
              className="mt-10 rounded-2xl bg-zinc-50 px-12 py-4 text-lg font-black text-zinc-950 transition hover:bg-zinc-200 active:scale-95 shadow-2xl shadow-white/10"
            >
              {c.startBtn}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-zinc-500">
            <FileSpreadsheet className="h-5 w-5" />
            <span className="text-sm font-medium">© 2026 execelMerge. Built for Data Efficiency.</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-zinc-500">
            <a href="#" className="hover:text-zinc-300 transition">Privacy</a>
            <a href="#" className="hover:text-zinc-300 transition">Terms</a>
            <a href="#" className="hover:text-zinc-300 transition">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
