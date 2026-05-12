/* ============================================================
   NEXUS PWA - app.js
   Logique : chat, HA control, historique, dictée, photo, thème
   ============================================================ */

(() => {
  'use strict';

  // ============ CONFIG & STATE ============
  const LS = {
    URL: 'nexus_backend_url',
    KEY: 'nexus_api_key',
    THEME: 'nexus_theme',
    CONVS: 'nexus_conversations',
    CURRENT: 'nexus_current_conv'
  };

  const state = {
    backendUrl: localStorage.getItem(LS.URL) || '',
    apiKey: localStorage.getItem(LS.KEY) || '',
    theme: localStorage.getItem(LS.THEME) || 'dark',
    conversations: JSON.parse(localStorage.getItem(LS.CONVS) || '[]'),
    currentConvId: localStorage.getItem(LS.CURRENT) || null,
    pendingImage: null,
    isRecording: false,
    isSending: false
  };

  // ============================================================
  // ⚙️ CONFIGURATION DES ENTITÉS
  // Pour ajouter une entité : copie-colle une ligne en respectant le format
  // Types supportés : 'climate', 'light', 'switch', 'sensor', 'input_boolean'
  // ============================================================

  // Dashboard rapide (cartes en haut de l'app, lecture rapide)
  const DASHBOARD_ENTITIES = [
    { id: 'climate.clim_salon',                            label: 'Salon',     type: 'climate' },
    { id: 'climate.clim_chambre_matteo',                   label: 'Matteo',    type: 'climate' },
    { id: 'climate.clim_chambre_etage',                    label: 'Étage',     type: 'climate' },
    { id: 'sensor.thermostat_chambre_parents_temperature', label: 'Parents',   type: 'sensor'  },
    { id: 'sensor.thermostat_dressing_temperature',        label: 'Dressing',  type: 'sensor'  },
    { id: 'sensor.thermostat_exterieur_temperature',       label: 'Extérieur', type: 'sensor'  }
  ];

  // Vue détail - pièces et entités à piloter
  const ROOMS = [
    {
      name: 'Salon',
      entities: [
        { id: 'climate.clim_salon',                  type: 'climate', label: 'Climatisation' },
        { id: 'light.lumiere_salon_table_2',         type: 'light',   label: 'Table' },
        { id: 'light.salon_tele_groupe',             type: 'light',   label: 'TV' },
        { id: 'light.led_tele',                      type: 'light',   label: 'LED TV' }
      ]
    },
    {
      name: 'Cuisine',
      entities: [
        { id: 'light.lumiere_evier_2',                       type: 'light',  label: 'Évier' },
        { id: 'switch.lumiere_plafonnier_cuisine_switch_1',  type: 'switch', label: 'Plafonnier' },
        { id: 'switch.lumiere_hotte_switch_1',               type: 'switch', label: 'Hotte' }
      ]
    },
    {
      name: 'Entrée',
      entities: [
        { id: 'switch.lumiere_entree_switch_1',      type: 'switch', label: 'Lumière entrée' }
      ]
    },
    {
      name: 'Chambre Matteo',
      entities: [
        { id: 'climate.clim_chambre_matteo',         type: 'climate', label: 'Climatisation' },
        { id: 'light.led_chambre_matteo',            type: 'light',   label: 'LED' }
      ]
    },
    {
      name: 'Chambre Étage',
      entities: [
        { id: 'climate.clim_chambre_etage',          type: 'climate', label: 'Climatisation' }
      ]
    },
    {
      name: 'Chambre Parents',
      entities: [
        { id: 'input_boolean.clim_parents',          type: 'input_boolean', label: 'Climatisation' },
        { id: 'light.lumiere_chambre_parents',       type: 'light',         label: 'Plafonnier' },
        { id: 'light.led_chambre_parents',           type: 'light',         label: 'LED' }
      ]
    },
    {
      name: 'Dressing',
      entities: [
        { id: 'input_boolean.clim_dressing_etat',    type: 'input_boolean', label: 'Climatisation' },
        { id: 'light.lumiere_dressing',              type: 'light',         label: 'Lumière' }
      ]
    },
    {
      name: 'Salle de bain',
      entities: [
        { id: 'light.miroirs_salle_de_bain',         type: 'light', label: 'Miroirs' }
      ]
    },
    {
      name: 'Escalier',
      entities: [
        { id: 'switch.lumiere_escalier_switch_1',    type: 'switch', label: 'Plafonnier' },
        { id: 'light.led_escalier',                  type: 'light',  label: 'LED' },
        { id: 'light.ampoules_escalier',             type: 'light',  label: 'Spots' }
      ]
    },
    {
      name: 'Couloirs',
      entities: [
        { id: 'light.lumiere_couloir_rdc_groupe',    type: 'light', label: 'Couloir RDC' },
        { id: 'light.lsc_smart_gls_a60_10',          type: 'light', label: 'Couloir étage' }
      ]
    },
    {
      name: 'Extérieur',
      entities: [
        { id: 'switch.lumiere_terrasse_droite_switch_1',  type: 'switch', label: 'Terrasse droite' },
        { id: 'switch.lumiere_terrasse_gauche_switch_1',  type: 'switch', label: 'Terrasse gauche' },
        { id: 'light.led_terrasse',                       type: 'light',  label: 'LED terrasse' }
      ]
    }
  ];

  // ============ DOM ============
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const els = {
    // Auth
    authModal: $('#auth-modal'),
    authUrl: $('#auth-url'),
    authKey: $('#auth-key'),
    authSave: $('#auth-save'),
    authError: $('#auth-error'),
    // Sidebar
    sidebar: $('#sidebar'),
    btnOpenSidebar: $('#btn-open-sidebar'),
    btnCloseSidebar: $('#btn-close-sidebar'),
    btnNewChat: $('#btn-new-chat'),
    convList: $('#conversations-list'),
    btnSettings: $('#btn-settings'),
    // Header
    btnTheme: $('#btn-theme'),
    btnToggleDashboard: $('#btn-toggle-dashboard'),
    // Dashboard
    dashboard: $('#dashboard'),
    dashboardGrid: $('#dashboard-grid'),
    btnOpenDetail: $('#btn-open-detail'),
    // Chat
    chat: $('#chat'),
    chatWelcome: $('#chat-welcome'),
    // Composer
    composerPreview: $('#composer-preview'),
    inputText: $('#input-text'),
    inputPhoto: $('#input-photo'),
    btnPhoto: $('#btn-photo'),
    btnMic: $('#btn-mic'),
    btnSend: $('#btn-send'),
    composerStatus: $('#composer-status'),
    // Detail modal
    detailModal: $('#detail-modal'),
    btnCloseDetail: $('#btn-close-detail'),
    detailContent: $('#detail-content'),
    // Settings modal
    settingsModal: $('#settings-modal'),
    btnCloseSettings: $('#btn-close-settings'),
    settingsUrl: $('#settings-url'),
    settingsKey: $('#settings-key'),
    btnSaveSettings: $('#btn-save-settings'),
    btnClearHistory: $('#btn-clear-history')
  };

  // ============ INITIALISATION ============
  function init() {
    applyTheme(state.theme);

    // Auth requise ?
    if (!state.backendUrl || !state.apiKey) {
      els.authModal.classList.remove('hidden');
    } else {
      bootApp();
    }

    setupListeners();
  }

  function bootApp() {
    if (state.conversations.length === 0) {
      newConversation();
    } else {
      if (!state.currentConvId || !state.conversations.find(c => c.id === state.currentConvId)) {
        state.currentConvId = state.conversations[0].id;
      }
      renderConversations();
      renderCurrentChat();
    }
    refreshDashboard();
    // Refresh dashboard toutes les 30s
    setInterval(refreshDashboard, 30000);
  }

  // ============ THÈME ============
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    state.theme = theme;
    localStorage.setItem(LS.THEME, theme);
    // Icône thème (soleil si dark, lune si light)
    const iconDark = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    const iconLight = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    els.btnTheme.innerHTML = theme === 'dark' ? iconLight : iconDark;
  }

  // ============ CONVERSATIONS ============
  function newConversation() {
    const conv = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      title: 'Nouvelle conversation',
      messages: [],
      createdAt: Date.now()
    };
    state.conversations.unshift(conv);
    state.currentConvId = conv.id;
    saveConversations();
    renderConversations();
    renderCurrentChat();
    closeSidebarOnMobile();
  }

  function getCurrentConv() {
    return state.conversations.find(c => c.id === state.currentConvId);
  }

  function saveConversations() {
    localStorage.setItem(LS.CONVS, JSON.stringify(state.conversations));
    localStorage.setItem(LS.CURRENT, state.currentConvId || '');
  }

  function renderConversations() {
    els.convList.innerHTML = '';
    state.conversations.forEach(conv => {
      const item = document.createElement('div');
      item.className = 'conv-item' + (conv.id === state.currentConvId ? ' active' : '');
      item.innerHTML = `
        <span class="conv-title">${escapeHtml(conv.title)}</span>
        <button class="conv-delete" title="Supprimer" aria-label="Supprimer">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
      `;
      item.querySelector('.conv-title').addEventListener('click', () => {
        state.currentConvId = conv.id;
        saveConversations();
        renderConversations();
        renderCurrentChat();
        closeSidebarOnMobile();
      });
      item.querySelector('.conv-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteConversation(conv.id);
      });
      els.convList.appendChild(item);
    });
  }

  function deleteConversation(id) {
    if (!confirm('Supprimer cette conversation ?')) return;
    state.conversations = state.conversations.filter(c => c.id !== id);
    if (state.currentConvId === id) {
      if (state.conversations.length > 0) {
        state.currentConvId = state.conversations[0].id;
      } else {
        newConversation();
        return;
      }
    }
    saveConversations();
    renderConversations();
    renderCurrentChat();
  }

  function renderCurrentChat() {
    const conv = getCurrentConv();
    els.chat.innerHTML = '';
    if (!conv || conv.messages.length === 0) {
      const welcome = els.chatWelcome.cloneNode(true);
      welcome.classList.remove('hidden');
      els.chat.appendChild(welcome);
      return;
    }
    conv.messages.forEach(msg => appendMessage(msg.role, msg.content, msg.image, false));
    scrollChatToBottom();
  }

  function appendMessage(role, content, imageDataUrl = null, save = true) {
    // Retirer le welcome si présent
    const welcome = els.chat.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    const msg = document.createElement('div');
    msg.className = `msg msg-${role}`;
    if (role === 'assistant') {
      msg.innerHTML = `
        <div class="msg-avatar"><div class="logo-sm"></div></div>
        <div class="msg-content">${renderMarkdown(content)}</div>
      `;
    } else {
      let html = '';
      if (content) html += `<div>${escapeHtml(content).replace(/\n/g, '<br>')}</div>`;
      if (imageDataUrl) html += `<img src="${imageDataUrl}" alt="Photo" />`;
      msg.innerHTML = `<div class="msg-content">${html}</div>`;
    }
    els.chat.appendChild(msg);
    scrollChatToBottom();

    if (save) {
      const conv = getCurrentConv();
      if (conv) {
        conv.messages.push({ role, content, image: imageDataUrl, ts: Date.now() });
        // Auto-titre depuis le premier message user
        if (conv.title === 'Nouvelle conversation' && role === 'user' && content) {
          conv.title = content.slice(0, 40) + (content.length > 40 ? '…' : '');
          renderConversations();
        }
        saveConversations();
      }
    }
    return msg;
  }

  function appendTyping() {
    const msg = document.createElement('div');
    msg.className = 'msg msg-assistant';
    msg.id = 'typing-indicator';
    msg.innerHTML = `
      <div class="msg-avatar"><div class="logo-sm"></div></div>
      <div class="msg-content"><div class="typing"><span></span><span></span><span></span></div></div>
    `;
    els.chat.appendChild(msg);
    scrollChatToBottom();
  }

  function removeTyping() {
    const t = document.getElementById('typing-indicator');
    if (t) t.remove();
  }

  function scrollChatToBottom() {
    els.chat.scrollTop = els.chat.scrollHeight;
  }

  function renderMarkdown(text) {
    if (window.marked) {
      try {
        return window.marked.parse(text, { breaks: true, gfm: true });
      } catch (e) {
        return escapeHtml(text).replace(/\n/g, '<br>');
      }
    }
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ============ ENVOI MESSAGE ============
  async function sendMessage() {
    if (state.isSending) return;
    const text = els.inputText.value.trim();
    const image = state.pendingImage;
    if (!text && !image) return;

    state.isSending = true;
    els.btnSend.disabled = true;

    appendMessage('user', text, image);
    els.inputText.value = '';
    autoResizeTextarea();
    clearPendingImage();
    appendTyping();
    setStatus('Nexus réfléchit…');

    try {
      const conv = getCurrentConv();
      const history = (conv?.messages || []).slice(0, -1).map(m => ({
        role: m.role,
        content: m.content || ''
      }));

      const response = await fetch(`${state.backendUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': state.apiKey
        },
        body: JSON.stringify({
          message: text,
          image: image,
          conversationHistory: history
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Erreur ${response.status}`);
      }

      const data = await response.json();
      removeTyping();
      appendMessage('assistant', data.message || 'Réponse vide.');
      setStatus('');
    } catch (err) {
      removeTyping();
      appendMessage('assistant', `❌ **Erreur** : ${err.message}\n\nVérifie ton backend et ta clé API dans les paramètres.`);
      setStatus('Erreur : ' + err.message);
    } finally {
      state.isSending = false;
      updateSendButton();
    }
  }

  function setStatus(msg) {
    els.composerStatus.textContent = msg;
  }

  function updateSendButton() {
    const hasContent = els.inputText.value.trim() || state.pendingImage;
    els.btnSend.disabled = !hasContent || state.isSending;
  }

  // ============ PHOTO ============
  function handlePhotoSelect(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      state.pendingImage = e.target.result;
      renderImagePreview();
      updateSendButton();
    };
    reader.readAsDataURL(file);
  }

  function renderImagePreview() {
    if (!state.pendingImage) {
      els.composerPreview.classList.add('hidden');
      els.composerPreview.innerHTML = '';
      return;
    }
    els.composerPreview.classList.remove('hidden');
    els.composerPreview.innerHTML = `
      <img src="${state.pendingImage}" alt="Aperçu" />
      <button class="preview-remove">Retirer</button>
    `;
    els.composerPreview.querySelector('.preview-remove').addEventListener('click', clearPendingImage);
  }

  function clearPendingImage() {
    state.pendingImage = null;
    els.inputPhoto.value = '';
    renderImagePreview();
    updateSendButton();
  }

  // ============ DICTÉE VOCALE ============
  let recognition = null;

  function setupSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      els.btnMic.style.display = 'none';
      return;
    }
    recognition = new SR();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (e) => {
      let txt = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        txt += e.results[i][0].transcript;
      }
      els.inputText.value = txt;
      autoResizeTextarea();
      updateSendButton();
    };

    recognition.onend = () => {
      state.isRecording = false;
      els.btnMic.classList.remove('recording');
      setStatus('');
    };

    recognition.onerror = (e) => {
      state.isRecording = false;
      els.btnMic.classList.remove('recording');
      setStatus('Erreur micro : ' + e.error);
    };
  }

  function toggleRecording() {
    if (!recognition) return;
    if (state.isRecording) {
      recognition.stop();
    } else {
      try {
        recognition.start();
        state.isRecording = true;
        els.btnMic.classList.add('recording');
        setStatus('🎤 Écoute en cours…');
      } catch (err) {
        setStatus('Erreur micro');
      }
    }
  }

  // ============ DASHBOARD (HA states) ============
  async function refreshDashboard() {
    if (!state.backendUrl || !state.apiKey) return;
    try {
      const states = await Promise.all(
        DASHBOARD_ENTITIES.map(e => fetchEntityState(e.id).catch(() => null))
      );
      renderDashboard(states);
    } catch (err) {
      els.dashboardGrid.innerHTML = `<div class="card-skeleton">⚠️ ${err.message}</div>`;
    }
  }

  async function fetchEntityState(entityId) {
    const res = await fetch(`${state.backendUrl}/api/ha/states?entity_id=${encodeURIComponent(entityId)}`, {
      headers: { 'X-API-Key': state.apiKey }
    });
    if (!res.ok) throw new Error('Erreur ' + res.status);
    const data = await res.json();
    return data.state;
  }

  function renderDashboard(states) {
    els.dashboardGrid.innerHTML = '';
    DASHBOARD_ENTITIES.forEach((entity, i) => {
      const data = states[i];
      const card = document.createElement('div');
      card.className = 'card';

      let value = '—';
      let sub = '';
      let active = false;

      if (data && data.state !== 'unavailable' && data.state !== 'unknown') {
        if (entity.type === 'climate') {
          value = data.state.toUpperCase();
          const temp = data.attributes?.current_temperature;
          const target = data.attributes?.temperature;
          if (temp != null) sub = `${temp.toFixed(1)}°C → ${target ?? '?'}°C`;
          active = data.state !== 'off';
        } else if (entity.type === 'sensor') {
          value = parseFloat(data.state).toFixed(1) + (data.attributes?.unit_of_measurement || '°C');
          sub = data.attributes?.friendly_name?.split(' ').slice(-1)[0] || '';
        }
      }

      if (active) card.classList.add('active');
      card.innerHTML = `
        <div class="card-label">${entity.label}</div>
        <div class="card-value">${value}</div>
        ${sub ? `<div class="card-sub">${sub}</div>` : ''}
      `;
      card.addEventListener('click', () => {
        els.inputText.value = `Donne-moi l'état détaillé de ${entity.label} (${entity.id})`;
        autoResizeTextarea();
        updateSendButton();
        els.inputText.focus();
      });
      els.dashboardGrid.appendChild(card);
    });
  }

  // ============ DETAIL MODAL ============
  async function openDetailModal() {
    els.detailModal.classList.remove('hidden');
    els.detailContent.innerHTML = '<div class="card-skeleton">Chargement…</div>';

    // Récupérer tous les états pour chaque entité de toutes les pièces
    const allIds = ROOMS.flatMap(r => r.entities.map(e => e.id));
    const statesMap = {};

    const results = await Promise.all(allIds.map(async (id) => {
      try {
        const s = await fetchEntityState(id);
        return { id, state: s };
      } catch {
        return { id, state: null };
      }
    }));
    results.forEach(r => { statesMap[r.id] = r.state; });

    els.detailContent.innerHTML = '';
    ROOMS.forEach(room => {
      const section = document.createElement('div');
      section.className = 'room-section';
      section.innerHTML = `<div class="room-title">${room.name}</div>`;
      room.entities.forEach(e => {
        const data = statesMap[e.id];
        const row = renderEntityRow(e, data);
        section.appendChild(row);
      });
      els.detailContent.appendChild(section);
    });
  }

  function renderEntityRow(entity, data) {
    const row = document.createElement('div');
    row.className = 'entity-row';

    let stateText = '—';
    let isOn = false;
    if (data && data.state !== 'unavailable' && data.state !== 'unknown') {
      if (entity.type === 'climate') {
        const temp = data.attributes?.current_temperature;
        const target = data.attributes?.temperature;
        stateText = `${data.state}${temp != null ? ` · ${temp.toFixed(1)}°C → ${target ?? '?'}°C` : ''}`;
        isOn = data.state !== 'off';
      } else {
        stateText = data.state;
        isOn = data.state === 'on';
      }
    }

    row.innerHTML = `
      <div class="entity-info">
        <div class="entity-name">${entity.label}</div>
        <div class="entity-state ${isOn ? 'on' : ''}">${stateText}</div>
      </div>
      <div class="toggle ${isOn ? 'on' : ''}"></div>
    `;

    row.querySelector('.toggle').addEventListener('click', async () => {
      await toggleEntity(entity, !isOn);
      openDetailModal(); // refresh
    });

    return row;
  }

  async function toggleEntity(entity, turnOn) {
    let domain, service;
    if (entity.type === 'climate') {
      domain = 'climate';
      service = turnOn ? 'turn_on' : 'turn_off';
    } else if (entity.type === 'light' || entity.type === 'switch') {
      domain = entity.type;
      service = turnOn ? 'turn_on' : 'turn_off';
    } else if (entity.type === 'input_boolean') {
      domain = 'input_boolean';
      service = turnOn ? 'turn_on' : 'turn_off';
    } else {
      return;
    }
    try {
      await fetch(`${state.backendUrl}/api/ha/service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': state.apiKey
        },
        body: JSON.stringify({
          domain,
          service,
          target: { entity_id: entity.id }
        })
      });
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  }

  // ============ SETTINGS ============
  function openSettings() {
    els.settingsUrl.value = state.backendUrl;
    els.settingsKey.value = state.apiKey;
    els.settingsModal.classList.remove('hidden');
  }

  function saveSettings() {
    const url = els.settingsUrl.value.trim().replace(/\/$/, '');
    const key = els.settingsKey.value.trim();
    if (!url || !key) {
      alert('URL et clé requises');
      return;
    }
    state.backendUrl = url;
    state.apiKey = key;
    localStorage.setItem(LS.URL, url);
    localStorage.setItem(LS.KEY, key);
    els.settingsModal.classList.add('hidden');
    refreshDashboard();
  }

  function clearAllHistory() {
    if (!confirm('Effacer TOUTES les conversations ? Cette action est irréversible.')) return;
    state.conversations = [];
    state.currentConvId = null;
    localStorage.removeItem(LS.CONVS);
    localStorage.removeItem(LS.CURRENT);
    newConversation();
    els.settingsModal.classList.add('hidden');
  }

  // ============ TEXTAREA AUTO-RESIZE ============
  function autoResizeTextarea() {
    els.inputText.style.height = 'auto';
    els.inputText.style.height = Math.min(els.inputText.scrollHeight, 160) + 'px';
  }

  // ============ SIDEBAR MOBILE ============
  function openSidebar() {
    els.sidebar.classList.add('open');
  }
  function closeSidebarOnMobile() {
    if (window.innerWidth < 768) {
      els.sidebar.classList.remove('open');
    }
  }

  // ============ LISTENERS ============
  function setupListeners() {
    // Auth
    els.authSave.addEventListener('click', async () => {
      const url = els.authUrl.value.trim().replace(/\/$/, '');
      const key = els.authKey.value.trim();
      if (!url || !key) {
        els.authError.textContent = 'URL et clé requises';
        return;
      }
      els.authError.textContent = 'Vérification…';
      try {
        const test = await fetch(`${url}/health`);
        if (!test.ok) throw new Error('Backend injoignable');
        state.backendUrl = url;
        state.apiKey = key;
        localStorage.setItem(LS.URL, url);
        localStorage.setItem(LS.KEY, key);
        els.authModal.classList.add('hidden');
        els.authError.textContent = '';
        bootApp();
      } catch (err) {
        els.authError.textContent = '❌ ' + err.message;
      }
    });

    // Sidebar
    els.btnNewChat.addEventListener('click', newConversation);
    els.btnOpenSidebar.addEventListener('click', openSidebar);
    els.btnCloseSidebar.addEventListener('click', () => els.sidebar.classList.remove('open'));
    els.btnSettings.addEventListener('click', openSettings);

    // Header
    els.btnTheme.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });
    els.btnToggleDashboard.addEventListener('click', () => {
      els.dashboard.classList.toggle('collapsed');
      els.btnToggleDashboard.classList.toggle('active');
    });

    // Dashboard
    els.btnOpenDetail.addEventListener('click', openDetailModal);
    els.btnCloseDetail.addEventListener('click', () => els.detailModal.classList.add('hidden'));

    // Composer
    els.inputText.addEventListener('input', () => {
      autoResizeTextarea();
      updateSendButton();
    });
    els.inputText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 768) {
        e.preventDefault();
        sendMessage();
      }
    });

    els.btnSend.addEventListener('click', sendMessage);
    els.btnPhoto.addEventListener('click', () => els.inputPhoto.click());
    els.inputPhoto.addEventListener('change', (e) => handlePhotoSelect(e.target.files[0]));
    els.btnMic.addEventListener('click', toggleRecording);

    // Settings
    els.btnCloseSettings.addEventListener('click', () => els.settingsModal.classList.add('hidden'));
    els.btnSaveSettings.addEventListener('click', saveSettings);
    els.btnClearHistory.addEventListener('click', clearAllHistory);

    // Click hors modale = fermer
    [els.detailModal, els.settingsModal].forEach(m => {
      m.addEventListener('click', (e) => {
        if (e.target === m) m.classList.add('hidden');
      });
    });

    setupSpeechRecognition();
  }

  // ============ SERVICE WORKER ============
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('SW registration failed:', err);
      });
    });
  }

  // GO !
  init();
})();
