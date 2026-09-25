/* ═══════════════════════════════════════════════════════════════
   script.js — Expense & Budget Visualizer
   Sections:
     1.  State & localStorage helpers
     2.  DOM references
     3.  Utility helpers
     4.  Render — Transaction List
     5.  Render — Total spending
     6.  Render — Spending Limit progress bar
     7.  Render — Chart (Chart.js doughnut)
     8.  Render — all (convenience wrapper)
     9.  Form — validation & submit
    10.  Delete transaction
    11.  Sort handler
    12.  Spending Limit handler
    13.  Dark / Light mode toggle
    14.  Initialise app
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────
   1. STATE & LOCALSTORAGE HELPERS
───────────────────────────────────────────── */

const STORAGE_KEYS = {
  transactions: 'ebv_transactions',
  limit:        'ebv_limit',
  theme:        'ebv_theme',
  sort:         'ebv_sort',
};

/**
 * Central application state.
 * All render functions read from here.
 */
const state = {
  transactions: [],   // Array of { id, name, amount, category }
  limit:        0,    // Spending limit (0 = not set)
  theme:        'light',
  sort:         'default',
};

/** Persist the transactions array to localStorage. */
function saveTransactions() {
  localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(state.transactions));
}

/** Load persisted data into state on startup. */
function loadFromStorage() {
  try {
    const txRaw = localStorage.getItem(STORAGE_KEYS.transactions);
    state.transactions = txRaw ? JSON.parse(txRaw) : [];
  } catch {
    state.transactions = [];
  }

  const limitRaw = localStorage.getItem(STORAGE_KEYS.limit);
  state.limit = limitRaw ? parseFloat(limitRaw) : 0;

  const themeRaw = localStorage.getItem(STORAGE_KEYS.theme);
  state.theme = themeRaw === 'dark' ? 'dark' : 'light';

  const sortRaw = localStorage.getItem(STORAGE_KEYS.sort);
  state.sort = sortRaw || 'default';
}


/* ─────────────────────────────────────────────
   2. DOM REFERENCES
───────────────────────────────────────────── */

const dom = {
  // Summary
  totalAmount:      document.getElementById('total-amount'),

  // Limit
  limitInput:       document.getElementById('limit-input'),
  setLimitBtn:      document.getElementById('set-limit-btn'),
  limitProgressWrap:document.getElementById('limit-progress-wrap'),
  limitSpentLabel:  document.getElementById('limit-spent-label'),
  limitOfLabel:     document.getElementById('limit-of-label'),
  progressBarTrack: document.getElementById('progress-bar-track'),
  progressBarFill:  document.getElementById('progress-bar-fill'),
  limitWarning:     document.getElementById('limit-warning'),

  // Form
  form:             document.getElementById('transaction-form'),
  itemName:         document.getElementById('item-name'),
  itemAmount:       document.getElementById('item-amount'),
  itemCategory:     document.getElementById('item-category'),
  errorName:        document.getElementById('error-name'),
  errorAmount:      document.getElementById('error-amount'),
  errorCategory:    document.getElementById('error-category'),

  // Chart
  chartCanvas:      document.getElementById('spending-chart'),
  chartEmpty:       document.getElementById('chart-empty'),

  // List
  transactionList:  document.getElementById('transaction-list'),
  listEmpty:        document.getElementById('list-empty'),
  sortSelect:       document.getElementById('sort-select'),

  // Theme toggle
  themeToggle:      document.getElementById('theme-toggle'),
  themeIcon:        document.getElementById('theme-icon'),
};


/* ─────────────────────────────────────────────
   3. UTILITY HELPERS
───────────────────────────────────────────── */

/**
 * Format a number as a USD currency string.
 * @param {number} value
 * @returns {string}  e.g. "$12.50"
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Generate a simple unique id.
 * Falls back to Date.now() + random if crypto API is unavailable.
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Return the emoji icon for a given category.
 * @param {string} category
 * @returns {string}
 */
