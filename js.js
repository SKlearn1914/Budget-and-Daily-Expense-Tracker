
// Simple budget & expense tracker using localStorage
const LS_BUDGET = 'bm_budget_v1';
const LS_EXP = 'bm_expenses_v1';

// UI refs
const budgetInput = document.getElementById('budgetInput');
const saveBudget = document.getElementById('saveBudget');
const budgetValue = document.getElementById('budgetValue');
const spentValue = document.getElementById('spentValue');
const remainingValue = document.getElementById('remainingValue');
const spendProgress = document.getElementById('spendProgress');
const title = document.getElementById('title');
const amount = document.getElementById('amount');
const category = document.getElementById('category');
const dateInput = document.getElementById('date');
const addBtn = document.getElementById('addBtn');
const expensesList = document.getElementById('expensesList');
const txList = document.getElementById('txList');
const exportBtn = document.getElementById('exportBtn');
const resetBtn = document.getElementById('resetBtn');
const addSample = document.getElementById('addSample');
const downloadJSON = document.getElementById('downloadJSON');
const importFile = document.getElementById('importFile');

const searchInput = document.getElementById('search');
const filterCat = document.getElementById('filterCat');
const fromDate = document.getElementById('fromDate');
const toDate = document.getElementById('toDate');
const applyFilters = document.getElementById('applyFilters');
const clearFilters = document.getElementById('clearFilters');

// state
let budget = 0;
let expenses = []; // {id,title,amount,category,date}

// charts
let pieChart, lineChart;

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

function load() {
  const b = localStorage.getItem(LS_BUDGET);
  const e = localStorage.getItem(LS_EXP);
  budget = b ? parseFloat(b) : 0;
  expenses = e ? JSON.parse(e) : [];
  renderAll();
}

function save() {
  localStorage.setItem(LS_BUDGET, String(budget));
  localStorage.setItem(LS_EXP, JSON.stringify(expenses));
}

function setBudget(v) { budget = Number(v) || 0; save(); renderStats(); }

function addExpense(it) { expenses.unshift(it); save(); renderAll(); }

function deleteExpense(id) { expenses = expenses.filter(e => e.id !== id); save(); renderAll(); }

function editExpense(id, patch) { expenses = expenses.map(e => e.id === id ? { ...e, ...patch } : e); save(); renderAll(); }

function totalSpent() { return expenses.reduce((s, e) => s + Number(e.amount), 0); }

function renderStats() {
  budgetValue.textContent = `PKR ${formatNum(budget)}`;
  const spent = totalSpent();
  spentValue.textContent = `PKR ${formatNum(spent)}`;
  const rem = Math.max(0, budget - spent);
  remainingValue.textContent = `PKR ${formatNum(rem)}`;
  const pct = budget > 0 ? Math.min(100, Math.round(spent / budget * 100)) : 0;
  spendProgress.style.width = pct + '%';
  if (pct > 90) spendProgress.style.background = getComputedStyle(document.documentElement).getPropertyValue('--danger') || '#fb7185';
  else spendProgress.style.background = 'linear-gradient(90deg,var(--accent),#7c3aed)';
}

function formatNum(n) { return Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }); }

