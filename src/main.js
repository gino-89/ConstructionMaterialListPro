import './style.css'
import { MASTER_MATERIALS } from './materials.js'

/**
 * Material List Pro - Logic & Persistence
 */

// --- State Management ---
let state = {
  currentView: 'dashboard',
  currentSite: localStorage.getItem('current_site_name') || '',
  currentList: JSON.parse(localStorage.getItem('material_draft')) || [], // Load from draft
  editingListIndex: JSON.parse(localStorage.getItem('editing_index')) || null, // Persist edit mode
  language: localStorage.getItem('app_language') || 'es', // Preferred language
  theme: localStorage.getItem('app_theme') || 'dark', // 'dark' or 'light'

  // Custom work locations (Lugares de Trabajo)
  savedLocations: JSON.parse(localStorage.getItem('saved_locations')) || [],

  // Material Suggestions: Master (Static) + User (Persistent)
  userSuggestions: JSON.parse(localStorage.getItem('material_suggestions_user')) || [],
  get suggestions() {
    // Merge Master and User suggestions, removing duplicates
    return [...new Set([...MASTER_MATERIALS, ...this.userSuggestions])];
  },

  // History of saved lists (loaded from localStorage)
  history: JSON.parse(localStorage.getItem('material_lists_history')) || [],
};

// --- DOM Elements ---
const views = {
  dashboard: document.getElementById('view-dashboard'),
  add: document.getElementById('view-add'),
  review: document.getElementById('view-review'),
  history: document.getElementById('view-history'),
  settings: document.getElementById('view-settings'),
};

const navButtons = {
  dashboard: document.getElementById('nav-dashboard'),
  history: document.getElementById('nav-history'),
  settings: document.getElementById('nav-settings'),
};

const components = {
  siteInput: document.getElementById('site-input'),
  locationSuggestions: document.getElementById('location-suggestions'),
  recentActivity: document.getElementById('recent-activity'),
  suggestions: document.getElementById('material-suggestions'),
  finalList: document.getElementById('final-list'),
  reviewTitle: document.getElementById('review-title'),
  reviewSiteName: document.getElementById('review-site-name'),
  historyContainer: document.getElementById('history-container'),
};

const inputs = {
  material: document.getElementById('material-input'),
  qty: document.getElementById('qty-input'),
  unit: document.getElementById('unit-input'),
};

const buttons = {
  create: document.getElementById('fab-create'),
  addItem: document.getElementById('btn-add-item'),
  done: document.getElementById('btn-done'),
  share: document.getElementById('btn-share'),
  save: document.getElementById('btn-save-list'),
  reviewAdd: document.getElementById('fab-review-add'),
  clearHistory: document.getElementById('btn-clear-history'),
  export: document.getElementById('btn-export'),
  importTrigger: document.getElementById('btn-import-trigger'),
  importFile: document.getElementById('import-file'),
};

// --- Core Functions ---

/**
 * View Navigation
 */
window.showView = function (viewName) {
  // Update UI classes
  Object.keys(views).forEach(v => {
    if (v === viewName) {
      views[v].classList.remove('hidden');
      views[v].classList.add('active-view');
    } else {
      views[v].classList.add('hidden');
      views[v].classList.remove('active-view');
    }
  });

  // Update Nav Active State
  if (navButtons[viewName]) {
    Object.values(navButtons).forEach(btn => btn.classList.remove('text-primary'));
    Object.values(navButtons).forEach(btn => btn.classList.add('text-slate-500'));
    navButtons[viewName].classList.add('text-primary');
    navButtons[viewName].classList.remove('text-slate-500');
  }

  state.currentView = viewName;

  // Refresh views when entering them
  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'history') renderHistory();
  if (viewName === 'add') {
    renderFinalList();
    renderLocationSuggestions(); // Refresh locations when starting new list
    renderMaterialSuggestions(''); // Hide suggestions initially
  }
  if (viewName === 'settings') {
    updateLanguageUI();
  }
};

