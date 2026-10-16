/* BasicLLIE 工作台 · 应用逻辑（生产版 v1）
   数据源：data/data.json（fetch）；结构索引：wiki-data.js / docs-data.js / config-yaml.js
   必须经 http://localhost 访问（file:// 下 fetch JSON 会被浏览器拦截） */
(function () {
  function boot(DATA) {
    window.WB_DATA = DATA;
    var ARMS = {};
    DATA.trio.arms.forEach(function (a) { ARMS[a.id] = a; });

    function aiEl(id) { return document.getElementById(id); }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function inl(s) {
      return esc(s)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" onclick="return false">$1</a>');
    }
    function md2html(md) {
      var lines = md.split('\n'), out = [], list = null, code = false, codeBuf = [], tbl = null;
      function closeList() { if (list) { out.push('</' + list + '>'); list = null; } }
      function closeTbl() { if (tbl) { out.push('<table>' + tbl.join('') + '</table>'); tbl = null; } }
      for (var i = 0; i < lines.length; i++) {
        var ln = lines[i];
        if (code) { if (/^```/.test(ln)) { out.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>'); code = false; codeBuf = []; } else codeBuf.push(ln); continue; }
        if (/^```/.test(ln)) { closeList(); closeTbl(); code = true; continue; }
        if (/^\s*\|/.test(ln)) {
          if (/^\s*\|[\s:|-]+\|\s*$/.test(ln)) continue;
          var cells = ln.trim().replace(/^\||\|$/g, '').split('|');
          if (!tbl) tbl = ['<thead><tr>' + cells.map(function (c) { return '<th>' + inl(c.trim()) + '</th>'; }).join('') + '</tr></thead>'];
          else tbl.push('<tr>' + cells.map(function (c) { return '<td>' + inl(c.trim()) + '</td>'; }).join('') + '</tr>');
          continue;
        }
        closeTbl();
        var h = ln.match(/^(#{1,3})\s+(.*)/);
        if (h) { closeList(); out.push('<h' + h[1].length + '>' + inl(h[2]) + '</h' + h[1].length + '>'); continue; }
        var ul = ln.match(/^\s*[-*]\s+(.*)/);
        if (ul) { if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; } out.push('<li>' + inl(ul[1]) + '</li>'); continue; }
        var ol = ln.match(/^\s*\d+\.\s+(.*)/);
        if (ol) { if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; } out.push('<li>' + inl(ol[1]) + '</li>'); continue; }
        closeList();
        if (/^\s*$/.test(ln)) continue;
        out.push('<p>' + inl(ln) + '</p>');
      }
      if (code) out.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>');
      closeList(); closeTbl();
      return out.join('');
    }

    /* ==== 数据渲染 ==== */
    function renderFrontline() { aiEl('frontlineText').innerHTML = DATA.frontier; }
    function renderSlots() {
      aiEl('slotList').innerHTML = DATA.slots.map(function (s) {
        return '<li><b>' + s[0] + '</b><span title="' + esc(s[1]) + '">' + esc(s[1]) + '</span></li>';
      }).join('');
    }
    function renderBaseline() {
      aiEl('blPsnr').textContent = DATA.baseline.psnr;
      aiEl('blSsim').textContent = DATA.baseline.ssim;
      aiEl('blLpips').textContent = DATA.baseline.lpips;
      aiEl('blIter').textContent = DATA.baseline.iter;
      aiEl('snapDate').textContent = DATA.snapshot.date;
    }
    function renderFeed() {
      aiEl('wfItems').innerHTML = DATA.feed.map(function (f) {
        return '<a class="wf-it" data-goto="wiki" title="kb/wiki/experiments/' + esc(f.page) + '">' +
          '<span class="wf-page">' + esc(f.page) + '</span><span class="wf-txt">' + esc(f.txt) + '</span>' +
          '<span class="wf-date">' + esc(f.date) + '</span></a>';
      }).join('');
      aiEl('wfItems').querySelectorAll('[data-goto]').forEach(function (el) {
        el.addEventListener('click', function () { go(el.dataset.goto); });
      });
    }
    function renderAgents() {
      var max = 1;
      DATA.agents.forEach(function (a) { if (a.count > max) max = a.count; });
      aiEl('agList').innerHTML = DATA.agents.map(function (a) {
        return '<li><button type="button" class="ag-row" data-doc="' + a.doc + '">' +
          '<span class="ag-name ' + a.cls + '">' + esc(a.name) + '</span>' +
          '<span class="ag-desc">' + esc(a.desc) + '</span>' +
          '<span class="ag-bar"><i style="width:' + Math.round(a.count / max * 100) + '%"></i></span>' +
          '<span class="ag-n">' + a.count + '</span></button></li>';
      }).join('');
      aiEl('agList').querySelectorAll('[data-doc]').forEach(function (el) {
        el.addEventListener('click', function () { openDoc(el.dataset.doc); });
      });
    }

    /* ==== trio：总览三臂 + eta 滚动倒计时 ==== */
    function tagHtml(t) {
      return '<span class="tag' + (t.cls ? ' ' + t.cls : '') + '">' + esc(t.t) + '</span>';
    }
    function renderTrioOverview() {
      var t = DATA.trio;
      aiEl('triptych').innerHTML = t.arms.map(function (a) {
        return '<div class="arm" data-arm="' + a.id + '">' +
          '<div class="arm-head"><span class="arm-id">' + a.id + '<em>INJECT</em></span>' +
          '<span class="arm-tags">' + a.tags.map(tagHtml).join('') + '</span></div>' +
          '<div class="arm-code">' + esc(a.group) + ' · ' + esc(a.crop) + '</div>' +
          (a.note ? '<p class="arm-note">' + a.note + '</p>' : '') +
          '<div class="arm-eta"><span class="ae-lab">eta</span>' +
          '<span class="ae-digits" data-arm="' + a.id + '" title="剩余时间 · ' + (a.real ? '自快照 eta 起算的滚动倒计时（实测值）' : '示意倒计时，正式版由 log 解析') + '"></span></div>' +
          '<div class="pwrap"><div class="plabels"><span>已验证 ' + t.verified_iter + '/' + t.total_iter + '</span><span>' + t.s_per_iter + ' s/iter</span></div>' +
          '<div class="pbar"><i style="width:' + (t.verified_iter / t.total_iter * 100).toFixed(2) + '%"></i></div></div>' +
          '</div>';
      }).join('');
      aiEl('triptych').querySelectorAll('.arm').forEach(function (a) {
        a.addEventListener('click', function () {
          if (tri.classList.contains('detail') && a.classList.contains('on')) { closeArm(); return; }
          openArm(a.dataset.arm);
        });
      });
    }
    var ETAREM = {};
    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function etaParts(total) {
      var r = total % 86400;
      return { d: Math.floor(total / 86400), str: pad2(Math.floor(r / 3600)) + ':' + pad2(Math.floor(r % 3600 / 60)) + ':' + pad2(r % 60) };
    }
    function buildEta(id) {
      var el = document.querySelector('.ae-digits[data-arm="' + id + '"]');
      if (!el) return;
      var p = etaParts(ETAREM[id]), out = '<span class="day">' + p.d + ' day</span>', di = 0;
      p.str.split('').forEach(function (ch) {
        if (/\d/.test(ch)) {
          out += '<span class="od"><span class="strip">';
          for (var k = 0; k < 10; k++) out += '<i>' + k + '</i>';
          out += '</span></span>';
        } else out += '<span class="sep">' + ch + '</span>';
      });
      el.innerHTML = out;
      var strips = el.querySelectorAll('.strip');
      p.str.split('').forEach(function (ch) {
        if (/\d/.test(ch)) { strips[di].style.transform = 'translateY(-' + (+ch) + 'em)'; di++; }
      });
    }
    function tickEta() {
      Object.keys(ETAREM).forEach(function (id) {
        if (ETAREM[id] > 0) ETAREM[id]--;
        var el = document.querySelector('.ae-digits[data-arm="' + id + '"]');
        if (!el || !el.querySelector('.strip')) return;
        var p = etaParts(ETAREM[id]), di = 0;
        var day = el.querySelector('.day');
        if (day) day.textContent = p.d + ' day';
        var strips = el.querySelectorAll('.strip');
        p.str.split('').forEach(function (ch) {
          if (/\d/.test(ch)) { if (strips[di]) strips[di].style.transform = 'translateY(-' + (+ch) + 'em)'; di++; }
        });
      });
    }

    /* ==== 消融台账 ==== */
    function renderAblations() {
      var n = { all: DATA.ablations.length, running: 0, todo: 0, done: 0, neg: 0 };
      DATA.ablations.forEach(function (r) { n[r.s]++; });
      aiEl('abFilters').innerHTML = ['all', 'running', 'todo', 'done', 'neg'].map(function (k, i) {
        var lab = k === 'all' ? '全部' : k === 'running' ? '进行中' : k === 'todo' ? '待做' : k === 'done' ? '已做' : '负结果';
        return '<button type="button" class="f-chip' + (i === 0 ? ' active' : '') + '" data-f="' + k + '">' + lab + '<span class="n">' + n[k] + '</span></button>';
      }).join('');
      aiEl('abList').innerHTML = DATA.ablations.map(function (r) {
        return '<li class="ab-row' + (r.forced ? ' row-forced' : '') + (r.s === 'neg' ? ' row-neg' : '') + '" data-s="' + r.s + '">' +
          '<span class="st ' + r.st_cls + '">' + esc(r.st_label) + '</span>' +
          '<span class="ab-name">' + r.name + '</span>' +
          '<span class="ab-res">' + r.res + '</span></li>';
      }).join('');
      var chips = aiEl('abFilters').querySelectorAll('.f-chip');
      var rows = aiEl('abList').querySelectorAll('.ab-row');
      chips.forEach(function (c) {
        c.addEventListener('click', function () {
          chips.forEach(function (x) { x.classList.remove('active'); });
          c.classList.add('active');
          var f = c.dataset.f;
          rows.forEach(function (r) { r.style.display = (f === 'all' || r.dataset.s === f) ? '' : 'none'; });
        });
      });
    }

    /* ==== 监控页表格 ==== */
    function renderMonRows() {
      aiEl('monRows').innerHTML = DATA.trio.arms.map(function (a) {
        return '<div class="at-row" data-arm="' + a.id + '" title="点击加载运行详情与实验配置"><b>' + a.id + '</b>' +
          '<span class="g">' + esc(a.group) + '</span><span>' + esc(a.crop) + '</span><span>' + esc(a.prior) + '</span>' +
          '<span class="g">' + esc(a.gpu) + '</span><span class="note">' + a.row_note + '</span></div>';
      }).join('');
      aiEl('monRows').querySelectorAll('.at-row').forEach(function (r) {
        r.addEventListener('click', function () { renderMonitorDetail(r.dataset.arm); });
      });
    }

    /* ==== 视图路由 ==== */
    var navs = document.querySelectorAll('.nav-it');
    var views = document.querySelectorAll('.view');
    var title = document.getElementById('viewTitle');
    function go(v) {
      navs.forEach(function (b) { b.classList.toggle('active', b.dataset.view === v); });
      views.forEach(function (s) { s.classList.toggle('active', s.dataset.view === v); });
      var b = document.querySelector('.nav-it[data-view="' + v + '"]');
      if (b && title) title.textContent = b.dataset.title;
      window.scrollTo({ top: 0 });
    }
    navs.forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.view); }); });
    document.querySelectorAll('[data-goto]').forEach(function (el) {
      el.addEventListener('click', function () { go(el.dataset.goto); });
    });

    /* ==== 总览选臂详情（与监控页共享渲染） ==== */
    var tri = document.getElementById('triptych');
    var curArmId = null;
    function tbChart(series, W) {
      W = W || 620; var H = 132, L = 56, R = 16, T = 12, B = 26;
      var xs = series.map(function (p) { return p[0]; }), ys = series.map(function (p) { return p[1]; });
      var x0 = xs[0], x1 = xs[xs.length - 1];
      var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
      var pad = (ymax - ymin) * .14; ymin = Math.max(0, ymin - pad); ymax = ymax + pad;
      function X(v) { return L + (v - x0) / (x1 - x0) * (W - L - R); }
      function Y(v) { return T + (1 - (v - ymin) / (ymax - ymin)) * (H - T - B); }
      var g = '';
      [.25, .5, .75, 1].forEach(function (f) {
        var yy = T + (1 - f) * (H - T - B), val = ymin + f * (ymax - ymin);
        g += '<line x1="' + L + '" y1="' + yy + '" x2="' + (W - R) + '" y2="' + yy + '" stroke="rgba(62,61,91,.45)" stroke-width="1"/>' +
          '<text x="' + (L - 6) + '" y="' + (yy + 3) + '" text-anchor="end" font-size="9.5" fill="#8b86ac" font-family="monospace">' + val.toFixed(3) + '</text>';
      });
      var pts = series.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ');
      var area = L + ',' + (H - B) + ' ' + pts + ' ' + X(x1).toFixed(1) + ',' + (H - B);
      var lx = X(x1), ly = Y(ys[ys.length - 1]);
      return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg" role="img">' + g +
        '<polygon points="' + area + '" fill="rgba(115,189,245,.08)"/>' +
        '<polyline points="' + pts + '" fill="none" stroke="#73bdf5" stroke-width="1.8" stroke-linejoin="round"/>' +
        '<circle cx="' + lx + '" cy="' + ly + '" r="3.2" fill="#73bdf5"/>' +
        '<circle cx="' + lx + '" cy="' + ly + '" r="6.5" fill="none" stroke="rgba(115,189,245,.4)"/>' +
        '<text x="' + (lx - 8) + '" y="' + (ly - 9) + '" text-anchor="end" font-size="10" fill="#73bdf5" font-family="monospace">' + ys[ys.length - 1].toExponential(3) + '</text>' +
        '<text x="' + L + '" y="' + (H - 8) + '" font-size="9.5" fill="#8b86ac" font-family="monospace">iter ' + x0 + '</text>' +
        '<text x="' + (W - R) + '" y="' + (H - 8) + '" text-anchor="end" font-size="9.5" fill="#8b86ac" font-family="monospace">iter ' + x1.toLocaleString() + '</text>' +
        '</svg>';
    }
    function armLossHTML(id) {
      var a = ARMS[id], hot = a.table.length - 1;
      var rows = a.table.map(function (r, i) {
        return '<tr' + (i === hot ? ' class="hot"' : '') + '><td>iter ' + r[0] + '</td><td><b>' + r[1] + '</b></td><td>' + r[2] + '</td><td>' + r[3] + '</td><td>' + r[4] + '</td></tr>';
      }).join('');
      return '<div class="ad-top">' +
        '<div style="min-width:0"><span class="kick"><i class="sqk sqk-blue"></i>EXPERIMENT · ' + id + ' 实验目录</span>' +
        '<code class="ad-folder">' + esc(a.folder) + '</code>' +
        '<span class="ad-sub" style="display:block;margin-top:4px">训练日志 ' + esc(a.log) + ' · 710 项目根 /workspace/Code/BasicLLIE</span></div>' +
        '<div class="ad-eta"><span class="lab">剩余时间 · ETA</span><b>' + esc(a.eta_label) + '</b>' +
        '<span class="sub">iter ' + esc(a.iter_label) + ' / 30,000 · epoch ' + a.epoch + ' · 全局 batch 8</span></div>' +
        '</div>' +
        '<div class="ad-chart"><div class="ad-chart-head"><span>l_pix · loss 曲线（TensorBoard 式渲染）</span>' +
        '<span class="now">now ' + a.series[a.series.length - 1][1].toExponential(4) + '</span></div>' + tbChart(a.series) + '</div>' +
        '<table class="tb-table"><thead><tr><th>iter</th><th>l_pix</th><th>l_freq</th><th>lr</th><th>time (data)</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }
    function fitArmChart(root, id) {
      var c = root.querySelector('.ad-chart'); if (!c || !ARMS[id]) return;
      var w = Math.max(280, c.clientWidth - 24);
      var svg = c.querySelector('svg');
      if (svg) svg.outerHTML = tbChart(ARMS[id].series, w);
    }
    function closeArm() {
      if (!tri) return;
      tri.classList.remove('detail');
      curArmId = null;
      var arms = tri.querySelectorAll('.arm');
      var mc = tri.closest('.card-monitor'); if (mc) mc.classList.remove('detailing');
      tri.querySelectorAll('.arm-detail').forEach(function (x) { x.remove(); });
      arms.forEach(function (x) { x.classList.remove('on'); });
    }
    function openArm(id) {
      var a = ARMS[id]; if (!a || !tri) return;
      var mc = tri.closest('.card-monitor'); if (mc) mc.classList.add('detailing');
      var arms = tri.querySelectorAll('.arm');
      arms.forEach(function (x) { x.classList.toggle('on', x.dataset.arm === id); });
      tri.classList.add('detail');
      tri.querySelectorAll('.arm-detail').forEach(function (x) { x.remove(); });
      curArmId = id;
      var div = document.createElement('div'); div.className = 'arm-detail';
      div.innerHTML = armLossHTML(id) +
        '<div class="ad-foot"><span class="ad-note">' + (a.real ? a.id + ' 末行取自最新实测 log（2026-10-11 13:33:02）' : a.id + ' 为示意数据') + ' · 其余采样点示意；正式版逐条解析训练 log 渲染，随「同步」更新</span>' +
        '<button type="button" class="btn-ghost ad-close">← 返回三臂总览</button></div>';
      tri.appendChild(div);
      fitArmChart(div, id);
      div.querySelector('.ad-close').addEventListener('click', closeArm);
    }

    /* ==== 监控页选臂详情（黑底 · 运行详情 + YAML） ==== */
    var YMLPATH = {};
    DATA.trio.arms.forEach(function (a) {
      YMLPATH[a.id] = 'options/train/wavemamba-attrib/wavemamba_attrib_framefull_lvl' + a.id.slice(1) + '_s20260901_uhdll_30k_20261011.yml';
    });
    function armYaml(id) {
      var y = window.WB_YAML;
      if (id === 'L2') y = y.replace(/lvl1/g, 'lvl2').replace(/iccb_level: 1\b/, 'iccb_level: 2')
        .replace(/down_group1（H\/2，最细尺度）/, 'down_group2（H/4）').replace(/port: 29531/, 'port: 29532').replace(/消融 L1：/, '消融 L2：');
      if (id === 'L3') y = y.replace(/lvl1/g, 'lvl3').replace(/iccb_level: 1\b/, 'iccb_level: 3')
        .replace(/down_group1（H\/2，最细尺度）/, 'down_group3（H/8，最粗）').replace(/port: 29531/, 'port: 29533').replace(/消融 L1：/, '消融 L3：');
      return y;
    }
    function hlYaml(y) {
      return esc(y).split('\n').map(function (ln) {
        if (/^\s*#/.test(ln)) return '<span class="y-c">' + ln + '</span>';
        ln = ln.replace(/^(\s*)([A-Za-z_][\w]*)(:)(?=\s|$)/, '$1<span class="y-k">$2</span>$3');
        ln = ln.replace(/(!!\w+)/g, '<span class="y-t">$1</span>');
        return ln;
      }).join('\n');
    }
    var mDetailCur = null;
    function clearMonOn() {
      document.querySelectorAll('#monArms .at-row').forEach(function (r) { r.classList.remove('on'); });
    }
    function renderMonitorDetail(id) {
      var a = ARMS[id], box = aiEl('mDetail'); if (!a || !box) return;
      if (mDetailCur === id) { box.hidden = true; mDetailCur = null; clearMonOn(); return; }
      mDetailCur = id; box.hidden = false;
      box.innerHTML =
        '<div class="md-tabs">' +
          '<button type="button" class="md-tab active" data-t="run">运行详情</button>' +
          '<button type="button" class="md-tab" data-t="yaml">实验配置 YAML</button>' +
          '<button type="button" class="btn-ghost" id="mClose" style="margin-left:auto">收起详情</button>' +
        '</div>' +
        '<div class="md-pan active" data-p="run">' + armLossHTML(id) +
          '<p class="ad-note" style="margin:10px 0 0">' + (a.real ? a.id + ' 表格末行取自最新实测 log（2026-10-11 13:33:02）' : a.id + ' 为示意数据') + ' · 正式版逐条解析训练 log 渲染，随「同步」更新</p></div>' +
        '<div class="md-pan" data-p="yaml"><p class="ad-note" style="margin:0 0 8px"><span style="color:var(--blue)">' + YMLPATH[id] + '</span> · 真实配置原文（与 710 同名文件一致，本地内嵌）</p><pre class="yaml-view">' + hlYaml(armYaml(id)) + '</pre></div>';
      box.querySelectorAll('.md-tab').forEach(function (t) {
        t.addEventListener('click', function () {
          box.querySelectorAll('.md-tab').forEach(function (x) { x.classList.remove('active'); });
          t.classList.add('active');
          box.querySelectorAll('.md-pan').forEach(function (p) { p.classList.toggle('active', p.dataset.p === t.dataset.t); });
        });
      });
      aiEl('mClose').addEventListener('click', function () {
        box.hidden = true; mDetailCur = null; clearMonOn();
      });
      clearMonOn();
      var row = document.querySelector('#monArms .at-row[data-arm="' + id + '"]');
      if (row) row.classList.add('on');
      window.scrollTo({ top: box.getBoundingClientRect().top + window.pageYOffset - 80, behavior: 'smooth' });
    }

    /* ==== Agent/Skill 文档 ==== */
    var DOCS = window.WB_DOCS;
    var docViews = document.querySelector('[data-view="doc"]');
    function openDoc(key) {
      var d = DOCS[key]; if (!d || !docViews) return;
      aiEl('docTitle').textContent = d.t;
      aiEl('docPath').textContent = d.path || '';
      aiEl('mdBody').innerHTML = md2html(d.md);
      go('doc');
    }

    /* ==== 知识库 docs 阅读器 ==== */
    var WIKI = window.WB_WIKI.lanes, KBMD = window.WB_WIKI.md;
    var STC = { ok: ['stc-ok', '稳定/已验证'], act: ['stc-ok', '进行中'], prop: ['stc-prop', 'proposed'],
      prov: ['stc-prop', 'provisional'], neg: ['stc-neg', '负结果'], wd: ['stc-wd', '已撤回'], ref: ['stc-ref', 'reference'] };
    var KB_CATS = [
      { tab: '实验记录', idx: 4, dir: 'experiments' }, { tab: '科研笔记', idx: 5, dir: 'notes' },
      { tab: '槽位决策', idx: 0, dir: 'slots' }, { tab: '框架设计', idx: 1, dir: 'architecture' },
      { tab: '领域知识', idx: 2, dir: 'field' }, { tab: '论文方法', idx: 3, dir: 'papers' },
      { tab: '综合', idx: 6, dir: '' }
    ];
    var KB_PAGES = {};
    WIKI.forEach(function (l, li) { l.items.forEach(function (it) { KB_PAGES[it[0]] = { wi: li, sum: it[1], st: it[2] }; }); });
    function kbCatOf(name) {
      var p = KB_PAGES[name];
      return KB_CATS.filter(function (c) { return c.idx === p.wi; })[0] || { tab: '', dir: '' };
    }
    function kbRel(name) {
      var d = kbCatOf(name).dir;
      return 'kb/wiki/' + (d ? d + '/' : '') + name + '.md';
    }
    function kbStub(name) {
      var p = KB_PAGES[name];
      return '# ' + name + '\n\n> ' + (STC[p.st] ? STC[p.st][1] : '') + ' · ' + kbCatOf(name).tab + '\n\n' + p.sum +
        '\n\n| 属性 | 值 |\n|---|---|\n| 路径 | `' + kbRel(name) + '` |\n| 状态 | ' + (STC[p.st] ? STC[p.st][1] : '') + ' |\n\n## 正文\n\n- 正式版由本地 `kb/wiki` 全文经同一渲染器输出；当前为桩页，属性取自 `index.md`。';
    }
    var kbCat = 0, kbCur = null, kbHeadings = [];
    function kbRenderTabs() {
      aiEl('kbTabs').innerHTML = KB_CATS.map(function (c, i) {
        return '<button type="button" class="kb-tab' + (i === kbCat ? ' active' : '') + '" data-i="' + i + '">' + c.tab + '<span>' + WIKI[c.idx].items.length + '</span></button>';
      }).join('');
      aiEl('kbTabs').querySelectorAll('.kb-tab').forEach(function (b) {
        b.addEventListener('click', function () { kbCat = +b.dataset.i; kbCur = null; kbRenderTabs(); kbRenderTree(); });
      });
    }
    function kbRenderTree() {
      var items = WIKI[KB_CATS[kbCat].idx].items;
      var html = '<div class="kb-tree-h">HIERARCHY · 目录</div>' + items.map(function (it) {
        var st = STC[it[2]] || STC.ref;
        var h = '<button type="button" class="kb-it' + (kbCur === it[0] ? ' active' : '') + '" data-n="' + it[0] + '" title="' + it[0] + ' · ' + st[1] + '"><i class="' + st[0] + '"></i><code>' + it[0] + '</code></button>';
        if (kbCur === it[0]) {
          h += kbHeadings.map(function (hd, i) {
            return '<button type="button" class="kb-sub ' + (hd.tag === 'H3' ? 'l3' : 'l2') + '" data-h="' + i + '">' + hd.text + '</button>';
          }).join('');
        }
        return h;
      }).join('');
      aiEl('kbTree').innerHTML = html;
      aiEl('kbTree').querySelectorAll('.kb-it').forEach(function (b) {
        b.addEventListener('click', function () { kbOpen(b.dataset.n); });
      });
      aiEl('kbTree').querySelectorAll('.kb-sub').forEach(function (b) {
        b.addEventListener('click', function () {
          aiEl('kbTree').querySelectorAll('.kb-sub').forEach(function (x) { x.classList.remove('cur'); });
          b.classList.add('cur');
          var h = kbHeadings[+b.dataset.h].el;
          window.scrollTo({ top: h.getBoundingClientRect().top + window.pageYOffset - 80, behavior: 'smooth' });
        });
      });
    }
    function kbOpen(name) {
      kbCur = name;
      var p = KB_PAGES[name], md = KBMD[name];
      aiEl('kbMeta').innerHTML = '<span style="color:var(--blue)">' + kbRel(name) + '</span>' +
        '<span>状态 ' + (STC[p.st] ? STC[p.st][1] : '') + '</span>' +
        '<span>' + (md ? '内嵌原文' : '桩页 · 接入全文见 wiki-data.js') + '</span>';
      var art = aiEl('kbArticle');
      art.innerHTML = md2html(md || kbStub(name));
      kbHeadings = [];
      art.querySelectorAll('h2,h3').forEach(function (h, i) {
        h.id = 'kbh' + i;
        kbHeadings.push({ el: h, tag: h.tagName, text: h.textContent });
      });
      kbRenderTree();
      window.scrollTo({ top: 0 });
    }

    /* ==== 右侧助理 dock（OpenAI 兼容端点 · key 仅存本地） ==== */
    var aiCfg = { base: 'https://api.openai.com/v1', key: '', model: 'gpt-4o-mini' };
    try { var _c = JSON.parse(localStorage.getItem('basicllie-ai') || '{}');
      ['base', 'key', 'model'].forEach(function (k) { if (_c[k]) aiCfg[k] = _c[k]; }); } catch (e) {}
    function aiSaveCfg() { try { localStorage.setItem('basicllie-ai', JSON.stringify(aiCfg)); } catch (e) {} }
    function aiStatus(t) {
      var s = aiEl('aiStatus');
      s.setAttribute('title', t);
      s.classList.toggle('ok', t.indexOf('已连接') === 0);
    }
    function aiSyncInputs() {
      aiEl('aiBase').value = aiCfg.base; aiEl('aiKey').value = aiCfg.key; aiEl('aiModel').value = aiCfg.model;
    }
    function aiAdd(cls, text) {
      var d = document.createElement('div'); d.className = 'msg ' + cls; d.innerHTML = text;
      var box = aiEl('aiMsgs'); box.appendChild(d); box.scrollTop = box.scrollHeight; return d;
    }
    var AI_SYS = '你是 BasicLLIE 工作台内置助理，服务一个 UHD-LLIE（WaveMamba 基线）研究项目。关键口径：' +
      '全量 baseline 锚点 PSNR 26.90 / SSIM 0.9314 / LPIPS 0.2015（A0 official recipe scratch，iter 426K，crop_border=1 Y 通道）；' +
      '论文表 WaveMamba 28.53 来自预训练权重，不可与 26.90 相减。主线 150k framefull 终点 27.490（峰值 140k 27.540，74k 后饱和），' +
      '~15% 尾部系统性欠曝（未消融）。在跑：iccb_level L1/L2/L3 三臂（30k 终点 pairwise>0.30 dB 判据待用户拍板，推算 ETA 2026-10-12 ~14:00Z）。' +
      '下一步：auxloss 小预算重跑（强制未排期；paired_gain_gate.py，d̄<0.01 kill）。已知负结果：FEB+CAB、ICRWS B2、IA-GTM。' +
      '回答用中文、简短、给依据；超出以上事实的问题明确说不知道，不要编造数字。';
    var aiHist = [];
    function aiSendMsg() {
      var t = aiEl('aiText').value.trim(); if (!t) return;
      if (!aiCfg.key) { aiEl('aiSettings').hidden = false; aiAdd('err', '未配置 API Key：先在上方表单填写 API 地址与 Key，点「连接检测」通过后即可问答。'); return; }
      aiEl('aiText').value = '';
      aiAdd('me', esc(t));
      aiHist.push({ role: 'user', content: t });
      var pd = aiAdd('pending', '<span class="ai-spinwrap" aria-hidden="true"><span class="spinner"><span class="spinner1"></span></span></span>');
      var body = { model: aiCfg.model || 'gpt-4o-mini', messages: [{ role: 'system', content: AI_SYS }].concat(aiHist.slice(-8)) };
      fetch(aiCfg.base.replace(/\/+$/, '') + '/chat/completions', { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiCfg.key },
        body: JSON.stringify(body) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && res.j.choices && res.j.choices[0]) {
            var txt = res.j.choices[0].message.content;
            aiHist.push({ role: 'assistant', content: txt });
            pd.className = 'msg ai'; pd.textContent = txt;
          } else {
            pd.className = 'msg err';
            pd.textContent = '✗ ' + (res.j && res.j.error && res.j.error.message ? ('HTTP 错误：' + res.j.error.message) : '响应异常');
          }
        })
        .catch(function (e) { pd.className = 'msg err'; pd.textContent = '✗ ' + (e.message || '网络/CORS 失败'); });
    }
    function initChat() {
      aiSyncInputs();
      if (aiCfg.key) aiStatus('已配置 · 未检测');
      try { if (localStorage.getItem('basicllie-ai-open') === '1') aiEl('aidock').classList.add('open'); } catch (e) {}
      aiEl('aidockTab').addEventListener('click', function () {
        aiEl('aidock').classList.add('open'); try { localStorage.setItem('basicllie-ai-open', '1'); } catch (e) {}
      });
      aiEl('aiClose').addEventListener('click', function () {
        aiEl('aidock').classList.remove('open'); try { localStorage.setItem('basicllie-ai-open', '0'); } catch (e) {}
      });
      aiEl('aiSettingsBtn').addEventListener('click', function () { var s = aiEl('aiSettings'); s.hidden = !s.hidden; });
      ['aiBase', 'aiKey', 'aiModel'].forEach(function (id) {
        aiEl(id).addEventListener('input', function () {
          aiCfg[id === 'aiBase' ? 'base' : id === 'aiKey' ? 'key' : 'model'] = aiEl(id).value.trim();
          aiSaveCfg(); aiStatus('已修改 · 未检测');
        });
      });
      aiEl('aiTest').addEventListener('click', function () {
        var out = aiEl('aiTestOut'); out.textContent = '检测中…'; aiEl('aiTest').disabled = true;
        fetch(aiCfg.base.replace(/\/+$/, '') + '/models', { headers: { Authorization: 'Bearer ' + aiCfg.key } })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (res) {
            if (res.ok) { out.textContent = '✓ 连接成功' + (res.j && res.j.data ? ' · ' + res.j.data.length + ' 个模型' : ''); aiStatus('已连接 · ' + (aiCfg.model || '未填模型名')); }
            else { out.textContent = '✗ ' + (res.j && res.j.error && res.j.error.message ? ('HTTP 错误：' + res.j.error.message) : '鉴权失败'); aiStatus('连接失败'); }
          })
          .catch(function (e) { out.textContent = '✗ ' + (e.message || '网络失败') + '（多为 CORS/网络；file:// 下部分厂商会拦跨域）'; aiStatus('连接失败'); })
          .then(function () { aiEl('aiTest').disabled = false; });
      });
      aiEl('aiSend').addEventListener('click', aiSendMsg);
      aiEl('aiText').addEventListener('keydown', function (e) { if (e.key === 'Enter') aiSendMsg(); });
      aiAdd('ai', '我是工作台助理，熟悉本页的项目口径（锚点 26.90、trio 三臂、台账与判据）。点右上滑块图标填入 API 地址与 Key，「连接检测」通过后即可提问；Key 只存在你本地浏览器。');
    }

    /* ==== 助理 dock：知识库页内嵌右分栏，其余页面悬浮球 ==== */
    function aiDockPlace(v) {
      var d = aiEl('aidock'), slot = aiEl('aiSlot'); if (!d) return;
      if (v === 'wiki' && slot) {
        if (d.classList.contains('inline')) return;
        slot.appendChild(d); d.classList.add('inline');
      } else {
        if (!d.classList.contains('inline')) return;
        document.body.appendChild(d); d.classList.remove('inline');
      }
    }
    var _goRef = go;
    go = function (v) { _goRef(v); aiDockPlace(v); };

    /* ==== resize：重绘当前打开的 loss 曲线 ==== */
    window.addEventListener('resize', function () {
      if (mDetailCur) fitArmChart(aiEl('mDetail'), mDetailCur);
      if (curArmId && tri && tri.classList.contains('detail')) {
        var ad = tri.querySelector('.arm-detail');
        if (ad) fitArmChart(ad, curArmId);
      }
    });

    /* ==== 初始化 ==== */
    renderFrontline(); renderSlots(); renderBaseline(); renderFeed(); renderAgents();
    renderTrioOverview(); renderMonRows(); renderAblations();
    DATA.trio.arms.forEach(function (a) { ETAREM[a.id] = a.eta_sec; buildEta(a.id); });
    setInterval(tickEta, 1000);
    kbRenderTabs(); kbOpen('iccb-placement-level-ablation');
    initChat();
    document.querySelectorAll('[data-doc]').forEach(function (el) {
      el.addEventListener('click', function () { openDoc(el.dataset.doc); });
    });

    /* ==== 深链 ==== */
    var h = location.hash.replace(/^#/, '');
    if (h.indexOf('doc=') === 0) { openDoc(h.slice(4)); }
    else if (h.indexOf('arm=') === 0) { openArm(h.slice(4).toUpperCase()); }
    else if (h.indexOf('mon=') === 0) {
      var mp = h.slice(4).split(':'); go('monitor'); renderMonitorDetail(mp[0].toUpperCase());
      if (mp[1] === 'yaml') { var t = document.querySelector('#mDetail .md-tab[data-t="yaml"]'); if (t) t.click(); }
    }
    else if (h.indexOf('view=') === 0) { go(h.slice(5)); }
  }

  fetch('data/data.json')
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(boot)
    .catch(function (e) {
      document.body.insertAdjacentHTML('beforeend',
        '<div style="position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:999;background:#2a1e33;color:#e39ad9;padding:12px 18px;font:500 13px/1.6 monospace;box-shadow:0 0 0 1px rgba(169,71,159,.5);border-radius:6px">data/data.json 加载失败（' +
        String(e.message || e).replace(/</g, '&lt;') + '）—— 请用 node tools/server.mjs 从 http://localhost 打开，不要双击 file://。</div>');
    });
})();
