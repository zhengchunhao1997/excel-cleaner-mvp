import { Request, Response } from 'express';

export const serveAdminPage = (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>execelMerge - 后台</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background: #09090b; color: #e4e4e7; }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 20px; }
    .card { border: 1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.04); border-radius: 16px; padding: 14px; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    .h { font-size: 14px; font-weight: 700; margin: 0 0 10px; }
    select, input { background: rgba(0,0,0,.35); border: 1px solid rgba(255,255,255,.12); color: #e4e4e7; border-radius: 10px; padding: 8px 10px; }
    button { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); color: #e4e4e7; border-radius: 12px; padding: 8px 12px; cursor: pointer; transition: all 0.2s; }
    button:hover { background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.2); }
    button.tab.active { background: rgba(245,158,11,.22); border-color: rgba(245,158,11,.45); color: #fde68a; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid rgba(255,255,255,.10); padding: 8px 10px; text-align: left; }
    th { color: rgba(228,228,231,.85); position: sticky; top: 0; background: rgba(0,0,0,.45); backdrop-filter: blur(8px); }
    .muted { color: rgba(228,228,231,.65); font-size: 12px; }
    .kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 10px; }
    @media (max-width: 900px) { .kpi { grid-template-columns: repeat(2, 1fr); } }
    .k { border: 1px solid rgba(255,255,255,.10); background: rgba(0,0,0,.30); border-radius: 14px; padding: 12px; }
    .k .v { font-size: 20px; font-weight: 800; }
    .bar { height: 10px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; }
    .bar > i { display: block; height: 100%; background: rgba(245,158,11,.9); }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 12px; color: rgba(228,228,231,.85); }

    /* Modal / Toast UI */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; opacity: 0; pointer-events: none; transition: opacity 0.2s; }
    .modal-overlay.active { opacity: 1; pointer-events: auto; }
    .modal { background: #18181b; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; width: 400px; max-width: 90%; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); transform: scale(0.95); transition: transform 0.2s; }
    .modal-overlay.active .modal { transform: scale(1); }
    .modal-h { font-size: 18px; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .modal-p { font-size: 14px; color: rgba(228,228,231,0.8); margin-bottom: 24px; line-height: 1.5; }
    .modal-btns { display: flex; justify-content: flex-end; gap: 12px; }
    .btn-primary { background: #f59e0b; color: #000; font-weight: 600; border: none; }
    .btn-primary:hover { background: #fbbf24; }

    .toast-container { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; gap: 8px; z-index: 10000; }
    .toast { background: #27272a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 12px 20px; border-radius: 12px; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 10px; animation: toast-in 0.3s ease-out; }
    @keyframes toast-in { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  </style>
</head>
<body>
  <div id="modal_overlay" class="modal-overlay">
    <div class="modal">
      <div id="modal_title" class="modal-h">提示</div>
      <div id="modal_content" class="modal-p"></div>
      <div class="modal-btns">
        <button id="modal_cancel" style="display:none">取消</button>
        <button id="modal_ok" class="btn-primary">确定</button>
      </div>
    </div>
  </div>
  <div id="toast_container" class="toast-container"></div>
  <div class="wrap">
    <div class="row" style="justify-content: space-between">
      <div>
        <div class="h">execelMerge - 后台数据面板</div>
        <div class="muted">按天 / 周 / 月查看使用情况与反馈。数据存储在 PostgreSQL。</div>
      </div>
      <div class="row">
        <div id="user_info" class="row" style="margin-right: 12px">
          <span id="user_email" class="muted"></span>
          <button id="logout_btn" style="padding: 4px 8px; font-size: 12px">退出登录</button>
        </div>
        <label class="muted">周期</label>
        <select id="period">
          <option value="day">按天</option>
          <option value="week">按周</option>
          <option value="month">按月</option>
        </select>
        <label class="muted">条数</label>
        <input id="count" type="number" min="1" max="120" value="14" style="width: 90px" />
        <button id="refresh">刷新</button>
      </div>
    </div>

    <div class="row" style="margin-top: 10px">
      <button class="tab" data-view="dashboard">首页</button>
      <button class="tab" data-view="logs">日志</button>
      <button class="tab" data-view="users">用户</button>
      <button class="tab" data-view="accounts">账号</button>
      <button class="tab" data-view="config">配置</button>
      <div class="muted" style="margin-left: auto">/admin?token=...</div>
    </div>

    <div id="view_dashboard">
    <div class="grid">
      <div class="card">
        <div class="h">概览</div>
        <div class="kpi">
          <div class="k"><div class="muted">活跃用户</div><div class="v" id="kpi_users">-</div></div>
          <div class="k"><div class="muted">上传</div><div class="v" id="kpi_upload">-</div></div>
          <div class="k"><div class="muted">分析成功</div><div class="v" id="kpi_analyze_ok">-</div></div>
          <div class="k"><div class="muted">导出（Join / Append）</div><div class="v" id="kpi_export">-</div></div>
        </div>
        <div style="margin-top: 12px" class="muted">近周期分布</div>
        <div id="bars" style="display: grid; gap: 10px; margin-top: 8px"></div>
      </div>

      <div class="card">
        <div class="h">用户反馈</div>
        <div class="kpi">
          <div class="k"><div class="muted">反馈数</div><div class="v" id="kpi_fb_count">-</div></div>
          <div class="k"><div class="muted">平均评分</div><div class="v" id="kpi_fb_avg">-</div></div>
          <div class="k"><div class="muted">5 星</div><div class="v" id="kpi_fb_5">-</div></div>
          <div class="k"><div class="muted">1 星</div><div class="v" id="kpi_fb_1">-</div></div>
        </div>
        <div style="margin-top: 12px" class="muted">最新 20 条</div>
        <div style="margin-top: 8px; max-height: 340px; overflow: auto; border-radius: 12px; border: 1px solid rgba(255,255,255,.08)">
          <table>
            <thead><tr><th style="width: 140px">时间</th><th style="width: 70px">评分</th><th>内容</th></tr></thead>
            <tbody id="fb_rows"></tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top: 12px">
      <div class="h">明细（近周期 buckets）</div>
      <div style="max-height: 420px; overflow: auto; border-radius: 12px; border: 1px solid rgba(255,255,255,.08)">
        <table>
          <thead>
            <tr>
              <th style="width: 120px">bucket</th>
              <th style="width: 120px">活跃用户</th>
              <th style="width: 120px">上传</th>
              <th style="width: 120px">分析成功</th>
              <th style="width: 120px">分析失败</th>
              <th style="width: 170px">导出 Join/Append</th>
            </tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
      <div class="muted" style="margin-top: 10px">如需更多维度（按渠道/字段/错误类型），可以在事件 props 里继续扩展。</div>
    </div>
    </div>

    <div id="view_logs" style="display:none; margin-top: 12px">
      <div class="card">
        <div class="row" style="justify-content: space-between">
          <div>
            <div class="h">日志 / 调用记录</div>
            <div class="muted">支持按调用记录（api_calls）或事件（telemetry_events）分页筛选。</div>
          </div>
          <div class="row">
            <select id="log_source">
              <option value="calls">调用记录（api_calls）</option>
              <option value="events">事件（telemetry_events）</option>
            </select>
            <input id="log_type" placeholder="type/endpoint (可选)" style="width: 180px" />
            <input id="log_client" placeholder="clientId (可选)" style="width: 220px" />
            <input id="log_user" placeholder="userId (可选)" style="width: 240px" />
            <button id="log_refresh">查询</button>
          </div>
        </div>
        <div style="margin-top: 10px; max-height: 520px; overflow: auto; border-radius: 12px; border: 1px solid rgba(255,255,255,.08)">
          <table>
            <thead><tr><th style="width: 150px">时间</th><th style="width: 210px">type/endpoint</th><th style="width: 260px">clientId</th><th style="width: 260px">userId</th><th>meta</th></tr></thead>
            <tbody id="log_rows"></tbody>
          </table>
        </div>
        <div class="row" style="margin-top: 10px">
          <button id="log_prev">上一页</button>
          <button id="log_next">下一页</button>
          <div class="muted" id="log_page">-</div>
        </div>
      </div>
    </div>

    <div id="view_users" style="display:none; margin-top: 12px">
      <div class="card">
        <div class="row" style="justify-content: space-between">
          <div>
            <div class="h">用户（匿名 clientId）</div>
            <div class="muted">匿名 clientId 维度：首次/最近活跃、调用次数、反馈次数。</div>
          </div>
          <div class="row">
            <input id="user_q" placeholder="搜索 clientId" style="width: 260px" />
            <button id="user_refresh">查询</button>
          </div>
        </div>
        <div style="margin-top: 10px; max-height: 520px; overflow: auto; border-radius: 12px; border: 1px solid rgba(255,255,255,.08)">
          <table>
            <thead><tr><th style="width: 260px">clientId</th><th style="width: 160px">firstSeen</th><th style="width: 160px">lastSeen</th><th style="width: 90px">events</th><th style="width: 90px">analyze</th><th style="width: 90px">export</th><th style="width: 90px">feedback</th></tr></thead>
            <tbody id="user_rows"></tbody>
          </table>
        </div>
        <div class="row" style="margin-top: 10px">
          <button id="user_prev">上一页</button>
          <button id="user_next">下一页</button>
          <div class="muted" id="user_page">-</div>
        </div>
      </div>
    </div>

    <div id="view_accounts" style="display:none; margin-top: 12px">
      <div class="card">
        <div class="row" style="justify-content: space-between">
          <div>
            <div class="h">账号（users）</div>
            <div class="muted">邮箱账号：配额/计划/登录时间。</div>
          </div>
          <div class="row">
            <input id="acc_q" placeholder="搜索 email" style="width: 260px" />
            <button id="acc_refresh">查询</button>
          </div>
        </div>
        <div style="margin-top: 10px; max-height: 520px; overflow: auto; border-radius: 12px; border: 1px solid rgba(255,255,255,.08)">
          <table>
            <thead><tr><th style="width: 260px">email</th><th style="width: 280px">id</th><th style="width: 90px">plan</th><th style="width: 90px">analyze/day</th><th style="width: 90px">export/day</th><th style="width: 160px">createdAt</th><th style="width: 160px">lastLoginAt</th></tr></thead>
            <tbody id="acc_rows"></tbody>
          </table>
        </div>
        <div class="row" style="margin-top: 10px">
          <button id="acc_prev">上一页</button>
          <button id="acc_next">下一页</button>
          <div class="muted" id="acc_page">-</div>
        </div>
      </div>
    </div>

    <div id="view_config" style="display:none; margin-top: 12px">
      <div class="card">
        <div class="row" style="justify-content: space-between">
          <div>
            <div class="h">配置（app_config）</div>
            <div class="muted">修改后立即生效（服务端强制执行配额）。</div>
          </div>
          <div class="row">
            <button id="cfg_reload">刷新</button>
            <button id="cfg_save">保存</button>
          </div>
        </div>

        <div class="grid" style="margin-top: 10px">
          <div class="k">
            <div class="muted">免费分析次数（按天 / 每用户）</div>
            <div class="row" style="margin-top: 8px">
              <input id="cfg_free_analyze_daily_limit" type="number" min="0" step="1" style="width: 180px" />
              <div class="muted">0 = 不限制</div>
            </div>
          </div>
          <div class="k">
            <div class="muted">免费导出次数（按天 / 每用户）</div>
            <div class="row" style="margin-top: 8px">
              <input id="cfg_free_export_daily_limit" type="number" min="0" step="1" style="width: 180px" />
              <div class="muted">0 = 不限制</div>
            </div>
          </div>
          <div class="k">
            <div class="muted">账号默认分析次数（按天 / 每账号）</div>
            <div class="row" style="margin-top: 8px">
              <input id="cfg_user_analyze_daily_limit" type="number" min="0" step="1" style="width: 180px" />
              <div class="muted">0 = 不限制</div>
            </div>
          </div>
          <div class="k">
            <div class="muted">账号默认导出次数（按天 / 每账号）</div>
            <div class="row" style="margin-top: 8px">
              <input id="cfg_user_export_daily_limit" type="number" min="0" step="1" style="width: 180px" />
              <div class="muted">0 = 不限制</div>
            </div>
          </div>
        </div>

        <div class="muted" style="margin-top: 12px">当前配置</div>
        <div style="margin-top: 8px" class="split">
          <div class="k"><pre id="cfg_json">{}</pre></div>
          <div class="k"><pre>提示：建议先用“按天免费次数”做灰度；后续再按月/按功能分档。</pre></div>
        </div>
      </div>
    </div>
  </div>

  <script>
    let ADMIN_TOKEN = ${JSON.stringify(token)};
    if (ADMIN_TOKEN) {
      localStorage.setItem('admin_token', ADMIN_TOKEN);
      // 清理 URL 中的 token 避免刷新后还在 URL 里
      const url = new URL(location.href);
      if (url.searchParams.has('token')) {
        url.searchParams.delete('token');
        history.replaceState(null, '', url.href);
      }
    } else {
      ADMIN_TOKEN = localStorage.getItem('admin_token') || localStorage.getItem('auth_token') || '';
    }

    // 如果是从 auth_token 获取的，也存到 admin_token 里方便后续
    if (ADMIN_TOKEN && !localStorage.getItem('admin_token')) {
      localStorage.setItem('admin_token', ADMIN_TOKEN);
    }

    console.log('Admin Page initialized with token:', ADMIN_TOKEN ? (ADMIN_TOKEN.slice(0, 10) + '...') : 'NONE');

    const $ = (id) => document.getElementById(id)
    const fmt = (n) => (n === null || n === undefined) ? '-' : String(n)
    const safe = (s) => String(s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))

    // UI Utilities
    const toast = (msg, duration = 3000) => {
      const container = $('toast_container');
      const el = document.createElement('div');
      el.className = 'toast';
      el.textContent = msg;
      container.appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-20px)';
        el.style.transition = 'all 0.3s';
        setTimeout(() => el.remove(), 300);
      }, duration);
    };

    const showModal = ({ title = '提示', content = '', onOk = null, onCancel = null }) => {
      const overlay = $('modal_overlay');
      $('modal_title').textContent = title;
      $('modal_content').textContent = content;
      const okBtn = $('modal_ok');
      const cancelBtn = $('modal_cancel');
      
      const close = () => {
        overlay.classList.remove('active');
        okBtn.onclick = null;
        cancelBtn.onclick = null;
      };

      okBtn.onclick = () => {
        close();
        if (onOk) onOk();
      };

      if (onCancel) {
        cancelBtn.style.display = '';
        cancelBtn.onclick = () => {
          close();
          onCancel();
        };
      } else {
        cancelBtn.style.display = 'none';
      }

      overlay.classList.add('active');
    };

    const withToken = (url) => {
      if (!ADMIN_TOKEN) return url
      const sep = url.includes('?') ? '&' : '?'
      return url + sep + 'token=' + encodeURIComponent(ADMIN_TOKEN)
    }

    const fetchJson = async (url, options = {}) => {
      try {
        const fetchUrl = withToken(url)
        const fetchOptions = {
          ...options,
          headers: {
            'Authorization': 'Bearer ' + ADMIN_TOKEN,
            ...(options.headers || {})
          }
        }
        const res = await fetch(fetchUrl, fetchOptions)
        if (res.status === 401) {
          localStorage.removeItem('admin_token');
          showModal({
            title: '登录失效',
            content: '您的登录已失效或无权限，请重新登录',
            onOk: () => {
              // 尝试返回首页或指定的登录页
              const loginUrl = window.location.origin + '/';
              window.location.href = loginUrl;
            }
          });
          return;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      } catch (err) {
        console.error('Fetch error:', err);
        toast('加载数据失败: ' + err.message);
        throw err;
      }
    }

    const renderBars = (buckets) => {
      const wrap = $('bars')
      wrap.innerHTML = ''
      const max = Math.max(1, ...buckets.map(b => b.total || 0))
      for (const b of buckets) {
        const pct = Math.round(((b.total || 0) / max) * 100)
        const row = document.createElement('div')
        row.className = 'row'
        row.innerHTML = \`
          <div class="muted" style="width: 110px">\${safe(b.key)}</div>
          <div style="flex: 1; min-width: 220px" class="bar"><i style="width:\${pct}%"></i></div>
          <div class="muted" style="width: 70px; text-align: right">\${safe(b.total)}</div>
        \`
        wrap.appendChild(row)
      }
    }

    const renderTable = (buckets) => {
      const tbody = $('rows')
      tbody.innerHTML = ''
      for (const b of buckets) {
        const upload = (b.byType && b.byType.upload) || 0
        const ok = (b.byType && b.byType.analyze_success) || 0
        const fail = (b.byType && b.byType.analyze_failure) || 0
        const join = (b.exports && b.exports.join) || 0
        const append = (b.exports && b.exports.append) || 0
        const tr = document.createElement('tr')
        tr.innerHTML = \`
          <td>\${safe(b.key)}</td>
          <td>\${safe(b.uniqueClients || 0)}</td>
          <td>\${safe(upload)}</td>
          <td>\${safe(ok)}</td>
          <td>\${safe(fail)}</td>
          <td>\${safe(join)} / \${safe(append)}</td>
        \`
        tbody.appendChild(tr)
      }
    }

    const renderFeedback = (stats, latest) => {
      $('kpi_fb_count').textContent = fmt(stats.count)
      $('kpi_fb_avg').textContent = fmt(stats.avgRating)
      $('kpi_fb_5').textContent = fmt((stats.byRating || {})['5'] || 0)
      $('kpi_fb_1').textContent = fmt((stats.byRating || {})['1'] || 0)
      const tbody = $('fb_rows')
      tbody.innerHTML = ''
      for (const it of (latest.items || []).slice(0, 20)) {
        const tr = document.createElement('tr')
        tr.innerHTML = \`
          <td>\${safe(String(it.ts).slice(0, 19).replace('T',' '))}</td>
          <td>\${safe(it.rating)}</td>
          <td><pre>\${safe(it.comment)}</pre></td>
        \`
        tbody.appendChild(tr)
      }
    }

    const fetchApi = async (url, options) => {
      try {
        const res = await fetch(withToken(url), options)
        if (res.status === 401) {
          localStorage.removeItem('admin_token');
          showModal({
            title: '登录失效',
            content: '您的登录已失效，请重新登录',
            onOk: () => location.href = '/admin'
          });
          return;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      } catch (err) {
        console.error('Fetch error:', err);
        toast('操作失败: ' + err.message);
        throw err;
      }
    }

    const setView = (name) => {
      const views = ['dashboard', 'logs', 'users', 'accounts', 'config']
      for (const v of views) {
        const el = $('view_' + v)
        if (el) el.style.display = v === name ? '' : 'none'
      }
      for (const b of document.querySelectorAll('button.tab')) {
        b.classList.toggle('active', b.getAttribute('data-view') === name)
      }
    }

    const getHashView = () => {
      const v = (location.hash || '').replace('#', '').trim()
      const allowed = new Set(['dashboard', 'logs', 'users', 'accounts', 'config'])
      return allowed.has(v) ? v : 'dashboard'
    }

    let logOffset = 0
    const logLimit = 100
    const loadLogs = async (reset) => {
      if (reset) logOffset = 0
      const source = $('log_source').value
      const type = $('log_type').value.trim()
      const clientId = $('log_client').value.trim()
      const userId = $('log_user').value.trim()
      const params = new URLSearchParams()
      params.set('limit', String(logLimit))
      params.set('offset', String(logOffset))
      if (source === 'calls') {
        if (type) params.set('endpoint', type)
        if (userId) params.set('userId', userId)
      } else {
        if (type) params.set('type', type)
      }
      if (clientId) params.set('clientId', clientId)
      const data = await fetchJson((source === 'calls' ? '/api/admin/calls?' : '/api/admin/events?') + params.toString())
      const tbody = $('log_rows')
      tbody.innerHTML = ''
      for (const it of data.items || []) {
        const tr = document.createElement('tr')
        const kind = source === 'calls' ? it.endpoint : it.type
        const meta = source === 'calls'
          ? ({ statusCode: it.statusCode, durationMs: it.durationMs, request: it.requestMeta, response: it.responseMeta, error: it.error })
          : (it.props || null)
        tr.innerHTML =
          '<td>' + safe(String(it.ts).slice(0, 19).replace('T',' ')) + '</td>' +
          '<td>' + safe(kind || '') + '</td>' +
          '<td>' + safe(it.clientId || '') + '</td>' +
          '<td>' + safe(it.userId || '') + '</td>' +
          '<td><pre>' + safe(meta ? JSON.stringify(meta, null, 2) : '') + '</pre></td>'
        tbody.appendChild(tr)
      }
      const total = Number(data.total || 0)
      const from = total === 0 ? 0 : logOffset + 1
      const to = Math.min(total, logOffset + logLimit)
      $('log_page').textContent = String(from) + '-' + String(to) + ' / ' + String(total)
    }

    let userOffset = 0
    const userLimit = 100
    const loadUsers = async (reset) => {
      if (reset) userOffset = 0
      const q = $('user_q').value.trim()
      const params = new URLSearchParams()
      params.set('limit', String(userLimit))
      params.set('offset', String(userOffset))
      if (q) params.set('q', q)
      const data = await fetchJson('/api/admin/clients?' + params.toString())
      const tbody = $('user_rows')
      tbody.innerHTML = ''
      for (const it of data.items || []) {
        const tr = document.createElement('tr')
        tr.innerHTML =
          '<td>' + safe(it.clientId || '') + '</td>' +
          '<td>' + safe(String(it.firstSeen || '').slice(0, 19).replace('T',' ')) + '</td>' +
          '<td>' + safe(String(it.lastSeen || '').slice(0, 19).replace('T',' ')) + '</td>' +
          '<td>' + safe(it.eventCount || 0) + '</td>' +
          '<td>' + safe(it.analyzeCount || 0) + '</td>' +
          '<td>' + safe(it.exportCount || 0) + '</td>' +
          '<td>' + safe(it.feedbackCount || 0) + '</td>'
        tbody.appendChild(tr)
      }
      const total = Number(data.total || 0)
      const from = total === 0 ? 0 : userOffset + 1
      const to = Math.min(total, userOffset + userLimit)
      $('user_page').textContent = String(from) + '-' + String(to) + ' / ' + String(total)
    }

    let accOffset = 0
    const accLimit = 100
    const loadAccounts = async (reset) => {
      if (reset) accOffset = 0
      const q = $('acc_q').value.trim()
      const params = new URLSearchParams()
      params.set('limit', String(accLimit))
      params.set('offset', String(accOffset))
      if (q) params.set('q', q)
      const data = await fetchJson('/api/admin/users?' + params.toString())
      const tbody = $('acc_rows')
      tbody.innerHTML = ''
      for (const it of data.items || []) {
        const tr = document.createElement('tr')
        tr.innerHTML =
          '<td>' + safe(it.email || '') + '</td>' +
          '<td>' + safe(it.id || '') + '</td>' +
          '<td>' + safe(it.plan || '') + '</td>' +
          '<td>' + safe(it.dailyAnalyzeLimit ?? 0) + '</td>' +
          '<td>' + safe(it.dailyExportLimit ?? 0) + '</td>' +
          '<td>' + safe(String(it.createdAt || '').slice(0, 19).replace('T',' ')) + '</td>' +
          '<td>' + safe(String(it.lastLoginAt || '').slice(0, 19).replace('T',' ')) + '</td>'
        tbody.appendChild(tr)
      }
      const total = Number(data.total || 0)
      const from = total === 0 ? 0 : accOffset + 1
      const to = Math.min(total, accOffset + accLimit)
      $('acc_page').textContent = String(from) + '-' + String(to) + ' / ' + String(total)
    }

    const loadConfig = async () => {
      const data = await fetchJson('/api/admin/config')
      const cfg = data.config || {}
      $('cfg_free_analyze_daily_limit').value = String(cfg.free_analyze_daily_limit ?? 20)
      $('cfg_free_export_daily_limit').value = String(cfg.free_export_daily_limit ?? 0)
      $('cfg_user_analyze_daily_limit').value = String(cfg.user_analyze_daily_limit ?? 200)
      $('cfg_user_export_daily_limit').value = String(cfg.user_export_daily_limit ?? 0)
      $('cfg_json').textContent = JSON.stringify(cfg, null, 2)
    }

    const saveConfig = async () => {
      const freeAnalyze = Number($('cfg_free_analyze_daily_limit').value || 0)
      const freeExport = Number($('cfg_free_export_daily_limit').value || 0)
      const userAnalyze = Number($('cfg_user_analyze_daily_limit').value || 0)
      const userExport = Number($('cfg_user_export_daily_limit').value || 0)
      const data = await fetchJson('/api/admin/config', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ADMIN_TOKEN
        },
        body: JSON.stringify({ values: { free_analyze_daily_limit: freeAnalyze, free_export_daily_limit: freeExport, user_analyze_daily_limit: userAnalyze, user_export_daily_limit: userExport } }),
      })
      if (data && data.config) {
        $('cfg_json').textContent = JSON.stringify(data.config || {}, null, 2)
      }
    }

    const refresh = async () => {
      const period = $('period').value
      const count = $('count').value
      const stats = await fetchJson(\`/api/stats?period=\${encodeURIComponent(period)}&count=\${encodeURIComponent(count)}\`)
      if (!stats) return;
      
      $('kpi_users').textContent = fmt(stats.uniqueClients)
      $('kpi_upload').textContent = fmt((stats.totals || {}).upload || 0)
      const analyzeOk = (stats.totals || {}).suggest_mapping_success ?? (stats.totals || {}).analyze_success ?? 0
      $('kpi_analyze_ok').textContent = fmt(analyzeOk)
      const join = (stats.exportsTotals || {}).join || 0
      const append = (stats.exportsTotals || {}).append || 0
      $('kpi_export').textContent = join + ' / ' + append
      renderBars(stats.buckets || [])
      renderTable(stats.buckets || [])

      const fbStats = await fetchJson('/api/feedback/stats')
      const fbLatest = await fetchJson('/api/feedback/latest?limit=20')
      renderFeedback(fbStats, fbLatest)
    }

    for (const b of document.querySelectorAll('button.tab')) {
      b.addEventListener('click', () => {
        const view = b.getAttribute('data-view') || 'dashboard'
        location.hash = view
      })
    }

    window.addEventListener('hashchange', () => {
      const view = getHashView()
      setView(view)
      if (view === 'dashboard') refresh().catch(e => toast(e.message))
      if (view === 'logs') loadLogs(true).catch(e => toast(e.message))
      if (view === 'users') loadUsers(true).catch(e => toast(e.message))
      if (view === 'accounts') loadAccounts(true).catch(e => toast(e.message))
      if (view === 'config') loadConfig().catch(e => toast(e.message))
    })

    $('refresh').addEventListener('click', () => refresh().catch(e => toast(e.message)))

    $('log_refresh').addEventListener('click', () => loadLogs(true).catch(e => toast(e.message)))
    $('log_prev').addEventListener('click', () => { logOffset = Math.max(0, logOffset - logLimit); loadLogs(false).catch(e => toast(e.message)) })
    $('log_next').addEventListener('click', () => { logOffset = logOffset + logLimit; loadLogs(false).catch(e => toast(e.message)) })

    $('user_refresh').addEventListener('click', () => loadUsers(true).catch(e => toast(e.message)))
    $('user_prev').addEventListener('click', () => { userOffset = Math.max(0, userOffset - userLimit); loadUsers(false).catch(e => toast(e.message)) })
    $('user_next').addEventListener('click', () => { userOffset = userOffset + userLimit; loadUsers(false).catch(e => toast(e.message)) })

    $('acc_refresh').addEventListener('click', () => loadAccounts(true).catch(e => toast(e.message)))
    $('acc_prev').addEventListener('click', () => { accOffset = Math.max(0, accOffset - accLimit); loadAccounts(false).catch(e => toast(e.message)) })
    $('acc_next').addEventListener('click', () => { accOffset = accOffset + accLimit; loadAccounts(false).catch(e => toast(e.message)) })

    $('cfg_reload').addEventListener('click', () => loadConfig().catch(e => toast(e.message)))
    $('cfg_save').addEventListener('click', () => saveConfig().then(() => toast('配置已保存')).catch(e => toast(e.message)))

   // 初始化 me 信息
    const loadMe = async () => {
      try {
        const data = await fetchJson('/api/admin/me')
        if (data && data.user) {
          $('user_email').textContent = data.user.email
          $('user_info').style.display = 'flex'
        }
      } catch (err) {
        console.error('Failed to load me:', err)
      }
    }

    // 退出登录
    $('logout_btn').addEventListener('click', () => {
      showModal({
        title: '退出登录',
        content: '确定要退出登录吗？',
        onOk: () => {
          localStorage.removeItem('admin_token');
          location.href = '/admin';
        },
        onCancel: () => {}
      });
    });

    const init = () => {
      loadMe()
      const view = getHashView()
      setView(view)
      if (view === 'dashboard') refresh().catch(e => toast(e.message))
      if (view === 'logs') loadLogs(true).catch(e => toast(e.message))
      if (view === 'users') loadUsers(true).catch(e => toast(e.message))
      if (view === 'accounts') loadAccounts(true).catch(e => toast(e.message))
      if (view === 'config') loadConfig().catch(e => toast(e.message))
    }

    init()
  </script>
</body>
</html>`);
};