/**
 * Rendering: Location Suggestions
 */
function renderLocationSuggestions() {
  if (!components.locationSuggestions) return;
  components.locationSuggestions.innerHTML = '';

  state.savedLocations.forEach((loc, idx) => {
    const chip = document.createElement('div');
    chip.className = 'flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900/5 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 transition-all';

    // Select Button
    const btnSelect = document.createElement('button');
    btnSelect.className = 'flex items-center text-[10px] text-slate-600 dark:text-slate-400 hover:text-primary';
    btnSelect.innerHTML = `<span class="material-icons text-[10px] mr-1">history</span>${loc}`;
    btnSelect.onclick = () => {
      state.currentSite = loc;
      components.siteInput.value = loc;
      syncState();
    };

    // Delete Button
    const btnDel = document.createElement('button');
    btnDel.className = 'ml-1 text-slate-600 hover:text-red-400 p-0.5 rounded';
    btnDel.innerHTML = '<span class="material-icons text-[10px]">close</span>';
    btnDel.onclick = (e) => {
      e.stopPropagation();
      window.deleteLocation(idx);
    };

    chip.appendChild(btnSelect);
    chip.appendChild(btnDel);
    components.locationSuggestions.appendChild(chip);
  });
}

window.deleteLocation = (index) => {
  state.savedLocations.splice(index, 1);
  localStorage.setItem('saved_locations', JSON.stringify(state.savedLocations));
  renderLocationSuggestions();
};

/**
 * Logic: Modern Modal Controller
 */
window.showModal = ({ title, message, type = 'info', confirmText = 'ACEPTAR', cancelText = 'CANCELAR', onConfirm = null }) => {
  const modal = document.getElementById('custom-modal');
  const titleEl = document.getElementById('modal-title');
  const messageEl = document.getElementById('modal-message');
  const btnConfirm = document.getElementById('modal-confirm');
  const btnCancel = document.getElementById('modal-cancel');
  const icon = document.getElementById('modal-icon');
  const iconContainer = document.getElementById('modal-icon-container');

  if (!modal) return;

  // Set Content
  titleEl.textContent = title;
  messageEl.textContent = message;
  btnConfirm.textContent = confirmText;
  btnCancel.textContent = cancelText;

  // Set Type/Icon
  if (type === 'danger') {
    icon.textContent = 'warning';
    iconContainer.className = 'w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 mx-auto mb-6';
    icon.className = 'material-icons text-3xl text-red-500';
    btnConfirm.className = 'flex-1 h-14 rounded-xl bg-red-500 text-white font-bold active:scale-95 transition-transform';
  } else {
    icon.textContent = (type === 'success' ? 'check_circle' : 'info');
    iconContainer.className = 'w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 mx-auto mb-6';
    icon.className = 'material-icons text-3xl text-primary';
    btnConfirm.className = 'flex-1 h-14 rounded-xl bg-primary neo-glow text-background-dark font-bold active:scale-95 transition-transform';
  }

  // Show/Hide Cancel button
  if (onConfirm) {
    btnCancel.classList.remove('hidden');
  } else {
    btnCancel.classList.add('hidden');
  }

  // Actions
  const closeModal = () => modal.classList.add('hidden');

  btnConfirm.onclick = () => {
    closeModal();
    if (onConfirm) onConfirm();
  };

  btnCancel.onclick = closeModal;
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };

  modal.classList.remove('hidden');
};

/**
 * Logic: Theme Selection (Dark/Light)
 */
window.toggleTheme = function () {
  const newTheme = state.theme === 'dark' ? 'light' : 'dark';
  state.theme = newTheme;
  localStorage.setItem('app_theme', newTheme);
  applyTheme();
};

function applyTheme() {
  const html = document.documentElement;
  const icon = document.getElementById('theme-icon');

  if (state.theme === 'dark') {
    html.classList.add('dark');
    if (icon) icon.textContent = 'light_mode';
  } else {
    html.classList.remove('dark');
    if (icon) icon.textContent = 'dark_mode';
  }
}

