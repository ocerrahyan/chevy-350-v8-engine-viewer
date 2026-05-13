// Job Autofill — single-file vanilla app. Data stays in localStorage.

const KEY = 'jobAutofill.v1';
const LISTS = ['experience', 'education', 'snippets', 'references'];

const DEFAULTS = {
  personal: { firstName:'', middleName:'', lastName:'', preferredName:'', pronouns:'', headline:'' },
  contact:  { email:'', phone:'', address1:'', address2:'', city:'', state:'', postalCode:'', country:'' },
  links:    { linkedin:'', github:'', portfolio:'', twitter:'', other:'' },
  workAuth: { authorizedToWork:'', requiresSponsorship:'', veteranStatus:'', disabilityStatus:'', raceEthnicity:'', gender:'' },
  logistics:{ desiredSalary:'', noticePeriod:'', earliestStartDate:'', willingToRelocate:'', remotePreference:'' },
  skills:   '',
  summary:  '',
  experience: [],
  education:  [],
  snippets:   [],
  references: []
};

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// ---- State ----------------------------------------------------------
let state = load();

function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    return merge(structuredClone(DEFAULTS), JSON.parse(raw));
  } catch (e) {
    console.warn('Failed to load state, using defaults', e);
    return structuredClone(DEFAULTS);
  }
}
function merge(a, b){
  if (b == null) return a;
  if (Array.isArray(a)) return Array.isArray(b) ? b : a;
  if (typeof a === 'object'){
    if (typeof b !== 'object' || b === null) return a;
    const out = { ...a };
    for (const k of Object.keys(a)) out[k] = merge(a[k], b[k]);
    for (const k of Object.keys(b)) if (!(k in a)) out[k] = b[k];
    return out;
  }
  return b;
}
let saveT;
function save(){
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { toast('Could not save (storage full?)'); }
  }, 150);
}

// ---- Path get/set ---------------------------------------------------
function getPath(path){
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), state);
}
function setPath(path, value){
  const keys = path.split('.');
  let o = state;
  for (let i = 0; i < keys.length - 1; i++){
    if (o[keys[i]] == null) o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = value;
}

// ---- Bindings (data-path inputs) -----------------------------------
function bindPaths(root = document){
  for (const el of $$('[data-path]', root)){
    const path = el.dataset.path;
    el.value = getPath(path) ?? '';
    el.addEventListener('input', () => { setPath(path, el.value); save(); });
    attachCopy(el);
  }
}

// ---- Tap-to-copy ----------------------------------------------------
function attachCopy(input){
  if (input.tagName === 'TEXTAREA' && input.rows > 3) return; // skip giant boxes (snippets/summary have their own UX)
  const label = input.closest('label');
  if (!label) return;
  if (label.querySelector('.copy')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'copy';
  btn.textContent = 'copy';
  btn.setAttribute('aria-label', 'Copy field');
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const v = input.value || '';
    if (!v) { toast('Field is empty'); return; }
    try {
      await navigator.clipboard.writeText(v);
      btn.classList.add('ok'); btn.textContent = '✓';
      setTimeout(() => { btn.classList.remove('ok'); btn.textContent = 'copy'; }, 1100);
    } catch {
      // Fallback for old Safari
      const ta = document.createElement('textarea');
      ta.value = v; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
      toast('Copied');
    }
  });
  label.appendChild(btn);
}

// ---- Lists (experience, education, snippets, references) ----------
const EMPTY = {
  experience: { company:'', title:'', location:'', start:'', end:'', current:false, description:'' },
  education:  { school:'', degree:'', field:'', start:'', end:'', gpa:'' },
  snippets:   { label:'', text:'' },
  references: { name:'', title:'', company:'', email:'', phone:'', relationship:'' }
};

function renderList(kind){
  const host = $('#' + kind + 'List');
  if (!host) return;
  host.innerHTML = '';
  const tpl = $('#tpl-' + kind);
  state[kind].forEach((item, idx) => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.idx = idx;
    // bind inputs by data-field
    for (const el of $$('[data-field]', node)){
      const f = el.dataset.field;
      if (el.type === 'checkbox') {
        el.checked = !!item[f];
        el.addEventListener('change', () => { state[kind][idx][f] = el.checked; save(); });
      } else {
        el.value = item[f] ?? '';
        el.addEventListener('input', () => { state[kind][idx][f] = el.value; save(); });
        attachCopy(el);
      }
    }
    // buttons
    node.querySelector('[data-act=up]').addEventListener('click', () => {
      if (idx === 0) return;
      const arr = state[kind];
      [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]];
      save(); renderList(kind);
    });
    node.querySelector('[data-act=down]').addEventListener('click', () => {
      const arr = state[kind];
      if (idx === arr.length - 1) return;
      [arr[idx+1], arr[idx]] = [arr[idx], arr[idx+1]];
      save(); renderList(kind);
    });
    node.querySelector('[data-act=remove]').addEventListener('click', () => {
      if (!confirm('Remove this entry?')) return;
      state[kind].splice(idx, 1); save(); renderList(kind);
    });
    host.appendChild(node);
  });
}