function renderExpensesList() {
  expensesList.innerHTML = '';
  const small = expenses.slice(0, 8);
  if (small.length === 0) { expensesList.innerHTML = '<p class="muted">No recent expenses. Add your first expense above.</p>'; return }
  small.forEach(e => {
    const div = document.createElement('div'); div.className = 'item';
    const left = document.createElement('div'); left.className = 'left';
    const tag = document.createElement('div'); tag.className = 'tag category-' + e.category; tag.textContent = capitalize(e.category);
    const txt = document.createElement('div'); txt.innerHTML = `<div style="font-weight:700">${e.title}</div><div class="muted">${formatDate(e.date)}</div>`;
    left.appendChild(tag); left.appendChild(txt);
    const right = document.createElement('div'); right.innerHTML = `<div style="text-align:right"><div style="font-weight:800">PKR ${formatNum(e.amount)}</div><div class="muted">${timeAgo(e.date)}</div></div>`;
    const actions = document.createElement('div'); actions.style.marginLeft = '12px';
    const del = document.createElement('button'); del.className = 'btn-ghost'; del.textContent = 'Delete'; del.onclick = () => { if (confirm('Delete this entry?')) deleteExpense(e.id) };
    const edit = document.createElement('button'); edit.className = 'btn-ghost'; edit.style.marginLeft = '6px'; edit.textContent = 'Edit'; edit.onclick = () => openEditDialog(e);
    actions.appendChild(edit); actions.appendChild(del);
    right.appendChild(actions);
    div.appendChild(left); div.appendChild(right);
    expensesList.appendChild(div);
  })
}

function renderTxList(filter = {}) {
  txList.innerHTML = '';
  let arr = [...expenses];
  if (filter.q) { const q = filter.q.toLowerCase(); arr = arr.filter(x => x.title.toLowerCase().includes(q) || x.category.toLowerCase().includes(q)); }
  if (filter.cat && filter.cat !== 'all') { arr = arr.filter(x => x.category === filter.cat); }
  if (filter.from) { arr = arr.filter(x => new Date(x.date) >= new Date(filter.from)); }
  if (filter.to) { arr = arr.filter(x => new Date(x.date) <= new Date(filter.to)); }
  if (arr.length === 0) { txList.innerHTML = '<p class="muted">No transactions found for selected filters.</p>'; return }
  arr.forEach(e => {
    const d = document.createElement('div'); d.className = 'item';
    d.innerHTML = `<div class="left"><div class="tag category-${e.category}">${capitalize(e.category)}</div><div><div style="font-weight:700">${e.title}</div><div class="muted">${formatDate(e.date)}</div></div></div><div style="text-align:right"><div style="font-weight:800">PKR ${formatNum(e.amount)}</div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px"><button class="btn-ghost editBtn">Edit</button><button class="btn-ghost delBtn">Delete</button></div></div>`;
    const editBtn = d.querySelector('.editBtn'); const delBtn = d.querySelector('.delBtn');
    editBtn.onclick = () => openEditDialog(e);
    delBtn.onclick = () => { if (confirm('Delete this transaction?')) deleteExpense(e.id) };
    txList.appendChild(d);
  })
}

function updateCharts() {
  // pie by category
  const byCat = expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + Number(e.amount); return acc }, {});
  const labels = Object.keys(byCat).map(k => capitalize(k));
  const data = Object.values(byCat);

  if (!pieChart) { pieChart = new Chart(document.getElementById('pieChart'), { type: 'doughnut', data: { labels, datasets: [{ data, hoverOffset: 8 }] }, options: { plugins: { legend: { position: 'bottom' } } } }); }
  else { pieChart.data.labels = labels; pieChart.data.datasets[0].data = data; pieChart.update(); }

  // line: daily totals for last 30 days
  const days = 30; const dayMap = {};
  for (let i = days - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const key = isoDate(d); dayMap[key] = 0; }
  expenses.forEach(e => { const k = isoDate(new Date(e.date)); if (dayMap.hasOwnProperty(k)) dayMap[k] += Number(e.amount); });
  const lineLabels = Object.keys(dayMap); const lineData = Object.values(dayMap);
  if (!lineChart) { lineChart = new Chart(document.getElementById('lineChart'), { type: 'line', data: { labels: lineLabels, datasets: [{ label: 'Daily spending', fill: true, tension: 0.3, data: lineData }] }, options: { scales: { y: { beginAtZero: true } } } }); }
  else { lineChart.data.labels = lineLabels; lineChart.data.datasets[0].data = lineData; lineChart.update(); }
}

function renderAll() { renderStats(); renderExpensesList(); renderTxList({}); updateCharts(); }