/**
 * Logic: Internationalization (Translation)
 */
const translations = {
  es: {
    dashboard: 'Panel',
    history: 'Listas',
    settings: 'Ajustes',
    create: 'Crear Nueva Lista',
    obra_actual: 'Listas Recientes',
    listas_recientes: 'Actividad Reciente',
    ver_todas: 'Ver todas',
    lugar_trabajo: 'Lugar de Trabajo',
    placeholder_obra: 'Escribe el nombre de la obra...',
    agregar_material: 'Agregar Material',
    material: 'Material',
    cantidad: 'Cantidad',
    unidad: 'Unidad',
    btn_agregar: 'AGREGAR A LA LISTA',
    btn_ver_lista: 'VER LISTA COMPLETA',
    resumen_lista: 'Resumen de Lista',
    btn_compartir: 'COMPARTIR LISTA',
    btn_guardado_auto: 'GUARDADO AUTOMÁTICO',
    historial_listas: 'Historial de Listas',
    btn_borrar_todo: 'BORRAR TODO',
    ajustes_sistema: 'Ajustes del Sistema',
    idioma: 'Idioma',
    desc_idioma: 'Selecciona tu idioma preferido',
    copia_seguridad: 'Respaldo y Restauración',
    desc_copia: 'Guarda o recupera tus materiales y listas personalizadas',
    btn_exportar: 'EXPORTAR',
    btn_importar: 'IMPORTAR',
    limpiar_datos: 'Limpiar Datos',
    borrar_historial: 'Borra todo el historial local',
  },
  en: {
    dashboard: 'Dashboard',
    history: 'Lists',
    settings: 'Settings',
    create: 'Create New List',
    obra_actual: 'Recent Lists',
    listas_recientes: 'Recent Activity',
    ver_todas: 'View all',
    lugar_trabajo: 'Work Location',
    placeholder_obra: 'Enter project name...',
    agregar_material: 'Add Material',
    material: 'Material',
    cantidad: 'Quantity',
    unidad: 'Unit',
    btn_agregar: 'ADD TO LIST',
    btn_ver_lista: 'VIEW FULL LIST',
    resumen_lista: 'List Summary',
    btn_compartir: 'SHARE LIST',
    btn_guardado_auto: 'AUTO SAVED',
    historial_listas: 'List History',
    btn_borrar_todo: 'CLEAR ALL',
    ajustes_sistema: 'System Settings',
    idioma: 'Language',
    desc_idioma: 'Select your preferred language',
    copia_seguridad: 'Backup & Restore',
    desc_copia: 'Save or recover your custom materials and lists',
    btn_exportar: 'EXPORT',
    btn_importar: 'IMPORT',
    limpiar_datos: 'Clear Data',
    borrar_historial: 'Clear all local history',
  },
};

window.setLanguage = function (lang) {
  state.language = lang;
  localStorage.setItem('app_language', lang);
  updateLanguageUI();
};