function setupAddButtons(){
  for (const btn of $$('[data-add]')){
    const kind = btn.dataset.add;
    btn.addEventListener('click', () => {
      state[kind].push(structuredClone(EMPTY[kind]));
      save(); renderList(kind);
      // scroll to last card
      const list = $('#' + kind + 'List');
      const last = list.lastElementChild;
      if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}

// ---- Tabs ----------------------------------------------------------
function setupTabs(){
  $('#tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tab]');
    if (!btn) return;
    const id = btn.dataset.tab;
    for (const b of $$('#tabs button')) b.classList.toggle('on', b === btn);
    for (const p of $$('main > .pane')) p.classList.toggle('on', p.dataset.pane === id);
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
}

// ---- Toast ---------------------------------------------------------
let toastT;
function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, 1800);
}

// ---- Bookmarklet generator -----------------------------------------
function buildBookmarklet(){
  // FILL_SCRIPT is injected at build time? No — we keep it readable here.
  // We embed JSON data and the runtime that fills fields.
  const data = JSON.stringify(state);
  // Runtime script. Keep self-contained, no external deps.
  // Strategy: match each input/textarea by name/id/placeholder/aria-label/autocomplete/label
  // against a list of regex patterns per field, only fill empty fields.
  const runtime = `(function(){
    try{
      var D=__DATA__;
      var P=[
        ["personal.firstName",     /(first[\\s_-]*name|fname|given[\\s_-]*name|givenname)/i],
        ["personal.lastName",      /(last[\\s_-]*name|lname|family[\\s_-]*name|surname|familyname)/i],
        ["personal.middleName",    /(middle[\\s_-]*name|mname|middle initial)/i],
        ["personal.preferredName", /(preferred[\\s_-]*name|nickname|name you go by|what.*call you)/i],
        ["personal.pronouns",      /pronoun/i],
        ["personal.headline",      /(headline|current title|professional title)/i],
        ["fullName",               /(full[\\s_-]*name|legal[\\s_-]*name|^your name$|^name$)/i],
        ["contact.email",          /e[\\s_-]?mail/i],
        ["contact.phone",          /(phone|mobile|cell|tel)/i],
        ["contact.address1",       /(address[\\s_-]*(line[\\s_-]*)?1|street[\\s_-]*address|street)/i],
        ["contact.address2",       /(address[\\s_-]*(line[\\s_-]*)?2|(^|[^a-z])(apt|apartment|unit|suite)([^a-z]|$))/i],
        ["contact.city",           /(^|[^a-z])(city|town|locality)([^a-z]|$)/i],
        ["contact.state",          /(^|[^a-z])(state|province|region)([^a-z]|$)|address-level1/i],
        ["contact.postalCode",     /(zip|postal|postcode)/i],
        ["contact.country",        /country/i],
        ["links.linkedin",         /linkedin/i],
        ["links.github",           /github/i],
        ["links.portfolio",        /(portfolio|personal[\\s_-]*site|personal[\\s_-]*website|website|homepage|(^|[^a-z])url([^a-z]|$))/i],
        ["links.twitter",          /(twitter|x[\\s_-]*profile)/i],
        ["workAuth.authorizedToWork",   /(authoriz|legally allowed|right to work|eligible to work)/i],
        ["workAuth.requiresSponsorship",/(sponsor|visa|require.*sponsor)/i],
        ["workAuth.veteranStatus",      /veteran/i],
        ["workAuth.disabilityStatus",   /disab/i],
        ["workAuth.raceEthnicity",      /(race|ethnic)/i],
        ["workAuth.gender",             /gender/i],
        ["logistics.desiredSalary",     /(salary|compensation|expected[\\s_-]*pay|comp.*expect)/i],
        ["logistics.noticePeriod",      /notice/i],
        ["logistics.earliestStartDate", /(start date|earliest start|available start|when.*start)/i],
        ["logistics.willingToRelocate", /relocat/i],
        ["logistics.remotePreference",  /(remote|on[\\s_-]*site|hybrid|work location preference)/i],
        ["skills",                      /(skills|technologies|tech stack)/i],
        ["summary",                     /(summary|bio|about you|professional summary|tell us about yourself)/i],
        ["exp0.company",   /(current company|most recent company|company name|employer)/i],
        ["exp0.title",     /(current title|most recent title|job title|position title)/i],
        ["exp0.location",  /(work location|job location|employer location)/i],
        ["exp0.start",     /(employment start|job start|start date.*(job|role|position))/i],
        ["exp0.end",       /(employment end|job end|end date.*(job|role|position))/i],
        ["exp0.description",/(job description|responsibilities|what.*did.*role)/i],
        ["edu0.school",    /(school|university|college|institution)/i],
        ["edu0.degree",    /(degree|qualification)/i],
        ["edu0.field",     /(field of study|major|concentration)/i],
        ["edu0.start",     /(school start|education start)/i],
        ["edu0.end",       /(graduation|school end|education end|grad year)/i],
        ["edu0.gpa",       /gpa/i]
      ];
      function get(p){
        if (p === 'fullName'){
          var pn = D.personal || {};
          return [pn.firstName, pn.middleName, pn.lastName].filter(Boolean).join(' ');
        }
        if (p.indexOf('exp0.')===0){ return (D.experience && D.experience[0]) ? (D.experience[0][p.slice(5)]||'') : ''; }
        if (p.indexOf('edu0.')===0){ return (D.education && D.education[0])   ? (D.education[0][p.slice(5)]||'')   : ''; }
        return p.split('.').reduce(function(o,k){ return (o==null)?o:o[k]; }, D) || '';
      }
      function labelText(el){
        try{
          if (el.labels && el.labels.length) return el.labels[0].textContent || '';
          if (el.id){
            var l = document.querySelector('label[for="'+el.id.replace(/"/g,'\\\\"')+'"]');
            if (l) return l.textContent || '';
          }
          var cl = el.closest && el.closest('label');
          if (cl) return cl.textContent || '';
          var prev = el.previousElementSibling;
          while (prev && prev.tagName !== 'LABEL') prev = prev.previousElementSibling;
          if (prev) return prev.textContent || '';
        }catch(_){}
        return '';
      }
      function matchText(el){
        return [el.name, el.id, el.placeholder, el.getAttribute('aria-label'), el.getAttribute('autocomplete'), el.getAttribute('data-testid'), labelText(el)]
          .filter(Boolean).join(' ').replace(/\\s+/g,' ');
      }
      function setVal(el, v){
        try{
          var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          var desc = Object.getOwnPropertyDescriptor(proto, 'value');
          if (desc && desc.set) desc.set.call(el, v); else el.value = v;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        } catch(_){ try { el.value = v; } catch(__){} }
      }
      var inputs = document.querySelectorAll('input, textarea');
      var filled = 0, skipped = 0;
      for (var i=0;i<inputs.length;i++){
        var el = inputs[i];
        var t = (el.type||'').toLowerCase();
        if (t==='hidden'||t==='submit'||t==='button'||t==='checkbox'||t==='radio'||t==='file'||t==='image'||t==='reset') continue;
        if (el.disabled || el.readOnly) continue;
        if (el.value && String(el.value).trim()) { skipped++; continue; }
        var text = matchText(el);
        if (!text) continue;
        for (var j=0;j<P.length;j++){
          if (P[j][1].test(text)){
            var v = get(P[j][0]);
            if (v){ setVal(el, v); filled++; break; }
          }
        }
      }
      var tt = document.createElement('div');
      tt.textContent = 'Autofill: filled '+filled+' field'+(filled===1?'':'s')+(skipped?' ('+skipped+' already had values)':'');
      tt.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#111;color:#fff;padding:12px 18px;border-radius:999px;font:600 14px -apple-system,system-ui,sans-serif;z-index:2147483647;box-shadow:0 8px 24px rgba(0,0,0,.35);max-width:90vw;text-align:center';
      document.body.appendChild(tt);
      setTimeout(function(){ tt.parentNode && tt.parentNode.removeChild(tt); }, 3000);
    } catch(err){
      alert('Autofill error: ' + (err && err.message || err));
    }
  })();`;
  // Use the function form of replace so '$' inside data (e.g. "$150,000") isn't interpreted as a backreference.
  const body = runtime.replace('__DATA__', () => data);
  // Build javascript: URL
  return 'javascript:' + encodeURIComponent(body);
}

function setupBookmarklet(){
  const out = $('#bmOut');
  const copyBtn = $('#copyBm');
  const gen = $('#genBm');
  let current = '';
  gen.addEventListener('click', () => {
    current = buildBookmarklet();
    out.value = current;
    copyBtn.disabled = false;
    toast('Bookmarklet ready (' + Math.round(current.length/1024) + ' KB)');
  });
  copyBtn.addEventListener('click', async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current);
      toast('Copied — now paste into a Safari bookmark URL');
    } catch {
      out.select();
      document.execCommand('copy');
      toast('Copied');
    }
  });
}