// utilities
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function isoDate(d) { const t = new Date(d); return t.toISOString().slice(0, 10); }
function formatDate(d) { return new Date(d).toLocaleDateString(); }
function timeAgo(d) { const diff = Date.now() - new Date(d); const days = Math.floor(diff / (1000 * 60 * 60 * 24)); if (days === 0) return 'Today'; if (days === 1) return '1 day ago'; return `${days} days ago`; }

// edit dialog (simple prompt-based)
function openEditDialog(e) { const newTitle = prompt('Edit title', e.title); if (newTitle === null) return; const newAmt = prompt('Edit amount (PKR)', e.amount); if (newAmt === null) return; const newDate = prompt('Date (YYYY-MM-DD)', e.date); if (newDate === null) return; const newCat = prompt('Category (food/transport/rent/shopping/entertainment/other)', e.category); if (newCat === null) return; editExpense(e.id, { title: newTitle, amount: Number(newAmt) || 0, date: newDate, category: newCat }); }

// event handlers
saveBudget.onclick = () => { setBudget(budgetInput.value); budgetInput.value = ''; };
addBtn.onclick = () => {
  const t = title.value.trim(); const a = Number(amount.value); const c = category.value; const d = dateInput.value || isoDate(new Date());
  if (!t || !a) { alert('Please provide title and amount'); return }
  addExpense({ id: uid(), title: t, amount: a, category: c, date: d });
  title.value = ''; amount.value = ''; dateInput.value = '';
}

exportBtn.onclick = () => exportCSV();
resetBtn.onclick = () => { if (confirm('Clear all data (this cannot be undone)?')) { localStorage.removeItem(LS_EXP); localStorage.removeItem(LS_BUDGET); budget = 0; expenses = []; renderAll(); } }
addSample.onclick = () => {
  const sample = [
    { id: uid(), title: 'Groceries', amount: 2200, category: 'food', date: isoDate(new Date()) },
    { id: uid(), title: 'Bus Fare', amount: 120, category: 'transport', date: isoDate(new Date(new Date().setDate(new Date().getDate() - 1))) },
    { id: uid(), title: 'Electricity Bill', amount: 5400, category: 'rent', date: isoDate(new Date(new Date().setDate(new Date().getDate() - 3))) },
    { id: uid(), title: 'Movie Night', amount: 950, category: 'entertainment', date: isoDate(new Date(new Date().setDate(new Date().getDate() - 5))) }
  ];
  expenses = sample.concat(expenses); save(); renderAll();
}

downloadJSON.onclick = () => {
  const blob = new Blob([JSON.stringify({ budget, expenses }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'bm-backup.json'; a.click(); URL.revokeObjectURL(url);
}

importFile.onchange = (e) => {
  const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => {
    try { const j = JSON.parse(r.result); if (j.expenses && Array.isArray(j.expenses)) { expenses = j.expenses; budget = Number(j.budget) || 0; save(); renderAll(); alert('Imported successfully'); } else alert('Invalid file'); } catch (err) { alert('Invalid JSON file') }
  }; r.readAsText(f);
}

// filters
applyFilters.onclick = () => {
  renderTxList({ q: searchInput.value, cat: filterCat.value, from: fromDate.value, to: toDate.value });
}
clearFilters.onclick = () => { searchInput.value = ''; filterCat.value = 'all'; fromDate.value = ''; toDate.value = ''; renderTxList({}); }

// export csv
function exportCSV() {
  if (expenses.length === 0) { alert('No expenses to export'); return }
  const headers = ['id', 'title', 'amount', 'category', 'date'];
  const rows = expenses.map(e => headers.map(h => '"' + String(e[h] || '') + '"').join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'expenses.csv'; a.click(); URL.revokeObjectURL(url);
}

// simple CSV import could be added by user

// init
load();

// expose small helper for debugging
window.bm = { getAll: () => ({ budget, expenses }), clear: () => { localStorage.removeItem(LS_EXP); localStorage.removeItem(LS_BUDGET); expenses = []; budget = 0; renderAll(); } }