function updateLanguageUI() {
  const t = translations[state.language];

  // Header / Nav
  if (navButtons.dashboard) navButtons.dashboard.querySelector('span:last-child').textContent = t.dashboard;
  if (navButtons.history) navButtons.history.querySelector('span:last-child').textContent = t.history;
  if (navButtons.settings) navButtons.settings.querySelector('span:last-child').textContent = t.settings;

  // View: Dashboard
  const dashH2 = views.dashboard.querySelector('section:last-of-type h2');
  if (dashH2) dashH2.textContent = t.obra_actual;

  const activityH2 = views.dashboard.querySelector('section:first-of-type h2');
  if (activityH2) activityH2.textContent = t.listas_recientes;

  const fabText = buttons.create.querySelector('span:last-child');
  if (fabText) fabText.textContent = t.create;

  // View: Add
  const addH2s = views.add.querySelectorAll('h2');
  if (addH2s[0]) addH2s[0].textContent = t.lugar_trabajo;
  if (addH2s[1]) addH2s[1].textContent = t.agregar_material;
  // Placeholder removed for minimalist design and language consistency


  const addLabels = views.add.querySelectorAll('label');
  if (addLabels[0]) addLabels[0].textContent = t.material;
  if (addLabels[1]) addLabels[1].textContent = t.cantidad;
  if (addLabels[2]) addLabels[2].textContent = t.unidad;

  const addItemText = buttons.addItem.querySelector('span:last-child');
  if (addItemText) addItemText.textContent = t.btn_agregar;
  const doneText = buttons.done.querySelector('span:last-child');
  if (doneText) doneText.textContent = t.btn_ver_lista;

  // View: Review
  if (components.reviewTitle) components.reviewTitle.textContent = t.resumen_lista;
  const shareText = buttons.share.querySelector('span:last-child');
  if (shareText) shareText.textContent = t.btn_compartir;
  const autoSaveText = document.getElementById('btn-save-list')?.querySelector('span:last-child');
  if (autoSaveText) autoSaveText.textContent = t.btn_guardado_auto;

  // View: History
  const historyH2 = views.history.querySelector('h2');
  if (historyH2) historyH2.textContent = t.historial_listas;
  if (buttons.clearHistory) buttons.clearHistory.textContent = t.btn_borrar_todo;

  // View: Settings
  const settingsH2 = views.settings.querySelector('h2');
  if (settingsH2) settingsH2.textContent = t.ajustes_sistema;
  const settingsH3s = views.settings.querySelectorAll('h3');
  if (settingsH3s[0]) settingsH3s[0].textContent = t.idioma;
  if (settingsH3s[1]) settingsH3s[1].textContent = t.copia_seguridad;
  if (settingsH3s[2]) settingsH3s[2].textContent = t.limpiar_datos;

  const settingsPs = views.settings.querySelectorAll('p');
  if (settingsPs[0]) settingsPs[0].textContent = t.desc_idioma;
  if (settingsPs[1]) settingsPs[1].textContent = t.desc_copia;
  if (settingsPs[2]) settingsPs[2].textContent = t.borrar_historial;

  // Buttons: Export / Import (careful with icons)
  if (buttons.export) buttons.export.querySelector('span:last-child').previousSibling.textContent = ' '; // spacer
  if (buttons.export) buttons.export.querySelector('span:last-child').nextSibling.textContent = t.btn_exportar;
  if (buttons.importTrigger) buttons.importTrigger.querySelector('span:last-child').nextSibling.textContent = t.btn_importar;

  // Update button styles in settings
  const btnEs = document.getElementById('lang-es');
  const btnEn = document.getElementById('lang-en');
  if (btnEs && btnEn) {
    if (state.language === 'es') {
      btnEs.className = 'px-4 py-3 rounded-xl border border-primary/40 bg-primary/10 text-primary text-xs font-bold transition-all';
      btnEn.className = 'px-4 py-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-900/5 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs font-bold transition-all';
    } else {
      btnEn.className = 'px-4 py-3 rounded-xl border border-primary/40 bg-primary/10 text-primary text-xs font-bold transition-all';
      btnEs.className = 'px-4 py-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-900/5 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs font-bold transition-all';
    }
  }
}

function syncState() {
  // 0. Save current site name and unique locations
  localStorage.setItem('current_site_name', state.currentSite);
  localStorage.setItem('saved_locations', JSON.stringify(state.savedLocations));

  // 1. Save main history
  localStorage.setItem('material_lists_history', JSON.stringify(state.history));

  // 1.5 Save user-added suggestions library
  localStorage.setItem('material_suggestions_user', JSON.stringify(state.userSuggestions));

  // 2. Save current build state (Draft)
  localStorage.setItem('material_draft', JSON.stringify(state.currentList));
  localStorage.setItem('editing_index', JSON.stringify(state.editingListIndex));
  localStorage.setItem('app_language', state.language);

  // 3. If editing an existing list, sync the content change directly to the history object
  if (state.editingListIndex !== null && state.history[state.editingListIndex]) {
    state.history[state.editingListIndex].title = state.currentSite || 'Sin Título';
    state.history[state.editingListIndex].content = [...state.currentList];
    state.history[state.editingListIndex].items = state.currentList.length;
    state.history[state.editingListIndex].status = 'Guardado';
    localStorage.setItem('material_lists_history', JSON.stringify(state.history));
  }
}