function categoryIcon(category) {
  const icons = { Food: '🍔', Transport: '🚌', Fun: '🎉' };
  return icons[category] || '📦';
}

/**
 * Compute the total spending from state.transactions.
 * @returns {number}
 */
function computeTotal() {
  return state.transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Return a sorted copy of state.transactions for rendering.
 * Source array is never mutated.
 * @returns {Array}
 */
function getSortedTransactions() {
  const copy = [...state.transactions];
  switch (state.sort) {
    case 'amount-asc':
      return copy.sort((a, b) => a.amount - b.amount);
    case 'amount-desc':
      return copy.sort((a, b) => b.amount - a.amount);
    case 'category-az':
      return copy.sort((a, b) => a.category.localeCompare(b.category));
    default:
      // Newest first — original insertion order reversed
      return copy.reverse();
  }
}

/**
 * Aggregate transaction amounts by category.
 * @returns {{ labels: string[], data: number[], colors: string[] }}
 */
function getChartData() {
  const map = {};
  for (const tx of state.transactions) {
    map[tx.category] = (map[tx.category] || 0) + tx.amount;
  }

  const palette = {
    Food:      '#fb923c',
    Transport: '#38bdf8',
    Fun:       '#a78bfa',
  };
  const fallbackColors = [
    '#f43f5e','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ec4899',
  ];
  let fallbackIdx = 0;

  const labels  = [];
  const data    = [];
  const colors  = [];

  for (const [label, amount] of Object.entries(map)) {
    labels.push(label);
    data.push(parseFloat(amount.toFixed(2)));
    colors.push(palette[label] || fallbackColors[fallbackIdx++ % fallbackColors.length]);
  }

  return { labels, data, colors };
}


/* ─────────────────────────────────────────────
   4. RENDER — TRANSACTION LIST
───────────────────────────────────────────── */

function renderTransactionList() {
  const sorted = getSortedTransactions();
  dom.transactionList.innerHTML = '';

  if (sorted.length === 0) {
    dom.listEmpty.hidden = false;
    return;
  }

  dom.listEmpty.hidden = true;

  for (const tx of sorted) {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.dataset.id = tx.id;

    li.innerHTML = `
      <div class="txn-badge" data-category="${tx.category}" aria-hidden="true">
        ${categoryIcon(tx.category)}
      </div>
      <div class="txn-info">
        <p class="txn-name" title="${escapeHtml(tx.name)}">${escapeHtml(tx.name)}</p>
        <p class="txn-category">${escapeHtml(tx.category)}</p>
      </div>
      <span class="txn-amount">${formatCurrency(tx.amount)}</span>
      <button
        class="txn-delete"
        data-id="${tx.id}"
        aria-label="Delete ${escapeHtml(tx.name)}"
        title="Delete transaction"
      >✕</button>
    `;

    dom.transactionList.appendChild(li);
  }
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


/* ─────────────────────────────────────────────
   5. RENDER — TOTAL SPENDING
───────────────────────────────────────────── */

function renderTotal() {
  const total = computeTotal();
  dom.totalAmount.textContent = formatCurrency(total);
}


/* ─────────────────────────────────────────────
   6. RENDER — SPENDING LIMIT PROGRESS BAR
───────────────────────────────────────────── */

function renderLimitProgress() {
  const total = computeTotal();
  const limit = state.limit;

  if (limit <= 0) {
    dom.limitProgressWrap.hidden = true;
    return;
  }

  dom.limitProgressWrap.hidden = false;

  // Calculate percentage (cap display at 100% visually)
  const pct = Math.min((total / limit) * 100, 100);

  dom.progressBarFill.style.width = `${pct}%`;
  dom.progressBarTrack.setAttribute('aria-valuenow', Math.round(pct));

  // Colour coding: green < 75%, orange 75–99%, red ≥ 100%
  if (total >= limit) {
    dom.progressBarFill.dataset.status = 'over';
    dom.limitWarning.hidden = false;
  } else if (total / limit >= 0.75) {
    dom.progressBarFill.dataset.status = 'warn';
    dom.limitWarning.hidden = true;
  } else {
    dom.progressBarFill.dataset.status = '';
    dom.limitWarning.hidden = true;
  }

  dom.limitSpentLabel.textContent = `${formatCurrency(total)} spent`;
  dom.limitOfLabel.textContent    = `of ${formatCurrency(limit)}`;
}


/* ─────────────────────────────────────────────
   7. RENDER — CHART (Chart.js doughnut)
───────────────────────────────────────────── */

/** Holds the Chart.js instance so we can update it in place. */
let chartInstance = null;

function renderChart() {
  const { labels, data, colors } = getChartData();
  const hasData = data.length > 0;

  // Toggle empty-state message
  dom.chartEmpty.hidden = hasData;

  if (!hasData) {
    // Destroy chart if it exists but there's no data
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  // Determine label colour based on theme
  const labelColor = state.theme === 'dark' ? '#94a3b8' : '#64748b';

  if (chartInstance) {
    // Update existing chart in-place (smooth transition)
    chartInstance.data.labels              = labels;
    chartInstance.data.datasets[0].data    = data;
    chartInstance.data.datasets[0].backgroundColor = colors;
    chartInstance.options.plugins.legend.labels.color = labelColor;
    chartInstance.update();
  } else {
    // Create fresh chart instance
    chartInstance = new Chart(dom.chartCanvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor:     'transparent',
          hoverOffset:     8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color:     labelColor,
              font:      { size: 12 },
              padding:   16,
              usePointStyle: true,
              pointStyleWidth: 10,
            },
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const val   = ctx.parsed;
                const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
                const pct   = ((val / total) * 100).toFixed(1);
                return ` ${formatCurrency(val)}  (${pct}%)`;
              },
            },
          },
        },
        animation: {
          animateRotate: true,
          duration: 500,
        },
      },
    });
  }
}