// ---- Export / Import / Clear --------------------------------------
function setupBackup(){
  $('#exportJson').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0,10);
    a.href = url; a.download = `job-autofill-${stamp}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  });
  $('#importJson').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const txt = await f.text();
      const parsed = JSON.parse(txt);
      if (!confirm('Replace current data with the contents of this file?')) return;
      state = merge(structuredClone(DEFAULTS), parsed);
      save();
      // Re-render everything
      for (const el of $$('[data-path]')) el.value = getPath(el.dataset.path) ?? '';
      for (const k of LISTS) renderList(k);
      toast('Imported');
    } catch (err) {
      toast('Could not parse JSON');
    } finally {
      e.target.value = '';
    }
  });
  $('#clearAll').addEventListener('click', () => {
    if (!confirm('Erase all autofill data on this device? This cannot be undone.')) return;
    state = structuredClone(DEFAULTS);
    localStorage.removeItem(KEY);
    for (const el of $$('[data-path]')) el.value = '';
    for (const k of LISTS) renderList(k);
    toast('Cleared');
  });
}

// ---- Init ---------------------------------------------------------
function init(){
  bindPaths();
  for (const k of LISTS) renderList(k);
  setupAddButtons();
  setupTabs();
  setupBookmarklet();
  setupBackup();
}
init();