function saveState() {
  syncState();
}

/**
 * Rendering: Dashboard (Recent Activity)
 */
function renderDashboard() {
  components.recentActivity.innerHTML = '';
  // Show only last 4 items on dashboard
  const recentLists = state.history.slice(0, 4);

  if (recentLists.length === 0) {
    components.recentActivity.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No hay actividad reciente.</p>';
    return;
  }

  recentLists.forEach((list, idx) => {
    // We need to find the actual index in state.history for the dashboard items
    const actualIndex = state.history.findIndex(h => h === list);

    const div = document.createElement('div');
    div.className = 'glass-card p-4 rounded-xl flex items-center gap-4 relative overflow-hidden active:bg-white/5 cursor-pointer';
    div.innerHTML = `
      ${idx === 0 ? '<div class="w-1 bg-primary absolute left-0 top-4 bottom-4 rounded-full"></div>' : ''}
      <div class="w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center">
        <span class="material-icons text-primary/70">${list.icon || 'list_alt'}</span>
      </div>
      <div class="flex-1">
        <div class="flex justify-between items-start">
          <h4 class="font-semibold text-slate-900 dark:text-slate-100">${list.title}</h4>
          <span class="text-[10px] text-slate-500">${list.date}</span>
        </div>
        <p class="text-xs text-slate-400">${list.items} ítems</p>
      </div>
    `;
    div.onclick = () => loadListForEditing(actualIndex);
    components.recentActivity.appendChild(div);
  });
}

/**
 * Logic: Load list for editing
 */