/* ─────────────────────────────────────────────
   8. RENDER — ALL (convenience wrapper)
───────────────────────────────────────────── */

/**
 * Re-render every UI section.
 * Call this after any state mutation.
 */
function renderAll() {
  renderTransactionList();
  renderTotal();
  renderLimitProgress();
  renderChart();
}


/* ─────────────────────────────────────────────
   9. FORM — VALIDATION & SUBMIT
───────────────────────────────────────────── */

/**
 * Clear all inline validation errors and invalid classes.
 */
function clearFormErrors() {
  dom.errorName.textContent     = '';
  dom.errorAmount.textContent   = '';
  dom.errorCategory.textContent = '';
  dom.itemName.classList.remove('is-invalid');
  dom.itemAmount.classList.remove('is-invalid');
  dom.itemCategory.classList.remove('is-invalid');
}

/**
 * Validate the form. Returns true if valid, false otherwise.
 * Sets error messages inline next to each invalid field.
 * @returns {boolean}
 */
function validateForm() {
  let valid = true;

  const name     = dom.itemName.value.trim();
  const amount   = parseFloat(dom.itemAmount.value);
  const category = dom.itemCategory.value;

  if (!name) {
    dom.errorName.textContent = 'Item name is required.';
    dom.itemName.classList.add('is-invalid');
    valid = false;
  }

  if (!dom.itemAmount.value.trim() || isNaN(amount) || amount <= 0) {
    dom.errorAmount.textContent = 'Please enter a valid amount greater than 0.';
    dom.itemAmount.classList.add('is-invalid');
    valid = false;
  }

  if (!category) {
    dom.errorCategory.textContent = 'Please select a category.';
    dom.itemCategory.classList.add('is-invalid');
    valid = false;
  }

  return valid;
}