function loadListForEditing(index) {
  const listToEdit = state.history[index];
  if (!listToEdit) return;

  state.editingListIndex = index;
  state.currentList = [...(listToEdit.content || [])];
  state.currentSite = listToEdit.title;

  if (components.siteInput) {
    components.siteInput.value = state.currentSite;
  }

  syncState(); // Persist the fact that we are now editing this

  window.showView('review');
  if (components.reviewSiteName) components.reviewSiteName.textContent = listToEdit.title;
  renderFinalList();

  // Brief alert to inform user
  const toast = document.createElement('div');
  toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-primary text-background-dark px-4 py-2 rounded-full font-bold text-xs z-[100] neo-glow';
  toast.textContent = 'MODIFICANDO: ' + listToEdit.title;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

/**
 * Rendering: History View (All Lists)
 */
function renderHistory() {
  components.historyContainer.innerHTML = '';
  if (state.history.length === 0) {
    components.historyContainer.innerHTML = `
      <div class="glass-card p-12 rounded-xl text-center space-y-4">
        <span class="material-icons text-5xl text-slate-700">history_toggle_off</span>
        <p class="text-slate-500">Historial vacío.</p>
      </div>
    `;
    return;
  }

  state.history.forEach((list, index) => {
    const div = document.createElement('div');
    div.className = 'glass-card p-5 rounded-xl flex items-center gap-4 group active:scale-[0.98] transition-all cursor-pointer';
    div.innerHTML = `
      <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
        <span class="material-icons text-primary">${list.icon || 'list_alt'}</span>
      </div>
      <div class="flex-1">
        <div class="flex justify-between">
          <h3 class="text-base font-bold text-slate-900 dark:text-white">${list.title}</h3>
          <span class="text-[10px] text-slate-500">${list.date}</span>
        </div>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-xs text-slate-400">${list.items} ítems</span>
        </div>
      </div>
      <button onclick="event.stopPropagation(); window.deleteList(${index})" class="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
        <span class="material-icons text-sm">delete</span>
      </button>
    `;
    div.onclick = () => loadListForEditing(index);
    components.historyContainer.appendChild(div);
  });
}

window.deleteList = (index) => {
  window.showModal({
    title: '¿Borrar Lista?',
    message: 'Esta acción no se puede deshacer.',
    type: 'danger',
    confirmText: 'BORRAR',
    onConfirm: () => {
      state.history.splice(index, 1);
      saveState();
      renderHistory();
      renderDashboard();
    }
  });
};

/**
 * Rendering: Material Suggestions (Autocomplete)
 */
function renderMaterialSuggestions(filter = '') {
  if (!components.suggestions) return;
  components.suggestions.innerHTML = '';

  if (!filter.trim()) {
    components.suggestions.classList.add('hidden');
    return;
  }

  const matches = state.suggestions.filter(s =>
    s.toLowerCase().includes(filter.toLowerCase()) &&
    s.toLowerCase() !== filter.toLowerCase()
  ); // Show all matches

  if (matches.length === 0) {
    components.suggestions.classList.add('hidden');
    return;
  }

  components.suggestions.classList.remove('hidden');
  matches.forEach(text => {
    const chip = document.createElement('button');
    chip.className = 'px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-[10px] text-primary hover:bg-primary hover:text-background-dark transition-all active:scale-95';
    chip.textContent = text;
    chip.onclick = () => {
      inputs.material.value = text;
      renderMaterialSuggestions(''); // Hide suggestions
      inputs.qty.focus();
    };
    components.suggestions.appendChild(chip);
  });
}

/**
 * Logic: Saving a New List
 */
function saveCurrentList() {
  if (state.currentList.length === 0) {
    alert('La lista está vacía.');
    return;
  }

  const newList = {
    title: state.currentSite,
    items: state.currentList.length,
    status: 'Guardado',
    icon: state.editingListIndex !== null ? 'edit_note' : 'assignment_turned_in',
    date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    content: [...state.currentList]
  };

  // NEW: Save location permanently ONLY when creating/updating the list
  if (state.currentSite && !state.savedLocations.includes(state.currentSite)) {
    state.savedLocations.push(state.currentSite);
    localStorage.setItem('saved_locations', JSON.stringify(state.savedLocations));
    renderLocationSuggestions();
  }

  if (state.editingListIndex !== null) {
    // Already in history, just finalize and exit
  } else {
    // This shouldn't happen much with auto-save, but here for safety
    // Create a basic entry if somehow it wasn't created by adding items
    const newList = {
      title: state.currentSite || 'Sin Título',
      items: state.currentList.length,
      status: 'Guardado',
      icon: 'assignment_turned_in',
      date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      content: [...state.currentList]
    };
    state.history.push(newList);
    state.editingListIndex = state.history.length - 1;
  }

  saveState();

  state.currentList = []; // Clear current builder
  state.editingListIndex = null;
  state.currentSite = '';
  syncState(); // Persist clear state

  alert('¡Lista finalizada y guardada!');
  window.showView('dashboard');
}

/**
 * Rendering: Builder Items
 */
function renderFinalList() {
  components.finalList.innerHTML = '';
  if (state.currentList.length === 0) {
    components.finalList.innerHTML = `
      <div class="glass-card p-8 rounded-xl text-center space-y-2">
        <span class="material-icons text-4xl text-slate-600">inventory</span>
        <p class="text-slate-400">Agrega materiales para verlos aquí</p>
      </div>
    `;
    return;
  }

  state.currentList.forEach((item, index) => {
    // Escape quotes for safe HTML attribute usage
    const escapedName = item.name.replace(/"/g, '&quot;');
    const div = document.createElement('div');
    div.className = 'glass-card p-4 rounded-xl flex items-center justify-between group gap-3';
    div.innerHTML = `
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <div class="w-10 h-10 rounded-lg bg-primary/5 flex-shrink-0 flex items-center justify-center border border-primary/10">
          <span class="material-icons text-primary/60 text-sm">edit</span>
        </div>
        <div class="flex-1 min-w-0 space-y-1">
          <input type="text" value="${escapedName}"
            class="w-full bg-transparent border-none p-0 text-slate-900 dark:text-white font-semibold focus:ring-0 text-sm"
            placeholder="Material"
            onchange="window.updateItemField(${index}, 'name', this.value)">
          <div class="flex items-center gap-2">
            <input type="number" value="${item.qty}"
              class="w-16 bg-slate-900/5 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded px-1 py-0.5 text-xs text-slate-700 dark:text-slate-300 focus:border-primary focus:ring-0"
              onchange="window.updateItemField(${index}, 'qty', this.value)">
            <select class="bg-slate-900/5 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded px-1 py-0.5 text-[10px] text-slate-700 dark:text-slate-400 focus:border-primary focus:ring-0"
              onchange="window.updateItemField(${index}, 'unit', this.value)">
              <option value="pcs" ${item.unit === 'pcs' ? 'selected' : ''}>pcs</option>
              <option value="bdl" ${item.unit === 'bdl' ? 'selected' : ''}>bdl</option>
              <option value="box" ${item.unit === 'box' ? 'selected' : ''}>box</option>
              <option value="bkt" ${item.unit === 'bkt' ? 'selected' : ''}>bkt</option>
            </select>
          </div>
        </div>
      </div>
      <button onclick="window.removeItem(${index})" class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-slate-600 hover:text-red-400 transition-colors">
        <span class="material-icons text-sm">delete</span>
      </button>
    `;
    components.finalList.appendChild(div);
  });
}

/**
 * Logic: Update item field in real-time
 */
window.updateItemField = (index, field, value) => {
  if (state.currentList[index]) {
    state.currentList[index][field] = value;
    syncState(); // Auto-save on change
  }
};

// --- Event Listeners ---

if (components.siteInput) {
  components.siteInput.value = state.currentSite;
  components.siteInput.oninput = (e) => {
    state.currentSite = e.target.value;
    syncState(); // Auto-save site name
  };
}

if (inputs.material) {
  inputs.material.oninput = (e) => {
    renderMaterialSuggestions(e.target.value);
  };
}

buttons.create.onclick = () => {
  state.editingListIndex = null; // Reset to "New List" mode
  state.currentList = [];
  state.currentSite = ''; // Reset site for new list
  if (components.siteInput) {
    components.siteInput.value = '';
  }
  syncState(); // Real-time clear
  renderFinalList();
  window.showView('add');
};

buttons.addItem.onclick = () => {
  let name = inputs.material.value.trim();
  const qty = inputs.qty.value;
  const unit = inputs.unit.value;

  if (name) {
    // Normalizar medidas automáticamente (" para pulgadas, ' para pies)
    name = name
      .replace(/\s*(pulgadas|pulgada|inches|inch)\b/gi, '"')
      .replace(/\s*(pies|pie|feet|foot)\b/gi, "'")
      .replace(/\s*"\s*/g, '"')
      .replace(/\s*'\s*/g, "'")
      .trim();

    state.currentList.push({ name, qty, unit });

    // NEW: If this is a new list, create the history entry immediately
    if (state.editingListIndex === null) {
      const newList = {
        title: state.currentSite || 'Obra Nueva',
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        items: state.currentList.length,
        status: 'Borrador',
        icon: 'assignment',
        content: [...state.currentList]
      };
      state.history.unshift(newList); // Add to beginning
      state.editingListIndex = 0; // Set index to the newly added item
    }

    // NEW: Also save this material to the USER suggestions library if not in Master
    if (name && !MASTER_MATERIALS.includes(name) && !state.userSuggestions.includes(name)) {
      state.userSuggestions.push(name);
    }

    // NEW: Also save this location to favorites if not already there
    if (state.currentSite && !state.savedLocations.includes(state.currentSite)) {
      state.savedLocations.push(state.currentSite);
      renderLocationSuggestions();
    }

    syncState(); // Auto-save everything
    inputs.material.value = '';
    inputs.qty.value = '';
    renderFinalList();
    window.showView('review'); // Auto-navigate to review

    const originalText = buttons.addItem.innerHTML;
    buttons.addItem.innerHTML = '<span class="material-icons">check</span> <span>AGREGADO!</span>';
    setTimeout(() => { buttons.addItem.innerHTML = originalText; }, 800);
  }
};

buttons.done.onclick = () => {
  if (components.reviewSiteName) components.reviewSiteName.textContent = state.currentSite;
  renderFinalList();
  window.showView('review');
};

buttons.save.onclick = saveCurrentList;

buttons.share.onclick = async () => {
  const text = `${state.currentSite.toUpperCase()}:\n\n` +
    state.currentList.map(item => `${item.qty} ${item.unit.toUpperCase()} • ${item.name.toUpperCase()}`).join('\n');

  if (navigator.share) {
    try { await navigator.share({ title: 'Material List Pro', text: text }); }
    catch (err) { console.log('Share failed', err); }
  } else {
    navigator.clipboard.writeText(text).then(() => {
      window.showModal({ title: '¡Copiado!', message: 'Enlace copiado al portapapeles.', type: 'success' });
    });
  }
};

buttons.reviewAdd.onclick = () => window.showView('add');

buttons.clearHistory.onclick = () => {
  window.showModal({
    title: '¿Borrar Todo?',
    message: '¿Seguro que quieres borrar TODO el historial? Se perderán todos los datos.',
    type: 'danger',
    confirmText: 'BORRAR TODO',
    onConfirm: () => {
      state.history = [];
      saveState();
      renderHistory();
      renderDashboard();
    }
  });
};

const settingsClearBtn = document.getElementById('settings-clear-history');
if (settingsClearBtn) {
  settingsClearBtn.onclick = () => buttons.clearHistory.click();
}

if (buttons.export) {
  buttons.export.onclick = () => {
    const data = {
      history: state.history,
      savedLocations: state.savedLocations,
      userSuggestions: state.userSuggestions,
      version: '1.2'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MaterialListPro_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    window.showModal({
      title: '¡Copia Creada!',
      message: 'Se ha generado tu archivo de respaldo incluyendo todas tus listas, lugares y materiales personalizados.',
      type: 'success'
    });
  };
}

if (buttons.importTrigger && buttons.importFile) {
  buttons.importTrigger.onclick = () => buttons.importFile.click();
  buttons.importFile.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.history && Array.isArray(data.history)) {
          window.showModal({
            title: '¿Importar Datos?',
            message: 'Esto reemplazará tu historial y configuraciones actuales.',
            type: 'info',
            confirmText: 'IMPORTAR',
            onConfirm: () => {
              state.history = data.history;
              if (data.savedLocations) state.savedLocations = data.savedLocations;
              if (data.userSuggestions) state.userSuggestions = data.userSuggestions;

              syncState();
              renderHistory();
              renderDashboard();
              renderLocationSuggestions();
              window.showModal({ title: 'Éxito', message: 'Datos importados correctamente.', type: 'success' });
            }
          });
        } else {
          window.showModal({ title: 'Error', message: 'Archivo no válido.', type: 'danger' });
        }
      } catch (err) {
        window.showModal({ title: 'Error', message: 'Error al leer el archivo.', type: 'danger' });
      }
      e.target.value = ''; // Reset input
    };
    reader.readAsText(file);
  };
}

window.removeItem = (index) => {
  window.showModal({
    title: '¿Eliminar?',
    message: '¿Eliminar este material de la lista?',
    type: 'danger',
    confirmText: 'ELIMINAR',
    onConfirm: () => {
      state.currentList.splice(index, 1);
      syncState(); // Auto-save on remove
      renderFinalList();
    }
  });
};

// --- Initialization ---
renderDashboard();
renderMaterialSuggestions(''); // Initialize as empty/hidden
updateLanguageUI(); // Apply translations
applyTheme(); // Set initial theme