/** Handle form submission. */
function handleFormSubmit(e) {
  e.preventDefault();
  clearFormErrors();

  if (!validateForm()) return;

  const newTransaction = {
    id:       generateId(),
    name:     dom.itemName.value.trim(),
    amount:   parseFloat(parseFloat(dom.itemAmount.value).toFixed(2)),
    category: dom.itemCategory.value,
  };

  state.transactions.push(newTransaction);
  saveTransactions();
  renderAll();

  // Reset form
  dom.form.reset();
  dom.itemName.focus();
}


/* ─────────────────────────────────────────────
   10. DELETE TRANSACTION
───────────────────────────────────────────── */

/**
 * Handle clicks on the transaction list — uses event delegation
 * so we only need one listener regardless of list length.
 * @param {MouseEvent} e
 */
function handleDeleteClick(e) {
  const btn = e.target.closest('.txn-delete');
  if (!btn) return;

  const id = btn.dataset.id;
  state.transactions = state.transactions.filter(tx => tx.id !== id);
  saveTransactions();
  renderAll();
}


/* ─────────────────────────────────────────────
   11. SORT HANDLER
───────────────────────────────────────────── */

function handleSortChange(e) {
  state.sort = e.target.value;
  localStorage.setItem(STORAGE_KEYS.sort, state.sort);
  renderTransactionList(); // only the list needs re-rendering
}


/* ─────────────────────────────────────────────
   12. SPENDING LIMIT HANDLER
───────────────────────────────────────────── */

function handleSetLimit() {
  const raw = parseFloat(dom.limitInput.value);

  if (isNaN(raw) || raw < 0) {
    dom.limitInput.focus();
    dom.limitInput.select();
    return;
  }

  state.limit = raw;
  localStorage.setItem(STORAGE_KEYS.limit, raw);
  renderLimitProgress();
}

/** Allow pressing Enter inside the limit input to set the limit. */
function handleLimitKeydown(e) {
  if (e.key === 'Enter') handleSetLimit();
}


/* ─────────────────────────────────────────────
   13. DARK / LIGHT MODE TOGGLE
───────────────────────────────────────────── */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  dom.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  dom.themeToggle.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  );
  // Update chart label colours if chart exists
  if (chartInstance) {
    const labelColor = theme === 'dark' ? '#94a3b8' : '#64748b';
    chartInstance.options.plugins.legend.labels.color = labelColor;
    chartInstance.update();
  }
}

function handleThemeToggle() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(STORAGE_KEYS.theme, state.theme);
  applyTheme(state.theme);
}


/* ─────────────────────────────────────────────
   14. INITIALISE APP
───────────────────────────────────────────── */

function init() {
  // 1. Load persisted state
  loadFromStorage();

  // 2. Apply saved theme immediately (prevents flash)
  applyTheme(state.theme);

  // 3. Restore sort dropdown selection
  dom.sortSelect.value = state.sort;

  // 4. Restore limit input value
  if (state.limit > 0) {
    dom.limitInput.value = state.limit;
  }

  // 5. Render all UI sections
  renderAll();

  // 6. Attach event listeners
  dom.form.addEventListener('submit', handleFormSubmit);
  dom.transactionList.addEventListener('click', handleDeleteClick);
  dom.sortSelect.addEventListener('change', handleSortChange);
  dom.setLimitBtn.addEventListener('click', handleSetLimit);
  dom.limitInput.addEventListener('keydown', handleLimitKeydown);
  dom.themeToggle.addEventListener('click', handleThemeToggle);

  // Clear field-level errors on input to give immediate feedback
  dom.itemName.addEventListener('input', () => {
    dom.errorName.textContent = '';
    dom.itemName.classList.remove('is-invalid');
  });
  dom.itemAmount.addEventListener('input', () => {
    dom.errorAmount.textContent = '';
    dom.itemAmount.classList.remove('is-invalid');
  });
  dom.itemCategory.addEventListener('change', () => {
    dom.errorCategory.textContent = '';
    dom.itemCategory.classList.remove('is-invalid');
  });
}

// Kick everything off once the DOM is ready
document.addEventListener('DOMContentLoaded', init);
