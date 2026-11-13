'use strict';
// Debug-Ausgabe erst nach der Skriptinitialisierung ausführen, da S und die Shop-Kataloge weiter unten gesetzt werden.
setTimeout(() => {
  console.log("Bonus:", S.bonusPoints);
  console.log("Gesamt:", getTotalPoints());
  console.log("Verfügbar:", getAvailablePoints());
}, 0);
// file:// origins may deny localStorage in some browsers. Keep the app usable
// for the current session when persistent storage is blocked.
const storage = (() => {
  try {
    const persistent = window.localStorage;
    const probe = '__consistly_storage_probe__';
    persistent.setItem(probe, '1');
    persistent.removeItem(probe);
    return persistent;
  } catch (error) {
    console.warn('Persistent browser storage unavailable; using session memory.', error);
    const memory = new Map();
    return {
      getItem: key => memory.has(String(key)) ? memory.get(String(key)) : null,
      setItem: (key, value) => memory.set(String(key), String(value)),
      removeItem: key => memory.delete(String(key)),
      clear: () => memory.clear()
    };
  }
})();
/* ===== BossWeek – all data lives in storage ===== */
console.log("🔥 CONSISTLY APP.JS GELADEN");
// ===== SUPABASE CONNECTION =====
const SUPABASE_URL = 'https://vgubnhvzpskfrzyufjif.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_nrU4rbjVup67l0ryvTWdiA_4_5YyTCh';

const supabaseAvailable = typeof window.supabase?.createClient === 'function';
const supabaseClient = supabaseAvailable
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() { } } } }),
      signUp: async () => ({ data: {}, error: new Error('Supabase client did not load. Check your internet connection and reload.') }),
      signInWithPassword: async () => ({ error: new Error('Supabase client did not load. Check your internet connection and reload.') }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ error: new Error('Supabase client did not load. Check your internet connection and reload.') }),
      updateUser: async () => ({ error: new Error('Supabase client did not load. Check your internet connection and reload.') })
    },
    rpc: async () => ({ data: null, error: new Error('Social and account features need a connection to Supabase.') }),
    from: () => { throw new Error('This feature needs a connection to Supabase.'); },
    storage: { from: () => ({ upload: async () => ({ error: new Error('Avatar uploads need a connection to Supabase.') }) }) }
  };
if (!supabaseAvailable) {
  console.error('Supabase JavaScript SDK did not load. Continuing in local-only mode.');
  const notice = document.querySelector('#runtimeNotice');
  if (notice) {
    notice.hidden = false;
    notice.textContent = 'Offline-Modus: Aufgaben und lokale Shop-Funktionen sind verfügbar; Konto und Social benötigen Internet.';
  }
}

// Nach Reload immer oben starten
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

window.addEventListener('load', () => {
  window.scrollTo(0, 0);
});


console.log('✅ Supabase-Verbindung vorbereitet');
const KEY = 'bossweek.v1';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Boss list: [name, emoji]. Boss index = number of bosses defeated so far (loops).
const BOSSES = [['Sloth Zilla', '🦥'], ['The Procrastinator', '🐌'], ['Snooze Dragon', '🐉'], ['Couch Golem', '🛋️'],
['Doom Scroller', '📱'], ['Chaos Wizard', '🧙'], ['Lazy Kraken', '🐙'], ['Lord of Excuses', '👹'], ['Streak Guardian', '🛡️']];
const STREAK_GUARDIAN_BOSS_INDEX = BOSSES.length - 1;
const STREAK_SHIELD_PRICE = 180;
const BOSS_SPAWN_HP = 3;
const bossNames = {
  en: ['Sloth Zilla', 'The Procrastinator', 'Snooze Dragon', 'Couch Golem', 'Doom Scroller', 'Chaos Wizard', 'Lazy Kraken', 'Lord of Excuses', 'Streak Guardian'],
  de: ['Faultier Zilla', 'Der Aufschieber', 'Schlummerdrache', 'Couch-Golem', 'Doom-Scroller', 'Chaoszauberer', 'Fauler Kraken', 'Lord der Ausreden', 'Streak-Wächter'],
  es: ['Perezoso Zilla', 'El Procrastinador', 'Dragón Somnoliento', 'Gólem del Sofá', 'Deslizador Infinito', 'Mago del Caos', 'Kraken Perezoso', 'Señor de las Excusas', 'Guardián de la racha'],
  it: ['Bradipo Zilla', 'Il Procrastinatore', 'Drago Sonnacchioso', 'Golem del Divano', 'Scrollatore Infinito', 'Mago del Caos', 'Kraken Pigro', 'Signore delle Scuse', 'Guardiano della serie'],
  el: ['Τεμπελόσαυρος', 'Ο Αναβλητικός', 'Δράκος του Ύπνου', 'Γκόλεμ του Καναπέ', 'Άρχοντας του Σκρολαρίσματος', 'Μάγος του Χάους', 'Τεμπέλης Κράκεν', 'Άρχοντας των Δικαιολογιών', 'Φύλακας σερί'],
  pt: ['Preguiçossauro', 'O Procrastinador', 'Dragão Sonolento', 'Golem do Sofá', 'Deslizador Infinito', 'Mago do Caos', 'Kraken Preguiçoso', 'Senhor das Desculpas', 'Guardião da sequência']
};
function bossName(index) {
  const lang = getSupportedLanguage();
  return bossNames[lang]?.[index % bossNames[lang].length] || BOSSES[index % BOSSES.length][0];
}


supabaseClient.auth.getSession()
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Supabase-Fehler:', error.message);
    } else {
      console.log('✅ Supabase erreichbar!', data);
    }
  });
supabaseClient.auth.getSession()
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Supabase-Fehler:', error.message);
    } else {
      console.log('✅ Supabase erreichbar!', data);
    }
  })
  .catch(error => {
    console.error('❌ Verbindungsfehler:', error);
  });

console.log("🧪 SUPABASE-TEST WIRD AUSGEFÜHRT", typeof supabaseClient);

// ===== CONSISTLY AUTHENTICATION =====

document.addEventListener('DOMContentLoaded', () => {
  const forgotButton = document.getElementById('forgotPassword');

  if (!forgotButton) return;

  forgotButton.addEventListener('click', async () => {
    const emailInput = document.getElementById('authEmail');
    const email = emailInput?.value.trim();

    if (!email) {
      alert(textFor('emailRequired'));
      return;
    }

    const { error } = await supabaseClient.auth
      .resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/app.html?reset=true'
      });

    if (error) {
      alert('Fehler: ' + error.message);
      return;
    }

    alert(textFor('accountResetEmail'));
  });
});


const authDlg = document.querySelector('#authDlg');

function showAuthMessage(message) {
  $('#authMessage').textContent = translateKnownText(message);
}

function openAuth() {
  showAuthMessage('');
  authDlg.showModal();
}

async function signUp() {
  const username = $('#authUsername').value.trim();
  const email = $('#authEmail').value.trim();
  const password = $('#authPassword').value;

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    showAuthMessage(textFor('usernameRule'));
    return;
  }

  if (password.length < 8) {
    showAuthMessage(textFor('passwordRule'));
    return;
  }

  showAuthMessage(textFor('createAccountBusy'));

  const friendTag = '@' + username + Math.floor(1000 + Math.random() * 9000);

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        friend_tag: friendTag
      }
    }
  });

  if (error) {
    showAuthMessage(error.message);
    return;
  }

  if (data.session) {
    showAuthMessage(textFor('createAccountOk'));
  } else {
    showAuthMessage(textFor('confirmEmail'));
  }
}



async function signIn() {
  const email = $('#authEmail').value.trim();
  const password = $('#authPassword').value;

  showAuthMessage(textFor('loginBusy'));

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showAuthMessage(error.message);
    return;
  }

  authDlg.close();
  await updateAuthUI();
}

async function logout() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    console.error('Logout error:', error.message);
    return;
  }

  await updateAuthUI();
}


async function loadProfile() {
  const { data: { user }, error: userError } =
    await supabaseClient.auth.getUser();

  if (userError || !user) return;

  // Auth creation time is independent of the profile row and must remain visible
  // even if a profile-column migration is missing or the profile query fails.
  const createdAt = new Date(user.created_at);
  $('#profileCreatedAt').textContent = textFor('aboutSince', {
    date: createdAt.toLocaleDateString(localeForLanguage(), {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  });

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('username, friend_tag, avatar, avatar_url')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Profil-Ladefehler:', error.message);
    return;
  }

  $('#profileUsername').textContent = data.username;
  $('#profileFriendTag').textContent = data.friend_tag;
  const { data: titleRows, error: titleError } = await supabaseClient.rpc('get_social_profile_titles', {
    p_user_ids: [user.id]
  });
  if (titleError) console.warn('Profil-Titel konnten nicht geladen werden:', titleError.message);
  renderEquippedTitle(document.querySelector('#myEquippedTitle'),
    titleRows?.[0]?.equipped_title || storage.getItem('equippedProfileTitle') || '');
  const { data: frameRows, error: frameError } = await supabaseClient.rpc('get_social_profile_frames', { p_user_ids: [user.id] });
  if (frameError) console.warn('Profilrahmen konnten nicht geladen werden:', frameError.message);
  const equippedFrame = frameRows?.[0]?.equipped_avatar_frame || '';
  if (equippedFrame) storage.setItem('equippedAvatarFrame', equippedFrame); else storage.removeItem('equippedAvatarFrame');
  applyAvatarFrame(document.querySelector('#profileAvatarImage'), equippedFrame);
  applyAvatarFrame(document.querySelector('#profileAvatar'), equippedFrame);
  $('#profileAvatar').textContent = data.avatar || '👤';
  const image = document.querySelector('#profileAvatarImage');
  const emoji = document.querySelector('#profileAvatar');

  if (data.avatar_url) {
    image.src = data.avatar_url;
    image.hidden = false;
    emoji.hidden = true;
  } else {
    image.hidden = true;
    emoji.hidden = false;
  }
  document.querySelectorAll('[data-avatar]').forEach(button => {
    button.classList.toggle(
      'selected',
      button.dataset.avatar === (data.avatar || '👤')
    );
  });
}

async function loadProfileBio() {
  const bioInput = $('#profileBio');

  if (!currentUser || !bioInput) return;

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('bio')
    .eq('id', currentUser.id)
    .single();

  if (error) {
    console.error('Bio-Ladefehler:', error.message);
    return;
  }

  bioInput.value = data.bio || '';
}

async function loadFriendProgressPreference() {
  const toggle = document.querySelector('#shareProgressWithFriends');
  if (!toggle || !currentUser) return;
  const { data, error } = await supabaseClient.rpc('get_my_progress_sharing');
  if (error) {
    console.warn('Fortschrittsfreigabe konnte nicht geladen werden:', error.message);
    toggle.checked = false;
    return;
  }
  toggle.checked = Boolean(data);
  document.querySelector('#shareProgressStatus').textContent = textFor(toggle.checked ? 'shareProgressEnabled' : 'shareProgressPrivateDefault');
}

document.querySelector('#shareProgressWithFriends')?.addEventListener('change', async event => {
  if (!currentUser) {
    event.currentTarget.checked = false;
    return;
  }
  const toggle = event.currentTarget;
  const oldValue = !toggle.checked;
  toggle.disabled = true;
  const { error } = await supabaseClient.rpc('set_my_progress_sharing', { p_enabled: toggle.checked });
  toggle.disabled = false;
  if (error) {
    toggle.checked = oldValue;
    document.querySelector('#shareProgressStatus').textContent = textFor('sharingSaveError', { error: error.message });
    return;
  }
  document.querySelector('#shareProgressStatus').textContent = textFor(toggle.checked ? 'shareProgressEnabled' : 'shareProgressPrivateDefault');
});

async function loadSocialPrivacySettings() {
  if (!currentUser) return;
  const profileToggle = document.querySelector('#publicProfileEnabled');
  const notificationsToggle = document.querySelector('#messageNotificationsEnabled');
  if (profileToggle) {
    const { data } = await supabaseClient.rpc('get_my_public_profile');
    profileToggle.checked = Boolean(data);
  }
  if (notificationsToggle) notificationsToggle.checked = storage.getItem('messageNotificationsEnabled') === 'true';
}
document.querySelector('#publicProfileEnabled')?.addEventListener('change', async event => {
  const toggle = event.currentTarget, prior = !toggle.checked;
  toggle.disabled = true;
  const { error } = await supabaseClient.rpc('set_my_public_profile', { p_enabled: toggle.checked });
  toggle.disabled = false;
  if (error) { toggle.checked = prior; alert(error.message); }
});
document.querySelector('#messageNotificationsEnabled')?.addEventListener('change', async event => {
  const toggle = event.currentTarget;
  if (toggle.checked && !('Notification' in window)) {
    toggle.checked = false; document.querySelector('#messageNotificationsStatus').textContent = textFor('reminderUnsupported'); return;
  }
  if (toggle.checked && Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { toggle.checked = false; document.querySelector('#messageNotificationsStatus').textContent = textFor('reminderPermission'); return; }
  }
  storage.setItem('messageNotificationsEnabled', String(toggle.checked));
});

const accessibilityPrefs = [
  ['largeTextToggle', 'largeTextEnabled', 'large-text'],
  ['reduceMotionToggle', 'reduceMotionEnabled', 'reduce-motion'],
  ['highContrastToggle', 'highContrastEnabled', 'high-contrast']
];
function loadAccessibilityPrefs() {
  accessibilityPrefs.forEach(([id, key, className]) => {
    const checkbox = document.getElementById(id);
    const enabled = storage.getItem(key) === 'true';
    if (checkbox) checkbox.checked = enabled;
    document.documentElement.classList.toggle(className, enabled);
  });
}
loadAccessibilityPrefs();
accessibilityPrefs.forEach(([id, key, className]) => document.getElementById(id)?.addEventListener('change', event => {
  storage.setItem(key, String(event.currentTarget.checked));
  document.documentElement.classList.toggle(className, event.currentTarget.checked);
}));
document.querySelector('#exportAppData')?.addEventListener('click', () => {
  const payload = { exportedAt: new Date().toISOString(), app: 'Consistly', data: S, dailyJournal: dailyJournalEntries };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = `consistly-data-${today()}.json`; link.click(); URL.revokeObjectURL(url);
  document.querySelector('#settingsToolsStatus').textContent = textFor('dataExported');
});


function renderMyTemplates() {
  const section = document.getElementById('myTemplatesCategory');
  const list = document.getElementById('myTemplatesList');

  if (!section || !list) return;

  section.hidden = !currentUser;
  list.innerHTML = '';

  if (!currentUser) return;

  if (!myTemplates.length) {
    const empty = document.createElement('p');
    empty.textContent = 'You have not created any templates yet.';
    list.appendChild(empty);
  }

  myTemplates.forEach(template => {
    const label = document.createElement('label');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.template = '';
    checkbox.dataset.myTemplateId = template.id;
    checkbox.value = template.title;

    const text = document.createElement('span');
    text.className = 'template-item-text';
    text.textContent = template.title;

    if (template.description) {
      const small = document.createElement('small');
      small.textContent = template.description;
      text.appendChild(small);
    }

    label.append(checkbox, text);
    list.appendChild(label);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.dataset.deleteMyTemplate = template.id;

    list.appendChild(deleteButton);
  });

  initTemplateControls();
  renderTemplateFavorites();
  updateAddSelectedButton();
}


document.getElementById('openMyTemplateEditor')
  ?.addEventListener('click', () => {
    document.getElementById('myTemplateEditor').hidden = false;
  });


document.getElementById('cancelMyTemplate')
  ?.addEventListener('click', () => {
    document.getElementById('myTemplateEditor').hidden = true;
    document.getElementById('myTemplateTitle').value = '';
    document.getElementById('myTemplateDescription').value = '';
    document.getElementById('myTemplateCategory').value = 'Personal';
  });


document.getElementById('saveMyTemplate')
  ?.addEventListener('click', async () => {
    if (!currentUser) {
      alert('Please sign in first.');
      return;
    }

    const title = document.getElementById('myTemplateTitle').value.trim();
    const description = document.getElementById('myTemplateDescription').value.trim();
    const category = document.getElementById('myTemplateCategory').value.trim() || 'Personal';

    if (!title) {
      alert('Please enter a template name.');
      return;
    }

    const { error } = await supabaseClient
      .from('user_templates')
      .insert({
        user_id: currentUser.id,
        title,
        description,
        category
      });

    if (error) {
      console.error('Fehler beim Speichern:', error.message);
      alert('Could not save the template.');
      return;
    }

    document.getElementById('myTemplateTitle').value = '';
    document.getElementById('myTemplateDescription').value = '';
    document.getElementById('myTemplateCategory').value = 'Personal';
    document.getElementById('myTemplateEditor').hidden = true;

    await loadMyTemplates();
  });


document.addEventListener('click', async event => {
  const button = event.target.closest('[data-delete-my-template]');
  if (!button || !currentUser) return;

  const id = button.dataset.deleteMyTemplate;

  if (!confirm('Delete this template?')) return;

  const { error } = await supabaseClient
    .from('user_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', currentUser.id);

  if (error) {
    console.error('Fehler beim Löschen:', error.message);
    alert('Could not delete the template.');
    return;
  }

  await loadMyTemplates();
});


async function loadMyTemplates() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from('user_templates')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fehler beim Laden eigener Templates:', error.message);
    return;
  }

  myTemplates = data || [];
  renderMyTemplates();
}

async function saveAvatar(avatar) {
  const { data: { user }, error: userError } =
    await supabaseClient.auth.getUser();

  if (userError || !user) return;

  $('#profileMessage').textContent = textFor('profileAvatarBusy');

  const { error } = await supabaseClient
    .from('profiles')
    .update({ avatar })
    .eq('id', user.id);

  if (error) {
    console.error('Avatar-Speicherfehler:', error.message);
    $('#profileMessage').textContent = textFor('profileAvatarFailed');
    return;
  }

  $('#profileAvatar').textContent = avatar;
  $('#profileMessage').textContent = textFor('profileAvatarSaved');

  document.querySelectorAll('[data-avatar]').forEach(button => {
    button.classList.toggle(
      'selected',
      button.dataset.avatar === avatar
    );
  });
}
async function updateAuthUI() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error('Auth-Fehler:', error.message);
    return;
  }

  const user = data?.session?.user ?? null;

  $('#authStatus').textContent = user
    ? textFor('accountSignedIn', { email: user.email })
    : textFor('accountSignedOut');

  $('#openAuth').hidden = !!user;
  $('#logoutBtn').hidden = !user;
  const deleteAccountButton = document.querySelector('#deleteAccountBtn');
  if (deleteAccountButton) deleteAccountButton.hidden = !user;

  // Nur Cloud-Daten neu laden, wenn sich der Account geändert hat
  const accountChanged = user?.id !== currentUser?.id;

  if (accountChanged) {
    if (user) {
      currentUser = user;
      cloudLoading = true;
      cloudSaveBlocked = false;

      try {
        const { data: cloudData, error: cloudError } =
          await supabaseClient
            .from('user_app_data')
            .select('app_data')
            .eq('user_id', user.id)
            .maybeSingle();

        if (cloudError) {
          console.error('Cloud-Ladefehler:', cloudError.message);
          cloudSaveBlocked = true;
        } else if (cloudData) {
          S = Object.assign(fresh(), cloudData.app_data);
        } else {
          S = fresh();
          await saveCloudData();
        }
      } finally {
        cloudLoading = false;
      }
    } else {
      currentUser = null;
      cloudSaveBlocked = false;
      loadLocalData();
    }
    await loadDailyJournal();
    if (user) {
      await loadMyTemplates();
    } else {
      myTemplates = [];
      renderMyTemplates();
    }
  }

  // Profil bei jedem Aufruf aktualisieren
  if (user) {
    await loadProfile();
    await loadProfileBio();
    await loadFriendProgressPreference();
    await loadSocialPrivacySettings();
    await updateMyPresence();
  } else {
    const sharingToggle = document.querySelector('#shareProgressWithFriends');
    if (sharingToggle) sharingToggle.checked = false;
    const publicToggle = document.querySelector('#publicProfileEnabled');
    if (publicToggle) publicToggle.checked = false;
  }

  await updateModerationAccess(!!user);
  await handlePendingGroupInvite();
  if (user) {
    await loadMyModerationWarnings();
    await enforceCurrentModerationStatus();
  }

  render();
}

// Auth-Änderungen überwachen
supabaseClient.auth.onAuthStateChange(() => {
  // Ausführung nach dem Auth-Callback
  setTimeout(() => updateAuthUI(), 0);
});

/* ----- state ----- */
// tasks:[{id,title,cat,rep:'once'|'daily'|'days',days:[0-6 Mon=0],date,created}]
// done:{ 'YYYY-MM-DD':[taskId] }   weeks:{ 'monday-ISO':{goal,reward,result,boss,seen} }   defeated:[{boss,week,pct,reward}]

const fresh = () => ({
  tasks: [],
  done: {},
  weeks: {},
  defeated: [],
  theme: null,
  achievements: [],
  bonusPoints: 0,
  shopPurchases: [],
  avatarFramePurchases: [],
  titlePurchases: [],
  themePurchases: [],
  streakShields: [],
  guardianBossMisses: 0,
  bossSpawnRolls: {},
  shopPurchaseHistory: [],
  nextBoss: null,

});

let S;
let currentUser = null;
let myTemplates = [];
let editingMyTemplateId = null;
let cloudLoading = false;
let cloudSaveBlocked = false;
let dailyJournalEntries = loadLocalJournalEntries('guest');
let journalEntryRecords = loadLocalJournalRecords('guest');
let editingJournalEntryId = null;
let restrictionNoticeShown = false;

function journalStorageKey(userId) { return `consistlyDailyJournal:${userId || 'guest'}`; }
function loadLocalJournalEntries(userId) {
  try {
    const parsed = JSON.parse(storage.getItem(journalStorageKey(userId)) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}
function persistLocalJournalEntries() {
  storage.setItem(journalStorageKey(currentUser?.id || 'guest'), JSON.stringify(dailyJournalEntries));
}
function journalRecordsStorageKey(userId) { return `consistlyJournalRecords:${userId || 'guest'}`; }
function loadLocalJournalRecords(userId) {
  try {
    const parsed = JSON.parse(storage.getItem(journalRecordsStorageKey(userId)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function persistLocalJournalRecords() {
  storage.setItem(journalRecordsStorageKey(currentUser?.id || 'guest'), JSON.stringify(journalEntryRecords));
}
async function loadJournalEntryRecords() {
  const userId = currentUser?.id || null;
  journalEntryRecords = loadLocalJournalRecords(userId || 'guest');
  if (!userId) return;
  const { data, error } = await supabaseClient.from('journal_entries')
    .select('id, user_id, entry_at, title, body, is_favorite, is_private, created_at, updated_at')
    .eq('user_id', userId)
    .order('entry_at', { ascending: false });
  if (currentUser?.id !== userId) return;
  if (error) {
    console.warn('Tagebucheinträge konnten nicht geladen werden:', error.message);
    document.getElementById('journalEntryStatus').textContent = textFor('journalEntryCloudUnavailable');
    return;
  }
  const merged = new Map(journalEntryRecords.map(entry => [entry.id, entry]));
  (data || []).forEach(entry => merged.set(entry.id, { ...entry, is_favorite: Boolean(entry.is_favorite), is_private: true }));
  journalEntryRecords = [...merged.values()].sort((a, b) => new Date(b.entry_at) - new Date(a.entry_at));
  persistLocalJournalRecords();
}
async function loadDailyJournal() {
  dailyJournalEntries = loadLocalJournalEntries(currentUser?.id || 'guest');
  journalEntryRecords = loadLocalJournalRecords(currentUser?.id || 'guest');
  if (!currentUser) return;
  const userId = currentUser.id;
  const { data, error } = await supabaseClient.from('daily_journal_entries')
    .select('entry_date, good, tomorrow, grateful, updated_at')
    .eq('user_id', userId);
  if (currentUser?.id !== userId) return;
  const status = document.getElementById('journalStatus');
  if (error) {
    console.warn('Tagesjournal konnte nicht aus der Cloud geladen werden:', error.message);
    if (status) { status.dataset.journalError = 'load'; status.textContent = textFor('journalCloudUnavailable'); }
  } else {
    if (status) delete status.dataset.journalError;
    (data || []).forEach(row => {
      dailyJournalEntries[row.entry_date] = { good: row.good || '', tomorrow: row.tomorrow || '', grateful: row.grateful || '', updatedAt: row.updated_at };
    });
    persistLocalJournalEntries();
  }
  await loadJournalEntryRecords();
}

function loadLocalData() {
  try {
    S = Object.assign(
      fresh(),
      JSON.parse(storage.getItem(KEY))
    );
  } catch (e) {
    S = fresh();
  }
}

loadLocalData();


function checkAchievements() {
  const completed = Object.values(S.done)
    .reduce((total, habits) => total + habits.length, 0);
  if (!S.achievements) S.achievements = [];
  const newlyUnlocked = achievementData.filter(achievement =>
    !S.achievements.includes(achievement.id) && achievement.unlocked(completed)
  );
  if (!newlyUnlocked.length) return false;
  S.achievements.push(...newlyUnlocked.map(achievement => achievement.id));
  save();
  renderAchievementPreview();
  alert(`🏆 ${textFor('achievementUnlocked')} ${newlyUnlocked.map(item => textFor(item.nameKey)).join(', ')}`);
  playRewardAnimation('achievement');
  return true;
}


function save() {
  // Während Cloud-Daten geladen werden, nichts überschreiben.
  if (cloudLoading || cloudSaveBlocked) return;

  if (currentUser) {
    saveCloudData();
  } else {
    storage.setItem(KEY, JSON.stringify(S));
  }
}

async function saveCloudData() {
  if (!currentUser || cloudSaveBlocked) return;

  const { error } = await supabaseClient
    .from('user_app_data')
    .upsert({
      user_id: currentUser.id,
      app_data: S,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Cloud-Speicherfehler:', error.message);
  }
}


/* ----- date helpers (local time, ISO strings compare correctly) ----- */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [a, b, c] = s.split('-').map(Number); return new Date(a, b - 1, c); };
const add = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const wd = s => (parse(s).getDay() + 6) % 7;           // Monday = 0
const monOf = s => add(s, -wd(s));
const TEST_DAY_OFFSET_KEY = 'consistlyTestDayOffset';
const getTestDayOffset = () => { try { return Math.max(-365, Math.min(365, Number.parseInt(localStorage.getItem(TEST_DAY_OFFSET_KEY) || '0', 10) || 0)); } catch { return 0; } };
const testDateNow = () => { const date = new Date(); date.setDate(date.getDate() + getTestDayOffset()); return date; };
const today = () => iso(testDateNow());
const SUPPORTED_LANGUAGE_CODES = Object.freeze(['en', 'de', 'es', 'it', 'el', 'pt']);
const getSupportedLanguage = () => {
  const stored = storage.getItem('siteLanguage');
  return SUPPORTED_LANGUAGE_CODES.includes(stored) ? stored : 'en';
};
const localeForLanguage = () => ({ de: 'de-DE', es: 'es-ES', en: 'en-GB', it: 'it-IT', el: 'el-GR', pt: 'pt-PT' }[getSupportedLanguage()]);
const fmt = (s, o) => parse(s).toLocaleDateString(localeForLanguage(), o || { day: 'numeric', month: 'short' });
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const R = v => Math.round(v);

// ===== CORE HELPERS =====


function occurs(t, d) {
  if (t.rep === 'once') return t.date === d;
  if (t.rep === 'daily') return true;
  if (t.rep === 'days') return (t.days || []).includes(wd(d));
  if (t.rep === 'weekly') return wd(d) === wd(t.date || d);
  return false;
}


$('#saveProfileBio')?.addEventListener('click', async () => {
  if (!currentUser) return;

  const bio = $('#profileBio').value.trim();
  const message = $('#bioMessage');

  const { error } = await supabaseClient
    .from('profiles')
    .update({ bio })
    .eq('id', currentUser.id);

  if (error) {
    message.textContent = textFor('profileSaveError');
    console.error(error);
    return;
  }

  message.textContent = textFor('bioSaved');
});

function planned(d) {
  return S.tasks.filter(t => occurs(t, d));
}

function doneOn(d) {
  return S.done[d] || [];
}

// Day value = done / planned * 100 (null if nothing planned -> ignored)
const dayStat = d => { const p = planned(d).length, k = doneOn(d).length; return { p, k, pct: p ? k / p * 100 : null }; };
function overallCompletionRate() {
  const start = firstDay();
  if (!start) return null;
  let plannedCount = 0, doneCount = 0;
  for (let date = start; date <= today(); date = add(date, 1)) {
    const scheduled = S.tasks.filter(task => task.created <= date && occurs(task, date));
    const completedIds = doneOn(date);
    plannedCount += scheduled.length;
    doneCount += scheduled.filter(task => completedIds.includes(task.id)).length;
  }
  return plannedCount ? Math.round(doneCount / plannedCount * 100) : null;
}
// Week value = all done / all planned of the week * 100
const weekStat = m => { let p = 0, k = 0; for (let i = 0; i < 7; i++) { const s = dayStat(add(m, i)); p += s.p; k += s.k; } return { p, k, pct: p ? k / p * 100 : null }; };
function avg4() {                                    // mean of the last 4 weeks that had tasks
  const m = monOf(today()), v = [0, 1, 2, 3].map(i => weekStat(add(m, -7 * i)).pct).filter(x => x !== null);
  return v.length ? v.reduce((a, b) => a + b) / v.length : null;
}
const firstDay = () => S.tasks.length ? S.tasks.reduce((a, t) => t.created < a ? t.created : a, today()) : null;
function streak() {                                  // consecutive days >= 80 %, days without tasks are skipped
  const f = firstDay(); if (!f) return 0;
  let d = today(), n = 0;
  if (!(dayStat(d).pct >= 80)) d = add(d, -1);           // today may still be in progress
  for (let i = 0; i < 400 && d >= f; i++, d = add(d, -1)) { const s = dayStat(d); if (!s.p) continue; if (s.pct >= 80) n++; else if (consumeStreakShield(d)) n++; else break; }
  return n;
}

function consumeStreakShield(date) {
  const shields = Array.isArray(S?.streakShields) ? S.streakShields : (S.streakShields = []);
  const shield = shields.find(item => !item.usedOn && item.purchasedOn <= date);
  if (!shield) return false;
  shield.usedOn = date;
  save();
  return true;
}
function grantStreakShield(source = 'shop') {
  if (!Array.isArray(S.streakShields)) S.streakShields = [];
  const shield = { id: uid(), purchasedOn: today(), usedOn: null, source };
  if (source === 'shop') recordShopPurchase('streakShield', shield.id, STREAK_SHIELD_PRICE);
  S.streakShields.push(shield);
  save();
  return shield;
}



/* ----- boss weeks ----- */
function bossTypeForLevel(level) {
  // Keep each level's lucky roll stable. The Guardian is random, with a pity cap
  // so an unlucky sequence cannot postpone it forever.
  if (!S.bossSpawnRolls || typeof S.bossSpawnRolls !== 'object') S.bossSpawnRolls = {};
  const levelKey = String(level);
  if (Number.isInteger(S.bossSpawnRolls[levelKey])) return S.bossSpawnRolls[levelKey];
  let boss;
  if (level <= 1) boss = 0;
  else if ((Number(S.guardianBossMisses) || 0) >= 17 || Math.random() < (1 / 9)) boss = STREAK_GUARDIAN_BOSS_INDEX;
  else boss = Math.random() < 0.5 ? 0 : 1;
  if (level > 1) {
    S.guardianBossMisses = boss === STREAK_GUARDIAN_BOSS_INDEX ? 0 : (Number(S.guardianBossMisses) || 0) + 1;
  }
  S.bossSpawnRolls[levelKey] = boss;
  save();
  return boss;
}

function nextBossLevel() {
  const levels = (S.defeated || []).map((entry, index) => Number(entry.level) || index + 1);
  return Math.max(0, ...levels) + 1;
}
function bossHpForLevel(level, plannedTasks) {
  const planned = Math.max(0, Number(plannedTasks) || 0);
  return Math.max(1, Math.min(BOSS_SPAWN_HP, planned || 1));
}

function week(m) {                                   // get or create the week record (boss gets stronger: higher default goal)
  if (!S.weeks[m]) {
    const level = nextBossLevel();
    const storedNextBoss = S.nextBoss?.level === level ? S.nextBoss : null;
    const boss = storedNextBoss?.boss ?? bossTypeForLevel(level);
    if (storedNextBoss) S.nextBoss = null;
    const plannedTasks = weekStat(m).p;
    S.weeks[m] = { goal: Math.min(95, 70 + 5 * (level - 1)), reward: '', result: null, boss, level, bossHp: storedNextBoss?.hp ?? bossHpForLevel(level, plannedTasks), bossDamage: storedNextBoss?.damage || 0, bossHitKeys: [], seen: false };
    save();
  }
  return S.weeks[m];
}

function recordBossWin(w, monday, pct) {
  const bossLevel = w.level || nextBossLevel();
  const savedWin = S.defeated.find(item => item.week === monday && (Number(item.level) || bossLevel) === bossLevel && item.boss === w.boss);
  w.result = 'won';
  if (!savedWin) {
    S.defeated.push({ boss: w.boss, level: bossLevel, week: monday, pct: R(pct), reward: w.reward });
    if (w.boss === STREAK_GUARDIAN_BOSS_INDEX) grantStreakShield('guardian');
  }
  if (!Number.isInteger(w.nextBoss)) {
    const nextLevel = nextBossLevel();
    const nextBoss = { boss: bossTypeForLevel(nextLevel), level: nextLevel, hp: bossHpForLevel(nextLevel, weekStat(monday).p), damage: 0 };
    w.nextBoss = nextBoss.boss;
    w.nextLevel = nextBoss.level;
    w.nextBossHp = nextBoss.hp;
    w.nextBossDamage = 0;
    S.nextBoss = nextBoss;
  }
  save();
}

function defeatSpawnedBoss(w, monday) {
  if (!Number.isInteger(w.nextBoss)) return;
  const boss = w.nextBoss, level = w.nextLevel || nextBossLevel();
  if (!S.defeated.some(item => (Number(item.level) || 0) === level)) {
    S.defeated.push({ boss, level, week: monday, pct: 100, reward: '' });
    if (boss === STREAK_GUARDIAN_BOSS_INDEX) grantStreakShield('guardian');
  }
  const nextLevel = nextBossLevel();
  const nextBoss = { boss: bossTypeForLevel(nextLevel), level: nextLevel, hp: bossHpForLevel(nextLevel, weekStat(monday).p), damage: 0 };
  w.nextBoss = nextBoss.boss;
  w.nextLevel = nextBoss.level;
  w.nextBossHp = nextBoss.hp;
  w.nextBossDamage = 0;
  S.nextBoss = nextBoss;
  save();
}

function ensureBossSpawnAfterSavedWin(w, monday) {
  if (w.result !== 'won') return;
  let repaired = false;
  // Upgrade wins saved by older app versions: they didn't store the next boss.
  const currentLevel = w.level || nextBossLevel();
  if (!S.defeated.some(item => item.week === monday && item.boss === w.boss && (Number(item.level) || currentLevel) === currentLevel)) {
    S.defeated.push({ boss: w.boss, level: currentLevel, week: monday, pct: R(weekStat(monday).pct || 0), reward: w.reward });
    repaired = true;
  }
  if (!Number.isInteger(w.nextBoss)) {
    const level = nextBossLevel();
    const next = S.nextBoss?.level === level ? S.nextBoss : { boss: bossTypeForLevel(level), level, hp: bossHpForLevel(level, weekStat(monday).p), damage: 0 };
    w.nextBoss = next.boss;
    w.nextLevel = next.level;
    S.nextBoss = next;
    repaired = true;
  }
  if (!Number.isFinite(w.nextBossHp) || w.nextBossHp > BOSS_SPAWN_HP) { w.nextBossHp = BOSS_SPAWN_HP; repaired = true; }
  if (!Number.isFinite(w.nextBossDamage)) { w.nextBossDamage = 0; repaired = true; }
  if (!Number.isFinite(w.bossHp)) { w.bossHp = bossHpForLevel(w.level || 1, weekStat(monday).p); repaired = true; }
  if (S.nextBoss?.level !== w.nextLevel || S.nextBoss?.boss !== w.nextBoss || S.nextBoss?.damage !== w.nextBossDamage || S.nextBoss?.hp !== w.nextBossHp) {
    S.nextBoss = { boss: w.nextBoss, level: w.nextLevel, hp: w.nextBossHp, damage: w.nextBossDamage };
    repaired = true;
  }
  if (repaired) save();
}

function applyBossHit(taskId, date) {
  const monday = monOf(date);
  if (monday !== monOf(today())) return false;
  const w = week(monday), hitKey = `${date}:${taskId}`;
  if (!Array.isArray(w.bossHitKeys)) w.bossHitKeys = [];
  if (w.bossHitKeys.includes(hitKey)) return false;
  w.bossHitKeys.push(hitKey);
  let defeated = false;
  if (w.result === 'won' && Number.isInteger(w.nextBoss)) {
    w.nextBossDamage = (Number(w.nextBossDamage) || 0) + 1;
    if (S.nextBoss?.level === w.nextLevel) S.nextBoss.damage = w.nextBossDamage;
    const hp = Number.isFinite(w.nextBossHp) ? w.nextBossHp : bossHpForLevel(w.nextLevel, weekStat(monday).p);
    if (w.nextBossDamage >= hp) { defeatSpawnedBoss(w, monday); defeated = true; }
  } else {
    w.bossDamage = (Number(w.bossDamage) || 0) + 1;
    const hp = Number.isFinite(w.bossHp) ? w.bossHp : bossHpForLevel(w.level, weekStat(monday).p);
    if (w.bossDamage >= hp) { recordBossWin(w, monday, weekStat(monday).pct || 0); defeated = true; }
  }
  save();
  return defeated;
}

function tab(v) {
  cur = v;

  // Richtige Ansicht anzeigen
  $$('.view').forEach(e => {
    e.hidden = e.id !== 'v-' + v;
  });

  // Aktiven Button in der unteren Navigation markieren
  $$('nav button').forEach(b => {
    b.classList.toggle('on', b.dataset.v === v);
  });

  // Hamburger-Menü schließen
  if (['settings', 'stats', 'leaderboard'].includes(v)) {
    document.querySelector('#settingsMenu')?.classList.remove('open');
    document.querySelector('#settingsMenuBackdrop')?.classList.remove('open');
  }

  if (v === 'social') loadSocialPage();
  if (v === 'leaderboard') loadXpLeaderboard();
}
/* ----- actions ----- */
/* ----- actions ----- */



function toggle(id, d) {
  // Tasks dürfen nur am aktuellen App-Datum abgehakt werden
  if (d !== today()) {
    return;
  }

  const a = S.done[d] || (S.done[d] = []);
  const i = a.indexOf(id);

  if (i < 0) {
    a.push(id);
  } else {
    a.splice(i, 1);
  }

  const completed = i < 0;

  // Nur die betroffenen Ansichten aktualisieren
  $('#todayList').innerHTML = list(today());

  if (d === sel) {
    $('#dayList').innerHTML =
      `<h2>${fmt(sel, {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })}</h2>` +
      list(sel) +
      `<section class="card journal-history" id="journalHistory"></section>`;

    renderJournalHistory(sel);
  }

  // Home-Fortschritt aktualisieren
  const cm = monOf(today());
  const ws = weekStat(cm);
  const ds = dayStat(today());

  $('#ringArc').style.strokeDashoffset =
    326.73 * (1 - (ws.pct || 0) / 100);

  $('#wPct').textContent = R(ws.pct || 0) + '%';
  $('#dPct').textContent =
    ds.pct === null ? '–' : R(ds.pct) + '%';

  // Bestehende Spiellogik
  const unlockedAchievement = completed
    ? checkAchievements()
    : false;

  const bossDefeated = completed
    ? applyBossHit(id, d)
    : false;

  if (bossDefeated) showResult();

  if (completed) {
    if (!unlockedAchievement) showHabitAchievementTest();

    playSelectedHabitSound();

    $$(`.task[data-id="${id}"]`).forEach(r =>
      r.classList.add('pop')
    );

    if (cm === monOf(d)) {
      for (const [el, c] of [
        [$('#bossEmoji'), 'hit'],
        [$('#dmg'), 'show']
      ]) {
        if (!el) continue;
        el.classList.remove(c);
        void el.offsetWidth;
        el.classList.add(c);
      }
    }

    navigator.vibrate?.(15);
  }

  // Cloud-Speicherung im Hintergrund
  save();
}

function openTask(id) {
  const task = S.tasks.find(x => x.id === id) || {
    rep: 'once',
    days: [],
    date: sel
  };

  const lang = getSupportedLanguage();
  const dict = translations[lang] || translations.en;

  $('#tHead').textContent = id
    ? (dict.editTask || translations.en.editTask || 'Edit task')
    : (dict.newTask || translations.en.newTask || 'New task');

  $('#tTitle').value = task.title || '';
  $('#tCat').value = task.cat || '';

  $('#tColorEnabled').checked = !!task.color;
  $('#tColor').value = task.color || '#8b5cf6';
  $('#tColor').disabled = !task.color;
  updateTaskColorUI();

  $('#tReminderEnabled').checked =
    task.reminderEnabled === true;

  $('#tReminderTime').value =
    task.reminderTime || '18:00';
  $('#tRep').value = task.rep;
  $('#tDate').value = task.date || sel;
  $('#tDel').hidden = !id;
  $('#taskDlg').dataset.id = id || '';

  // Übersetzte Wochentage
  $('#tDays').innerHTML = getTranslatedDays().map((n, i) =>
    `<label>${n}<input type="checkbox" value="${i}" ${(task.days || []).includes(i) ? 'checked' : ''
    }></label>`
  ).join('');

  function updateRepUI() {
    $('#tDate').hidden = $('#tRep').value !== 'once';
    $('#tDays').hidden = $('#tRep').value !== 'days';
  }

  updateRepUI();

  setTaskMode('custom');

  $('#taskDlg').showModal();
}


function setTaskMode(mode) {
  const customView = $('#customTaskView');
  const templateView = $('#templateView');
  const saveButton = $('#saveTaskButton');

  const buttons = $$('#taskDlg [data-act="taskMode"]');

  customView.hidden = mode !== 'custom';
  templateView.hidden = mode !== 'templates';

  saveButton.hidden = mode !== 'custom';
  $('#tDel').hidden =
    mode !== 'custom' || !$('#taskDlg').dataset.id;

  buttons.forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('pri', active);
  });

  $('#tHead').textContent =
    mode === 'templates'
      ? 'Choose Templates'
      : ($('#taskDlg').dataset.id ? 'Edit task' : 'New task');
}


function getFavoriteTemplates() {
  try {
    const saved = storage.getItem('favoriteTemplates');

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed)
      ? [...new Set(parsed.filter(item => typeof item === 'string'))]
      : [];
  } catch (error) {
    console.error('Could not load favorite templates:', error);
    return [];
  }
}




function renderTemplateFavorites() {
  const section = document.getElementById('templateFavoritesSection');
  const list = document.getElementById('templateFavoritesList');
  const count = document.getElementById('templateFavoritesCount');

  if (!section || !list) return;

  const favorites = getFavoriteTemplates();

  const originalInputs = [
    ...document.querySelectorAll(
      '#templateView [data-template]:not([data-favorite-copy])'
    )
  ];

  const favoriteInputs = originalInputs.filter(input =>
    favorites.includes(input.value.trim())
  );

  list.innerHTML = '';

  if (count) count.textContent = favoriteInputs.length;

  section.style.display = favoriteInputs.length ? '' : 'none';

  favoriteInputs.forEach(input => {
    const label = document.createElement('label');
    label.className = 'favorite-template-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.favoriteCopy = 'true';
    checkbox.value = input.value;
    checkbox.checked = input.checked;

    const text = document.createElement('span');
    text.textContent = input.value;

    label.append(checkbox, text);
    list.appendChild(label);
  });
}

async function loadMyTemplates() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from('user_templates')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fehler beim Laden eigener Templates:', error.message);
    return;
  }

  myTemplates = data || [];
  renderMyTemplates();
}


document.addEventListener('change', event => {
  const target = event.target;

  // Änderung in der Favoritenliste
  if (target.matches('[data-favorite-copy]')) {
    const originals = [
      ...document.querySelectorAll(
        '[data-template]:not([data-favorite-copy])'
      )
    ];

    const original = originals.find(input =>
      input.value === target.value
    );

    if (original) original.checked = target.checked;
  }

  // Änderung bei einem originalen Template
  if (
    target.matches('[data-template]') &&
    !target.hasAttribute('data-favorite-copy')
  ) {
    const copies = [
      ...document.querySelectorAll('[data-favorite-copy]')
    ];

    const copy = copies.find(input =>
      input.value === target.value
    );

    if (copy) copy.checked = target.checked;
  }
});

document.addEventListener('change', event => {
  if (event.target.matches(
    '#templateView [data-template], #templateView [data-favorite-copy]'
  )) {
    updateAddSelectedButton();
  }
});

// Häufigkeit und Favoriten neben den Templates anzeigen
function initTemplateControls() {
  const favorites = getFavoriteTemplates();

  document.querySelectorAll(
    '[data-template]:not([data-favorite-copy])'
  ).forEach(input => {
    const label = input.closest('label');

    if (!label || label.dataset.controlsReady === 'true') return;

    label.dataset.controlsReady = 'true';

    const title = input.value.trim();

    // Häufigkeit auswählen
    const controls = document.createElement('div');
    controls.className = 'template-controls';

    const select = document.createElement('select');
    select.className = 'template-frequency';
    select.setAttribute('aria-label', `Häufigkeit für ${title}`);

    const frequencies = [
      { value: 'daily', label: 'Daily' },
      { value: 'weekdays', label: 'Weekdays' },
      { value: 'weekends', label: 'Weekends' },
      { value: 'weekly', label: 'Weekly (Monday)' }
    ];

    frequencies.forEach(frequency => {
      const option = document.createElement('option');
      option.value = frequency.value;
      option.textContent = frequency.label;
      select.appendChild(option);
    });

    input.dataset.frequency = 'daily';

    select.addEventListener('change', () => {
      input.dataset.frequency = select.value;
    });

    // Favoriten-Schaltfläche
    const favoriteButton = document.createElement('button');
    favoriteButton.type = 'button';
    favoriteButton.className = 'template-favorite';
    favoriteButton.setAttribute('aria-label', 'Favorit markieren');

    function updateFavoriteButton() {
      const isFavorite = getFavoriteTemplates().includes(title);

      favoriteButton.textContent = isFavorite ? '★' : '☆';
      favoriteButton.classList.toggle('active', isFavorite);
      favoriteButton.setAttribute(
        'aria-pressed',
        String(isFavorite)
      );
    }

    favoriteButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();

      let currentFavorites = [...new Set(getFavoriteTemplates())];

      if (currentFavorites.includes(title)) {
        currentFavorites = currentFavorites.filter(
          item => item !== title
        );
      } else {
        currentFavorites.push(title);
      }

      storage.setItem(
        'favoriteTemplates',
        JSON.stringify(currentFavorites)
      );

      updateFavoriteButton();
      renderTemplateFavorites();
    });

    controls.appendChild(select);
    controls.appendChild(favoriteButton);

    label.insertAdjacentElement('afterend', controls);

    updateFavoriteButton();
  });
}


function updateAddSelectedButton() {
  const button = document.getElementById('addSelectedTemplates');
  if (!button) return;

  const selected = document.querySelectorAll(
    '#templateView [data-template]:checked:not([data-favorite-copy])'
  ).length;

  button.classList.toggle('has-selection', selected > 0);
  button.textContent = selected > 0
    ? `Add Selected (${selected})`
    : 'Add Selected';
}



// Templates hinzufügen
function addTemplates() {
  const selected = [
    ...document.querySelectorAll(
      '#templateView [data-template]:checked:not([data-favorite-copy])'
    )
  ];

  if (!selected.length) return;

  let addedCount = 0;
  let duplicateCount = 0;

  selected.forEach(input => {
    const title = input.value.trim();
    if (!title) return;

    // Duplikate verhindern (Groß-/Kleinschreibung ignorieren)
    const normalizedTitle = title.toLowerCase();

    const alreadyExists = S.tasks.some(task =>
      (task.title || '').trim().toLowerCase() === normalizedTitle
    );

    if (alreadyExists) {
      duplicateCount++;
      return;
    }

    const frequency = input.dataset.frequency || 'daily';

    let rep = 'daily';
    let days = [];

    if (frequency === 'weekdays') {
      rep = 'days';
      days = [0, 1, 2, 3, 4];
    } else if (frequency === 'weekends') {
      rep = 'days';
      days = [5, 6];
    } else if (frequency === 'weekly') {
      rep = 'days';
      days = [0];
    }

    const task = {
      id: uid(),
      title,
      cat: 'Routine',
      rep,
      days,
      date: null,
      created: sel,
      reminderEnabled: false,
      reminderTime: '18:00'
    };

    S.tasks.push(task);
    addedCount++;
  });

  // Auswahl zurücksetzen
  selected.forEach(input => {
    input.checked = false;
    input.dataset.frequency = 'daily';

    const controls = input.closest('label')
      ?.nextElementSibling;

    const select = controls?.querySelector('.template-frequency');

    if (select) select.value = 'daily';
  });

  updateAddSelectedButton();

  save();
  $('#taskDlg').close();
  render();

  if (duplicateCount > 0) {
    console.log(
      `[Templates] ${addedCount} hinzugefügt, ${duplicateCount} Duplikate übersprungen.`
    );
  }
}


let templateSearchActive = false;

let recentlyAddedOnly = false;

function filterTemplates(query) {
  const search = query.trim().toLowerCase();

  const categories = document.querySelectorAll(
    '#templateView .template-category'
  );

  const filtersActive = search || recentlyAddedOnly;

  // Ursprüngliche Ansicht wiederherstellen
  if (!filtersActive) {
    categories.forEach(category => {
      category.hidden = false;

      category.querySelectorAll(
        '.template-category-content > label'
      ).forEach(label => {
        label.style.display = '';

        const controls = label.nextElementSibling;
        if (controls?.classList.contains('template-controls')) {
          controls.style.display = '';
        }
      });

      if (templateSearchActive) {
        category.open = category.dataset.wasOpen === 'true';
        delete category.dataset.wasOpen;
      }
    });

    templateSearchActive = false;
    return;
  }

  // Öffnungszustand beim ersten Filter speichern
  if (!templateSearchActive) {
    categories.forEach(category => {
      category.dataset.wasOpen = String(category.open);
    });

    templateSearchActive = true;
  }

  categories.forEach(category => {
    let matches = 0;

    const labels = category.querySelectorAll(
      '.template-category-content > label'
    );

    labels.forEach(label => {
      const input = label.querySelector(
        'input[data-template]:not([data-favorite-copy])'
      );

      if (!input) return;

      const matchesSearch =
        input.value.toLowerCase().includes(search);

      const isRecentlyAdded =
        input.dataset.recentlyAdded === 'true';

      const isMatch =
        matchesSearch && (!recentlyAddedOnly || isRecentlyAdded);

      label.style.display = isMatch ? '' : 'none';

      const controls = label.nextElementSibling;

      if (controls?.classList.contains('template-controls')) {
        controls.style.display = isMatch ? '' : 'none';
      }

      if (isMatch) matches++;
    });

    category.hidden = matches === 0;
    category.open = matches > 0;
  });
}

// Live-Suche
document.getElementById('templateSearch')
  ?.addEventListener('input', event => {
    filterTemplates(event.target.value);
  });

document.getElementById('recentlyAddedBtn')
  ?.addEventListener('click', function () {
    recentlyAddedOnly = !recentlyAddedOnly;

    this.classList.toggle('active', recentlyAddedOnly);

    const search = document.getElementById('templateSearch');
    filterTemplates(search?.value || '');
  });

// Controls initialisieren, sobald das HTML verfügbar ist
function initializeTemplateSystem() {
  initTemplateControls();
  renderTemplateFavorites();
  updateAddSelectedButton();
}

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    initializeTemplateSystem,
    { once: true }
  );
} else {
  initializeTemplateSystem();
}


document.getElementById('addSelectedTemplates')
  ?.addEventListener('click', () => {
    addTemplates();
  });

function updateTaskColorUI() {
  const enabled = $('#tColorEnabled').checked;
  const color = $('#tColor').value;

  $('#tColor').disabled = !enabled;
  $('#taskColorPicker').hidden = !enabled;

  $('#taskColorPreview').style.background = color;
  $('#taskColorHex').textContent = color.toUpperCase();
}

$('#tColorEnabled').addEventListener('change', updateTaskColorUI);
$('#tColor').addEventListener('input', updateTaskColorUI);

function saveTask() {
  console.log('Gespeicherte Erinnerungen:');
  console.log(JSON.stringify(
    S.tasks.map(t => ({
      title: t.title,
      reminderEnabled: t.reminderEnabled,
      reminderTime: t.reminderTime
    })),
    null,
    2
  ));

  const title = $('#tTitle').value.trim();
  if (!title) {
    $('#tTitle').focus();
    return;
  }

  const rep = $('#tRep').value;
  const id = $('#taskDlg').dataset.id;
  const old = S.tasks.find(x => x.id === id);

  let days = $$('#tDays input:checked').map(c => +c.value);

  if (rep === 'days' && !days.length) {
    days = [0, 1, 2, 3, 4, 5, 6];
  }

  const date = $('#tDate').value || sel;

  const task = {
    id: id || uid(),
    title,
    cat: $('#tCat').value.trim(),
    rep,
    days: rep === 'days' ? days : [],
    date: rep === 'once' ? date : null,
    created: rep === 'once' ? date : (old ? old.created : sel),

    // Individuelle Habit-Erinnerung
    reminderEnabled: $('#tReminderEnabled').checked,
    reminderTime: $('#tReminderTime').value || '18:00',

    // Individuelle Aufgabenfarbe
    color: $('#tColorEnabled').checked
      ? $('#tColor').value
      : null
  };

  if (old) {
    Object.assign(old, task);
  } else {
    S.tasks.push(task);
  }

  console.log(
    '[Habit Reminder] Gespeichert:',
    S.tasks.map(t => ({
      id: t.id,
      title: t.title,
      reminderEnabled: t.reminderEnabled,
      reminderTime: t.reminderTime
    }))
  );

  save();
  $('#taskDlg').close();
  render();
}


function delTask() {
  const id = $('#taskDlg').dataset.id;

  S.tasks = S.tasks.filter(t => t.id !== id);

  for (const d in S.done) {
    S.done[d] = S.done[d].filter(x => x !== id);
  }

  save();
  $('#taskDlg').close();
  render();
}

function openGoal() {
  const w = week(monOf(today()));

  if (w.result) {
    alert('This week is already decided.');
    return;
  }

  $('#gRange').value = w.goal;
  $('#gVal').textContent = w.goal + '%';
  $('#gReward').value = w.reward;
  $('#goalDlg').showModal();
}

function saveGoal() {
  const w = week(monOf(today()));

  w.goal = +$('#gRange').value;
  w.reward = $('#gReward').value.trim();

  save();
  $('#goalDlg').close();
  render();
}

function theme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  S.theme = dark ? 'light' : 'dark';
  applyTheme();
  save();
}

function applyTheme() {
  document.documentElement.dataset.theme =
    S.theme ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}


const translations = {
  en: {
    editTask: "Edit task",
    newTask: "New task",
    taskTitlePlaceholder: "Task title",
    taskCategoryPlaceholder: "Category (optional)",
    themeObsidianGold: "Obsidian Gold",
    themeObsidianGoldDesc: "Black glass · Liquid gold",
    themeFalloutTerminal: "Fallout Terminal",
    themeFalloutTerminalDesc: "Wasteland green · Retro terminal",
    themeNocturnal: "Nocturnal",
    themeNocturnalDesc: "Midnight blue · Starlight",
    themeRuby: "Ruby",
    themeRubyDesc: "Deep crimson · Ruby glow",
    themeAmethyst: "Amethyst",
    themeAmethystDesc: "Dark violet · Lavender glow",
    noBossDefeated: "No boss defeated yet. Hit your weekly goal to win your first one!",
    goalLabel: "Goal",
    rewardLabel: "Reward",
    noRewardSet: "no reward set",
    themeCherryNoir: "Cherry Noir",
    themeCherryNoirDesc: "Cherry red · Dark elegance",
    themeAurora: "Aurora",
    themeAuroraDesc: "Northern lights · Magical",
    themeSynthwave: "Synthwave",
    themeSynthwaveDesc: "Neon pink · Retro future",
    themeGlacier: "Glacier",
    themeGlacierDesc: "Ice blue · Crystal clear",
    themePeachGlow: "Peach Glow",
    themePeachGlowDesc: "Peach · Warm and cozy",
    themeSakura: "Sakura",
    themeSakuraDesc: "Soft blossom · Calm and bright",
    themeDeepSpace: "Deep Space",
    themeDeepSpaceDesc: "Cosmic blue · Starlit",
    themeMatcha: "Matcha",
    themeMatchaDesc: "Fresh green · Calm and natural",

    themeMidnight: "Midnight",
    themeMidnightDesc: "Deep purple · Dark",
    themeOcean: "Ocean",
    themeOceanDesc: "Cool blue · Calm",
    themeForest: "Forest",
    themeForestDesc: "Sage green · Natural",
    themeSunset: "Sunset",
    themeSunsetDesc: "Warm coral · Soft",
    themeLavender: "Lavender",
    themeLavenderDesc: "Pastel violet · Dreamy",
    themePaper: "Paper",
    themePaperDesc: "Warm cream · Minimal",
    themeNeon: "Neon",
    themeNeonDesc: "Black · Electric green",
    themeRose: "Rose",
    themeRoseDesc: "Soft pink · Cozy",
    themeArctic: "Arctic",
    themeArcticDesc: "Ice blue · Fresh",
    themeGolden: "Golden",
    themeGoldenDesc: "Warm gold · Cozy",
    themeCoralReef: "Coral Reef",
    themeCoralReefDesc: "Tropical teal · Coral glow",
    themeCyberpunk: "Cyberpunk",
    themeCyberpunkDesc: "Neon cyan · Electric night",
    themeEmber: "Ember",
    themeEmberDesc: "Molten orange · Warm charcoal",
    titleShopHeading: "✨ Profile titles",
    profileTitleEquipped: "✨ Equipped title",
    titleShopIntro: "Buy a glowing title and show it on your profile.",
    titleInventoryHeading: "✨ Your titles",
    titleComet: "Comet",
    titleStarlight: "Starlight",
    titleNeonDream: "Neon Dream",
    titleRoyalAura: "Royal Aura",
    titleSolarFlare: "Solar Flare",
    equipTitle: "✨ Equip title",
    noTitles: "You have not purchased any titles yet.",
    titleEquipFailed: "Could not equip title: {error}",

    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun",
    cont: "Continue",
    sav: "Save",
    ca: "Cancel",
    g: "Goal",
    wg: "Weekly Goal",
    del: "Delete",
    save: "Save",
    canc: "Cancel",
    spec: "Specific Weekdays",
    dai: "Daily",
    once: "One-time",
    nt: "New task",
    shoop: "Shop",
    settings: "Settings",
    bosses: "Bosses",
    stats: "Stats",
    home: "Home",
    week: "Week",
    bcx: "Boss collection",
    apy: "Appearance",
    souny: "Sound enabled",
    edy: "Edit Goal",
    tw: "This Week",
    viby: "Choose your personal vibe.",
    wc: "Weekly consistency (last 8 weeks)",
    rewards: "🎁 Rewards",
    compro: "✅ Your Purchases",
    ss: "🔊 Satisfying Sound",
    tp: "Total Points:",
    available: "Your available points:",
    ps: "🪙 Pointshop",
    l4w: "Last 4 Weeks",
    today: "Today",
    settingsTitle: "Settings",
    languageLabel: "Language",
    friendsTitle: "Friends",
    socialHomeButton: "💬 Open Chats",
    registration: "Log in / Sign up",
    reportReasonPlaceholder: "What happened?",
    friendsHomeIntro: "Find friends and follow each other's progress.",
    searchUsers: "🔎 Search users",
    friendRequests: "📩 Friend requests",
    inventoryTitle: "🎒 Your inventory",
    inventoryHint: "Your purchased sounds are here. Try them and equip your favorite.",
    soundLabel: "🔊 Satisfying sound",
    profileTitle: "👤 My profile",
    changePicture: "📷 Change profile picture",
    aboutMe: "✍️ About me",
    bioPlaceholder: "Write something about yourself ...",
    max160: "Maximum 160 characters",
    saveBio: "Save description",
    chooseAvatar: "🎨 Choose avatar",
    achievements: "🏆 Achievements",
    achievementBlurb: "Your achievements and milestones in Consistly.",
    accountTitle: "👤 Consistly account",
    loginRegister: "Log in / Sign up",
    forgotPassword: "Forgot password?",
    logout: "Log out",
    deleteAccount: "Delete account permanently",
    remindersTitle: "🔔 Reminders",
    remindersIntro: "Get a daily reminder for your habits at the time you choose.",
    remindersEnable: "Enable daily reminder",
    reminderTime: "Reminder time",
    testReminder: "🔔 Send test notification",
    saveReminderSettings: "💾 Save reminder settings",
    quietHoursTitle: "🌙 Quiet hours",
    quietHoursIntro: "You will not receive habit reminders during these hours.",
    quietHoursEnable: "Enable quiet hours",
    quietStart: "Quiet hours start",
    quietEnd: "Quiet hours end",
    saveQuietHours: "💾 Save quiet hours",
    accountNotices: "⚠️ Account notices",
    moderationReports: "🛡️ Moderation reports",
    adminReportsIntro: "Private chat reports for admins.",
    refreshReports: "🔄 Refresh reports",
    social: "💬 Social",
    privateChats: "Your private chats with friends",
    chooseFriend: "Choose a friend to start chatting.",
    writeMessage: "Write a message ...",
    send: "Send",
    close: "Close",
    reportMessage: "⚑ Report message",
    reportTitle: "⚑ Report message",
    reportIntro: "Choose a reason and briefly describe what happened.",
    reportCategory: "Category",
    reportDescription: "Description",
    reportPlaceholder: "What happened?",
    sendReport: "Send report",
    cancel: "Cancel",
    catInsult: "Insult or harassment",
    catNsfw: "Sexual / NSFW content",
    catThreat: "Threat or violence",
    catHate: "Hate speech or discrimination",
    catSpam: "Spam or scam",
    catOther: "Other",
    warning: "Warning",
    reviewStatus: "Under review",
    closeReport: "Close report",
    reopenReport: "Reopen",
    adminNote: "Admin note / warning",
    adminNotePlaceholder: "Reason or message to the user",
    warnUser: "Warn user",
    timeout24: "Timeout 24 hours",
    timeout7: "Timeout 7 days",
    permanentBan: "Ban permanently",
    liftBan: "Lift ban",
    moderationPending: "{count} open report(s)",
    noOpenReports: "No open reports.",
    noReports: "No chat messages have been reported.",
    reportedBy: "Reported by:",
    reportedUser: "About:",
    categoryLabel: "Category:",
    descriptionLabel: "Additional details:",
    reportDeletedUser: "The reported account was deleted; actions are no longer available.",
    reportedContentUnavailable: "[Message is no longer available]",
    accountWarningsNone: "No account notices.",
    warningSeen: "Read",
    markRead: "Mark as read",
    warningLoadError: "Could not load account notices.",
    noFriends: "You have no confirmed friends yet. Add a friend first.",
    loadingFriends: "Loading friends ...",
    friendsLoadError: "Could not load friends.",
    loadingMessages: "Loading messages ...",
    chatLoadError: "Could not load chat. Check whether the Supabase migration has been run.",
    noMessages: "No messages yet. Say hello 👋",
    sent: "✓ Sent",
    loadingReports: "Loading reports ...",
    reportsLoadError: "Could not load reports:",
    reportFailed: "Report failed:",
    reportSent: "Thanks. Your report was sent to the moderation team.",
    messageSending: "Sending message failed:",
    noTasksPlanned: "No tasks planned. Tap + to add one.",
    dayNoTasks: "No tasks",
    done: "done",
    goalLabelWeek: "Goal",
    rewardLabelWeek: "Reward:",
    noReward: "no reward set",
    totalPoints: "Total points",
    currentStreak: "Current streak (≥ 80 %)",
    bestDay: "Best day",
    bestWeek: "Best week",
    pointsPrice: "Price:",
    buy: "🛒 Buy",
    preview: "▶️ Listen",
    equip: "Equip",
    equipped: "✅ Equipped",
    purchasedReady: "Purchased · ready to equip",
    noPurchases: "No purchases yet.",
    delete: "Delete",
    taskOneTime: "One-time",
    taskDaily: "Every day",
    taskSpecificDays: "Specific weekdays",
    enableHabitReminder: "🔔 Enable a reminder for this habit",
    reminderPerHabit: "You can set a different time for every habit.",
    weeklyGoalReward: "Weekly goal & reward",
    taskRewardPlaceholder: "Your reward (e.g. Order pizza 🍕)",
    loginRequired: "Please log in first.",
    addFriend: "➕ Add",
    friendAdded: "✅ Added",
    noIncomingRequests: "No incoming requests.",
    noOutgoingRequests: "No outgoing requests.",
    noFriendsYet: "You have no friends yet.",
    blockedUsers: "🚫 Blocked users",
    noneBlocked: "You have not blocked anyone.",
    friendSearchHint: "Search for a username ...",
    chatFriendsLoading: "Loading friends ...",
    achievementUnlocked: "Achievement unlocked:",
    usernamePlaceholder: "Username",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Password",
    newPasswordPlaceholder: "New password",
    repeatPasswordPlaceholder: "Repeat password",
    searchUsernamePlaceholder: "Search username ...",
    accountCreatedOn: "📅 Account created on:",
    profilePicture: "Profile picture",
    saveBioSuccess: "✅ Description saved!",
    saveAvatarBusy: "Saving avatar...",
    saveAvatarError: "Failed to save.",
    saveAvatarSuccess: "Avatar saved!",
    uploadImageBusy: "Uploading image...",
    uploadFileTypeError: "Please choose a JPG, PNG or WebP image.",
    uploadSizeError: "Image must be 3 MB or smaller.",
    uploadFileDetected: "File selected:",
    uploadError: "Upload failed:",
    profileSaveError: "Profile error:",
    profilePictureSuccess: "Profile picture saved!",
    profileSaveBusy: "Saving ...",
    usernameNoResults: "No users found.",
    usernameSearchPrompt: "Search for a username ...",
    usernameMinLength: "Enter at least 2 characters.",
    searchFailed: "Search failed.",
    friendOverviewError: "Could not load friend overview.",
    online: "🟢 Online",
    offline: "⚫ Offline",
    remove: "Remove",
    block: "🚫 Block",
    accept: "✅ Accept",
    reject: "❌ Reject",
    pending: "⏳ Pending",
    rejected: "Rejected",
    unblock: "Unblock",
    blockedUsersLoadError: "Could not load blocked users.",
    signupValidation: "Username must have 3–20 letters, numbers or underscores.",
    passwordLength: "Password must have at least 8 characters.",
    creatingAccount: "Creating account...",
    accountCreated: "Account created successfully!",
    confirmEmail: "Please check your email to confirm your account.",
    signingIn: "Signing in...",
    invalidCredentials: "Invalid login credentials",
    forgotPasswordSent: "You will receive an email to reset your password.",
    resetPasswordSaved: "Password successfully changed!",
    passwordMismatch: "Passwords do not match.",
    passwordResetMin: "Password must have at least 8 characters.",
    saveProfileBio: "Save description",
    friendSearchLoading: "🔎 Searching ...",
    friendAddedAlert: "Friend request sent!",
    friendRequestError: "Could not send friend request.",
    noBlockedUsers: "You have not blocked anyone.",
    pointsAvailable: "Your available points:",
    achievementFirstStep: "First Step",
    achievementHabitKeeper: "Habit keeper",
    achievementRoutine: "Routine is growing",
    achievementPro: "Habit pro",
    achievementThreeDay: "Three-day streak",
    achievementBoss: "Boss slayer",
    achievementFirstDesc: "Complete your first habit.",
    achievementFiveDesc: "Complete 5 habits in total.",
    achievement25Desc: "Complete 25 habits in total.",
    achievement100Desc: "Complete 100 habits in total.",
    achievement3DayDesc: "Reach at least 80% on three consecutive days.",
    achievementBossDesc: "Defeat your first weekly boss.",
    unlocked: "✅ Unlocked",
    locked: "🔒 Locked",
    achievementsCount: "{count} of {total} unlocked",
    reportActionFailed: "Moderation action failed:",
    moderationNoteRequired: "Please enter a note or warning message.",
    confirmPermanentBan: "Permanently ban this account?",
    confirmTimeout: "Apply a timeout to this account?",
    confirmUnban: "Lift this account's ban?",
    confirmWarning: "Send a warning to this user?",
    warningSent: "Warning was added to the user's Consistly account.",
    timeout24Set: "24-hour timeout set.",
    timeout7Set: "7-day timeout set.",
    permanentBanSet: "Permanent ban set.",
    banLifted: "Ban lifted.",
    reportManageNote: "Admin action failed:",
    reportLimitReached: "You have reached the report limit. Try again later.",
    moderatorActions: "Moderation actions",
    actionTakenBy: "Action taken by:",
    weeklyConsistency: "Weekly consistency (last 8 weeks)"
  },

  de: {
    editTask: "Aufgabe bearbeiten",
    newTask: "Neue Aufgabe",
    taskTitlePlaceholder: "Aufgabentitel",
    taskCategoryPlaceholder: "Kategorie (optional)",
    themeObsidianGold: "Obsidian Gold",
    themeObsidianGoldDesc: "Schwarzes Glas · Flüssiges Gold",
    themeFalloutTerminal: "Fallout Terminal",
    themeFalloutTerminalDesc: "Ödland-Grün · Retro-Terminal",
    themeNocturnal: "Nocturnal",
    themeNocturnalDesc: "Mitternachtsblau · Sternenlicht",
    themeRuby: "Ruby",
    themeRubyDesc: "Dunkles Karmesinrot · Rubin-Glow",
    themeAmethyst: "Amethyst",
    themeAmethystDesc: "Dunkles Violett · Lavendel-Glow",
    noBossDefeated: "Noch kein Boss besiegt. Erreiche dein Wochenziel, um deinen ersten Boss zu besiegen!",
    goalLabel: "Ziel",
    rewardLabel: "Belohnung",
    noRewardSet: "Keine Belohnung festgelegt",
    themeCherryNoir: "Kirschrot",
    themeCherryNoirDesc: "Kirschrot · Dunkle Eleganz",
    themeAurora: "Aurora",
    themeAuroraDesc: "Polarlichter · Magisch",
    themeSynthwave: "Synthwave",
    themeSynthwaveDesc: "Neonpink · Retro-Zukunft",
    themeGlacier: "Gletscher",
    themeGlacierDesc: "Eisblau · Kristallklar",
    themePeachGlow: "Pfirsichglanz",
    themePeachGlowDesc: "Pfirsich · Warm und gemütlich",
    themeSakura: "Sakura",
    themeSakuraDesc: "Zarte Blüten · Ruhig und hell",
    themeDeepSpace: "Tiefes Weltall",
    themeDeepSpaceDesc: "Kosmisches Blau · Sternenlicht",
    themeMatcha: "Matcha",
    themeMatchaDesc: "Frisches Grün · Ruhig und natürlich",

    themeMidnight: "Mitternacht",
    themeMidnightDesc: "Tiefviolett · Dunkel",
    themeOcean: "Ozean",
    themeOceanDesc: "Kühles Blau · Ruhig",
    themeForest: "Wald",
    themeForestDesc: "Salbeigrün · Natürlich",
    themeSunset: "Sonnenuntergang",
    themeSunsetDesc: "Warmes Korallrot · Sanft",
    themeLavender: "Lavendel",
    themeLavenderDesc: "Pastellviolett · Verträumt",
    themePaper: "Papier",
    themePaperDesc: "Warmes Creme · Minimalistisch",
    themeNeon: "Neon",
    themeNeonDesc: "Schwarz · Elektrisches Grün",
    themeRose: "Rose",
    themeRoseDesc: "Zartrosa · Gemütlich",
    themeArctic: "Arktis",
    themeArcticDesc: "Eisblau · Frisch",
    themeGolden: "Gold",
    themeGoldenDesc: "Warmes Gold · Gemütlich",
    themeCoralReef: "Korallenriff",
    themeCoralReefDesc: "Tropisches Türkis · Korallenschimmer",
    themeCyberpunk: "Cyberpunk",
    themeCyberpunkDesc: "Neon-Cyan · Elektrische Nacht",
    themeEmber: "Glut",
    themeEmberDesc: "Glühendes Orange · Warmes Anthrazit",
    titleShopHeading: "✨ Profil-Titel",
    profileTitleEquipped: "✨ Ausgerüsteter Titel",
    titleShopIntro: "Kaufe einen leuchtenden Titel und zeige ihn in deinem Profil.",
    titleInventoryHeading: "✨ Deine Titel",
    titleComet: "Komet",
    titleStarlight: "Sternenlicht",
    titleNeonDream: "Neontraum",
    titleRoyalAura: "Königliche Aura",
    titleSolarFlare: "Sonnensturm",
    equipTitle: "✨ Titel ausrüsten",
    noTitles: "Du hast noch keine Titel gekauft.",
    titleEquipFailed: "Titel konnte nicht ausgerüstet werden: {error}",

    mon: "Mo",
    tue: "Di",
    wed: "Mi",
    thu: "Do",
    fri: "Fr",
    sat: "Sa",
    sun: "So",
    cont: "Fortfahren",
    sav: "Speichern",
    ca: "Abbruch",
    g: "Ziel",
    wg: "Wöchentliches Ziel",
    del: "Löschen",
    save: "Speichern",
    canc: "Abbrechen",
    spec: "Spezifische Wochentage",
    dai: "Täglich",
    once: "Einmalig",
    nt: "Neue Aufgabe",
    shoop: "Laden",
    settings: "Einstellungen",
    bosses: "Bosse",
    stats: "Statistiken",
    home: "Home",
    week: "Woche",
    bcx: "Boss Sammlung",
    apy: "Erscheinungsbild",
    souny: "Klang aktiviert",
    edy: "Ziel bearbeiten",
    tw: "Diese Woche",
    viby: "Wähle deine persönliche Atmosphäre.",
    wc: "Wöchentliche Konstanz (Letzte 8 Wochen)",
    rewards: "🎁 Belohnungen",
    compro: "✅ Deine Käufe",
    ss: "🔊 Befriedigender Klang",
    tp: "Gesamtpunkte:",
    available: "Deine verfügbaren Punkte:",
    ps: "🪙 Punkteshop",
    l4w: "Letzten 4 Wochen",
    today: "Heute",
    settingsTitle: "Einstellungen",
    languageLabel: "Sprache",
    friendsTitle: "Freunde",
    socialHomeButton: "💬 Social – Mit Freunden chatten",
    registration: "Login / Registrieren",
    reportReasonPlaceholder: "Was ist passiert?",
    friendsHomeIntro: "Finde Freunde und verfolge eure Fortschritte gemeinsam.",
    searchUsers: "🔎 Benutzer suchen",
    friendRequests: "📩 Freundschaftsanfragen",
    inventoryTitle: "🎒 Dein Inventar",
    inventoryHint: "Hier findest du deine gekauften Sounds. Probiere sie aus und rüste deinen Lieblingssound aus.",
    soundLabel: "🔊 Angenehmer Abschlusston",
    profileTitle: "👤 Mein Profil",
    changePicture: "📷 Profilbild ändern",
    aboutMe: "✍️ Über mich",
    bioPlaceholder: "Schreib etwas über dich ...",
    max160: "Maximal 160 Zeichen",
    saveBio: "Beschreibung speichern",
    chooseAvatar: "🎨 Avatar auswählen",
    achievements: "🏆 Erfolge",
    achievementBlurb: "Deine Erfolge und Meilensteine in Consistly.",
    accountTitle: "👤 Consistly-Konto",
    loginRegister: "Anmelden / Registrieren",
    forgotPassword: "Passwort vergessen?",
    logout: "Abmelden",
    deleteAccount: "Konto dauerhaft löschen",
    remindersTitle: "🔔 Erinnerungen",
    remindersIntro: "Lass dich täglich zur gewünschten Uhrzeit an deine Habits erinnern.",
    remindersEnable: "Tägliche Erinnerung aktivieren",
    reminderTime: "Erinnerungszeit",
    testReminder: "🔔 Test-Benachrichtigung senden",
    saveReminderSettings: "💾 Erinnerungseinstellungen speichern",
    quietHoursTitle: "🌙 Ruhezeiten",
    quietHoursIntro: "Während dieser Zeit bekommst du keine Habit-Erinnerungen.",
    quietHoursEnable: "Ruhezeiten aktivieren",
    quietStart: "Ruhezeit beginnt",
    quietEnd: "Ruhezeit endet",
    saveQuietHours: "💾 Ruhezeiten speichern",
    accountNotices: "⚠️ Kontohinweise",
    moderationReports: "🛡️ Moderationsmeldungen",
    adminReportsIntro: "Private Chatmeldungen für Admins.",
    refreshReports: "🔄 Meldungen aktualisieren",
    social: "💬 Social",
    privateChats: "Deine privaten Chats mit Freunden",
    chooseFriend: "Wähle einen Freund aus, um zu chatten.",
    writeMessage: "Nachricht schreiben …",
    send: "Senden",
    close: "Schließen",
    reportMessage: "⚑ Nachricht melden",
    reportTitle: "⚑ Nachricht melden",
    reportIntro: "Wähle einen Grund und beschreibe den Vorfall kurz.",
    reportCategory: "Kategorie",
    reportDescription: "Beschreibung",
    reportPlaceholder: "Was ist passiert?",
    sendReport: "Meldung senden",
    cancel: "Abbrechen",
    catInsult: "Beleidigung oder Belästigung",
    catNsfw: "Sexuelle / NSFW-Inhalte",
    catThreat: "Drohung oder Gewalt",
    catHate: "Hassrede oder Diskriminierung",
    catSpam: "Spam oder Betrug",
    catOther: "Sonstiger Grund",
    warning: "Verwarnung",
    reviewStatus: "In Prüfung",
    closeReport: "Schließen",
    reopenReport: "Wieder öffnen",
    adminNote: "Admin-Notiz / Verwarnung",
    adminNotePlaceholder: "Begründung oder Nachricht an den Nutzer",
    warnUser: "Verwarnen",
    timeout24: "Timeout 24 Std.",
    timeout7: "Timeout 7 Tage",
    permanentBan: "Dauerhaft sperren",
    liftBan: "Sperre aufheben",
    moderationPending: "{count} offene Meldung(en)",
    noOpenReports: "Keine offenen Meldungen.",
    noReports: "Es wurden noch keine Chatnachrichten gemeldet.",
    reportedBy: "Gemeldet von:",
    reportedUser: "Über:",
    categoryLabel: "Kategorie:",
    descriptionLabel: "Zusätzliche Beschreibung:",
    reportDeletedUser: "Der gemeldete Account wurde gelöscht; Maßnahmen sind nicht mehr verfügbar.",
    reportedContentUnavailable: "[Nachricht nicht mehr verfügbar]",
    accountWarningsNone: "Keine Kontohinweise.",
    warningSeen: "Gelesen",
    markRead: "Als gelesen markieren",
    warningLoadError: "Kontohinweise konnten nicht geladen werden.",
    noFriends: "Du hast noch keine bestätigten Freunde. Füge zuerst Freunde hinzu.",
    loadingFriends: "Freunde werden geladen …",
    friendsLoadError: "Freunde konnten nicht geladen werden.",
    loadingMessages: "Nachrichten werden geladen …",
    chatLoadError: "Chat konnte nicht geladen werden. Prüfe, ob die Supabase-Migration ausgeführt wurde.",
    noMessages: "Noch keine Nachrichten. Sag Hallo 👋",
    sent: "✓ Gesendet",
    loadingReports: "Meldungen werden geladen …",
    reportsLoadError: "Meldungen konnten nicht geladen werden:",
    reportFailed: "Meldung fehlgeschlagen:",
    reportSent: "Danke. Deine Meldung wurde an die Moderation übermittelt.",
    messageSending: "Nachricht konnte nicht gesendet werden:",
    noTasksPlanned: "Keine Aufgaben geplant. Tippe auf +, um eine hinzuzufügen.",
    dayNoTasks: "Keine Aufgaben",
    done: "erledigt",
    goalLabelWeek: "Ziel",
    rewardLabelWeek: "Belohnung:",
    noReward: "Keine Belohnung festgelegt",
    totalPoints: "Gesamtpunkte",
    currentStreak: "Aktuelle Serie (≥ 80 %) ",
    bestDay: "Bester Tag",
    bestWeek: "Beste Woche",
    pointsPrice: "Preis:",
    buy: "🛒 Kaufen",
    preview: "▶️ Anhören",
    equip: "Ausrüsten",
    equipped: "✅ Ausgerüstet",
    purchasedReady: "Gekauft · bereit zum Ausrüsten",
    noPurchases: "Noch keine Käufe.",
    delete: "Löschen",
    taskOneTime: "Einmalig",
    taskDaily: "Täglich",
    taskSpecificDays: "Bestimmte Wochentage",
    enableHabitReminder: "🔔 Erinnerung für diese Aufgabe aktivieren",
    reminderPerHabit: "Du kannst für jede Aufgabe eine andere Uhrzeit einstellen.",
    weeklyGoalReward: "Wochenziel & Belohnung",
    taskRewardPlaceholder: "Deine Belohnung (z. B. Pizza bestellen 🍕)",
    loginRequired: "Bitte melde dich zuerst an.",
    addFriend: "➕ Hinzufügen",
    friendAdded: "✅ Hinzugefügt",
    noIncomingRequests: "Keine eingehenden Anfragen.",
    noOutgoingRequests: "Keine gesendeten Anfragen.",
    noFriendsYet: "Du hast noch keine Freunde.",
    blockedUsers: "🚫 Blockierte Nutzer",
    noneBlocked: "Du hast niemanden blockiert.",
    friendSearchHint: "Suche nach einem Username ...",
    chatFriendsLoading: "Freunde werden geladen ...",
    achievementUnlocked: "Achievement freigeschaltet:",
    usernamePlaceholder: "Benutzername",
    emailPlaceholder: "E-Mail",
    passwordPlaceholder: "Passwort",
    newPasswordPlaceholder: "Neues Passwort",
    repeatPasswordPlaceholder: "Passwort wiederholen",
    searchUsernamePlaceholder: "Username suchen ...",
    accountCreatedOn: "📅 Account erstellt am:",
    profilePicture: "Profilbild",
    saveBioSuccess: "✅ Beschreibung gespeichert!",
    saveAvatarBusy: "Speichere Avatar...",
    saveAvatarError: "Fehler beim Speichern.",
    saveAvatarSuccess: "Avatar gespeichert!",
    uploadImageBusy: "Bild wird hochgeladen...",
    uploadFileTypeError: "Bitte JPG, PNG oder WebP auswählen.",
    uploadSizeError: "Das Bild darf maximal 3 MB groß sein.",
    uploadFileDetected: "Datei erkannt:",
    uploadError: "Uploadfehler:",
    profileSaveError: "Profilfehler:",
    profilePictureSuccess: "Profilbild erfolgreich gespeichert!",
    profileSaveBusy: "Speichere ...",
    usernameNoResults: "Keine Benutzer gefunden.",
    usernameSearchPrompt: "Suche nach einem Username ...",
    usernameMinLength: "Gib mindestens 2 Zeichen ein.",
    searchFailed: "Die Suche ist fehlgeschlagen.",
    friendOverviewError: "Freundesübersicht konnte nicht geladen werden.",
    online: "🟢 Online",
    offline: "⚫ Offline",
    remove: "Entfernen",
    block: "🚫 Blockieren",
    accept: "✅ Annehmen",
    reject: "❌ Ablehnen",
    pending: "⏳ Ausstehend",
    rejected: "Abgelehnt",
    unblock: "Entblockieren",
    blockedUsersLoadError: "Blockierte Nutzer konnten nicht geladen werden.",
    signupValidation: "Username: 3–20 Buchstaben, Zahlen oder Unterstriche.",
    passwordLength: "Das Passwort muss mindestens 8 Zeichen haben.",
    creatingAccount: "Konto wird erstellt...",
    accountCreated: "Konto erfolgreich erstellt!",
    confirmEmail: "Bitte prüfe deine E-Mails, um dein Konto zu bestätigen.",
    signingIn: "Anmeldung läuft...",
    invalidCredentials: "Ungültige Anmeldedaten",
    forgotPasswordSent: "Du bekommst eine E-Mail zum Zurücksetzen deines Passworts.",
    resetPasswordSaved: "Passwort erfolgreich geändert!",
    passwordMismatch: "Die Passwörter stimmen nicht überein.",
    passwordResetMin: "Das Passwort muss mindestens 8 Zeichen haben.",
    saveProfileBio: "Beschreibung speichern",
    friendSearchLoading: "🔎 Suche läuft ...",
    friendAddedAlert: "Freundschaftsanfrage gesendet!",
    friendRequestError: "Freundschaftsanfrage konnte nicht gesendet werden.",
    noBlockedUsers: "Du hast niemanden blockiert.",
    pointsAvailable: "Deine verfügbaren Punkte:",
    achievementFirstStep: "Erster Schritt",
    achievementHabitKeeper: "Dranbleiber",
    achievementRoutine: "Routine wächst",
    achievementPro: "Habit-Profi",
    achievementThreeDay: "Drei Tage in Folge",
    achievementBoss: "Boss-Besieger",
    achievementFirstDesc: "Erledige deinen ersten Habit.",
    achievementFiveDesc: "Erledige insgesamt 5 Habits.",
    achievement25Desc: "Erledige insgesamt 25 Habits.",
    achievement100Desc: "Erledige insgesamt 100 Habits.",
    achievement3DayDesc: "Erreiche an 3 Tagen hintereinander mindestens 80 %.",
    achievementBossDesc: "Besiege deinen ersten Wochen-Boss.",
    unlocked: "✅ Freigeschaltet",
    locked: "🔒 Noch gesperrt",
    achievementsCount: "{count} von {total} freigeschaltet",
    reportActionFailed: "Maßnahme fehlgeschlagen:",
    moderationNoteRequired: "Bitte eine Admin-Notiz oder Verwarnungsnachricht eingeben.",
    confirmPermanentBan: "Diesen Account dauerhaft sperren?",
    confirmTimeout: "Diesen Account mit Timeout belegen?",
    confirmUnban: "Sperre dieses Accounts aufheben?",
    confirmWarning: "Verwarnung an diesen Nutzer senden?",
    warningSent: "Verwarnung wurde im Consistly-Konto des Nutzers hinterlegt.",
    timeout24Set: "Timeout für 24 Stunden gesetzt.",
    timeout7Set: "Timeout für 7 Tage gesetzt.",
    permanentBanSet: "Dauerhafte Sperre gesetzt.",
    banLifted: "Sperre wurde aufgehoben.",
    reportManageNote: "Maßnahme fehlgeschlagen:",
    reportLimitReached: "Du hast das Meldungslimit erreicht. Versuche es später erneut.",
    moderatorActions: "Moderationsmaßnahmen",
    actionTakenBy: "Maßnahme von:",
    weeklyConsistency: "Wöchentliche Beständigkeit (letzte 8 Wochen)"
  },

  es: {
    editTask: "Editar tarea",
    newTask: "Nueva tarea",
    taskTitlePlaceholder: "Título de la tarea",
    taskCategoryPlaceholder: "Categoría (opcional)",
    themeObsidianGold: "Oro obsidiana",
    themeObsidianGoldDesc: "Cristal negro · Oro líquido",
    themeFalloutTerminal: "Terminal Fallout",
    themeFalloutTerminalDesc: "Verde del yermo · Terminal retro",
    themeNocturnal: "Nocturnal",
    themeNocturnalDesc: "Azul medianoche · Luz de estrellas",
    themeRuby: "Rubí",
    themeRubyDesc: "Carmesí oscuro · Brillo de rubí",
    themeAmethyst: "Amatista",
    themeAmethystDesc: "Violeta oscuro · Brillo lavanda",
    noBossDefeated: "Aún no has derrotado a ningún jefe. ¡Alcanza tu objetivo semanal para derrotar al primero!",
    goalLabel: "Meta",
    rewardLabel: "Recompensa",
    noRewardSet: "sin recompensa definida",
    themeCherryNoir: "Cereza Noir",
    themeCherryNoirDesc: "Rojo cereza · Elegancia oscura",
    themeAurora: "Aurora",
    themeAuroraDesc: "Luces del norte · Mágico",
    themeSynthwave: "Synthwave",
    themeSynthwaveDesc: "Rosa neón · Futuro retro",
    themeGlacier: "Glaciar",
    themeGlacierDesc: "Azul hielo · Cristalino",
    themePeachGlow: "Brillo melocotón",
    themePeachGlowDesc: "Melocotón · Cálido y acogedor",
    themeSakura: "Sakura",
    themeSakuraDesc: "Flores suaves · Sereno y luminoso",
    themeDeepSpace: "Espacio profundo",
    themeDeepSpaceDesc: "Azul cósmico · Luz de estrellas",
    themeMatcha: "Matcha",
    themeMatchaDesc: "Verde fresco · Sereno y natural",

    themeMidnight: "Medianoche",
    themeMidnightDesc: "Morado oscuro · Oscuro",
    themeOcean: "Océano",
    themeOceanDesc: "Azul frío · Sereno",
    themeForest: "Bosque",
    themeForestDesc: "Verde salvia · Natural",
    themeSunset: "Atardecer",
    themeSunsetDesc: "Coral cálido · Suave",
    themeLavender: "Lavanda",
    themeLavenderDesc: "Violeta pastel · Soñador",
    themePaper: "Papel",
    themePaperDesc: "Crema cálido · Minimalista",
    themeNeon: "Neón",
    themeNeonDesc: "Negro · Verde eléctrico",
    themeRose: "Rosa",
    themeRoseDesc: "Rosa suave · Acogedor",
    themeArctic: "Ártico",
    themeArcticDesc: "Azul hielo · Fresco",
    themeGolden: "Dorado",
    themeGoldenDesc: "Dorado cálido · Acogedor",
    themeCoralReef: "Arrecife de coral",
    themeCoralReefDesc: "Turquesa tropical · Brillo coral",
    themeCyberpunk: "Cyberpunk",
    themeCyberpunkDesc: "Cian neón · Noche eléctrica",
    themeEmber: "Ascua",
    themeEmberDesc: "Naranja incandescente · Carbón cálido",
    titleShopHeading: "✨ Títulos del perfil",
    profileTitleEquipped: "✨ Título equipado",
    titleShopIntro: "Compra un título brillante y muéstralo en tu perfil.",
    titleInventoryHeading: "✨ Tus títulos",
    titleComet: "Cometa",
    titleStarlight: "Luz estelar",
    titleNeonDream: "Sueño neón",
    titleRoyalAura: "Aura real",
    titleSolarFlare: "Llamarada solar",
    equipTitle: "✨ Equipar título",
    noTitles: "Aún no has comprado títulos.",
    titleEquipFailed: "No se pudo equipar el título: {error}",

    mon: "Lun",
    tue: "Mar",
    wed: "Mié",
    thu: "Jue",
    fri: "Vie",
    sat: "Sáb",
    sun: "Dom",
    cont: "Continuar",
    sav: "Guardar",
    ca: "Cancelación",
    g: "Objetivo",
    wg: "Objetivo semanal",
    del: "Eliminar",
    save: "Guardar",
    canc: "Cancelar",
    spec: "Días específicos de la semana",
    dai: "Diariamente",
    once: "Único",
    nt: "Nueva tarea",
    shoop: "Comercio",
    settings: "Configuración",
    bosses: "Jefe",
    stats: "Estadísticas",
    home: "Hogar",
    week: "Semana",
    bcx: "Colección Boss",
    apy: "Apariencia",
    souny: "Activado por sonido",
    edy: "Editar objetivo",
    tw: "Esta semana",
    viby: "Elige tu estilo personal.",
    wc: "Constancia semanal (últimas 8 semanas)",
    rewards: "🎁 Recompensas",
    compro: "✅ Tus compras",
    ss: "🔊 Sonido satisfactorio",
    tp: "Puntos totales",
    available: "Tus puntos disponibles:",
    ps: "🪙 Tienda de puntos",
    l4w: "últimas 4 semanas",
    today: "hoy",
    settingsTitle: "Ajustes",
    languageLabel: "Idioma",
    friendsTitle: "Amigos",
    socialHomeButton: "💬 Social – Chatear con amigos",
    registration: "Iniciar sesión / Registrarse",
    reportReasonPlaceholder: "¿Qué ha pasado?",
    friendsHomeIntro: "Encuentra amigos y sigue vuestro progreso juntos.",
    searchUsers: "🔎 Buscar usuarios",
    friendRequests: "📩 Solicitudes de amistad",
    inventoryTitle: "🎒 Tu inventario",
    inventoryHint: "Aquí están tus sonidos comprados. Pruébalos y equipa tu favorito.",
    soundLabel: "🔊 Sonido agradable",
    profileTitle: "👤 Mi perfil",
    changePicture: "📷 Cambiar foto de perfil",
    aboutMe: "✍️ Sobre mí",
    bioPlaceholder: "Escribe algo sobre ti ...",
    max160: "Máximo 160 caracteres",
    saveBio: "Guardar descripción",
    chooseAvatar: "🎨 Elegir avatar",
    achievements: "🏆 Logros",
    achievementBlurb: "Tus logros e hitos en Consistly.",
    accountTitle: "👤 Cuenta de Consistly",
    loginRegister: "Iniciar sesión / Registrarse",
    forgotPassword: "¿Olvidaste tu contraseña?",
    logout: "Cerrar sesión",
    deleteAccount: "Eliminar cuenta permanentemente",
    remindersTitle: "🔔 Recordatorios",
    remindersIntro: "Recibe un recordatorio diario para tus hábitos a la hora elegida.",
    remindersEnable: "Activar recordatorio diario",
    reminderTime: "Hora del recordatorio",
    testReminder: "🔔 Enviar notificación de prueba",
    saveReminderSettings: "💾 Guardar ajustes de recordatorios",
    quietHoursTitle: "🌙 Horario de descanso",
    quietHoursIntro: "No recibirás recordatorios durante este horario.",
    quietHoursEnable: "Activar horario de descanso",
    quietStart: "Inicio del descanso",
    quietEnd: "Fin del descanso",
    saveQuietHours: "💾 Guardar horario de descanso",
    accountNotices: "⚠️ Avisos de cuenta",
    moderationReports: "🛡️ Informes de moderación",
    adminReportsIntro: "Informes privados de chats para administradores.",
    refreshReports: "🔄 Actualizar informes",
    social: "💬 Social",
    privateChats: "Tus chats privados con amigos",
    chooseFriend: "Elige un amigo para chatear.",
    writeMessage: "Escribe un mensaje …",
    send: "Enviar",
    close: "Cerrar",
    reportMessage: "⚑ Denunciar mensaje",
    reportTitle: "⚑ Denunciar mensaje",
    reportIntro: "Elige un motivo y describe brevemente lo ocurrido.",
    reportCategory: "Categoría",
    reportDescription: "Descripción",
    reportPlaceholder: "¿Qué ha pasado?",
    sendReport: "Enviar informe",
    cancel: "Cancelar",
    catInsult: "Insultos o acoso",
    catNsfw: "Contenido sexual / NSFW",
    catThreat: "Amenazas o violencia",
    catHate: "Discurso de odio o discriminación",
    catSpam: "Spam o estafa",
    catOther: "Otro motivo",
    warning: "Advertencia",
    reviewStatus: "En revisión",
    closeReport: "Cerrar informe",
    reopenReport: "Reabrir",
    adminNote: "Nota / advertencia del administrador",
    adminNotePlaceholder: "Motivo o mensaje para el usuario",
    warnUser: "Advertir",
    timeout24: "Bloqueo 24 horas",
    timeout7: "Bloqueo 7 días",
    permanentBan: "Bloquear permanentemente",
    liftBan: "Retirar bloqueo",
    moderationPending: "{count} informe(s) abierto(s)",
    noOpenReports: "No hay informes abiertos.",
    noReports: "Aún no se ha denunciado ningún mensaje.",
    reportedBy: "Denunciado por:",
    reportedUser: "Sobre:",
    categoryLabel: "Categoría:",
    descriptionLabel: "Detalles adicionales:",
    reportDeletedUser: "La cuenta denunciada se eliminó; ya no hay medidas disponibles.",
    reportedContentUnavailable: "[El mensaje ya no está disponible]",
    accountWarningsNone: "No hay avisos de cuenta.",
    warningSeen: "Leído",
    markRead: "Marcar como leído",
    warningLoadError: "No se pudieron cargar los avisos de cuenta.",
    noFriends: "Aún no tienes amigos confirmados. Añade uno primero.",
    loadingFriends: "Cargando amigos …",
    friendsLoadError: "No se pudieron cargar los amigos.",
    loadingMessages: "Cargando mensajes …",
    chatLoadError: "No se pudo cargar el chat. Comprueba si ejecutaste la migración de Supabase.",
    noMessages: "Aún no hay mensajes. Saluda 👋",
    sent: "✓ Enviado",
    loadingReports: "Cargando informes …",
    reportsLoadError: "No se pudieron cargar los informes:",
    reportFailed: "Error al enviar el informe:",
    reportSent: "Gracias. Tu informe se envió al equipo de moderación.",
    messageSending: "No se pudo enviar el mensaje:",
    noTasksPlanned: "No hay tareas planificadas. Pulsa + para añadir una.",
    dayNoTasks: "Sin tareas",
    done: "hecho",
    goalLabelWeek: "Objetivo",
    rewardLabelWeek: "Recompensa:",
    noReward: "sin recompensa definida",
    totalPoints: "Puntos totales",
    currentStreak: "Racha actual (≥ 80 %)",
    bestDay: "Mejor día",
    bestWeek: "Mejor semana",
    pointsPrice: "Precio:",
    buy: "🛒 Comprar",
    preview: "▶️ Escuchar",
    equip: "Equipar",
    equipped: "✅ Equipado",
    purchasedReady: "Comprado · listo para equipar",
    noPurchases: "Aún no hay compras.",
    delete: "Eliminar",
    taskOneTime: "Una vez",
    taskDaily: "Cada día",
    taskSpecificDays: "Días concretos de la semana",
    enableHabitReminder: "🔔 Activar recordatorio para este hábito",
    reminderPerHabit: "Puedes elegir una hora diferente para cada hábito.",
    weeklyGoalReward: "Objetivo semanal y recompensa",
    taskRewardPlaceholder: "Tu recompensa (por ejemplo, pedir pizza 🍕)",
    loginRequired: "Inicia sesión primero.",
    addFriend: "➕ Añadir",
    friendAdded: "✅ Añadido",
    noIncomingRequests: "No hay solicitudes recibidas.",
    noOutgoingRequests: "No hay solicitudes enviadas.",
    noFriendsYet: "Aún no tienes amigos.",
    blockedUsers: "🚫 Usuarios bloqueados",
    noneBlocked: "No has bloqueado a nadie.",
    friendSearchHint: "Busca un nombre de usuario ...",
    chatFriendsLoading: "Cargando amigos ...",
    achievementUnlocked: "Logro desbloqueado:",
    usernamePlaceholder: "Nombre de usuario",
    emailPlaceholder: "Correo electrónico",
    passwordPlaceholder: "Contraseña",
    newPasswordPlaceholder: "Nueva contraseña",
    repeatPasswordPlaceholder: "Repetir contraseña",
    searchUsernamePlaceholder: "Buscar nombre de usuario ...",
    accountCreatedOn: "📅 Cuenta creada el:",
    profilePicture: "Foto de perfil",
    saveBioSuccess: "✅ ¡Descripción guardada!",
    saveAvatarBusy: "Guardando avatar...",
    saveAvatarError: "No se pudo guardar.",
    saveAvatarSuccess: "¡Avatar guardado!",
    uploadImageBusy: "Subiendo imagen...",
    uploadFileTypeError: "Elige una imagen JPG, PNG o WebP.",
    uploadSizeError: "La imagen debe ocupar 3 MB como máximo.",
    uploadFileDetected: "Archivo seleccionado:",
    uploadError: "Error de carga:",
    profileSaveError: "Error de perfil:",
    profilePictureSuccess: "¡Foto de perfil guardada!",
    profileSaveBusy: "Guardando ...",
    usernameNoResults: "No se encontraron usuarios.",
    usernameSearchPrompt: "Busca un nombre de usuario ...",
    usernameMinLength: "Escribe al menos 2 caracteres.",
    searchFailed: "La búsqueda falló.",
    friendOverviewError: "No se pudo cargar la lista de amigos.",
    online: "🟢 En línea",
    offline: "⚫ Desconectado",
    remove: "Eliminar",
    block: "🚫 Bloquear",
    accept: "✅ Aceptar",
    reject: "❌ Rechazar",
    pending: "⏳ Pendiente",
    rejected: "Rechazada",
    unblock: "Desbloquear",
    blockedUsersLoadError: "No se pudieron cargar los usuarios bloqueados.",
    signupValidation: "El nombre debe tener entre 3 y 20 letras, números o guiones bajos.",
    passwordLength: "La contraseña debe tener al menos 8 caracteres.",
    creatingAccount: "Creando cuenta...",
    accountCreated: "¡Cuenta creada!",
    confirmEmail: "Revisa tu correo para confirmar la cuenta.",
    signingIn: "Iniciando sesión...",
    invalidCredentials: "Credenciales de inicio de sesión no válidas",
    forgotPasswordSent: "Recibirás un correo para restablecer la contraseña.",
    resetPasswordSaved: "¡Contraseña actualizada!",
    passwordMismatch: "Las contraseñas no coinciden.",
    passwordResetMin: "La contraseña debe tener al menos 8 caracteres.",
    saveProfileBio: "Guardar descripción",
    friendSearchLoading: "🔎 Buscando ...",
    friendAddedAlert: "¡Solicitud de amistad enviada!",
    friendRequestError: "No se pudo enviar la solicitud de amistad.",
    noBlockedUsers: "No has bloqueado a nadie.",
    pointsAvailable: "Tus puntos disponibles:",
    achievementFirstStep: "Primer paso",
    achievementHabitKeeper: "Constancia",
    achievementRoutine: "La rutina crece",
    achievementPro: "Experto en hábitos",
    achievementThreeDay: "Racha de tres días",
    achievementBoss: "Vencedor del jefe",
    achievementFirstDesc: "Completa tu primer hábito.",
    achievementFiveDesc: "Completa 5 hábitos en total.",
    achievement25Desc: "Completa 25 hábitos en total.",
    achievement100Desc: "Completa 100 hábitos en total.",
    achievement3DayDesc: "Alcanza al menos el 80 % durante tres días seguidos.",
    achievementBossDesc: "Derrota a tu primer jefe semanal.",
    unlocked: "✅ Desbloqueado",
    locked: "🔒 Bloqueado",
    achievementsCount: "{count} de {total} desbloqueados",
    reportActionFailed: "Error en la medida:",
    moderationNoteRequired: "Escribe una nota o un mensaje de advertencia.",
    confirmPermanentBan: "¿Bloquear esta cuenta permanentemente?",
    confirmTimeout: "¿Aplicar un bloqueo temporal a esta cuenta?",
    confirmUnban: "¿Retirar el bloqueo de esta cuenta?",
    confirmWarning: "¿Enviar una advertencia a este usuario?",
    warningSent: "La advertencia se guardó en la cuenta de Consistly.",
    timeout24Set: "Bloqueo de 24 horas aplicado.",
    timeout7Set: "Bloqueo de 7 días aplicado.",
    permanentBanSet: "Bloqueo permanente aplicado.",
    banLifted: "Bloqueo retirado.",
    reportManageNote: "Error en la medida:",
    reportLimitReached: "Has alcanzado el límite de denuncias. Inténtalo más tarde.",
    moderatorActions: "Medidas de moderación",
    actionTakenBy: "Medida aplicada por:",
    weeklyConsistency: "Constancia semanal (últimas 8 semanas)"
  }
};

const extraTranslations = {
  en: {
    bossDefeated: 'defeated!', bossSurvived: 'survived', goalReached: '{pct}% – goal of {goal}% reached.',
    goalWas: '{pct}% – goal was {goal}%.', rewardUnlocked: 'Reward unlocked:', planBoss: 'Plan tasks to give the boss HP',
    hp: '{left} / {total} HP', weekNoTasks: 'No tasks', weekDone: '{pct}% · {done}/{planned} done',
    pointsPriceLine: '🪙 Price: {price} points', pointBalanceLabel: 'Your available points:',
    emptyPurchases: 'No purchases yet.', purchased: 'Purchased · ready to equip', justEquipped: 'Currently equipped',
    weeklyBossQuote1: 'The boss survived – but it is wounded. Next week it falls!',
    weeklyBossQuote2: 'Every task you did still counted. Reload and strike again.',
    weeklyBossQuote3: 'Progress beats perfection. Come back stronger on Monday.',
    weeklyBossQuote4: 'Close fights make the best comebacks.',
    accountSignedOut: 'Not signed in', accountSignedIn: 'Signed in: {email}',
    premiumThemesHeading: '🌈 Premium themes & animated glows', premiumThemesIntro: 'Unlock a theme with points, then equip it in Settings.',
    buyTheme: '🪙 Unlock theme', equipTheme: 'Use theme', themeLockedHint: 'Unlock this theme in the Point Shop first.',
    themeToxicBloom: 'Toxic Bloom', themeToxicBloomDesc: 'Poison green · Dark garden',
    themeBloodMoon: 'Blood Moon', themeBloodMoonDesc: 'Crimson red · Lunar night',
    themeHologram: 'Hologram', themeHologramDesc: 'Iridescent cyan · Chrome',
    themeVolcanicAsh: 'Volcanic Ash', themeVolcanicAshDesc: 'Charcoal · Lava glow',
    themeEnchantedForest: 'Enchanted Forest', themeEnchantedForestDesc: 'Deep green · Fireflies',
    themeNebulaDrift: 'Nebula Drift', themeNebulaDriftDesc: 'Animated violet cosmic glow',
    themeAuroraFlow: 'Aurora Flow', themeAuroraFlowDesc: 'Animated green aurora glow',
    themeLavaPulse: 'Lava Pulse', themeLavaPulseDesc: 'Animated molten orange glow',
    titleVoidWalker: 'Void Walker', titleCrimsonCrown: 'Crimson Crown', titleForestPhantom: 'Forest Phantom',
    friendProgressSharingTitle: '🤝 Share progress with friends', shareProgressWithFriendsLabel: 'Let confirmed friends view my tasks and stats',
    shareProgressPrivateDefault: 'Private by default. You can change this any time.', sharingSaveError: 'Could not update sharing: {error}',
    progressViewButton: '📊 View progress', friendProgressTitle: '📊 Friend progress', friendProgressLoading: 'Loading progress ...',
    friendProgressUnavailable: 'Progress could not be loaded: {error}', friendProgressPrivate: 'This friend has not enabled progress sharing.',
    shareProgressEnabled: 'Progress sharing is on.', progressHistory: 'Last 8 weeks',
    progressAllTime: 'Tasks completed all time', progressWeekGoal: 'Weekly goal: {goal}%', progressNoGoal: 'No weekly goal set',
    progressWeekRate: 'This week: {done}/{planned} tasks · {pct}%', progressNoTasks: 'No tasks scheduled for this day.',
    progressCompleted: 'Completed', progressNotCompleted: 'Not completed', progressDefeatedBosses: 'Bosses defeated: {count}',
    aboutSince: '📅 Member since: {date}', saveBusy: 'Saving ...', bioSaved: '✅ Description saved!',
    editTask: 'Edit task', newTask: 'New task', taskTitle: 'Task title', categoryOptional: 'Category (optional)',
    noTasks: 'No tasks planned. Tap + to add one.', weeklyGoal: 'Weekly goal & reward',
    reminderEnable: '🔔 Enable a reminder for this habit', reminderPerTask: 'You can set a different time for every habit.',
    reportReasonPrompt: 'Why are you reporting this message?', reportDone: 'Thanks. Your report was sent to the moderation team.',
    socialChooseFriend: 'Choose a friend to start chatting.', socialLoadingFriends: 'Loading friends ...',
    socialNoFriends: 'You have no confirmed friends yet. Add a friend first.', socialLoadingMessages: 'Loading messages ...',
    socialLoadError: 'Could not load chat. Check whether the Supabase migration has been run.',
    socialNoMessages: 'No messages yet. Say hello 👋', messageSent: '✓ Sent', messageRead: '✓✓ Read',
    readReceiptError: 'Could not update read receipts: {error}', readReceiptsNeedMigration: 'Run the read receipt SQL migration to enable read status.',
    adminLoading: 'Loading reports ...', adminNoOpen: 'No open reports.', adminNoReports: 'No chat messages have been reported.',
    activeRestrictionsHeading: 'Active timeouts and bans', noActiveRestrictions: 'No active timeouts or bans.',
    liftRestriction: 'Lift restriction', restrictionLifted: 'Restriction lifted.', restrictionLiftError: 'Could not lift restriction: {error}',
    timeoutUntil: 'Until {date}', permanentRestriction: 'Permanent ban',
    adminReportCount: '{count} open report(s)', adminLoadError: 'Could not load reports: {error}',
    reportActionError: 'Moderation action failed: {error}', reportStatusError: 'Could not update status: {error}',
    reportSubmitted: 'Thanks. Your report was sent to the moderation team.', reportFailure: 'Report failed: {error}',
    reportSendBusy: 'Sending report ...', reportSentButton: '✓ Reported', reportMessageButton: '⚑ Report message',
    noAccountNotices: 'No account notices.', accountNoticesError: 'Could not load account notices.',
    markWarningRead: 'Mark as read', warningWasRead: 'Read',
    onlineState: '🟢 Online', offlineState: '⚫ Offline', friendRemove: 'Remove', friendBlock: '🚫 Block',
    friendAccept: '✅ Accept', friendReject: '❌ Reject', friendPending: '⏳ Pending', friendRejected: 'Rejected',
    friendUnblock: 'Unblock', noIncoming: 'No incoming requests.', noOutgoing: 'No outgoing requests.',
    noFriendsYet: 'You have no friends yet.', noBlocked: 'You have not blocked anyone.',
    incomingTitle: '📩 Incoming requests', outgoingTitle: '📤 Sent requests', yourFriends: '🤝 Your friends',
    blockedTitle: '🚫 Blocked users', findUsername: 'Search for a username ...', searchAtLeastTwo: 'Enter at least 2 characters.',
    userSearchFailed: 'Search failed.', noUsersFound: 'No users found.', friendSendError: 'Could not send friend request.',
    friendRequestSent: 'Friend request sent!', friendOverviewError: 'Could not load friend overview.',
    reminderPermission: 'Enable notifications in your browser first.', reminderSaved: 'Reminder settings saved.',
    reminderRequested: '🔔 Test notification requested!', quietSaved: 'Quiet hours saved.',
    quietNeedsBoth: 'Choose both start and end times.', reminderUnsupported: 'Notifications are not supported in this browser.',
    resetPasswordsMismatch: 'Passwords do not match.', resetPasswordMin: 'Password must have at least 8 characters.',
    passwordSaving: 'Saving password...', passwordUpdated: 'Password successfully changed!',
    profileAvatarBusy: 'Saving avatar...', profileAvatarSaved: 'Avatar saved!', profileAvatarFailed: 'Failed to save.',
    imageUploading: 'Uploading image...', imageTypeError: 'Please choose a JPG, PNG or WebP image.',
    imageTooLarge: 'Image must be 3 MB or smaller.', imageUploadFailed: 'Upload failed: {error}',
    profileImageSaved: 'Profile picture saved!', profileImageDbFailed: 'Profile error: {error}',
    profileImageDetected: 'File selected: {name}', loginToContinue: 'Please log in first.',
    usernameRule: 'Username must have 3–20 letters, numbers or underscores.', passwordRule: 'Password must have at least 8 characters.',
    createAccountBusy: 'Creating account...', createAccountOk: 'Account created successfully!', confirmEmail: 'Please check your email to confirm your account.',
    loginBusy: 'Signing in...', accountResetEmail: 'You will receive an email to reset your password.',
    accountDeleteConfirm: 'Permanently delete your account? This cannot be undone.', accountDeleteFailed: 'Could not delete account: {error}',
    warnConfirm: 'Send a warning to this user?', banConfirm: 'Permanently ban this account?',
    timeoutConfirm: 'Apply a timeout to this account?', unbanConfirm: "Lift this account's ban?",
    adminNoteRequired: 'Please enter an admin note or warning message.',
    warningOk: 'Warning was added to the user’s Consistly account.', timeout24Ok: '24-hour timeout set.',
    timeout7Ok: '7-day timeout set.', banOk: 'Permanent ban set.', unbanOk: 'Ban lifted.',
    moderatingError: 'Moderation action failed: {error}',
    restrictionNotice: 'Your access has been restricted: {reason}.{expiry}',
    accountDeleted: 'Your account has been deleted.',
    themeToggle: 'Toggle theme', addTask: 'Add task', chatWith: 'Chat with',
    shopPremiumSound: 'Premium completion sound', shopPremiumDesc: 'A special three-tone sound when you complete a task.',
    shopSoftPop: 'Soft pop', shopSoftPopDesc: 'A gentle, short pop with a bright finish.',
    shopCrystal: 'Crystal chime', shopCrystalDesc: 'Two clear, sparkling notes as a small reward.',
    shopBubble: 'Bubbles', shopBubbleDesc: 'Two bubbly tones that float upward.',
    shopSoftBell: 'Soft bell', shopSoftBellDesc: 'Gentle, bright bell notes as a small reward.', shopWoodblock: 'Woodblock', shopWoodblockDesc: 'Warm, short wooden taps.', shopArcade: 'Arcade', shopArcadeDesc: 'A playful retro sound for completed tasks.', shopRaindrop: 'Raindrops', shopRaindropDesc: 'Soft falling tones like tiny raindrops.',
    journalTitle: '📓 Daily journal', journalIntro: 'A small check-in for today. Your entry is private.', journalGood: 'What went well today?', journalTomorrow: 'What can go better tomorrow?', journalGrateful: 'Things I’m grateful for:', journalGoodPlaceholder: 'Write something that went well…', journalTomorrowPlaceholder: 'One thing you want to improve…', journalGratefulPlaceholder: 'People, moments, or little things…', journalSave: 'Save today’s journal', journalSaved: 'Today’s journal saved.', journalSavedLocal: 'Saved on this device.', journalSaving: 'Saving…', journalSaveError: 'Could not save your journal. Check the journal table migration.', journalCloudUnavailable: 'Cloud journal unavailable. Your local draft is kept; run the journal SQL migration.',
    xpLeaderboard: '🏆 XP leaderboard', xpLeaderboardIntro: 'Compare levels with the community or your friends.', leaderboardGlobal: 'Global', leaderboardFriends: 'Friends', leaderboardLoading: 'Loading leaderboard…', leaderboardError: 'Could not load leaderboard: {error}', leaderboardEmpty: 'No results yet.', leaderboardYou: 'You', leaderboardXp: '{xp} XP', socialReportTitle: '⚑ Report profile or post', reportProfile: '⚑ Report profile', reportPost: '⚑ Report post', reportedProfile: 'Profile reported', reportedPost: 'Post reported',
    shopSoftBell: 'Soft bell', shopSoftBellDesc: 'Gentle, bright bell notes as a small reward.',
    shopWoodblock: 'Woodblock', shopWoodblockDesc: 'Warm, short wooden taps.',
    shopArcade: 'Arcade', shopArcadeDesc: 'A playful retro sound for completed tasks.',
    shopRaindrop: 'Raindrops', shopRaindropDesc: 'Soft falling tones like tiny raindrops.',
    journalTitle: '📓 Daily journal', journalIntro: 'A small check-in for today. Your entry is private.',
    journalGood: 'What went well today?', journalTomorrow: 'What can go better tomorrow?', journalGrateful: 'Things I’m grateful for:',
    journalGoodPlaceholder: 'Write something that went well…', journalTomorrowPlaceholder: 'One thing you want to improve…',
    journalGratefulPlaceholder: 'People, moments, or little things…', journalSave: 'Save today’s journal', journalSaved: 'Today’s journal saved.',
    emailRequired: 'Please enter your email first.', genericError: 'Error: {error}',
    itemAlreadyOwned: 'You already own this item!', notEnoughPoints: 'You need {price} points to buy this item.',
    itemPurchased: '🎉 {item} purchased successfully!', premiumBuyRequired: 'Buy the Premium sound in the Point Shop first!',
    premiumActivated: '🔊 Premium sound enabled!', normalSoundActivated: '🔔 Normal sound enabled!',
    friendEndConfirm: 'Are you sure you want to end this friendship?', blockConfirm: 'Block this user? This will end the friendship.',
    unblockConfirm: 'Are you sure you want to unblock this user?', operationFailed: 'That did not work: {error}',
    friendAccepted: '🎉 Friend request accepted!', friendRejectedAlert: 'Friend request declined.',
    friendRemoved: 'Friendship ended.', friendRemoveFailed: 'Could not remove friend.',
    friendBlockFailed: 'Could not block this user.', friendBlocked: 'User blocked.',
    userUnblockFailed: 'Could not unblock this user.', userUnblocked: 'User unblocked.',
    friendRequestFailed: 'Could not send friend request: {error}',
    taskSaveFailed: '❌ Could not save.',
    shopPrice: '🪙 Price:', listen: '▶️ Listen', equipSound: '🔊 Equip', buyItem: '🛒 Buy',
  },
  de: {
    bossDefeated: 'besiegt!', bossSurvived: 'hat überlebt', goalReached: '{pct}% – Ziel von {goal}% erreicht.',
    goalWas: '{pct}% – Ziel waren {goal}%.', rewardUnlocked: 'Belohnung freigeschaltet:', planBoss: 'Plane Aufgaben, damit der Boss HP bekommt',
    hp: '{left} / {total} HP', weekNoTasks: 'Keine Aufgaben', weekDone: '{pct}% · {done}/{planned} erledigt',
    pointsPriceLine: '🪙 Preis: {price} Punkte', pointBalanceLabel: 'Deine verfügbaren Punkte:',
    emptyPurchases: 'Noch keine Käufe.', purchased: 'Gekauft · bereit zum Ausrüsten', justEquipped: 'Gerade ausgerüstet',
    weeklyBossQuote1: 'Der Boss hat überlebt, ist aber verwundet. Nächste Woche fällt er!',
    weeklyBossQuote2: 'Jede erledigte Aufgabe zählt. Lade neu und greif wieder an.',
    weeklyBossQuote3: 'Fortschritt ist wichtiger als Perfektion. Starte am Montag stärker.',
    weeklyBossQuote4: 'Knapp verlorene Kämpfe sorgen für die besten Comebacks.',
    accountSignedOut: 'Nicht angemeldet', accountSignedIn: 'Angemeldet: {email}',
    premiumThemesHeading: '🌈 Premium-Themes & animierte Glows', premiumThemesIntro: 'Schalte Themes mit Punkten frei und rüste sie in den Einstellungen aus.',
    buyTheme: '🪙 Theme freischalten', equipTheme: 'Theme verwenden', themeLockedHint: 'Schalte dieses Theme zuerst im Punkteshop frei.',
    themeToxicBloom: 'Toxic Bloom', themeToxicBloomDesc: 'Giftgrün · Dunkler Garten',
    themeBloodMoon: 'Blood Moon', themeBloodMoonDesc: 'Karmesinrot · Mondnacht',
    themeHologram: 'Hologramm', themeHologramDesc: 'Irisierendes Cyan · Chrom',
    themeVolcanicAsh: 'Volcanic Ash', themeVolcanicAshDesc: 'Anthrazit · Lavaschein',
    themeEnchantedForest: 'Enchanted Forest', themeEnchantedForestDesc: 'Tiefgrün · Glühwürmchen',
    themeNebulaDrift: 'Nebula Drift', themeNebulaDriftDesc: 'Bewegter violetter Nebelglow',
    themeAuroraFlow: 'Aurora Flow', themeAuroraFlowDesc: 'Bewegter grüner Polarlichtglow',
    themeLavaPulse: 'Lava Pulse', themeLavaPulseDesc: 'Pulsierender orangefarbener Lava-Glow',
    titleVoidWalker: 'Leerenwanderer', titleCrimsonCrown: 'Purpurkrone', titleForestPhantom: 'Waldphantom',
    friendProgressSharingTitle: '🤝 Fortschritt mit Freunden teilen', shareProgressWithFriendsLabel: 'Bestätigte Freunde dürfen meine Aufgaben und Statistiken ansehen',
    shareProgressPrivateDefault: 'Standardmäßig privat. Du kannst das jederzeit ändern.', sharingSaveError: 'Teilen konnte nicht geändert werden: {error}',
    progressViewButton: '📊 Fortschritt ansehen', friendProgressTitle: '📊 Fortschritt von Freunden', friendProgressLoading: 'Fortschritt wird geladen ...',
    friendProgressUnavailable: 'Fortschritt konnte nicht geladen werden: {error}', friendProgressPrivate: 'Dieser Freund hat die Fortschrittsfreigabe nicht aktiviert.',
    shareProgressEnabled: 'Fortschrittsfreigabe ist aktiviert.', progressHistory: 'Letzte 8 Wochen',
    progressAllTime: 'Erledigte Aufgaben insgesamt', progressWeekGoal: 'Wochenziel: {goal}%', progressNoGoal: 'Kein Wochenziel gesetzt',
    progressWeekRate: 'Diese Woche: {done}/{planned} Aufgaben · {pct}%', progressNoTasks: 'Für diesen Tag sind keine Aufgaben geplant.',
    progressCompleted: 'Erledigt', progressNotCompleted: 'Nicht erledigt', progressDefeatedBosses: 'Besiegte Bosse: {count}',
    aboutSince: '📅 Dabei seit: {date}', saveBusy: 'Speichere ...', bioSaved: '✅ Beschreibung gespeichert!',
    editTask: 'Aufgabe bearbeiten', newTask: 'Neue Aufgabe', taskTitle: 'Aufgabentitel', categoryOptional: 'Kategorie (optional)',
    noTasks: 'Keine Aufgaben geplant. Tippe auf +, um eine hinzuzufügen.', weeklyGoal: 'Wochenziel & Belohnung',
    reminderEnable: '🔔 Erinnerung für diese Aufgabe aktivieren', reminderPerTask: 'Du kannst für jede Aufgabe eine andere Uhrzeit einstellen.',
    reportReasonPrompt: 'Warum möchtest du diese Nachricht melden?', reportDone: 'Danke. Deine Meldung wurde an die Moderation übermittelt.',
    socialChooseFriend: 'Wähle einen Freund aus, um zu chatten.', socialLoadingFriends: 'Freunde werden geladen ...',
    socialNoFriends: 'Du hast noch keine bestätigten Freunde. Füge zuerst Freunde hinzu.', socialLoadingMessages: 'Nachrichten werden geladen ...',
    socialLoadError: 'Chat konnte nicht geladen werden. Prüfe, ob die Supabase-Migration ausgeführt wurde.',
    socialNoMessages: 'Noch keine Nachrichten. Sag Hallo 👋', messageSent: '✓ Gesendet', messageRead: '✓✓ Gelesen',
    readReceiptError: 'Lesestatus konnte nicht aktualisiert werden: {error}', readReceiptsNeedMigration: 'Führe die SQL-Migration für Lesebestätigungen aus.',
    adminLoading: 'Meldungen werden geladen ...', adminNoOpen: 'Keine offenen Meldungen.', adminNoReports: 'Es wurden noch keine Chatnachrichten gemeldet.',
    activeRestrictionsHeading: 'Aktive Timeouts und Sperren', noActiveRestrictions: 'Keine aktiven Timeouts oder Sperren.',
    liftRestriction: 'Sperre aufheben', restrictionLifted: 'Sperre wurde aufgehoben.', restrictionLiftError: 'Sperre konnte nicht aufgehoben werden: {error}',
    timeoutUntil: 'Bis {date}', permanentRestriction: 'Dauerhafte Sperre',
    adminReportCount: '{count} offene Meldung(en)', adminLoadError: 'Meldungen konnten nicht geladen werden: {error}',
    reportActionError: 'Maßnahme fehlgeschlagen: {error}', reportStatusError: 'Status konnte nicht geändert werden: {error}',
    reportSubmitted: 'Danke. Deine Meldung wurde an die Moderation übermittelt.', reportFailure: 'Meldung fehlgeschlagen: {error}',
    reportSendBusy: 'Meldung wird gesendet ...', reportSentButton: '✓ Gemeldet', reportMessageButton: '⚑ Nachricht melden',
    noAccountNotices: 'Keine Kontohinweise.', accountNoticesError: 'Kontohinweise konnten nicht geladen werden.',
    markWarningRead: 'Als gelesen markieren', warningWasRead: 'Gelesen',
    onlineState: '🟢 Online', offlineState: '⚫ Offline', friendRemove: 'Entfernen', friendBlock: '🚫 Blockieren',
    friendAccept: '✅ Annehmen', friendReject: '❌ Ablehnen', friendPending: '⏳ Ausstehend', friendRejected: 'Abgelehnt',
    friendUnblock: 'Entblockieren', noIncoming: 'Keine eingehenden Anfragen.', noOutgoing: 'Keine gesendeten Anfragen.',
    noFriendsYet: 'Du hast noch keine Freunde.', noBlocked: 'Du hast niemanden blockiert.',
    incomingTitle: '📩 Eingehende Anfragen', outgoingTitle: '📤 Gesendete Anfragen', yourFriends: '🤝 Deine Freunde',
    blockedTitle: '🚫 Blockierte Nutzer', findUsername: 'Suche nach einem Username ...', searchAtLeastTwo: 'Gib mindestens 2 Zeichen ein.',
    userSearchFailed: 'Die Suche ist fehlgeschlagen.', noUsersFound: 'Keine Benutzer gefunden.', friendSendError: 'Freundschaftsanfrage konnte nicht gesendet werden.',
    friendRequestSent: 'Freundschaftsanfrage gesendet!', friendOverviewError: 'Freundesübersicht konnte nicht geladen werden.',
    reminderPermission: 'Aktiviere zuerst Benachrichtigungen im Browser.', reminderSaved: 'Erinnerungseinstellungen gespeichert.',
    reminderRequested: '🔔 Test-Benachrichtigung angefordert!', quietSaved: 'Ruhezeiten gespeichert.',
    quietNeedsBoth: 'Wähle Start- und Endzeit aus.', reminderUnsupported: 'Dieser Browser unterstützt keine Benachrichtigungen.',
    resetPasswordsMismatch: 'Die Passwörter stimmen nicht überein.', resetPasswordMin: 'Das Passwort muss mindestens 8 Zeichen haben.',
    passwordSaving: 'Passwort wird gespeichert...', passwordUpdated: 'Passwort erfolgreich geändert!',
    profileAvatarBusy: 'Speichere Avatar...', profileAvatarSaved: 'Avatar gespeichert!', profileAvatarFailed: 'Fehler beim Speichern.',
    imageUploading: 'Bild wird hochgeladen...', imageTypeError: 'Bitte JPG, PNG oder WebP auswählen.',
    imageTooLarge: 'Das Bild darf maximal 3 MB groß sein.', imageUploadFailed: 'Uploadfehler: {error}',
    profileImageSaved: 'Profilbild erfolgreich gespeichert!', profileImageDbFailed: 'Profilfehler: {error}',
    profileImageDetected: 'Datei erkannt: {name}', loginToContinue: 'Bitte melde dich zuerst an.',
    usernameRule: 'Username: 3–20 Buchstaben, Zahlen oder Unterstriche.', passwordRule: 'Das Passwort muss mindestens 8 Zeichen haben.',
    createAccountBusy: 'Konto wird erstellt...', createAccountOk: 'Konto erfolgreich erstellt!', confirmEmail: 'Bitte prüfe deine E-Mails, um dein Konto zu bestätigen.',
    loginBusy: 'Anmeldung läuft...', accountResetEmail: 'Du bekommst eine E-Mail zum Zurücksetzen deines Passworts.',
    accountDeleteConfirm: 'Konto wirklich dauerhaft löschen? Das kann nicht rückgängig gemacht werden.', accountDeleteFailed: 'Konto konnte nicht gelöscht werden: {error}',
    warnConfirm: 'Verwarnung an diesen Nutzer senden?', banConfirm: 'Diesen Account dauerhaft sperren?',
    timeoutConfirm: 'Diesen Account mit Timeout belegen?', unbanConfirm: 'Sperre dieses Accounts aufheben?',
    adminNoteRequired: 'Bitte eine Admin-Notiz oder Verwarnungsnachricht eingeben.',
    warningOk: 'Verwarnung wurde im Consistly-Konto des Nutzers hinterlegt.', timeout24Ok: 'Timeout für 24 Stunden gesetzt.',
    timeout7Ok: 'Timeout für 7 Tage gesetzt.', banOk: 'Dauerhafte Sperre gesetzt.', unbanOk: 'Sperre wurde aufgehoben.',
    moderatingError: 'Maßnahme fehlgeschlagen: {error}',
    restrictionNotice: 'Dein Zugang wurde eingeschränkt: {reason}.{expiry}',
    accountDeleted: 'Dein Konto wurde gelöscht.',
    themeToggle: 'Theme wechseln', addTask: 'Aufgabe hinzufügen', chatWith: 'Chat mit',
    shopPremiumSound: 'Premium-Abschlusston', shopPremiumDesc: 'Ein besonderer dreistufiger Ton beim Erledigen einer Aufgabe.',
    shopSoftPop: 'Sanftes Plopp', shopSoftPopDesc: 'Ein weiches, kurzes Plopp mit hellem Ausklang.',
    shopCrystal: 'Kristall-Klingeln', shopCrystalDesc: 'Zwei klare, funkelnde Töne als kleine Belohnung.',
    shopBubble: 'Seifenblasen', shopBubbleDesc: 'Zwei blubbernde Töne, die nach oben schweben.',
    shopSoftBell: 'Sanfte Glocke', shopSoftBellDesc: 'Helle, ruhige Glockentöne als kleine Belohnung.', shopWoodblock: 'Holzklang', shopWoodblockDesc: 'Warme, kurze Klopfklänge.', shopArcade: 'Arcade', shopArcadeDesc: 'Ein verspielter Retro-Sound für erledigte Aufgaben.', shopRaindrop: 'Regentropfen', shopRaindropDesc: 'Sanfte, fallende Töne wie kleine Regentropfen.',
    journalTitle: '📓 Tagesjournal', journalIntro: 'Ein kurzer Tagesrückblick. Dein Eintrag ist privat.', journalGood: 'Was lief heute gut?', journalTomorrow: 'Was kann morgen besser laufen?', journalGrateful: 'Dinge, für die ich dankbar bin:', journalGoodPlaceholder: 'Schreib auf, was heute gut lief …', journalTomorrowPlaceholder: 'Eine Sache, die du verbessern möchtest …', journalGratefulPlaceholder: 'Menschen, Momente oder Kleinigkeiten …', journalSave: 'Journal für heute speichern', journalSaved: 'Dein Journal für heute wurde gespeichert.', journalSavedLocal: 'Auf diesem Gerät gespeichert.', journalSaving: 'Wird gespeichert …', journalSaveError: 'Journal konnte nicht gespeichert werden. Prüfe die Journal-Migration in Supabase.', journalCloudUnavailable: 'Cloud-Journal nicht verfügbar. Dein lokaler Entwurf bleibt erhalten; führe die Journal-SQL-Migration aus.',
    xpLeaderboard: '🏆 XP-Rangliste', xpLeaderboardIntro: 'Vergleiche dein Level mit der Community oder deinen Freunden.', leaderboardGlobal: 'Global', leaderboardFriends: 'Freunde', leaderboardLoading: 'Rangliste wird geladen…', leaderboardError: 'Rangliste konnte nicht geladen werden: {error}', leaderboardEmpty: 'Noch keine Ergebnisse.', leaderboardYou: 'Du', leaderboardXp: '{xp} XP', socialReportTitle: '⚑ Profil oder Beitrag melden', reportProfile: '⚑ Profil melden', reportPost: '⚑ Beitrag melden', reportedProfile: 'Profil gemeldet', reportedPost: 'Beitrag gemeldet',
    shopSoftBell: 'Sanfte Glocke', shopSoftBellDesc: 'Helle, ruhige Glockentöne als kleine Belohnung.',
    shopWoodblock: 'Holzklang', shopWoodblockDesc: 'Warme, kurze Klopfklänge.',
    shopArcade: 'Arcade', shopArcadeDesc: 'Ein verspielter Retro-Sound für erledigte Aufgaben.',
    shopRaindrop: 'Regentropfen', shopRaindropDesc: 'Sanfte, fallende Töne wie kleine Regentropfen.',
    journalTitle: '📓 Tagesjournal', journalIntro: 'Ein kurzer Tagesrückblick. Dein Eintrag ist privat.',
    journalGood: 'Was lief heute gut?', journalTomorrow: 'Was kann morgen besser laufen?', journalGrateful: 'Dinge, für die ich dankbar bin:',
    journalGoodPlaceholder: 'Schreib auf, was heute gut lief …', journalTomorrowPlaceholder: 'Eine Sache, die du verbessern möchtest …',
    journalGratefulPlaceholder: 'Menschen, Momente oder Kleinigkeiten …', journalSave: 'Journal für heute speichern', journalSaved: 'Dein Journal für heute wurde gespeichert.',
    emailRequired: 'Bitte gib zuerst deine E-Mail ein.', genericError: 'Fehler: {error}',
    itemAlreadyOwned: 'Du hast dieses Item bereits gekauft!', notEnoughPoints: 'Du brauchst {price} Punkte für diesen Kauf.',
    itemPurchased: '🎉 {item} erfolgreich gekauft!', premiumBuyRequired: 'Kaufe den Premium-Sound zuerst im Punkteshop!',
    premiumActivated: '🔊 Premium-Sound aktiviert!', normalSoundActivated: '🔔 Normaler Sound aktiviert!',
    friendEndConfirm: 'Möchtest du diese Freundschaft wirklich beenden?', blockConfirm: 'Nutzer blockieren? Die Freundschaft wird beendet.',
    unblockConfirm: 'Möchtest du diesen Nutzer wirklich entblockieren?', operationFailed: 'Das hat leider nicht funktioniert: {error}',
    friendAccepted: '🎉 Freundschaft bestätigt!', friendRejectedAlert: 'Anfrage abgelehnt.',
    friendRemoved: 'Freundschaft wurde beendet.', friendRemoveFailed: 'Freund konnte nicht entfernt werden.',
    friendBlockFailed: 'Nutzer konnte nicht blockiert werden.', friendBlocked: 'Nutzer wurde blockiert.',
    userUnblockFailed: 'Nutzer konnte nicht entblockiert werden.', userUnblocked: 'Nutzer wurde entblockiert.',
    friendRequestFailed: 'Anfrage konnte nicht gesendet werden: {error}',
    taskSaveFailed: '❌ Fehler beim Speichern.',
    shopPrice: '🪙 Preis:', listen: '▶️ Anhören', equipSound: '🔊 Ausrüsten', buyItem: '🛒 Kaufen',
  },
  es: {
    bossDefeated: '¡derrotado!', bossSurvived: 'ha sobrevivido', goalReached: '{pct}% – objetivo del {goal}% alcanzado.',
    goalWas: '{pct}% – el objetivo era {goal}%.', rewardUnlocked: 'Recompensa desbloqueada:', planBoss: 'Planifica tareas para darle puntos de vida al jefe',
    hp: '{left} / {total} HP', weekNoTasks: 'Sin tareas', weekDone: '{pct}% · {done}/{planned} hecho',
    pointsPriceLine: '🪙 Precio: {price} puntos', pointBalanceLabel: 'Tus puntos disponibles:',
    emptyPurchases: 'Aún no hay compras.', purchased: 'Comprado · listo para equipar', justEquipped: 'Equipado actualmente',
    weeklyBossQuote1: 'El jefe ha sobrevivido, pero está herido. ¡La próxima semana caerá!',
    weeklyBossQuote2: 'Cada tarea completada cuenta. Vuelve a intentarlo.',
    weeklyBossQuote3: 'El progreso supera a la perfección. Vuelve con más fuerza el lunes.',
    weeklyBossQuote4: 'Las derrotas ajustadas preparan los mejores regresos.',
    accountSignedOut: 'No has iniciado sesión', accountSignedIn: 'Sesión iniciada: {email}',
    premiumThemesHeading: '🌈 Temas premium y brillos animados', premiumThemesIntro: 'Desbloquea temas con puntos y equípalos en Ajustes.',
    buyTheme: '🪙 Desbloquear tema', equipTheme: 'Usar tema', themeLockedHint: 'Desbloquea primero este tema en la tienda.',
    themeToxicBloom: 'Toxic Bloom', themeToxicBloomDesc: 'Verde tóxico · Jardín oscuro',
    themeBloodMoon: 'Blood Moon', themeBloodMoonDesc: 'Rojo carmesí · Noche lunar',
    themeHologram: 'Holograma', themeHologramDesc: 'Cian iridiscente · Cromo',
    themeVolcanicAsh: 'Ceniza volcánica', themeVolcanicAshDesc: 'Carbón · Resplandor de lava',
    themeEnchantedForest: 'Bosque encantado', themeEnchantedForestDesc: 'Verde profundo · Luciérnagas',
    themeNebulaDrift: 'Nebula Drift', themeNebulaDriftDesc: 'Brillo cósmico violeta animado',
    themeAuroraFlow: 'Aurora Flow', themeAuroraFlowDesc: 'Brillo verde de aurora animado',
    themeLavaPulse: 'Lava Pulse', themeLavaPulseDesc: 'Brillo naranja de lava animado',
    titleVoidWalker: 'Caminante del vacío', titleCrimsonCrown: 'Corona carmesí', titleForestPhantom: 'Fantasma del bosque',
    friendProgressSharingTitle: '🤝 Compartir progreso con amigos', shareProgressWithFriendsLabel: 'Permitir que amigos confirmados vean mis tareas y estadísticas',
    shareProgressPrivateDefault: 'Privado por defecto. Puedes cambiarlo cuando quieras.', sharingSaveError: 'No se pudo cambiar el uso compartido: {error}',
    progressViewButton: '📊 Ver progreso', friendProgressTitle: '📊 Progreso de amigos', friendProgressLoading: 'Cargando progreso ...',
    friendProgressUnavailable: 'No se pudo cargar el progreso: {error}', friendProgressPrivate: 'Este amigo no ha activado el uso compartido del progreso.',
    shareProgressEnabled: 'El uso compartido del progreso está activado.', progressHistory: 'Últimas 8 semanas',
    progressAllTime: 'Tareas completadas en total', progressWeekGoal: 'Objetivo semanal: {goal}%', progressNoGoal: 'No hay objetivo semanal',
    progressWeekRate: 'Esta semana: {done}/{planned} tareas · {pct}%', progressNoTasks: 'No hay tareas programadas para este día.',
    progressCompleted: 'Completada', progressNotCompleted: 'Sin completar', progressDefeatedBosses: 'Jefes derrotados: {count}',
    aboutSince: '📅 Desde: {date}', saveBusy: 'Guardando ...', bioSaved: '✅ ¡Descripción guardada!',
    editTask: 'Editar tarea', newTask: 'Nueva tarea', taskTitle: 'Título de la tarea', categoryOptional: 'Categoría (opcional)',
    noTasks: 'No hay tareas planificadas. Pulsa + para añadir una.', weeklyGoal: 'Objetivo semanal y recompensa',
    reminderEnable: '🔔 Activar recordatorio para este hábito', reminderPerTask: 'Puedes elegir una hora diferente para cada hábito.',
    reportReasonPrompt: '¿Por qué quieres denunciar este mensaje?', reportDone: 'Gracias. Tu informe se envió al equipo de moderación.',
    socialChooseFriend: 'Elige un amigo para chatear.', socialLoadingFriends: 'Cargando amigos ...',
    socialNoFriends: 'Aún no tienes amigos confirmados. Añade uno primero.', socialLoadingMessages: 'Cargando mensajes ...',
    socialLoadError: 'No se pudo cargar el chat. Comprueba si ejecutaste la migración de Supabase.',
    socialNoMessages: 'Aún no hay mensajes. Saluda 👋', messageSent: '✓ Enviado', messageRead: '✓✓ Leído',
    readReceiptError: 'No se pudo actualizar el estado de lectura: {error}', readReceiptsNeedMigration: 'Ejecuta la migración SQL de confirmaciones de lectura.',
    adminLoading: 'Cargando informes ...', adminNoOpen: 'No hay informes abiertos.', adminNoReports: 'Aún no se ha denunciado ningún mensaje.',
    activeRestrictionsHeading: 'Bloqueos y suspensiones activos', noActiveRestrictions: 'No hay bloqueos ni suspensiones activos.',
    liftRestriction: 'Retirar restricción', restrictionLifted: 'Se retiró la restricción.', restrictionLiftError: 'No se pudo retirar la restricción: {error}',
    timeoutUntil: 'Hasta {date}', permanentRestriction: 'Bloqueo permanente',
    adminReportCount: '{count} informe(s) abierto(s)', adminLoadError: 'No se pudieron cargar los informes: {error}',
    reportActionError: 'Error en la medida: {error}', reportStatusError: 'No se pudo cambiar el estado: {error}',
    reportSubmitted: 'Gracias. Tu informe se envió al equipo de moderación.', reportFailure: 'Error al enviar el informe: {error}',
    reportSendBusy: 'Enviando informe ...', reportSentButton: '✓ Denunciado', reportMessageButton: '⚑ Denunciar mensaje',
    noAccountNotices: 'No hay avisos de cuenta.', accountNoticesError: 'No se pudieron cargar los avisos de cuenta.',
    markWarningRead: 'Marcar como leído', warningWasRead: 'Leído',
    onlineState: '🟢 En línea', offlineState: '⚫ Desconectado', friendRemove: 'Eliminar', friendBlock: '🚫 Bloquear',
    friendAccept: '✅ Aceptar', friendReject: '❌ Rechazar', friendPending: '⏳ Pendiente', friendRejected: 'Rechazada',
    friendUnblock: 'Desbloquear', noIncoming: 'No hay solicitudes recibidas.', noOutgoing: 'No hay solicitudes enviadas.',
    noFriendsYet: 'Aún no tienes amigos.', noBlocked: 'No has bloqueado a nadie.',
    incomingTitle: '📩 Solicitudes recibidas', outgoingTitle: '📤 Solicitudes enviadas', yourFriends: '🤝 Tus amigos',
    blockedTitle: '🚫 Usuarios bloqueados', findUsername: 'Busca un nombre de usuario ...', searchAtLeastTwo: 'Escribe al menos 2 caracteres.',
    userSearchFailed: 'La búsqueda falló.', noUsersFound: 'No se encontraron usuarios.', friendSendError: 'No se pudo enviar la solicitud de amistad.',
    friendRequestSent: '¡Solicitud de amistad enviada!', friendOverviewError: 'No se pudo cargar la lista de amigos.',
    reminderPermission: 'Activa primero las notificaciones en el navegador.', reminderSaved: 'Ajustes de recordatorios guardados.',
    reminderRequested: '🔔 ¡Notificación de prueba solicitada!', quietSaved: 'Horario de descanso guardado.',
    quietNeedsBoth: 'Elige las horas de inicio y fin.', reminderUnsupported: 'Este navegador no admite notificaciones.',
    resetPasswordsMismatch: 'Las contraseñas no coinciden.', resetPasswordMin: 'La contraseña debe tener al menos 8 caracteres.',
    passwordSaving: 'Guardando contraseña...', passwordUpdated: '¡Contraseña actualizada!',
    profileAvatarBusy: 'Guardando avatar...', profileAvatarSaved: '¡Avatar guardado!', profileAvatarFailed: 'No se pudo guardar.',
    imageUploading: 'Subiendo imagen...', imageTypeError: 'Elige una imagen JPG, PNG o WebP.',
    imageTooLarge: 'La imagen debe ocupar 3 MB como máximo.', imageUploadFailed: 'Error de carga: {error}',
    profileImageSaved: '¡Foto de perfil guardada!', profileImageDbFailed: 'Error de perfil: {error}',
    profileImageDetected: 'Archivo seleccionado: {name}', loginToContinue: 'Inicia sesión primero.',
    usernameRule: 'El nombre debe tener entre 3 y 20 letras, números o guiones bajos.', passwordRule: 'La contraseña debe tener al menos 8 caracteres.',
    createAccountBusy: 'Creando cuenta...', createAccountOk: '¡Cuenta creada!', confirmEmail: 'Revisa tu correo para confirmar la cuenta.',
    loginBusy: 'Iniciando sesión...', accountResetEmail: 'Recibirás un correo para restablecer la contraseña.',
    accountDeleteConfirm: '¿Eliminar tu cuenta permanentemente? No se puede deshacer.', accountDeleteFailed: 'No se pudo eliminar la cuenta: {error}',
    warnConfirm: '¿Enviar una advertencia a este usuario?', banConfirm: '¿Bloquear esta cuenta permanentemente?',
    timeoutConfirm: '¿Aplicar un bloqueo temporal a esta cuenta?', unbanConfirm: '¿Retirar el bloqueo de esta cuenta?',
    adminNoteRequired: 'Escribe una nota o un mensaje de advertencia.',
    warningOk: 'La advertencia se guardó en la cuenta de Consistly.', timeout24Ok: 'Bloqueo de 24 horas aplicado.',
    timeout7Ok: 'Bloqueo de 7 días aplicado.', banOk: 'Bloqueo permanente aplicado.', unbanOk: 'Bloqueo retirado.',
    moderatingError: 'Error en la medida: {error}',
    restrictionNotice: 'Se ha restringido tu acceso: {reason}.{expiry}',
    accountDeleted: 'Tu cuenta ha sido eliminada.',
    themeToggle: 'Cambiar tema', addTask: 'Añadir tarea', chatWith: 'Chat con',
    shopPremiumSound: 'Sonido premium al completar', shopPremiumDesc: 'Un sonido especial de tres tonos al completar una tarea.',
    shopSoftPop: 'Burbujita suave', shopSoftPopDesc: 'Un sonido breve y suave con un final brillante.',
    shopCrystal: 'Campanilla de cristal', shopCrystalDesc: 'Dos notas claras y brillantes como pequeña recompensa.',
    shopBubble: 'Burbujas', shopBubbleDesc: 'Dos tonos burbujeantes que flotan hacia arriba.',
    shopSoftBell: 'Campana suave', shopSoftBellDesc: 'Notas de campana suaves y brillantes como pequeña recompensa.', shopWoodblock: 'Madera', shopWoodblockDesc: 'Golpecitos cálidos y breves de madera.', shopArcade: 'Arcade', shopArcadeDesc: 'Un sonido retro divertido para las tareas completadas.', shopRaindrop: 'Gotas de lluvia', shopRaindropDesc: 'Tonos suaves y descendentes como pequeñas gotas.',
    journalTitle: '📓 Diario diario', journalIntro: 'Un pequeño repaso del día. Tu entrada es privada.', journalGood: '¿Qué ha ido bien hoy?', journalTomorrow: '¿Qué puede ir mejor mañana?', journalGrateful: 'Cosas por las que estoy agradecido/a:', journalGoodPlaceholder: 'Escribe algo que haya ido bien…', journalTomorrowPlaceholder: 'Algo que quieras mejorar…', journalGratefulPlaceholder: 'Personas, momentos o pequeños detalles…', journalSave: 'Guardar el diario de hoy', journalSaved: 'El diario de hoy se ha guardado.', journalSavedLocal: 'Guardado en este dispositivo.', journalSaving: 'Guardando…', journalSaveError: 'No se pudo guardar el diario. Comprueba la migración de la tabla en Supabase.', journalCloudUnavailable: 'El diario en la nube no está disponible. El borrador local se conserva; ejecuta la migración SQL del diario.',
    xpLeaderboard: '🏆 Clasificación de XP', xpLeaderboardIntro: 'Compara tu nivel con la comunidad o tus amigos.', leaderboardGlobal: 'Global', leaderboardFriends: 'Amigos', leaderboardLoading: 'Cargando clasificación…', leaderboardError: 'No se pudo cargar la clasificación: {error}', leaderboardEmpty: 'Aún no hay resultados.', leaderboardYou: 'Tú', leaderboardXp: '{xp} XP', socialReportTitle: '⚑ Denunciar perfil o publicación', reportProfile: '⚑ Denunciar perfil', reportPost: '⚑ Denunciar publicación', reportedProfile: 'Perfil denunciado', reportedPost: 'Publicación denunciada',
    shopSoftBell: 'Campana suave', shopSoftBellDesc: 'Notas de campana suaves y brillantes como pequeña recompensa.',
    shopWoodblock: 'Madera', shopWoodblockDesc: 'Golpecitos cálidos y breves de madera.',
    shopArcade: 'Arcade', shopArcadeDesc: 'Un sonido retro divertido para las tareas completadas.',
    shopRaindrop: 'Gotas de lluvia', shopRaindropDesc: 'Tonos suaves y descendentes como pequeñas gotas.',
    journalTitle: '📓 Diario diario', journalIntro: 'Un pequeño repaso del día. Tu entrada es privada.',
    journalGood: '¿Qué ha ido bien hoy?', journalTomorrow: '¿Qué puede ir mejor mañana?', journalGrateful: 'Cosas por las que estoy agradecido/a:',
    journalGoodPlaceholder: 'Escribe algo que haya ido bien…', journalTomorrowPlaceholder: 'Algo que quieras mejorar…',
    journalGratefulPlaceholder: 'Personas, momentos o pequeños detalles…', journalSave: 'Guardar el diario de hoy', journalSaved: 'El diario de hoy se ha guardado.',
    emailRequired: 'Escribe primero tu correo electrónico.', genericError: 'Error: {error}',
    itemAlreadyOwned: '¡Ya tienes este artículo!', notEnoughPoints: 'Necesitas {price} puntos para comprar este artículo.',
    itemPurchased: '🎉 ¡{item} comprado!', premiumBuyRequired: 'Compra primero el sonido premium en la tienda de puntos.',
    premiumActivated: '🔊 ¡Sonido premium activado!', normalSoundActivated: '🔔 ¡Sonido normal activado!',
    friendEndConfirm: '¿Quieres terminar esta amistad?', blockConfirm: '¿Bloquear a este usuario? Esto terminará la amistad.',
    unblockConfirm: '¿Quieres desbloquear a este usuario?', operationFailed: 'No se pudo completar: {error}',
    friendAccepted: '🎉 ¡Solicitud aceptada!', friendRejectedAlert: 'Solicitud rechazada.',
    friendRemoved: 'La amistad terminó.', friendRemoveFailed: 'No se pudo eliminar al amigo.',
    friendBlockFailed: 'No se pudo bloquear al usuario.', friendBlocked: 'Usuario bloqueado.',
    userUnblockFailed: 'No se pudo desbloquear al usuario.', userUnblocked: 'Usuario desbloqueado.',
    friendRequestFailed: 'No se pudo enviar la solicitud: {error}',
    taskSaveFailed: '❌ No se pudo guardar.',
    shopPrice: '🪙 Precio:', listen: '▶️ Escuchar', equipSound: '🔊 Equipar', buyItem: '🛒 Comprar',
  }
};

const newFeatureCopy = {
  socialNav: ['Sociale', 'Κοινωνικά', 'Social'], socialHomeButton: ['💬 Chatta con gli amici', '💬 Συνομιλία με φίλους', '💬 Conversar com amigos'], socialPageTitle: ['🌐 Social', '🌐 Κοινωνικά', '🌐 Social'],
  socialPageIntro: ['Amici, obiettivi condivisi e post della community.', 'Φίλοι, κοινοί στόχοι και αναρτήσεις κοινότητας.', 'Amigos, objetivos partilhados e publicações da comunidade.'],
  friendsTitle: ['Amici', 'Φίλοι', 'Amigos'], openChat: ['Apri chat', 'Άνοιγμα συνομιλιών', 'Abrir conversas'],
  communityFeed: ['📰 Feed della community', '📰 Ροή κοινότητας', '📰 Feed da comunidade'],
  socialPostPlaceholder: ['Condividi qualcosa con la community...', 'Μοιράσου κάτι με την κοινότητα...', 'Partilha algo com a comunidade...'],
  publishPost: ['Pubblica', 'Δημοσίευση', 'Publicar'], feedLoading: ['Caricamento post...', 'Φόρτωση αναρτήσεων...', 'A carregar publicações...'],
  sharedGoalsTitle: ['🎯 Obiettivi condivisi', '🎯 Κοινοί στόχοι', '🎯 Objetivos partilhados'],
  sharedGoalTitlePlaceholder: ['Nome obiettivo', 'Όνομα στόχου', 'Nome do objetivo'],
  sharedGoalDescriptionPlaceholder: ['A cosa lavorerete insieme?', 'Τι θα προσπαθήσετε να πετύχετε μαζί;', 'Em que vão trabalhar juntos?'],
  goalFriendLabel: ['Amico', 'Φίλος', 'Amigo'], chooseFriend: ['Scegli un amico', 'Επίλεξε φίλο', 'Escolhe um amigo'],
  goalTargetLabel: ['Obiettivo condiviso (check-in)', 'Κοινός στόχος (check-in)', 'Meta partilhada (check-ins)'],
  goalDeadlineLabel: ['Data obiettivo', 'Ημερομηνία στόχου', 'Data limite'], createSharedGoal: ['Crea obiettivo condiviso', 'Δημιουργία κοινού στόχου', 'Criar objetivo partilhado'],
  publicProfileToggle: ['Rendi pubblico il mio profilo e i post', 'Κάνε δημόσιο το προφίλ και τις αναρτήσεις μου', 'Tornar público o meu perfil e publicações'],
  publicProfilePrivacyNote: ['Attivalo solo se vuoi che chiunque possa vedere il tuo profilo e i post.', 'Ενεργοποίησέ το μόνο αν θέλεις να βλέπουν όλοι το προφίλ και τις αναρτήσεις σου.', 'Ativa apenas se quiseres que qualquer pessoa veja o teu perfil e publicações.'],
  messageNotificationsToggle: ['Avvisami dei nuovi messaggi', 'Ειδοποίησέ με για νέα μηνύματα', 'Notificar-me de novas mensagens'],
  notificationForegroundNote: ['Le notifiche funzionano mentre l’app è aperta; serve il permesso del browser.', 'Οι ειδοποιήσεις λειτουργούν όσο η εφαρμογή είναι ανοιχτή· απαιτείται άδεια προγράμματος περιήγησης.', 'As notificações funcionam enquanto a app está aberta; é necessária permissão do navegador.'],
  themeGalaxy: ['Galassia', 'Γαλαξίας', 'Galáxia'], themeGalaxyDesc: ['Cielo cosmico stellato con bagliori animati', 'Έναστρος κοσμικός ουρανός με κινούμενη λάμψη', 'Céu cósmico estrelado com brilho animado'],
  themeSageMinimal: ['Salvia Minimal', 'Φασκόμηλο Minimal', 'Sálvia Minimal'], themeSageMinimalDesc: ['Verde salvia delicato e pulito', 'Απαλό και καθαρό πράσινο του φασκόμηλου', 'Verde-sálvia suave e simples'],
  themeSolarEclipse: ['Eclissi solare', 'Ηλιακή έκλειψη', 'Eclipse solar'], themeSolarEclipseDesc: ['Oro caldo e ombre d’eclissi', 'Ζεστό χρυσό και σκιές έκλειψης', 'Dourado quente e sombras de eclipse'],
  themeCottonCandy: ['Zucchero filato', 'Μαλλί της γριάς', 'Algodão-doce'], themeCottonCandyDesc: ['Rosa pastello e azzurro', 'Παστέλ ροζ και γαλάζιο', 'Rosa pastel e azul-celeste'],
  themeRetroArcade: ['Sala giochi retrò', 'Ρετρό arcade', 'Arcade retro'], themeRetroArcadeDesc: ['Neon pixel e vibrazioni arcade', 'Neon pixel και arcade αισθητική', 'Neon pixel e ambiente arcade'],
  themeOceanGlass: ['Vetro oceanico', 'Ωκεάνιο γυαλί', 'Vidro oceânico'], themeOceanGlassDesc: ['Turchese profondo e riflessi di vetro', 'Βαθύ τιρκουάζ και γυάλινες αντανακλάσεις', 'Turquesa profundo e reflexos de vidro'],
  themeRoseQuartz: ['Quarzo rosa', 'Ροζ χαλαζίας', 'Quartzo rosa'], themeRoseQuartzDesc: ['Rosa minerale e luce morbida', 'Ροζ ορυκτό και απαλό φως', 'Rosa mineral e luz suave'],
  themeEmeraldCity: ['Città di smeraldo', 'Σμαραγδένια πόλη', 'Cidade Esmeralda'], themeEmeraldCityDesc: ['Verde gioiello e oro', 'Πράσινο σμαραγδιού και χρυσό', 'Verde-esmeralda e dourado'],
  themeCloudNine: ['Settimo cielo', 'Στον έβδομο ουρανό', 'Nuvem Nove'], themeCloudNineDesc: ['Blu arioso e nuvole soffici', 'Αέρινο μπλε και απαλές νεφέλες', 'Azul leve e nuvens suaves'],
  themePrism: ['Prisma', 'Πρίσμα', 'Prisma'], themePrismDesc: ['Colori cangianti e riflessi luminosi', 'Ιριδίζοντα χρώματα και φωτεινές αντανακλάσεις', 'Cores iridescentes e reflexos luminosos'],
  titleStardustKeeper: ['Custode di stelle', 'Φύλακας αστερόσκονης', 'Guardião das estrelas'],
  titleSageOracle: ['Oracolo di salvia', 'Μάντης του φασκόμηλου', 'Oráculo de sálvia'],
  titlePrismHeart: ['Cuore di prisma', 'Πρισματική καρδιά', 'Coração de prisma']
};
const featureLangCodes = ['it', 'el', 'pt'];
for (const [key, values] of Object.entries(newFeatureCopy)) {
  featureLangCodes.forEach((lang, index) => {
    translations[lang] ||= { ...translations.en };
    translations[lang][key] = values[index];
  });
}
const featureRuntimeCopy = {
  en: { ...Object.fromEntries(Object.entries(newFeatureCopy).map(([key, values]) => [key, values[0]])), feedEmpty: 'No public posts yet.', postPublished: 'Post published.', goalInviteSent: 'Invitation sent.', acceptGoal: 'Accept', declineGoal: 'Decline', goalCheckin: 'check in', goalWith: 'with', noSharedGoals: 'No shared goals yet.', profileUnavailable: 'This profile is private.', messageEdited: 'Edited', messageDeleted: 'Message deleted', editMessage: 'Edit', deleteMessage: 'Delete', editMessagePrompt: 'Edit this message:', deleteMessageConfirm: 'Delete this message for everyone?', newMessagesTitle: 'New Consistly message', newMessageBody: 'You received a new message.', newMessagesBody: 'You received {count} new messages.' },
  de: { socialPageTitle: '🌐 Social', socialPageIntro: 'Freunde, gemeinsame Ziele und Community-Beiträge.', socialNav: 'Social', friendsTitle: 'Freunde', openChat: 'Chats öffnen', communityFeed: '📰 Community-Feed', socialPostPlaceholder: 'Teile etwas mit der Community ...', publishPost: 'Veröffentlichen', feedLoading: 'Beiträge werden geladen ...', sharedGoalsTitle: '🎯 Gemeinsame Ziele', sharedGoalTitlePlaceholder: 'Name des Ziels', sharedGoalDescriptionPlaceholder: 'Woran arbeitet ihr zusammen?', goalFriendLabel: 'Freund', chooseFriend: 'Freund auswählen', goalTargetLabel: 'Gemeinsames Ziel (Check-ins)', goalDeadlineLabel: 'Zieldatum', createSharedGoal: 'Gemeinsames Ziel erstellen', publicProfileToggle: 'Mein Profil und Beiträge öffentlich machen', publicProfilePrivacyNote: 'Aktiviere dies nur, wenn alle dein Profil und deine Beiträge sehen dürfen.', messageNotificationsToggle: 'Bei neuen Nachrichten benachrichtigen', notificationForegroundNote: 'Benachrichtigungen funktionieren, solange die App geöffnet ist; Browser-Erlaubnis nötig.', themeGalaxy: 'Galaxy', themeGalaxyDesc: 'Sternenreicher Kosmos mit animiertem Leuchten', themeSageMinimal: 'Sage Minimal', themeSageMinimalDesc: 'Sanftes, klares Salbeigrün', themeSolarEclipse: 'Solar Eclipse', themeSolarEclipseDesc: 'Warmes Gold und Finsternis-Schatten', themeCottonCandy: 'Cotton Candy', themeCottonCandyDesc: 'Pastellrosa und Himmelblau', themeRetroArcade: 'Retro Arcade', themeRetroArcadeDesc: 'Pixelneon mit Arcade-Vibes', themeOceanGlass: 'Ocean Glass', themeOceanGlassDesc: 'Tiefes Türkis und Glasreflexe', themeRoseQuartz: 'Rose Quartz', themeRoseQuartzDesc: 'Mineralisches Rosa und sanftes Licht', themeEmeraldCity: 'Emerald City', themeEmeraldCityDesc: 'Juwelgrün und Gold', themeCloudNine: 'Cloud Nine', themeCloudNineDesc: 'Luftiges Blau und weiche Wolken', themePrism: 'Prism', themePrismDesc: 'Schillernde Farben und Lichtreflexe', titleStardustKeeper: 'Sternenstaub-Hüter', titleSageOracle: 'Salbei-Orakel', titlePrismHeart: 'Prismaherz', feedEmpty: 'Noch keine öffentlichen Beiträge.', postPublished: 'Beitrag veröffentlicht.', goalInviteSent: 'Einladung gesendet.', acceptGoal: 'Annehmen', declineGoal: 'Ablehnen', goalCheckin: 'eintragen', goalWith: 'mit', noSharedGoals: 'Noch keine gemeinsamen Ziele.', profileUnavailable: 'Dieses Profil ist privat.', messageEdited: 'Bearbeitet', messageDeleted: 'Nachricht gelöscht', editMessage: 'Bearbeiten', deleteMessage: 'Löschen', editMessagePrompt: 'Nachricht bearbeiten:', deleteMessageConfirm: 'Nachricht für alle löschen?', newMessagesTitle: 'Neue Consistly-Nachricht', newMessageBody: 'Du hast eine neue Nachricht erhalten.', newMessagesBody: 'Du hast {count} neue Nachrichten erhalten.' },
  es: { socialPageTitle: '🌐 Social', socialPageIntro: 'Amigos, objetivos compartidos y publicaciones de la comunidad.', socialNav: 'Social', friendsTitle: 'Amigos', openChat: 'Abrir chats', communityFeed: '📰 Feed de la comunidad', socialPostPlaceholder: 'Comparte algo con la comunidad...', publishPost: 'Publicar', feedLoading: 'Cargando publicaciones...', sharedGoalsTitle: '🎯 Objetivos compartidos', sharedGoalTitlePlaceholder: 'Nombre del objetivo', sharedGoalDescriptionPlaceholder: '¿En qué trabajarán juntos?', goalFriendLabel: 'Amigo', chooseFriend: 'Elige un amigo', goalTargetLabel: 'Meta compartida (registros)', goalDeadlineLabel: 'Fecha objetivo', createSharedGoal: 'Crear objetivo compartido', publicProfileToggle: 'Hacer público mi perfil y publicaciones', publicProfilePrivacyNote: 'Actívalo solo si quieres que cualquiera vea tu perfil y publicaciones.', messageNotificationsToggle: 'Avisarme de mensajes nuevos', notificationForegroundNote: 'Las notificaciones funcionan con la app abierta; se requiere permiso del navegador.', themeGalaxy: 'Galaxy', themeGalaxyDesc: 'Cosmos estrellado con brillo animado', themeSageMinimal: 'Sage Minimal', themeSageMinimalDesc: 'Verde salvia suave y limpio', themeSolarEclipse: 'Solar Eclipse', themeSolarEclipseDesc: 'Oro cálido y sombras de eclipse', themeCottonCandy: 'Cotton Candy', themeCottonCandyDesc: 'Rosa pastel y azul cielo', themeRetroArcade: 'Retro Arcade', themeRetroArcadeDesc: 'Neón pixel con estilo arcade', themeOceanGlass: 'Ocean Glass', themeOceanGlassDesc: 'Turquesa profundo y reflejos de cristal', themeRoseQuartz: 'Rose Quartz', themeRoseQuartzDesc: 'Rosa mineral y luz suave', themeEmeraldCity: 'Emerald City', themeEmeraldCityDesc: 'Verde joya y dorado', themeCloudNine: 'Cloud Nine', themeCloudNineDesc: 'Azul ligero y nubes suaves', themePrism: 'Prism', themePrismDesc: 'Colores iridiscentes y reflejos', titleStardustKeeper: 'Guardián de estrellas', titleSageOracle: 'Oráculo de salvia', titlePrismHeart: 'Corazón prisma', feedEmpty: 'Aún no hay publicaciones públicas.', postPublished: 'Publicación realizada.', goalInviteSent: 'Invitación enviada.', acceptGoal: 'Aceptar', declineGoal: 'Rechazar', goalCheckin: 'registrar', goalWith: 'con', noSharedGoals: 'Aún no hay objetivos compartidos.', profileUnavailable: 'Este perfil es privado.', messageEdited: 'Editado', messageDeleted: 'Mensaje eliminado', editMessage: 'Editar', deleteMessage: 'Eliminar', editMessagePrompt: 'Editar este mensaje:', deleteMessageConfirm: '¿Eliminar el mensaje para todos?', newMessagesTitle: 'Nuevo mensaje de Consistly', newMessageBody: 'Has recibido un mensaje nuevo.', newMessagesBody: 'Has recibido {count} mensajes nuevos.' }
};
for (const [lang, copy] of Object.entries(featureRuntimeCopy)) {
  translations[lang] ||= { ...translations.en };
  extraTranslations[lang] ||= { ...extraTranslations.en };
  Object.assign(translations[lang], copy);
  extraTranslations[lang] = { ...extraTranslations[lang], ...copy };
}
const englishSocialCopy = {
  socialNav: 'Social', socialHomeButton: '💬 Social – Chat with friends', socialPageTitle: '🌐 Social',
  socialPageIntro: 'Friends, shared goals and community posts.', friendsTitle: 'Friends', openChat: 'Open chats',
  communityFeed: '📰 Community feed', socialPostPlaceholder: 'Share something with the community...',
  publishPost: 'Publish', feedLoading: 'Loading posts...', sharedGoalsTitle: '🎯 Shared goals',
  sharedGoalTitlePlaceholder: 'Goal name', sharedGoalDescriptionPlaceholder: 'What will you work on together?',
  goalFriendLabel: 'Friend', chooseFriend: 'Choose a friend', goalTargetLabel: 'Shared goal (check-ins)',
  goalDeadlineLabel: 'Target date', createSharedGoal: 'Create shared goal',
  publicProfileToggle: 'Make my profile and posts public',
  publicProfilePrivacyNote: 'Only enable this if you want anyone to see your profile and posts.',
  messageNotificationsToggle: 'Notify me about new messages',
  notificationForegroundNote: 'Notifications work while the app is open; browser permission is required.',
  feedEmpty: 'No public posts yet.', postPublished: 'Post published.', goalInviteSent: 'Invitation sent.',
  acceptGoal: 'Accept', declineGoal: 'Decline', goalCheckin: 'check in', goalWith: 'with', noSharedGoals: 'No shared goals yet.',
  profileUnavailable: 'This profile is private.', messageEdited: 'Edited', messageDeleted: 'Message deleted',
  editMessage: 'Edit', deleteMessage: 'Delete', editMessagePrompt: 'Edit this message:',
  deleteMessageConfirm: 'Delete this message for everyone?', newMessagesTitle: 'New Consistly message',
  newMessageBody: 'You received a new message.', newMessagesBody: 'You received {count} new messages.'
};
Object.assign(translations.en, englishSocialCopy);
Object.assign(extraTranslations.en, englishSocialCopy);
const translatedRuntimeActions = {
  it: { feedEmpty: 'Nessun post pubblico.', postPublished: 'Post pubblicato.', goalInviteSent: 'Invito inviato.', acceptGoal: 'Accetta', declineGoal: 'Rifiuta', goalCheckin: 'check-in', goalWith: 'con', noSharedGoals: 'Nessun obiettivo condiviso.', profileUnavailable: 'Questo profilo è privato.', messageEdited: 'Modificato', messageDeleted: 'Messaggio eliminato', editMessage: 'Modifica', deleteMessage: 'Elimina', editMessagePrompt: 'Modifica questo messaggio:', deleteMessageConfirm: 'Eliminare il messaggio per tutti?', newMessagesTitle: 'Nuovo messaggio Consistly', newMessageBody: 'Hai ricevuto un nuovo messaggio.', newMessagesBody: 'Hai ricevuto {count} nuovi messaggi.' },
  el: { feedEmpty: 'Δεν υπάρχουν δημόσιες αναρτήσεις.', postPublished: 'Η ανάρτηση δημοσιεύτηκε.', goalInviteSent: 'Η πρόσκληση στάλθηκε.', acceptGoal: 'Αποδοχή', declineGoal: 'Απόρριψη', goalCheckin: 'καταχώριση', goalWith: 'με', noSharedGoals: 'Δεν υπάρχουν κοινοί στόχοι.', profileUnavailable: 'Αυτό το προφίλ είναι ιδιωτικό.', messageEdited: 'Έγινε επεξεργασία', messageDeleted: 'Το μήνυμα διαγράφηκε', editMessage: 'Επεξεργασία', deleteMessage: 'Διαγραφή', editMessagePrompt: 'Επεξεργασία μηνύματος:', deleteMessageConfirm: 'Να διαγραφεί το μήνυμα για όλους;', newMessagesTitle: 'Νέο μήνυμα Consistly', newMessageBody: 'Έλαβες νέο μήνυμα.', newMessagesBody: 'Έλαβες {count} νέα μηνύματα.' },
  pt: { feedEmpty: 'Ainda não há publicações públicas.', postPublished: 'Publicação enviada.', goalInviteSent: 'Convite enviado.', acceptGoal: 'Aceitar', declineGoal: 'Recusar', goalCheckin: 'registar', goalWith: 'com', noSharedGoals: 'Ainda não há objetivos partilhados.', profileUnavailable: 'Este perfil é privado.', messageEdited: 'Editada', messageDeleted: 'Mensagem eliminada', editMessage: 'Editar', deleteMessage: 'Eliminar', editMessagePrompt: 'Editar esta mensagem:', deleteMessageConfirm: 'Eliminar a mensagem para todos?', newMessagesTitle: 'Nova mensagem Consistly', newMessageBody: 'Recebeste uma nova mensagem.', newMessagesBody: 'Recebeste {count} novas mensagens.' }
};
for (const [lang, copy] of Object.entries(translatedRuntimeActions)) {
  translations[lang] ||= { ...translations.en };
  extraTranslations[lang] ||= { ...extraTranslations.en };
  Object.assign(translations[lang], copy);
  Object.assign(extraTranslations[lang], copy);
}
for (const lang of featureLangCodes) extraTranslations[lang] = { ...extraTranslations.en, ...extraTranslations[lang], ...translations[lang] };

// Fill the older app-wide labels too; the three locales used to inherit English
// for most existing home, stats, settings, theme and shop strings.
const coreLocaleCopy = {
  social: ['💬 Social', '💬 Κοινωνικά', '💬 Social'], privateChats: ['Le tue chat private con gli amici', 'Οι ιδιωτικές συνομιλίες σου με φίλους', 'As tuas conversas privadas com amigos'], writeMessage: ['Scrivi un messaggio…', 'Γράψε ένα μήνυμα…', 'Escreve uma mensagem…'], send: ['Invia', 'Αποστολή', 'Enviar'], chatWith: ['Chatta con', 'Συνομιλία με', 'Conversar com'], loading: ['Caricamento…', 'Φόρτωση…', 'A carregar…'],
  socialChooseFriend: ['Scegli un amico per iniziare a chattare.', 'Επίλεξε έναν φίλο για να ξεκινήσεις συνομιλία.', 'Escolhe um amigo para começares a conversar.'], socialLoadingFriends: ['Caricamento amici…', 'Φόρτωση φίλων…', 'A carregar amigos…'], friendsLoadError: ['Impossibile caricare gli amici.', 'Δεν ήταν δυνατή η φόρτωση φίλων.', 'Não foi possível carregar os amigos.'], socialNoFriends: ['Non hai ancora amici confermati. Aggiungi prima un amico.', 'Δεν έχεις ακόμη επιβεβαιωμένους φίλους. Πρόσθεσε πρώτα έναν φίλο.', 'Ainda não tens amigos confirmados. Adiciona primeiro um amigo.'], socialLoadingMessages: ['Caricamento messaggi…', 'Φόρτωση μηνυμάτων…', 'A carregar mensagens…'], socialLoadError: ['Impossibile caricare la chat. Verifica che la migrazione Supabase sia stata eseguita.', 'Δεν ήταν δυνατή η φόρτωση της συνομιλίας. Έλεγξε αν εκτελέστηκε η migration του Supabase.', 'Não foi possível carregar a conversa. Confirma se a migração do Supabase foi executada.'], socialNoMessages: ['Ancora nessun messaggio. Saluta 👋', 'Δεν υπάρχουν μηνύματα ακόμη. Πες ένα γεια 👋', 'Ainda não há mensagens. Diz olá 👋'], messageSent: ['✓ Inviato', '✓ Στάλθηκε', '✓ Enviada'], messageRead: ['✓✓ Letto', '✓✓ Διαβάστηκε', '✓✓ Lida'], readReceiptError: ['Impossibile aggiornare le conferme di lettura: {error}', 'Δεν ήταν δυνατή η ενημέρωση αποδείξεων ανάγνωσης: {error}', 'Não foi possível atualizar as confirmações de leitura: {error}'], readReceiptsNeedMigration: ['Esegui la migrazione SQL delle conferme di lettura per attivare questa funzione.', 'Εκτέλεσε τη migration SQL για τις αποδείξεις ανάγνωσης ώστε να ενεργοποιηθεί αυτή η λειτουργία.', 'Executa a migração SQL das confirmações de leitura para ativar esta função.'], reportMessageButton: ['⚑ Segnala messaggio', '⚑ Αναφορά μηνύματος', '⚑ Denunciar mensagem'], messageSending: ['Invio del messaggio non riuscito:', 'Η αποστολή μηνύματος απέτυχε:', 'Falha ao enviar a mensagem:'], reportFailure: ['Segnalazione non riuscita: {error}', 'Η αναφορά απέτυχε: {error}', 'Falha ao enviar denúncia: {error}'],
  searchUsernamePlaceholder: ['Cerca nome utente…', 'Αναζήτηση ονόματος χρήστη…', 'Pesquisar nome de utilizador…'], friendSearchHint: ['Cerca un nome utente…', 'Αναζήτησε όνομα χρήστη…', 'Pesquisa um nome de utilizador…'], searchAtLeastTwo: ['Inserisci almeno 2 caratteri.', 'Πληκτρολόγησε τουλάχιστον 2 χαρακτήρες.', 'Introduz pelo menos 2 caracteres.'], userSearchFailed: ['Ricerca non riuscita.', 'Η αναζήτηση απέτυχε.', 'A pesquisa falhou.'], noUsersFound: ['Nessun utente trovato.', 'Δεν βρέθηκαν χρήστες.', 'Não foram encontrados utilizadores.'], noBio: ['Nessuna biografia', 'Δεν υπάρχει βιογραφία', 'Sem biografia'], addFriend: ['➕ Aggiungi', '➕ Προσθήκη', '➕ Adicionar'], friendRequestFailed: ['Impossibile inviare la richiesta di amicizia: {error}', 'Δεν ήταν δυνατή η αποστολή αιτήματος φιλίας: {error}', 'Não foi possível enviar o pedido de amizade: {error}'], friendRequestSent: ['Richiesta di amicizia inviata!', 'Το αίτημα φιλίας στάλθηκε!', 'Pedido de amizade enviado!'], friendOverviewError: ['Impossibile caricare la panoramica degli amici.', 'Δεν ήταν δυνατή η φόρτωση της επισκόπησης φίλων.', 'Não foi possível carregar a lista de amigos.'],
  profilePicture: ['Foto profilo', 'Φωτογραφία προφίλ', 'Foto de perfil'], userLabel: ['Utente', 'Χρήστης', 'Utilizador'], blockedUsersLoadError: ['Impossibile caricare gli utenti bloccati.', 'Δεν ήταν δυνατή η φόρτωση αποκλεισμένων χρηστών.', 'Não foi possível carregar os utilizadores bloqueados.'], friendEndConfirm: ['Vuoi davvero terminare questa amicizia?', 'Θέλεις σίγουρα να τερματίσεις αυτή τη φιλία;', 'Queres mesmo terminar esta amizade?'], friendRemoveFailed: ['Impossibile rimuovere l’amico.', 'Δεν ήταν δυνατή η αφαίρεση του φίλου.', 'Não foi possível remover o amigo.'], friendRemoved: ['Amicizia terminata.', 'Η φιλία τερματίστηκε.', 'Amizade terminada.'], blockConfirm: ['Bloccare questo utente? L’amicizia verrà terminata.', 'Να αποκλειστεί αυτός ο χρήστης; Η φιλία θα τερματιστεί.', 'Bloquear este utilizador? A amizade será terminada.'], friendBlockFailed: ['Impossibile bloccare questo utente.', 'Δεν ήταν δυνατός ο αποκλεισμός αυτού του χρήστη.', 'Não foi possível bloquear este utilizador.'], friendBlocked: ['Utente bloccato.', 'Ο χρήστης αποκλείστηκε.', 'Utilizador bloqueado.'], unblockConfirm: ['Vuoi davvero sbloccare questo utente?', 'Θέλεις σίγουρα να άρεις τον αποκλεισμό αυτού του χρήστη;', 'Queres mesmo desbloquear este utilizador?'], userUnblockFailed: ['Impossibile sbloccare questo utente.', 'Δεν ήταν δυνατή η άρση αποκλεισμού αυτού του χρήστη.', 'Não foi possível desbloquear este utilizador.'], userUnblocked: ['Utente sbloccato.', 'Ο χρήστης ξεμπλοκαρίστηκε.', 'Utilizador desbloqueado.'],
  goalPending: ['In attesa', 'Σε αναμονή', 'Pendente'], goalActive: ['Attivo', 'Ενεργός', 'Ativo'], goalCompleted: ['Completato', 'Ολοκληρώθηκε', 'Concluído'], goalDeclined: ['Rifiutato', 'Απορρίφθηκε', 'Recusado'],
  friendAccepted: ['🎉 Richiesta di amicizia accettata!', '🎉 Το αίτημα φιλίας έγινε δεκτό!', '🎉 Pedido de amizade aceite!'], friendRejectedAlert: ['Richiesta di amicizia rifiutata.', 'Το αίτημα φιλίας απορρίφθηκε.', 'Pedido de amizade recusado.'], operationFailed: ['Operazione non riuscita: {error}', 'Η ενέργεια απέτυχε: {error}', 'A operação falhou: {error}'],
  progressAllTime: ['Attività completate in totale', 'Συνολικές ολοκληρωμένες εργασίες', 'Tarefas concluídas no total'], progressWeekRate: ['Questa settimana: {done}/{planned} attività · {pct}%', 'Αυτή την εβδομάδα: {done}/{planned} εργασίες · {pct}%', 'Esta semana: {done}/{planned} tarefas · {pct}%'], progressWeekGoal: ['Obiettivo settimanale: {goal}%', 'Εβδομαδιαίος στόχος: {goal}%', 'Meta semanal: {goal}%'], progressNoGoal: ['Nessun obiettivo settimanale impostato', 'Δεν έχει οριστεί εβδομαδιαίος στόχος', 'Sem meta semanal definida'], progressDefeatedBosses: ['Boss sconfitti: {count}', 'Αφεντικά που νικήθηκαν: {count}', 'Bosses derrotados: {count}'], progressNoTasks: ['Nessuna attività prevista per questo giorno.', 'Δεν έχουν προγραμματιστεί εργασίες για αυτή την ημέρα.', 'Não há tarefas planeadas para este dia.'], progressCompleted: ['Completata', 'Ολοκληρώθηκε', 'Concluída'], progressNotCompleted: ['Non completata', 'Δεν ολοκληρώθηκε', 'Não concluída'], progressHistory: ['Ultime 8 settimane', 'Τελευταίες 8 εβδομάδες', 'Últimas 8 semanas'], friendProgressPrivate: ['Questo amico non ha attivato la condivisione dei progressi.', 'Αυτός ο φίλος δεν έχει ενεργοποιήσει την κοινή χρήση προόδου.', 'Este amigo não ativou a partilha de progresso.'], friendProgressUnavailable: ['Impossibile caricare i progressi: {error}', 'Δεν ήταν δυνατή η φόρτωση προόδου: {error}', 'Não foi possível carregar o progresso: {error}'],
  noIncoming: ['Nessuna richiesta in arrivo.', 'Δεν υπάρχουν εισερχόμενα αιτήματα.', 'Não há pedidos recebidos.'], noOutgoing: ['Nessuna richiesta inviata.', 'Δεν υπάρχουν απεσταλμένα αιτήματα.', 'Não há pedidos enviados.'], yourFriends: ['🤝 I tuoi amici', '🤝 Οι φίλοι σου', '🤝 Os teus amigos'], blockedTitle: ['🚫 Utenti bloccati', '🚫 Αποκλεισμένοι χρήστες', '🚫 Utilizadores bloqueados'], noBlocked: ['Non hai bloccato nessuno.', 'Δεν έχεις αποκλείσει κανέναν.', 'Não bloqueaste ninguém.'], noFriendsYet: ['Non hai ancora amici.', 'Δεν έχεις φίλους ακόμη.', 'Ainda não tens amigos.'], incomingTitle: ['📩 Richieste in arrivo', '📩 Εισερχόμενα αιτήματα', '📩 Pedidos recebidos'], outgoingTitle: ['📤 Richieste inviate', '📤 Απεσταλμένα αιτήματα', '📤 Pedidos enviados'], friendAccept: ['✅ Accetta', '✅ Αποδοχή', '✅ Aceitar'], friendReject: ['❌ Rifiuta', '❌ Απόρριψη', '❌ Recusar'], friendRejected: ['Rifiutata', 'Απορρίφθηκε', 'Recusado'], friendPending: ['⏳ In attesa', '⏳ Σε αναμονή', '⏳ Pendente'], friendRemove: ['Rimuovi', 'Αφαίρεση', 'Remover'], friendBlock: ['🚫 Blocca', '🚫 Αποκλεισμός', '🚫 Bloquear'], friendUnblock: ['Sblocca', 'Άρση αποκλεισμού', 'Desbloquear'], onlineState: ['🟢 Online', '🟢 Σε σύνδεση', '🟢 Online'], offlineState: ['⚫ Offline', '⚫ Εκτός σύνδεσης', '⚫ Offline'], loginRequired: ['Accedi prima.', 'Συνδέσου πρώτα.', 'Inicia sessão primeiro.'], loginToContinue: ['Accedi per continuare.', 'Συνδέσου για να συνεχίσεις.', 'Inicia sessão para continuares.'],
  pointsPriceLine: ['🪙 Prezzo: {price} punti', '🪙 Τιμή: {price} πόντοι', '🪙 Preço: {price} pontos'], pointBalanceLabel: ['I tuoi punti disponibili:', 'Οι διαθέσιμοι πόντοι σου:', 'Os teus pontos disponíveis:'], shopPrice: ['🪙 Prezzo:', '🪙 Τιμή:', '🪙 Preço:'], emptyPurchases: ['Non hai ancora acquistato nulla.', 'Δεν έχεις κάνει ακόμα αγορές.', 'Ainda não fizeste compras.'], purchased: ['Acquistato · pronto da usare', 'Αγοράστηκε · έτοιμο για χρήση', 'Comprado · pronto a equipar'], justEquipped: ['Attualmente in uso', 'Σε χρήση τώρα', 'Em utilização'], noPurchases: ['Non hai ancora acquistato nulla.', 'Δεν έχεις κάνει ακόμα αγορές.', 'Ainda não fizeste compras.'], purchasedReady: ['Acquistato · pronto da usare', 'Αγοράστηκε · έτοιμο για χρήση', 'Comprado · pronto a equipar'], buyItem: ['🛒 Acquista', '🛒 Αγορά', '🛒 Comprar'], listen: ['▶️ Ascolta', '▶️ Ακρόαση', '▶️ Ouvir'], equipSound: ['🔊 Usa suono', '🔊 Εξοπλισμός ήχου', '🔊 Equipar som'],
  shopPremiumSound: ['Suono premium di completamento', 'Premium ήχος ολοκλήρωσης', 'Som premium de conclusão'], shopPremiumDesc: ['Un suono speciale a tre toni quando completi un’attività.', 'Ένας ξεχωριστός ήχος τριών τόνων όταν ολοκληρώνεις μια εργασία.', 'Um som especial de três tons ao concluíres uma tarefa.'], shopSoftPop: ['Plop delicato', 'Απαλό ποπ', 'Pop suave'], shopSoftPopDesc: ['Un plop morbido e breve con una nota luminosa.', 'Ένας απαλός, σύντομος ήχος με φωτεινή κατάληξη.', 'Um pop suave e curto com um final brilhante.'], shopCrystal: ['Rintocco di cristallo', 'Κρυστάλλινος ήχος', 'Toque de cristal'], shopCrystalDesc: ['Due note limpide e scintillanti come piccola ricompensa.', 'Δύο καθαρές, λαμπερές νότες ως μικρή ανταμοιβή.', 'Duas notas claras e cintilantes como pequena recompensa.'], shopBubble: ['Bolle', 'Φυσαλίδες', 'Bolhas'], shopBubbleDesc: ['Due suoni frizzanti che fluttuano verso l’alto.', 'Δύο παιχνιδιάρικοι ήχοι που ανεβαίνουν απαλά.', 'Dois sons borbulhantes que sobem no ar.'],
  shopSoftBell: ['Campana delicata', 'Απαλή καμπάνα', 'Sino suave'], shopSoftBellDesc: ['Note di campana luminose e delicate.', 'Απαλές, φωτεινές νότες καμπάνας.', 'Notas de sino suaves e brilhantes.'], shopWoodblock: ['Legno caldo', 'Ξύλινος ήχος', 'Bloco de madeira'], shopWoodblockDesc: ['Colpetti di legno caldi e brevi.', 'Ζεστοί, σύντομοι ξύλινοι χτύποι.', 'Batidas de madeira quentes e curtas.'], shopArcade: ['Arcade', 'Arcade', 'Arcade'], shopArcadeDesc: ['Un suono rétro giocoso per le attività completate.', 'Ένας παιχνιδιάρικος ρετρό ήχος για ολοκληρωμένες εργασίες.', 'Um som retro divertido para tarefas concluídas.'], shopRaindrop: ['Gocce di pioggia', 'Σταγόνες βροχής', 'Gotas de chuva'], shopRaindropDesc: ['Toni delicati e discendenti come piccole gocce.', 'Απαλοί ήχοι που πέφτουν σαν μικρές σταγόνες.', 'Tons suaves e descendentes como pequenas gotas.'],
  journalTitle: ['📓 Diario giornaliero', '📓 Ημερήσιο ημερολόγιο', '📓 Diário diário'], journalIntro: ['Un breve riepilogo della giornata. Il tuo diario è privato.', 'Μια σύντομη ανασκόπηση της ημέρας. Το ημερολόγιό σου είναι ιδιωτικό.', 'Uma pequena reflexão diária. O teu diário é privado.'], journalGood: ['Cosa è andato bene oggi?', 'Τι πήγε καλά σήμερα;', 'O que correu bem hoje?'], journalTomorrow: ['Cosa può andare meglio domani?', 'Τι μπορεί να πάει καλύτερα αύριο;', 'O que pode correr melhor amanhã?'], journalGrateful: ['Cose per cui sono grato/a:', 'Πράγματα για τα οποία νιώθω ευγνωμοσύνη:', 'Coisas pelas quais estou agradecido/a:'], journalGoodPlaceholder: ['Scrivi qualcosa che è andato bene…', 'Γράψε κάτι που πήγε καλά…', 'Escreve algo que correu bem…'], journalTomorrowPlaceholder: ['Una cosa che vuoi migliorare…', 'Κάτι που θέλεις να βελτιώσεις…', 'Algo que queres melhorar…'], journalGratefulPlaceholder: ['Persone, momenti o piccole cose…', 'Άνθρωποι, στιγμές ή μικρά πράγματα…', 'Pessoas, momentos ou pequenas coisas…'], journalSave: ['Salva il diario di oggi', 'Αποθήκευση του σημερινού ημερολογίου', 'Guardar o diário de hoje'], journalSaved: ['Diario di oggi salvato.', 'Το σημερινό ημερολόγιο αποθηκεύτηκε.', 'Diário de hoje guardado.'],
  itemAlreadyOwned: ['Possiedi già questo articolo!', 'Έχεις ήδη αυτό το αντικείμενο!', 'Já tens este artigo!'], notEnoughPoints: ['Ti servono {price} punti per acquistare questo articolo.', 'Χρειάζεσαι {price} πόντους για να αγοράσεις αυτό το αντικείμενο.', 'Precisas de {price} pontos para comprar este artigo.'], itemPurchased: ['🎉 {item} acquistato!', '🎉 Το {item} αγοράστηκε!', '🎉 {item} comprado!'], premiumBuyRequired: ['Acquista prima il suono Premium nel negozio punti!', 'Αγόρασε πρώτα τον Premium ήχο από το κατάστημα πόντων!', 'Compra primeiro o som Premium na loja de pontos!'], premiumActivated: ['🔊 Suono Premium attivato!', '🔊 Ενεργοποιήθηκε ο Premium ήχος!', '🔊 Som Premium ativado!'], normalSoundActivated: ['🔔 Suono normale attivato!', '🔔 Ενεργοποιήθηκε ο κανονικός ήχος!', '🔔 Som normal ativado!'], titleEquipFailed: ['Impossibile equipaggiare il titolo: {error}', 'Δεν ήταν δυνατός ο εξοπλισμός του τίτλου: {error}', 'Não foi possível equipar o título: {error}'],
  loginToContinue: ['Accedi per continuare.', 'Συνδέσου για να συνεχίσεις.', 'Inicia sessão para continuares.'],
  profileTitle: ['👤 Il mio profilo', '👤 Το προφίλ μου', '👤 O meu perfil'], changePicture: ['📷 Cambia foto profilo', '📷 Αλλαγή φωτογραφίας προφίλ', '📷 Alterar foto de perfil'], aboutMe: ['✍️ Su di me', '✍️ Σχετικά με εμένα', '✍️ Sobre mim'], bioPlaceholder: ['Scrivi qualcosa su di te…', 'Γράψε κάτι για τον εαυτό σου…', 'Escreve algo sobre ti…'], max160: ['Massimo 160 caratteri', 'Έως 160 χαρακτήρες', 'Máximo de 160 caracteres'], saveBio: ['Salva descrizione', 'Αποθήκευση περιγραφής', 'Guardar descrição'], chooseAvatar: ['🎨 Scegli avatar', '🎨 Επιλογή avatar', '🎨 Escolher avatar'], achievements: ['🏆 Traguardi', '🏆 Επιτεύγματα', '🏆 Conquistas'], achievementBlurb: ['I tuoi traguardi e progressi su Consistly.', 'Τα επιτεύγματα και τα ορόσημά σου στο Consistly.', 'As tuas conquistas e marcos no Consistly.'],
  accountTitle: ['👤 Account Consistly', '👤 Λογαριασμός Consistly', '👤 Conta Consistly'], loginRegister: ['Accedi / Registrati', 'Σύνδεση / Εγγραφή', 'Iniciar sessão / Registar'], forgotPassword: ['Password dimenticata?', 'Ξέχασες τον κωδικό;', 'Esqueceste-te da palavra-passe?'], logout: ['Esci', 'Αποσύνδεση', 'Terminar sessão'], deleteAccount: ['Elimina definitivamente l’account', 'Οριστική διαγραφή λογαριασμού', 'Eliminar conta permanentemente'],
  close: ['Chiudi', 'Κλείσιμο', 'Fechar'], signInButton: ['Accedi', 'Σύνδεση', 'Iniciar sessão'], signUpButton: ['Registrati', 'Εγγραφή', 'Registar'], usernamePlaceholder: ['Nome utente', 'Όνομα χρήστη', 'Nome de utilizador'], emailPlaceholder: ['Email', 'Email', 'Email'], passwordPlaceholder: ['Password', 'Κωδικός πρόσβασης', 'Palavra-passe'], newPasswordPlaceholder: ['Nuova password', 'Νέος κωδικός πρόσβασης', 'Nova palavra-passe'], repeatPasswordPlaceholder: ['Ripeti password', 'Επανάλαβε τον κωδικό', 'Repetir palavra-passe'], newPasswordTitle: ['🔐 Nuova password', '🔐 Νέος κωδικός πρόσβασης', '🔐 Nova palavra-passe'], newPasswordIntro: ['Imposta una nuova password per il tuo account.', 'Όρισε νέο κωδικό πρόσβασης για τον λογαριασμό σου.', 'Define uma nova palavra-passe para a tua conta.'], saveNewPasswordLabel: ['Salva password', 'Αποθήκευση κωδικού', 'Guardar palavra-passe'],
  reportTitle: ['⚑ Segnala messaggio', '⚑ Αναφορά μηνύματος', '⚑ Denunciar mensagem'], reportIntro: ['Scegli un motivo e descrivi brevemente cosa è successo.', 'Επίλεξε λόγο και περιέγραψε σύντομα τι συνέβη.', 'Escolhe um motivo e descreve brevemente o que aconteceu.'], reportCategory: ['Categoria', 'Κατηγορία', 'Categoria'], reportDescription: ['Descrizione', 'Περιγραφή', 'Descrição'], reportPlaceholder: ['Che cosa è successo?', 'Τι συνέβη;', 'O que aconteceu?'], sendReport: ['Invia segnalazione', 'Υποβολή αναφοράς', 'Enviar denúncia'], cancel: ['Annulla', 'Ακύρωση', 'Cancelar'], catInsult: ['Insulti o molestie', 'Προσβολές ή παρενόχληση', 'Insulto ou assédio'], catNsfw: ['Contenuti sessuali / NSFW', 'Σεξουαλικό περιεχόμενο / NSFW', 'Conteúdo sexual / NSFW'], catThreat: ['Minacce o violenza', 'Απειλές ή βία', 'Ameaça ou violência'], catHate: ['Incitamento all’odio o discriminazione', 'Ρητορική μίσους ή διακρίσεις', 'Discurso de ódio ou discriminação'], catSpam: ['Spam o truffa', 'Ανεπιθύμητα μηνύματα ή απάτη', 'Spam ou fraude'], catOther: ['Altro motivo', 'Άλλος λόγος', 'Outro motivo'],
  achievementsHeading: ['🏆 Traguardi', '🏆 Επιτεύγματα', '🏆 Conquistas'], achievementsIntro: ['I tuoi traguardi e progressi su Consistly.', 'Τα επιτεύγματα και τα ορόσημά σου στο Consistly.', 'As tuas conquistas e marcos no Consistly.'], closeAchievements: ['Chiudi', 'Κλείσιμο', 'Fechar'],
  remindersTitle: ['🔔 Promemoria', '🔔 Υπενθυμίσεις', '🔔 Lembretes'], remindersIntro: ['Ricevi un promemoria giornaliero per le tue abitudini all’orario scelto.', 'Λάβε καθημερινή υπενθύμιση για τις συνήθειές σου την ώρα που επιλέγεις.', 'Recebe um lembrete diário para os teus hábitos à hora que escolheres.'], remindersEnable: ['Attiva il promemoria giornaliero', 'Ενεργοποίηση καθημερινής υπενθύμισης', 'Ativar lembrete diário'], reminderTime: ['Orario del promemoria', 'Ώρα υπενθύμισης', 'Hora do lembrete'], testReminder: ['🔔 Invia notifica di prova', '🔔 Αποστολή δοκιμαστικής ειδοποίησης', '🔔 Enviar notificação de teste'], saveReminderSettings: ['💾 Salva impostazioni promemoria', '💾 Αποθήκευση ρυθμίσεων υπενθύμισης', '💾 Guardar definições de lembretes'], quietHoursTitle: ['🌙 Ore di silenzio', '🌙 Ώρες ησυχίας', '🌙 Horário de silêncio'], quietHoursIntro: ['In queste ore non riceverai promemoria sulle abitudini.', 'Δεν θα λαμβάνεις υπενθυμίσεις συνηθειών αυτές τις ώρες.', 'Durante este período, não receberás lembretes de hábitos.'], quietHoursEnable: ['Attiva le ore di silenzio', 'Ενεργοποίηση ωρών ησυχίας', 'Ativar horário de silêncio'], quietStart: ['Inizio del silenzio', 'Έναρξη ησυχίας', 'Início do silêncio'], quietEnd: ['Fine del silenzio', 'Λήξη ησυχίας', 'Fim do silêncio'], saveQuietHours: ['💾 Salva ore di silenzio', '💾 Αποθήκευση ωρών ησυχίας', '💾 Guardar horário de silêncio'],
  accountNotices: ['⚠️ Avvisi dell’account', '⚠️ Ειδοποιήσεις λογαριασμού', '⚠️ Avisos da conta'], moderationReports: ['🛡️ Segnalazioni di moderazione', '🛡️ Αναφορές εποπτείας', '🛡️ Denúncias de moderação'], adminReportsIntro: ['Segnalazioni delle chat private per gli amministratori.', 'Αναφορές ιδιωτικών συνομιλιών για τους διαχειριστές.', 'Denúncias de conversas privadas para os administradores.'], refreshReports: ['🔄 Aggiorna segnalazioni', '🔄 Ανανέωση αναφορών', '🔄 Atualizar denúncias'],
  aboutSince: ['📅 Iscritto dal: {date}', '📅 Μέλος από: {date}', '📅 Membro desde: {date}'], accountSignedOut: ['Non hai effettuato l’accesso', 'Δεν έχεις συνδεθεί', 'Sessão não iniciada'], accountSignedIn: ['Accesso effettuato: {email}', 'Συνδεδεμένος: {email}', 'Sessão iniciada: {email}'], accountCreatedOn: ['📅 Account creato il:', '📅 Ο λογαριασμός δημιουργήθηκε:', '📅 Conta criada em:'],
  noAccountNotices: ['Nessun avviso per l’account.', 'Δεν υπάρχουν ειδοποιήσεις λογαριασμού.', 'Não há avisos para a conta.'], accountNoticesError: ['Impossibile caricare gli avvisi dell’account.', 'Δεν ήταν δυνατή η φόρτωση των ειδοποιήσεων.', 'Não foi possível carregar os avisos da conta.'], markWarningRead: ['Segna come letto', 'Σήμανση ως αναγνωσμένο', 'Marcar como lido'], warningWasRead: ['Letto', 'Διαβάστηκε', 'Lido'],
  achievementsCount: ['{count} di {total} sbloccati', 'Ξεκλειδώθηκαν {count} από {total}', '{count} de {total} desbloqueadas'], unlocked: ['✅ Sbloccato', '✅ Ξεκλειδώθηκε', '✅ Desbloqueada'], locked: ['🔒 Bloccato', '🔒 Κλειδωμένο', '🔒 Bloqueada'], achievementUnlocked: ['Traguardo sbloccato:', 'Το επίτευγμα ξεκλειδώθηκε:', 'Conquista desbloqueada:'], achievementFirstStep: ['Primo passo', 'Πρώτο βήμα', 'Primeiro passo'], achievementHabitKeeper: ['Costanza', 'Συνέπεια', 'Persistência'], achievementRoutine: ['La routine cresce', 'Η ρουτίνα εξελίσσεται', 'A rotina está a crescer'], achievementPro: ['Esperto di abitudini', 'Ειδικός στις συνήθειες', 'Especialista em hábitos'], achievementThreeDay: ['Serie di tre giorni', 'Σερί τριών ημερών', 'Sequência de três dias'], achievementBoss: ['Vincitore del boss', 'Νικητής αφεντικού', 'Vencedor do boss'], achievementFirstDesc: ['Completa la tua prima attività.', 'Ολοκλήρωσε την πρώτη σου συνήθεια.', 'Conclui o teu primeiro hábito.'], achievementFiveDesc: ['Completa 5 attività in totale.', 'Ολοκλήρωσε συνολικά 5 συνήθειες.', 'Conclui 5 hábitos no total.'], achievement25Desc: ['Completa 25 attività in totale.', 'Ολοκλήρωσε συνολικά 25 συνήθειες.', 'Conclui 25 hábitos no total.'], achievement100Desc: ['Completa 100 attività in totale.', 'Ολοκλήρωσε συνολικά 100 συνήθειες.', 'Conclui 100 hábitos no total.'], achievement3DayDesc: ['Raggiungi almeno l’80% per tre giorni consecutivi.', 'Πέτυχε τουλάχιστον 80% για τρεις συνεχόμενες ημέρες.', 'Atinge pelo menos 80% durante três dias seguidos.'], achievementBossDesc: ['Sconfiggi il tuo primo boss settimanale.', 'Νίκησε το πρώτο εβδομαδιαίο αφεντικό σου.', 'Derrota o teu primeiro boss semanal.'],
  reminderSaved: ['Impostazioni promemoria salvate.', 'Οι ρυθμίσεις υπενθύμισης αποθηκεύτηκαν.', 'Definições de lembrete guardadas.'], reminderRequested: ['🔔 Notifica di prova richiesta!', '🔔 Ζητήθηκε δοκιμαστική ειδοποίηση!', '🔔 Notificação de teste solicitada!'], quietSaved: ['Ore di silenzio salvate.', 'Οι ώρες ησυχίας αποθηκεύτηκαν.', 'Horário de silêncio guardado.'], quietNeedsBoth: ['Scegli sia l’ora di inizio sia quella di fine.', 'Επίλεξε ώρα έναρξης και λήξης.', 'Escolhe uma hora de início e de fim.'], reminderPermission: ['Attiva prima le notifiche nel browser.', 'Ενεργοποίησε πρώτα τις ειδοποιήσεις στο πρόγραμμα περιήγησης.', 'Ativa primeiro as notificações no navegador.'], reminderUnsupported: ['Le notifiche non sono supportate da questo browser.', 'Αυτό το πρόγραμμα περιήγησης δεν υποστηρίζει ειδοποιήσεις.', 'Este navegador não suporta notificações.'],
  profileSaveError: ['Errore del profilo: {error}', 'Σφάλμα προφίλ: {error}', 'Erro no perfil: {error}'], bioSaved: ['✅ Descrizione salvata!', '✅ Η περιγραφή αποθηκεύτηκε!', '✅ Descrição guardada!'], profileAvatarBusy: ['Salvataggio avatar…', 'Αποθήκευση avatar…', 'A guardar avatar…'], profileAvatarSaved: ['Avatar salvato!', 'Το avatar αποθηκεύτηκε!', 'Avatar guardado!'], profileAvatarFailed: ['Impossibile salvare l’avatar.', 'Δεν ήταν δυνατή η αποθήκευση του avatar.', 'Não foi possível guardar o avatar.'],
  usernameRule: ['Il nome utente deve contenere 3–20 lettere, numeri o trattini bassi.', 'Το όνομα χρήστη πρέπει να έχει 3–20 γράμματα, αριθμούς ή κάτω παύλες.', 'O nome de utilizador deve ter 3–20 letras, números ou underscores.'], passwordRule: ['La password deve contenere almeno 8 caratteri.', 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.', 'A palavra-passe deve ter pelo menos 8 caracteres.'], createAccountBusy: ['Creazione account…', 'Δημιουργία λογαριασμού…', 'A criar conta…'], createAccountOk: ['Account creato!', 'Ο λογαριασμός δημιουργήθηκε!', 'Conta criada!'], confirmEmail: ['Controlla l’email per confermare l’account.', 'Έλεγξε το email σου για να επιβεβαιώσεις τον λογαριασμό.', 'Verifica o teu email para confirmares a conta.'], loginBusy: ['Accesso in corso…', 'Σύνδεση…', 'A iniciar sessão…'], accountResetEmail: ['Riceverai un’email per reimpostare la password.', 'Θα λάβεις email για επαναφορά του κωδικού σου.', 'Vais receber um email para redefinir a palavra-passe.'], resetPasswordsMismatch: ['Le password non coincidono.', 'Οι κωδικοί δεν ταιριάζουν.', 'As palavras-passe não coincidem.'], resetPasswordMin: ['La password deve contenere almeno 8 caratteri.', 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.', 'A palavra-passe deve ter pelo menos 8 caracteres.'], passwordSaving: ['Salvataggio password…', 'Αποθήκευση κωδικού…', 'A guardar palavra-passe…'], passwordUpdated: ['Password aggiornata!', 'Ο κωδικός ενημερώθηκε!', 'Palavra-passe atualizada!'], invalidCredentials: ['Credenziali non valide.', 'Μη έγκυρα στοιχεία σύνδεσης.', 'Credenciais inválidas.'], emailRequired: ['Inserisci prima il tuo email.', 'Συμπλήρωσε πρώτα το email σου.', 'Introduz primeiro o teu email.'],
  adminNoReports: ['Nessun messaggio in chat è stato segnalato.', 'Δεν έχουν αναφερθεί μηνύματα συνομιλίας.', 'Não há mensagens de chat denunciadas.'], adminNoOpen: ['Nessuna segnalazione aperta.', 'Δεν υπάρχουν ανοιχτές αναφορές.', 'Não há denúncias abertas.'], noActiveRestrictions: ['Nessun timeout o ban attivo.', 'Δεν υπάρχουν ενεργά timeout ή αποκλεισμοί.', 'Não há suspensões ou banimentos ativos.'], liftRestriction: ['Rimuovi restrizione', 'Άρση περιορισμού', 'Levantar restrição'], restrictionLifted: ['Restrizione rimossa.', 'Ο περιορισμός αφαιρέθηκε.', 'Restrição levantada.'], restrictionLiftError: ['Impossibile rimuovere la restrizione: {error}', 'Δεν ήταν δυνατή η άρση του περιορισμού: {error}', 'Não foi possível levantar a restrição: {error}'], timeoutUntil: ['Fino al {date}', 'Έως {date}', 'Até {date}'], permanentRestriction: ['Ban permanente', 'Μόνιμος αποκλεισμός', 'Banimento permanente'],
  adminLoading: ['Caricamento segnalazioni…', 'Φόρτωση αναφορών…', 'A carregar denúncias…'], adminLoadError: ['Impossibile caricare le segnalazioni: {error}', 'Δεν ήταν δυνατή η φόρτωση αναφορών: {error}', 'Não foi possível carregar denúncias: {error}'], warnUser: ['Invia avviso', 'Αποστολή προειδοποίησης', 'Enviar aviso'], timeout24: ['Timeout 24 ore', 'Αναστολή 24 ωρών', 'Suspensão de 24 horas'], timeout7: ['Timeout 7 giorni', 'Αναστολή 7 ημερών', 'Suspensão de 7 dias'], permanentBan: ['Ban permanente', 'Μόνιμος αποκλεισμός', 'Banimento permanente'], liftBan: ['Rimuovi ban', 'Άρση αποκλεισμού', 'Levantar banimento'], adminNote: ['Nota per l’utente', 'Σημείωση προς τον χρήστη', 'Nota para o utilizador'], adminNotePlaceholder: ['Scrivi un avviso o una nota…', 'Γράψε προειδοποίηση ή σημείωση…', 'Escreve um aviso ou uma nota…'], reportDeletedUser: ['L’utente segnalato ha eliminato il proprio account.', 'Ο αναφερόμενος χρήστης διέγραψε τον λογαριασμό του.', 'O utilizador denunciado eliminou a conta.'],
  reportedBy: ['Segnalato da', 'Αναφέρθηκε από', 'Denunciado por'], reportedUser: ['Utente segnalato', 'Αναφερόμενος χρήστης', 'Utilizador denunciado'], categoryLabel: ['Categoria', 'Κατηγορία', 'Categoria'], descriptionLabel: ['Descrizione', 'Περιγραφή', 'Descrição'], reviewStatus: ['Segna in revisione', 'Σήμανση υπό εξέταση', 'Marcar em análise'], closeReport: ['Chiudi segnalazione', 'Κλείσιμο αναφοράς', 'Fechar denúncia'], reopenReport: ['Riapri segnalazione', 'Άνοιγμα αναφοράς ξανά', 'Reabrir denúncia'], moderationNoteRequired: ['Inserisci una nota o un messaggio di avviso.', 'Γράψε μια σημείωση ή προειδοποίηση.', 'Introduz uma nota ou mensagem de aviso.'], warnConfirm: ['Inviare un avviso a questo utente?', 'Να σταλεί προειδοποίηση σε αυτόν τον χρήστη;', 'Enviar um aviso a este utilizador?'], banConfirm: ['Escludere definitivamente questo account?', 'Να αποκλειστεί οριστικά αυτός ο λογαριασμός;', 'Banir permanentemente esta conta?'], timeoutConfirm: ['Applicare un timeout a questo account?', 'Να επιβληθεί προσωρινή αναστολή σε αυτόν τον λογαριασμό;', 'Aplicar uma suspensão temporária a esta conta?'], unbanConfirm: ['Rimuovere il ban di questo account?', 'Να αρθεί ο αποκλεισμός αυτού του λογαριασμού;', 'Levantar o banimento desta conta?'], warningOk: ['Avviso aggiunto all’account Consistly dell’utente.', 'Η προειδοποίηση προστέθηκε στον λογαριασμό Consistly του χρήστη.', 'O aviso foi adicionado à conta Consistly do utilizador.'], timeout24Ok: ['Timeout di 24 ore applicato.', 'Επιβλήθηκε αναστολή 24 ωρών.', 'Suspensão de 24 horas aplicada.'], timeout7Ok: ['Timeout di 7 giorni applicato.', 'Επιβλήθηκε αναστολή 7 ημερών.', 'Suspensão de 7 dias aplicada.'], banOk: ['Ban permanente applicato.', 'Επιβλήθηκε μόνιμος αποκλεισμός.', 'Banimento permanente aplicado.'], unbanOk: ['Ban rimosso.', 'Ο αποκλεισμός αφαιρέθηκε.', 'Banimento levantado.'], reportActionError: ['Azione di moderazione non riuscita: {error}', 'Η ενέργεια εποπτείας απέτυχε: {error}', 'A ação de moderação falhou: {error}'], reportStatusError: ['Impossibile aggiornare lo stato: {error}', 'Δεν ήταν δυνατή η ενημέρωση κατάστασης: {error}', 'Não foi possível atualizar o estado: {error}'], reportSubmitted: ['Grazie. La segnalazione è stata inviata al team di moderazione.', 'Ευχαριστούμε. Η αναφορά στάλθηκε στην ομάδα εποπτείας.', 'Obrigado. A denúncia foi enviada à equipa de moderação.'], reportSendBusy: ['Invio segnalazione…', 'Αποστολή αναφοράς…', 'A enviar denúncia…'], reportSentButton: ['✓ Segnalato', '✓ Αναφέρθηκε', '✓ Denunciado'],
  sharingSaveError: ['Impossibile aggiornare la condivisione: {error}', 'Δεν ήταν δυνατή η ενημέρωση κοινής χρήσης: {error}', 'Não foi possível atualizar a partilha: {error}'], shareProgressEnabled: ['Condivisione dei progressi attiva.', 'Η κοινή χρήση προόδου είναι ενεργή.', 'Partilha de progresso ativada.'], profileImageDetected: ['File selezionato: {name}', 'Επιλέχθηκε αρχείο: {name}', 'Ficheiro selecionado: {name}'], imageUploading: ['Caricamento immagine…', 'Μεταφόρτωση εικόνας…', 'A carregar imagem…'], imageTypeError: ['Scegli un’immagine JPG, PNG o WebP.', 'Επίλεξε εικόνα JPG, PNG ή WebP.', 'Escolhe uma imagem JPG, PNG ou WebP.'], imageTooLarge: ['L’immagine deve essere di 3 MB o meno.', 'Η εικόνα πρέπει να είναι έως 3 MB.', 'A imagem deve ter no máximo 3 MB.'], imageUploadFailed: ['Caricamento non riuscito: {error}', 'Η μεταφόρτωση απέτυχε: {error}', 'Falha ao carregar imagem: {error}'], profileImageSaved: ['Foto profilo salvata!', 'Η φωτογραφία προφίλ αποθηκεύτηκε!', 'Foto de perfil guardada!'], profileImageDbFailed: ['Errore del profilo: {error}', 'Σφάλμα προφίλ: {error}', 'Erro no perfil: {error}'],
  accountDeleteConfirm: ['Eliminare definitivamente il tuo account? L’azione non può essere annullata.', 'Να διαγραφεί οριστικά ο λογαριασμός σου; Αυτή η ενέργεια δεν αναιρείται.', 'Eliminar permanentemente a tua conta? Esta ação não pode ser anulada.'], accountDeleted: ['Il tuo account è stato eliminato.', 'Ο λογαριασμός σου διαγράφηκε.', 'A tua conta foi eliminada.'], accountDeleteFailed: ['Impossibile eliminare l’account: {error}', 'Δεν ήταν δυνατή η διαγραφή του λογαριασμού: {error}', 'Não foi possível eliminar a conta: {error}'],
  postLike: ['Mi piace', 'Μου αρέσει', 'Gosto'], postLiked: ['Ti piace', 'Σου αρέσει', 'Gostas'], postComments: ['Commenti', 'Σχόλια', 'Comentários'], postCommentPlaceholder: ['Scrivi un commento…', 'Γράψε ένα σχόλιο…', 'Escreve um comentário…'], postCommentSend: ['Invia', 'Αποστολή', 'Enviar'], postDelete: ['Elimina', 'Διαγραφή', 'Eliminar'], postDeleteConfirm: ['Eliminare questo post?', 'Να διαγραφεί αυτή η ανάρτηση;', 'Eliminar esta publicação?'],
  bcx: ['Raccolta boss', 'Συλλογή αφεντικών', 'Coleção de bosses'], ca: ['Annulla', 'Ακύρωση', 'Cancelar'], canc: ['Annulla', 'Ακύρωση', 'Cancelar'], cont: ['Continua', 'Συνέχεια', 'Continuar'], dai: ['Ogni giorno', 'Καθημερινά', 'Todos os dias'], del: ['Elimina', 'Διαγραφή', 'Eliminar'], edy: ['Modifica obiettivo', 'Επεξεργασία στόχου', 'Editar objetivo'], g: ['Obiettivo', 'Στόχος', 'Meta'], l4w: ['Ultime 4 settimane', 'Τελευταίες 4 εβδομάδες', 'Últimas 4 semanas'], nt: ['Nuova attività', 'Νέα εργασία', 'Nova tarefa'], once: ['Una volta', 'Μία φορά', 'Uma vez'], sav: ['Salva', 'Αποθήκευση', 'Guardar'], save: ['Salva', 'Αποθήκευση', 'Guardar'], spec: ['Giorni specifici', 'Συγκεκριμένες ημέρες', 'Dias específicos'], tw: ['Questa settimana', 'Αυτή την εβδομάδα', 'Esta semana'], wc: ['Costanza settimanale (ultime 8 settimane)', 'Εβδομαδιαία συνέπεια (τελευταίες 8 εβδομάδες)', 'Consistência semanal (últimas 8 semanas)'], wg: ['Obiettivo settimanale', 'Εβδομαδιαίος στόχος', 'Meta semanal'],
  bossDefeated: ['sconfitto!', 'ηττήθηκε!', 'derrotado!'], bossSurvived: ['è sopravvissuto', 'επέζησε', 'sobreviveu'], goalReached: ['{pct}% – obiettivo del {goal}% raggiunto.', '{pct}% – επιτεύχθηκε ο στόχος {goal}%.', '{pct}% – objetivo de {goal}% alcançado.'], goalWas: ['{pct}% – obiettivo: {goal}%.', '{pct}% – στόχος: {goal}%.', '{pct}% – objetivo: {goal}%.'], rewardUnlocked: ['Ricompensa sbloccata:', 'Ξεκλειδώθηκε ανταμοιβή:', 'Recompensa desbloqueada:'], planBoss: ['Pianifica attività per assegnare HP al boss', 'Προγραμμάτισε εργασίες για να δώσεις HP στο αφεντικό', 'Planeia tarefas para dar HP ao boss'], hp: ['{left} / {total} HP', '{left} / {total} HP', '{left} / {total} HP'], weekNoTasks: ['Nessuna attività', 'Καμία εργασία', 'Sem tarefas'], weekDone: ['{pct}% · {done}/{planned} completate', '{pct}% · {done}/{planned} ολοκληρώθηκαν', '{pct}% · {done}/{planned} concluídas'], weeklyBossQuote1: ['Il boss è sopravvissuto, ma è ferito. La prossima settimana cadrà!', 'Το αφεντικό επέζησε, αλλά τραυματίστηκε. Την επόμενη εβδομάδα θα πέσει!', 'O boss sobreviveu, mas está ferido. Para a semana cai!'], weeklyBossQuote2: ['Ogni attività completata è servita. Riparti e colpisci ancora.', 'Κάθε εργασία που έκανες μέτρησε. Ξεκίνα ξανά και χτύπα πάλι.', 'Cada tarefa que fizeste contou. Recomeça e volta a atacar.'], weeklyBossQuote3: ['I progressi contano più della perfezione. Torna più forte lunedì.', 'Η πρόοδος μετρά περισσότερο από την τελειότητα. Γύρνα πιο δυνατός τη Δευτέρα.', 'O progresso vale mais do que a perfeição. Regressa mais forte na segunda-feira.'], weeklyBossQuote4: ['Le sfide combattute fino all’ultimo rendono migliori le vittorie.', 'Οι δύσκολες μάχες κάνουν τις ανατροπές πιο δυνατές.', 'As lutas renhidas tornam as reviravoltas ainda melhores.'],
  mon: ['Lun', 'Δευ', 'Seg'], tue: ['Mar', 'Τρι', 'Ter'], wed: ['Mer', 'Τετ', 'Qua'], thu: ['Gio', 'Πεμ', 'Qui'], fri: ['Ven', 'Παρ', 'Sex'], sat: ['Sab', 'Σαβ', 'Sáb'], sun: ['Dom', 'Κυρ', 'Dom'],
  monthTasksDone: ['Attività del mese', 'Εργασίες του μήνα', 'Tarefas do mês'], bossTowerNextReward: ['Mancano {count} vittorie alla prossima ricompensa della torre.', 'Απομένουν {count} νίκες για την επόμενη ανταμοιβή του πύργου.', 'Faltam {count} vitórias para a próxima recompensa da torre.'], dailyRewardAlreadyClaimed: ['Hai già riscosso il bonus di oggi.', 'Έχεις ήδη πάρει το σημερινό μπόνους.', 'Já recebeste o bónus de hoje.'], dailyRewardClaimed: ['Hai ricevuto 10 punti bonus!', 'Κέρδισες 10 μπόνους πόντους!', 'Recebeste 10 pontos de bónus!'], dataExported: ['Esportazione dei dati pronta.', 'Η εξαγωγή δεδομένων είναι έτοιμη.', 'Exportação de dados pronta.'], refreshFeed: ['↻ Aggiorna', '↻ Ανανέωση', '↻ Atualizar'], accessibilityTitle: ['♿ Visualizzazione e accessibilità', '♿ Προβολή και προσβασιμότητα', '♿ Ecrã e acessibilidade'], largeTextLabel: ['Testo più grande', 'Μεγαλύτερο κείμενο', 'Texto maior'], reduceMotionLabel: ['Riduci animazioni', 'Μείωση κίνησης', 'Reduzir movimento'], highContrastLabel: ['Contrasto elevato', 'Υψηλή αντίθεση', 'Contraste elevado'], exportDataButton: ['⬇️ Scarica i miei dati', '⬇️ Λήψη των δεδομένων μου', '⬇️ Descarregar os meus dados'],
  home: ['Home', 'Αρχική', 'Início'], week: ['Settimana', 'Εβδομάδα', 'Semana'], stats: ['Statistiche', 'Στατιστικά', 'Estatísticas'], bosses: ['Boss', 'Αφεντικά', 'Chefes'], socialNav: ['Sociale', 'Κοινωνικά', 'Social'], settings: ['Impostazioni', 'Ρυθμίσεις', 'Definições'], shoop: ['Negozio', 'Κατάστημα', 'Loja'],
  today: ['Oggi', 'Σήμερα', 'Hoje'], settingsTitle: ['Impostazioni', 'Ρυθμίσεις', 'Definições'], apy: ['Aspetto', 'Εμφάνιση', 'Aparência'], viby: ['Scegli il tuo stile.', 'Διάλεξε το στιλ σου.', 'Escolhe o teu estilo.'], languageLabel: ['Lingua', 'Γλώσσα', 'Idioma'],
  available: ['Punti disponibili:', 'Διαθέσιμοι πόντοι:', 'Pontos disponíveis:'], tp: ['Punti totali:', 'Σύνολο πόντων:', 'Pontos totais:'], ps: ['🪙 Negozio punti', '🪙 Κατάστημα πόντων', '🪙 Loja de pontos'], rewards: ['🎁 Ricompense', '🎁 Ανταμοιβές', '🎁 Recompensas'], inventoryTitle: ['🎒 Il tuo inventario', '🎒 Το απόθεμά σου', '🎒 O teu inventário'], inventoryHint: ['Qui trovi i suoni acquistati. Provali e scegli il tuo preferito.', 'Εδώ θα βρεις τους ήχους σου. Δοκίμασέ τους και εξόπλισε τον αγαπημένο σου.', 'Aqui encontras os sons comprados. Experimenta-os e equipa o teu favorito.'],
  titleShopHeading: ['✨ Titoli profilo', '✨ Τίτλοι προφίλ', '✨ Títulos de perfil'], profileTitleEquipped: ['✨ Titolo equipaggiato', '✨ Εξοπλισμένος τίτλος', '✨ Título equipado'], titleShopIntro: ['Acquista un titolo luminoso da mostrare sul profilo.', 'Αγόρασε έναν λαμπερό τίτλο για το προφίλ σου.', 'Compra um título brilhante para mostrar no perfil.'], titleInventoryHeading: ['✨ I tuoi titoli', '✨ Οι τίτλοι σου', '✨ Os teus títulos'], premiumThemesHeading: ['🌈 Temi premium e animazioni', '🌈 Premium θέματα και κινούμενες λάμψεις', '🌈 Temas premium e brilhos animados'], premiumThemesIntro: ['Sblocca un tema con i punti e applicalo nelle impostazioni.', 'Ξεκλείδωσε ένα θέμα με πόντους και επίλεξέ το στις ρυθμίσεις.', 'Desbloqueia um tema com pontos e equipa-o nas definições.'],
  friendProgressSharingTitle: ['🤝 Condividi i progressi con gli amici', '🤝 Κοινή χρήση προόδου με φίλους', '🤝 Partilhar progresso com amigos'], shareProgressWithFriendsLabel: ['Consenti agli amici confermati di vedere attività e statistiche', 'Επίτρεψε σε επιβεβαιωμένους φίλους να βλέπουν εργασίες και στατιστικά', 'Permitir que amigos confirmados vejam tarefas e estatísticas'], shareProgressPrivateDefault: ['Privato per impostazione predefinita. Puoi cambiare quando vuoi.', 'Ιδιωτικό από προεπιλογή. Μπορείς να το αλλάξεις όποτε θέλεις.', 'Privado por predefinição. Podes alterar quando quiseres.'],
  friendRequests: ['📩 Richieste di amicizia', '📩 Αιτήματα φιλίας', '📩 Pedidos de amizade'], friendsHomeIntro: ['Trova amici e seguite i progressi a vicenda.', 'Βρες φίλους και παρακολουθήστε την πρόοδό σας.', 'Encontra amigos e acompanhem o progresso uns dos outros.'], searchUsers: ['🔎 Cerca utenti', '🔎 Αναζήτηση χρηστών', '🔎 Procurar utilizadores'],
  playerLevelLabel: ['Livello giocatore', 'Επίπεδο παίκτη', 'Nível do jogador'], bossTowerFloor: ['Torre dei boss · Piano', 'Πύργος αφεντικών · Όροφος', 'Torre de bosses · Andar'], bossTowerReward: ['Ogni 5 vittorie sblocca una ricompensa speciale.', 'Κάθε 5 νίκες ξεκλειδώνουν ειδική ανταμοιβή.', 'A cada 5 vitórias desbloqueias uma recompensa especial.'], bossTowerNextReward: ['Mancano {count} vittorie alla prossima ricompensa della torre.', 'Απομένουν {count} νίκες για την επόμενη ανταμοιβή του πύργου.', 'Faltam {count} vitórias para a próxima recompensa da torre.'], monthTasksDone: ['Attività del mese', 'Εργασίες του μήνα', 'Tarefas do mês'],
  dailyRewardButton: ['🎁 Bonus giornaliero · +10 punti', '🎁 Ημερήσιο μπόνους · +10 πόντοι', '🎁 Bónus diário · +10 pontos'], shopSearchPlaceholder: ['Cerca suoni, temi e titoli…', 'Αναζήτηση ήχων, θεμάτων και τίτλων…', 'Pesquisar sons, temas e títulos…'], shopOwnedOnly: ['Mostra solo gli articoli posseduti', 'Εμφάνιση μόνο των αντικειμένων που έχεις', 'Mostrar apenas artigos que já tenho'], shopSortFeatured: ['In evidenza', 'Προτεινόμενα', 'Destaques'], shopSortPriceUp: ['Prezzo: dal più basso', 'Τιμή: από χαμηλή σε υψηλή', 'Preço: do menor para o maior'], shopSortPriceDown: ['Prezzo: dal più alto', 'Τιμή: από υψηλή σε χαμηλή', 'Preço: do maior para o menor'], dailyRewardAlreadyClaimed: ['Hai già riscosso il bonus di oggi.', 'Έχεις ήδη πάρει το σημερινό μπόνους.', 'Já recebeste o bónus de hoje.'], dailyRewardClaimed: ['Hai ricevuto 10 punti bonus!', 'Κέρδισες 10 μπόνους πόντους!', 'Recebeste 10 pontos de bónus!'],
  themeFalloutTerminal: ['Terminale Fallout', 'Τερματικό Fallout', 'Terminal Fallout'], themeFalloutTerminalDesc: ['Verde desolato · Terminale retrò', 'Πράσινο ερημιάς · Ρετρό τερματικό', 'Verde pós-apocalíptico · Terminal retro'], themeNocturnal: ['Notturno', 'Νυχτερινό', 'Noturno'], themeNocturnalDesc: ['Blu notte · Luce stellare', 'Μπλε μεσονυχτίου · Αστρόφως', 'Azul meia-noite · Luz das estrelas'], themeRuby: ['Rubino', 'Ρουμπίνι', 'Rubi'], themeRubyDesc: ['Cremisi intenso · Bagliore rubino', 'Βαθύ κόκκινο · Λάμψη ρουμπινιού', 'Carmesim intenso · Brilho de rubi'], themeAmethyst: ['Ametista', 'Αμέθυστος', 'Ametista'], themeAmethystDesc: ['Viola scuro · Bagliore lavanda', 'Σκούρο μωβ · Λάμψη λεβάντας', 'Violeta escuro · Brilho lavanda'],
  themeObsidianGold: ['Oro ossidiana', 'Οψιδιανός χρυσός', 'Ouro obsidiana'], themeObsidianGoldDesc: ['Vetro nero · Oro liquido', 'Μαύρο γυαλί · Ρευστό χρυσό', 'Vidro negro · Ouro líquido'], themeCherryNoir: ['Ciliegia noir', 'Κεράσι noir', 'Cereja noir'], themeCherryNoirDesc: ['Rosso ciliegia · Eleganza scura', 'Κερασί · Σκοτεινή κομψότητα', 'Vermelho-cereja · Elegância escura'], themeAurora: ['Aurora', 'Σέλας', 'Aurora'], themeAuroraDesc: ['Luci del nord · Magia', 'Βόρειο σέλας · Μαγεία', 'Aurora boreal · Magia'], themeSynthwave: ['Synthwave', 'Synthwave', 'Synthwave'], themeSynthwaveDesc: ['Rosa neon · Futuro retrò', 'Ροζ νέον · Ρετρό μέλλον', 'Rosa néon · Futuro retro'], themeGlacier: ['Ghiacciaio', 'Παγετώνας', 'Glaciar'], themeGlacierDesc: ['Blu ghiaccio · Cristallino', 'Παγωμένο μπλε · Κρυστάλλινο', 'Azul-gelo · Cristalino'], themePeachGlow: ['Bagliore pesca', 'Λάμψη ροδάκινου', 'Brilho pêssego'], themePeachGlowDesc: ['Pesca · Caldo e accogliente', 'Ροδάκινο · Ζεστό και γαλήνιο', 'Pêssego · Quente e acolhedor'], themeSakura: ['Sakura', 'Σακούρα', 'Sakura'], themeSakuraDesc: ['Fiori delicati · Calmo e luminoso', 'Απαλά άνθη · Ήρεμο και φωτεινό', 'Flores suaves · Calmo e luminoso'], themeDeepSpace: ['Spazio profondo', 'Βαθύ διάστημα', 'Espaço profundo'], themeDeepSpaceDesc: ['Blu cosmico · Cielo stellato', 'Κοσμικό μπλε · Έναστρος ουρανός', 'Azul cósmico · Céu estrelado'], themeMatcha: ['Matcha', 'Matcha', 'Matcha'], themeMatchaDesc: ['Verde fresco · Calmo e naturale', 'Φρέσκο πράσινο · Ήρεμο και φυσικό', 'Verde fresco · Calmo e natural'],
  themeMidnight: ['Mezzanotte', 'Μεσάνυχτα', 'Meia-noite'], themeMidnightDesc: ['Viola intenso · Scuro', 'Βαθύ μωβ · Σκοτεινό', 'Roxo profundo · Escuro'], themeOcean: ['Oceano', 'Ωκεανός', 'Oceano'], themeOceanDesc: ['Blu freddo · Calmo', 'Δροσερό μπλε · Ήρεμο', 'Azul fresco · Calmo'], themeForest: ['Foresta', 'Δάσος', 'Floresta'], themeForestDesc: ['Verde salvia · Naturale', 'Πράσινο φασκόμηλου · Φυσικό', 'Verde-sálvia · Natural'], themeSunset: ['Tramonto', 'Ηλιοβασίλεμα', 'Pôr do sol'], themeSunsetDesc: ['Corallo caldo · Morbido', 'Ζεστό κοραλλί · Απαλό', 'Coral quente · Suave'], themeLavender: ['Lavanda', 'Λεβάντα', 'Lavanda'], themeLavenderDesc: ['Viola pastello · Sognante', 'Παστέλ μωβ · Ονειρικό', 'Violeta pastel · Sonhador'], themePaper: ['Carta', 'Χαρτί', 'Papel'], themePaperDesc: ['Crema caldo · Minimal', 'Ζεστό κρεμ · Μίνιμαλ', 'Creme quente · Minimalista'], themeNeon: ['Neon', 'Νέον', 'Néon'], themeNeonDesc: ['Nero · Verde elettrico', 'Μαύρο · Ηλεκτρικό πράσινο', 'Preto · Verde elétrico'], themeRose: ['Rosa', 'Ροζ', 'Rosa'], themeRoseDesc: ['Rosa tenue · Accogliente', 'Απαλό ροζ · Ζεστό', 'Rosa suave · Acolhedor'], themeArctic: ['Artico', 'Αρκτική', 'Ártico'], themeArcticDesc: ['Blu ghiaccio · Fresco', 'Παγωμένο μπλε · Δροσερό', 'Azul-gelo · Fresco'], themeGolden: ['Dorato', 'Χρυσό', 'Dourado'], themeGoldenDesc: ['Oro caldo · Accogliente', 'Ζεστό χρυσό · Φιλόξενο', 'Ouro quente · Acolhedor'], themeCoralReef: ['Barriera corallina', 'Κοραλλιογενής ύφαλος', 'Recife de coral'], themeCoralReefDesc: ['Turchese tropicale · Bagliore corallo', 'Τροπικό τιρκουάζ · Κοραλλί λάμψη', 'Turquesa tropical · Brilho coral'], themeCyberpunk: ['Cyberpunk', 'Cyberpunk', 'Cyberpunk'], themeCyberpunkDesc: ['Ciano neon · Notte elettrica', 'Κυανό νέον · Ηλεκτρική νύχτα', 'Ciano néon · Noite elétrica'], themeEmber: ['Brace', 'Κάρβουνο', 'Brasa'], themeEmberDesc: ['Arancione fuso · Carbone caldo', 'Λιωμένο πορτοκαλί · Ζεστό κάρβουνο', 'Laranja incandescente · Carvão quente'],
  themeToxicBloom: ['Fioritura tossica', 'Τοξική άνθιση', 'Flores tóxicas'], themeToxicBloomDesc: ['Verde veleno · Giardino oscuro', 'Δηλητηριώδες πράσινο · Σκοτεινός κήπος', 'Verde venenoso · Jardim sombrio'], themeBloodMoon: ['Luna di sangue', 'Ματωμένο φεγγάρι', 'Lua de sangue'], themeBloodMoonDesc: ['Rosso cremisi · Notte lunare', 'Βαθύ κόκκινο · Σεληνόφωτη νύχτα', 'Carmesim · Noite lunar'], themeHologram: ['Ologramma', 'Ολόγραμμα', 'Holograma'], themeHologramDesc: ['Ciano iridescente · Cromo', 'Ιριδίζον κυανό · Χρώμιο', 'Ciano iridescente · Cromado'], themeVolcanicAsh: ['Cenere vulcanica', 'Ηφαιστειακή στάχτη', 'Cinza vulcânica'], themeVolcanicAshDesc: ['Carbone · Bagliore di lava', 'Κάρβουνο · Λάμψη λάβας', 'Carvão · Brilho de lava'], themeEnchantedForest: ['Foresta incantata', 'Μαγεμένο δάσος', 'Floresta encantada'], themeEnchantedForestDesc: ['Verde profondo · Lucciole', 'Βαθύ πράσινο · Πυγολαμπίδες', 'Verde profundo · Pirilampos'], themeNebulaDrift: ['Deriva nebulare', 'Νεφέλωμα σε κίνηση', 'Deriva nebulosa'], themeNebulaDriftDesc: ['Bagliore cosmico viola animato', 'Κινούμενη μωβ κοσμική λάμψη', 'Brilho cósmico violeta animado'], themeAuroraFlow: ['Flusso aurora', 'Ροή σέλαος', 'Fluxo de aurora'], themeAuroraFlowDesc: ['Bagliore verde aurora animato', 'Κινούμενη πράσινη λάμψη σέλαος', 'Brilho verde de aurora animado'], themeLavaPulse: ['Impulso di lava', 'Παλμός λάβας', 'Pulso de lava'], themeLavaPulseDesc: ['Bagliore animato di lava fusa', 'Κινούμενη λάμψη λιωμένης λάβας', 'Brilho animado de lava derretida'],
  titleComet: ['Cometa', 'Κομήτης', 'Cometa'], titleStarlight: ['Luce stellare', 'Αστρόφως', 'Luz das estrelas'], titleNeonDream: ['Sogno neon', 'Όνειρο νέον', 'Sonho néon'], titleRoyalAura: ['Aura regale', 'Βασιλική αύρα', 'Aura real'], titleSolarFlare: ['Eruzione solare', 'Ηλιακή έκλαμψη', 'Erupção solar'], titleVoidWalker: ['Viandante del vuoto', 'Οδοιπόρος του κενού', 'Caminhante do vazio'], titleCrimsonCrown: ['Corona cremisi', 'Πορφυρό στέμμα', 'Coroa carmesim'], titleForestPhantom: ['Fantasma della foresta', 'Φάντασμα του δάσους', 'Fantasma da floresta'],
  totalPoints: ['Punti totali', 'Σύνολο πόντων', 'Pontos totais'], currentStreak: ['Serie attuale', 'Τρέχον σερί', 'Sequência atual'], bestDay: ['Giorno migliore', 'Καλύτερη ημέρα', 'Melhor dia'], bestWeek: ['Settimana migliore', 'Καλύτερη εβδομάδα', 'Melhor semana'], noBossDefeated: ['Nessun boss sconfitto. Raggiungi il tuo obiettivo settimanale per vincere!', 'Δεν έχεις νικήσει ακόμα κανένα αφεντικό. Πέτυχε τον εβδομαδιαίο στόχο σου!', 'Ainda não derrotaste nenhum chefe. Atinge a meta semanal para vencer!'],
  taskTitlePlaceholder: ['Titolo attività', 'Τίτλος εργασίας', 'Título da tarefa'], taskCategoryPlaceholder: ['Categoria (facoltativa)', 'Κατηγορία (προαιρετική)', 'Categoria (opcional)'], editTask: ['Modifica attività', 'Επεξεργασία εργασίας', 'Editar tarefa'], newTask: ['Nuova attività', 'Νέα εργασία', 'Nova tarefa'], taskTitle: ['Titolo attività', 'Τίτλος εργασίας', 'Título da tarefa'], categoryOptional: ['Categoria (facoltativa)', 'Κατηγορία (προαιρετική)', 'Categoria (opcional)'],
  noTasksPlanned: ['Nessuna attività programmata. Tocca + per aggiungerne una.', 'Δεν έχουν προγραμματιστεί εργασίες. Πάτησε + για προσθήκη.', 'Não há tarefas planeadas. Toca em + para adicionar uma.'], taskOneTime: ['Una volta', 'Μία φορά', 'Uma vez'], taskDaily: ['Ogni giorno', 'Καθημερινά', 'Diária'], goalLabel: ['Obiettivo', 'Στόχος', 'Meta'], rewardLabel: ['Ricompensa', 'Ανταμοιβή', 'Recompensa'], noRewardSet: ['nessuna ricompensa', 'χωρίς ανταμοιβή', 'sem recompensa'], weeklyGoal: ['Obiettivo e ricompensa settimanali', 'Εβδομαδιαίος στόχος και ανταμοιβή', 'Meta e recompensa semanal'], addTask: ['Aggiungi attività', 'Προσθήκη εργασίας', 'Adicionar tarefa'],
  themeLockedHint: ['Sblocca prima questo tema nel negozio punti.', 'Ξεκλείδωσε πρώτα αυτό το θέμα στο κατάστημα πόντων.', 'Desbloqueia primeiro este tema na loja de pontos.'], buyTheme: ['🪙 Sblocca tema', '🪙 Ξεκλείδωσε θέμα', '🪙 Desbloquear tema'], equipTheme: ['Usa tema', 'Εφαρμογή θέματος', 'Usar tema'], equipTitle: ['✨ Equipaggia titolo', '✨ Εξόπλισε τίτλο', '✨ Equipar título'], buyItem: ['🛒 Acquista', '🛒 Αγορά', '🛒 Comprar'], equipped: ['Equipaggiato', 'Εξοπλισμένο', 'Equipado'], noTitles: ['Non hai ancora acquistato titoli.', 'Δεν έχεις αγοράσει τίτλους ακόμα.', 'Ainda não compraste títulos.'],
  friendProgressTitle: ['📊 Progressi degli amici', '📊 Πρόοδος φίλων', '📊 Progresso dos amigos'], friendProgressLoading: ['Caricamento progressi...', 'Φόρτωση προόδου...', 'A carregar progresso...'], progressViewButton: ['📊 Vedi progressi', '📊 Προβολή προόδου', '📊 Ver progresso'], friend: ['Amico', 'Φίλος', 'Amigo'],
  shopSoftBell: ['Campana delicata', 'Απαλή καμπάνα', 'Sino suave'], shopSoftBellDesc: ['Note di campana luminose e delicate.', 'Απαλές, φωτεινές νότες καμπάνας.', 'Notas de sino suaves e brilhantes.'], shopWoodblock: ['Legno caldo', 'Ξύλινος ήχος', 'Bloco de madeira'], shopWoodblockDesc: ['Colpetti di legno caldi e brevi.', 'Ζεστοί, σύντομοι ξύλινοι χτύποι.', 'Batidas de madeira quentes e curtas.'], shopArcade: ['Arcade', 'Arcade', 'Arcade'], shopArcadeDesc: ['Un suono rétro giocoso per le attività completate.', 'Ένας παιχνιδιάρικος ρετρό ήχος για ολοκληρωμένες εργασίες.', 'Um som retro divertido para tarefas concluídas.'], shopRaindrop: ['Gocce di pioggia', 'Σταγόνες βροχής', 'Gotas de chuva'], shopRaindropDesc: ['Toni delicati e discendenti come piccole gocce.', 'Απαλοί ήχοι που πέφτουν σαν μικρές σταγόνες.', 'Tons suaves e descendentes como pequenas gotas.'],
  journalTitle: ['📓 Diario giornaliero', '📓 Ημερήσιο ημερολόγιο', '📓 Diário diário'], journalIntro: ['Un breve riepilogo della giornata. Il tuo diario è privato.', 'Μια σύντομη ανασκόπηση της ημέρας. Το ημερολόγιό σου είναι ιδιωτικό.', 'Uma pequena reflexão diária. O teu diário é privado.'], journalGood: ['Cosa è andato bene oggi?', 'Τι πήγε καλά σήμερα;', 'O que correu bem hoje?'], journalTomorrow: ['Cosa può andare meglio domani?', 'Τι μπορεί να πάει καλύτερα αύριο;', 'O que pode correr melhor amanhã?'], journalGrateful: ['Cose per cui sono grato/a:', 'Πράγματα για τα οποία νιώθω ευγνωμοσύνη:', 'Coisas pelas quais estou agradecido/a:'], journalGoodPlaceholder: ['Scrivi qualcosa che è andato bene…', 'Γράψε κάτι που πήγε καλά…', 'Escreve algo que correu bem…'], journalTomorrowPlaceholder: ['Una cosa che vuoi migliorare…', 'Κάτι που θέλεις να βελτιώσεις…', 'Algo que queres melhorar…'], journalGratefulPlaceholder: ['Persone, momenti o piccole cose…', 'Άνθρωποι, στιγμές ή μικρά πράγματα…', 'Pessoas, momentos ou pequenas coisas…'], journalSave: ['Salva il diario di oggi', 'Αποθήκευση του σημερινού ημερολογίου', 'Guardar o diário de hoje'], journalSaved: ['Diario di oggi salvato.', 'Το σημερινό ημερολόγιο αποθηκεύτηκε.', 'Diário de hoje guardado.'], journalSavedLocal: ['Salvato su questo dispositivo.', 'Αποθηκεύτηκε σε αυτή τη συσκευή.', 'Guardado neste dispositivo.'], journalSaving: ['Salvataggio…', 'Αποθήκευση…', 'A guardar…'], journalSaveError: ['Impossibile salvare il diario. Controlla la migrazione della tabella su Supabase.', 'Δεν ήταν δυνατή η αποθήκευση του ημερολογίου. Έλεγξε τη migration του πίνακα στο Supabase.', 'Não foi possível guardar o diário. Verifica a migração da tabela no Supabase.'], journalCloudUnavailable: ['Diario cloud non disponibile. La bozza locale è conservata; esegui la migrazione SQL del diario.', 'Το ημερολόγιο cloud δεν είναι διαθέσιμο. Το τοπικό πρόχειρο διατηρήθηκε· εκτέλεσε τη migration SQL.', 'O diário na cloud não está disponível. O rascunho local foi mantido; executa a migração SQL do diário.'],
  xpLeaderboard: ['🏆 Classifica XP', '🏆 Κατάταξη XP', '🏆 Classificação de XP'], xpLeaderboardIntro: ['Confronta il tuo livello con la community o con i tuoi amici.', 'Σύγκρινε το επίπεδό σου με την κοινότητα ή τους φίλους σου.', 'Compara o teu nível com a comunidade ou com os teus amigos.'], leaderboardGlobal: ['Globale', 'Παγκόσμια', 'Global'], leaderboardFriends: ['Amici', 'Φίλοι', 'Amigos'], leaderboardLoading: ['Caricamento classifica…', 'Φόρτωση κατάταξης…', 'A carregar classificação…'], leaderboardError: ['Impossibile caricare la classifica: {error}', 'Δεν ήταν δυνατή η φόρτωση της κατάταξης: {error}', 'Não foi possível carregar a classificação: {error}'], leaderboardEmpty: ['Ancora nessun risultato.', 'Δεν υπάρχουν ακόμη αποτελέσματα.', 'Ainda não há resultados.'], leaderboardYou: ['Tu', 'Εσύ', 'Tu'], leaderboardXp: ['{xp} XP', '{xp} XP', '{xp} XP'], socialReportTitle: ['⚑ Segnala profilo o post', '⚑ Αναφορά προφίλ ή ανάρτησης', '⚑ Denunciar perfil ou publicação'], reportProfile: ['⚑ Segnala profilo', '⚑ Αναφορά προφίλ', '⚑ Denunciar perfil'], reportPost: ['⚑ Segnala post', '⚑ Αναφορά ανάρτησης', '⚑ Denunciar publicação'], reportedProfile: ['Profilo segnalato', 'Το προφίλ αναφέρθηκε', 'Perfil denunciado'], reportedPost: ['Post segnalato', 'Η ανάρτηση αναφέρθηκε', 'Publicação denunciada'],
  profileReport: ['Segnalazione profilo', 'Αναφορά προφίλ', 'Denúncia de perfil'], postReport: ['Segnalazione post', 'Αναφορά ανάρτησης', 'Denúncia de publicação'], messageReport: ['Segnalazione messaggio', 'Αναφορά μηνύματος', 'Denúncia de mensagem'],
  activeRestrictionsHeading: ['Timeout e ban attivi', 'Ενεργές αναστολές και αποκλεισμοί', 'Suspensões e banimentos ativos'], premiumThemesHeading: ['🌈 Temi premium e bagliori animati', '🌈 Premium θέματα και κινούμενες λάμψεις', '🌈 Temas premium e brilhos animados'], languageLabel: ['Lingua', 'Γλώσσα', 'Idioma'], soundLabel: ['🔊 Suono soddisfacente', '🔊 Ευχάριστος ήχος', '🔊 Som satisfatório'], souny: ['Suono attivo', 'Ο ήχος είναι ενεργός', 'Som ativado'],
  feedNewest: ['Più recenti', 'Νεότερα', 'Mais recentes'], feedFriends: ['Amici', 'Φίλοι', 'Amigos'], feedMine: ['I miei post', 'Οι αναρτήσεις μου', 'As minhas publicações'], refreshFeed: ['↻ Aggiorna', '↻ Ανανέωση', '↻ Atualizar'], feedNoFriendPosts: ['I tuoi amici non hanno ancora pubblicato nulla.', 'Οι φίλοι σου δεν έχουν δημοσιεύσει ακόμα.', 'Os teus amigos ainda não publicaram nada.'], feedOnlyMineEmpty: ['Non hai ancora pubblicato.', 'Δεν έχεις δημοσιεύσει ακόμα.', 'Ainda não publicaste.'], feedCount: ['{count} post', '{count} ανάρτηση', '{count} publicação'], accessibilityTitle: ['♿ Visualizzazione e accessibilità', '♿ Προβολή και προσβασιμότητα', '♿ Ecrã e acessibilidade'], largeTextLabel: ['Testo più grande', 'Μεγαλύτερο κείμενο', 'Texto maior'], reduceMotionLabel: ['Riduci animazioni', 'Μείωση κίνησης', 'Reduzir movimento'], highContrastLabel: ['Contrasto elevato', 'Υψηλή αντίθεση', 'Contraste elevado'], exportDataButton: ['⬇️ Scarica i miei dati', '⬇️ Λήψη των δεδομένων μου', '⬇️ Descarregar os meus dados'], dataExported: ['Esportazione dei dati pronta.', 'Η εξαγωγή δεδομένων είναι έτοιμη.', 'Exportação de dados pronta.']
};
for (const [key, values] of Object.entries(coreLocaleCopy)) {
  featureLangCodes.forEach((lang, index) => {
    translations[lang][key] = values[index];
    extraTranslations[lang][key] = values[index];
  });
}
const journalHistoryLocaleCopy = {
  en: { journalHistoryTitle: '📓 Journal entry', journalHistoryEmpty: 'No journal entry saved for this day.', journalEntriesTitle: '✍️ Journal entries', journalPrivateNote: '🔒 Only you can see your journal entries.', journalPrivateBadge: '🔒 Private', journalEntryDate: 'Date and time', journalEntryTitle: 'Title', journalEntryText: 'Text', journalEntryTitlePlaceholder: 'Give this entry a title', journalEntryTextPlaceholder: 'Write your journal entry…', journalEntrySave: 'Save entry', journalEntryUpdate: 'Save changes', journalEntryCancel: 'Cancel edit', journalEntrySearch: 'Search your entries…', journalFavoritesOnly: 'Favorites only', journalNoEntries: 'No journal entries yet.', journalEdit: 'Edit', journalDelete: 'Delete', journalFavorite: 'Add to favorites', journalUnfavorite: 'Remove from favorites', journalEntrySaved: 'Journal entry saved.', journalEntryDeleted: 'Journal entry deleted.', journalConfirmDelete: 'Delete this journal entry?', journalEntryCloudError: 'Cloud save failed. Your entry is still saved on this device; check the journal SQL migration.' },
  de: { journalHistoryTitle: '📓 Tagebucheintrag', journalHistoryEmpty: 'Für diesen Tag ist kein Eintrag gespeichert.', journalEntriesTitle: '✍️ Tagebucheinträge', journalPrivateNote: '🔒 Nur du kannst deine Tagebucheinträge sehen.', journalPrivateBadge: '🔒 Privat', journalEntryDate: 'Datum und Uhrzeit', journalEntryTitle: 'Titel', journalEntryText: 'Text', journalEntryTitlePlaceholder: 'Gib dem Eintrag einen Titel', journalEntryTextPlaceholder: 'Schreib deinen Tagebucheintrag …', journalEntrySave: 'Eintrag speichern', journalEntryUpdate: 'Änderungen speichern', journalEntryCancel: 'Bearbeiten abbrechen', journalEntrySearch: 'Einträge durchsuchen …', journalFavoritesOnly: 'Nur Favoriten', journalNoEntries: 'Noch keine Tagebucheinträge.', journalEdit: 'Bearbeiten', journalDelete: 'Löschen', journalFavorite: 'Zu Favoriten hinzufügen', journalUnfavorite: 'Aus Favoriten entfernen', journalEntrySaved: 'Tagebucheintrag gespeichert.', journalEntryDeleted: 'Tagebucheintrag gelöscht.', journalConfirmDelete: 'Diesen Tagebucheintrag löschen?', journalEntryCloudError: 'Cloud-Speichern fehlgeschlagen. Der Eintrag ist noch auf diesem Gerät gespeichert; prüfe die Journal-SQL-Migration.' },
  es: { journalHistoryTitle: '📓 Entrada del diario', journalHistoryEmpty: 'No hay ninguna entrada guardada para este día.', journalEntriesTitle: '✍️ Entradas del diario', journalPrivateNote: '🔒 Solo tú puedes ver tus entradas.', journalPrivateBadge: '🔒 Privada', journalEntryDate: 'Fecha y hora', journalEntryTitle: 'Título', journalEntryText: 'Texto', journalEntryTitlePlaceholder: 'Ponle un título a esta entrada', journalEntryTextPlaceholder: 'Escribe tu entrada del diario…', journalEntrySave: 'Guardar entrada', journalEntryUpdate: 'Guardar cambios', journalEntryCancel: 'Cancelar edición', journalEntrySearch: 'Buscar en tus entradas…', journalFavoritesOnly: 'Solo favoritos', journalNoEntries: 'Aún no hay entradas del diario.', journalEdit: 'Editar', journalDelete: 'Eliminar', journalFavorite: 'Añadir a favoritos', journalUnfavorite: 'Quitar de favoritos', journalEntrySaved: 'Entrada guardada.', journalEntryDeleted: 'Entrada eliminada.', journalConfirmDelete: '¿Eliminar esta entrada del diario?', journalEntryCloudError: 'No se pudo guardar en la nube. La entrada sigue guardada en este dispositivo; comprueba la migración SQL del diario.' },
  it: { journalHistoryTitle: '📓 Voce del diario', journalHistoryEmpty: 'Non hai voci del diario salvate per questo giorno.', journalEntriesTitle: '✍️ Voci del diario', journalPrivateNote: '🔒 Solo tu puoi vedere le tue voci.', journalPrivateBadge: '🔒 Privata', journalEntryDate: 'Data e ora', journalEntryTitle: 'Titolo', journalEntryText: 'Testo', journalEntryTitlePlaceholder: 'Dai un titolo a questa voce', journalEntryTextPlaceholder: 'Scrivi la tua voce di diario…', journalEntrySave: 'Salva voce', journalEntryUpdate: 'Salva modifiche', journalEntryCancel: 'Annulla modifica', journalEntrySearch: 'Cerca nelle tue voci…', journalFavoritesOnly: 'Solo preferiti', journalNoEntries: 'Non hai ancora voci di diario.', journalEdit: 'Modifica', journalDelete: 'Elimina', journalFavorite: 'Aggiungi ai preferiti', journalUnfavorite: 'Rimuovi dai preferiti', journalEntrySaved: 'Voce del diario salvata.', journalEntryDeleted: 'Voce del diario eliminata.', journalConfirmDelete: 'Vuoi eliminare questa voce del diario?', journalEntryCloudError: 'Salvataggio cloud non riuscito. La voce è ancora salvata su questo dispositivo; controlla la migrazione SQL del diario.' },
  el: { journalHistoryTitle: '📓 Καταχώριση ημερολογίου', journalHistoryEmpty: 'Δεν υπάρχει αποθηκευμένη καταχώριση για αυτή την ημέρα.', journalEntriesTitle: '✍️ Καταχωρίσεις ημερολογίου', journalPrivateNote: '🔒 Μόνο εσύ μπορείς να δεις τις καταχωρίσεις σου.', journalPrivateBadge: '🔒 Ιδιωτική', journalEntryDate: 'Ημερομηνία και ώρα', journalEntryTitle: 'Τίτλος', journalEntryText: 'Κείμενο', journalEntryTitlePlaceholder: 'Δώσε τίτλο σε αυτή την καταχώριση', journalEntryTextPlaceholder: 'Γράψε την καταχώρισή σου…', journalEntrySave: 'Αποθήκευση καταχώρισης', journalEntryUpdate: 'Αποθήκευση αλλαγών', journalEntryCancel: 'Ακύρωση επεξεργασίας', journalEntrySearch: 'Αναζήτηση στις καταχωρίσεις…', journalFavoritesOnly: 'Μόνο αγαπημένα', journalNoEntries: 'Δεν υπάρχουν ακόμη καταχωρίσεις.', journalEdit: 'Επεξεργασία', journalDelete: 'Διαγραφή', journalFavorite: 'Προσθήκη στα αγαπημένα', journalUnfavorite: 'Αφαίρεση από τα αγαπημένα', journalEntrySaved: 'Η καταχώριση αποθηκεύτηκε.', journalEntryDeleted: 'Η καταχώριση διαγράφηκε.', journalConfirmDelete: 'Να διαγραφεί αυτή η καταχώριση;', journalEntryCloudError: 'Η αποθήκευση στο cloud απέτυχε. Η καταχώριση παραμένει σε αυτή τη συσκευή· έλεγξε τη SQL migration του ημερολογίου.' },
  pt: { journalHistoryTitle: '📓 Entrada do diário', journalHistoryEmpty: 'Não há nenhuma entrada guardada para este dia.', journalEntriesTitle: '✍️ Entradas do diário', journalPrivateNote: '🔒 Só tu podes ver as tuas entradas.', journalPrivateBadge: '🔒 Privada', journalEntryDate: 'Data e hora', journalEntryTitle: 'Título', journalEntryText: 'Texto', journalEntryTitlePlaceholder: 'Dá um título a esta entrada', journalEntryTextPlaceholder: 'Escreve a tua entrada do diário…', journalEntrySave: 'Guardar entrada', journalEntryUpdate: 'Guardar alterações', journalEntryCancel: 'Cancelar edição', journalEntrySearch: 'Pesquisar nas tuas entradas…', journalFavoritesOnly: 'Só favoritos', journalNoEntries: 'Ainda não há entradas no diário.', journalEdit: 'Editar', journalDelete: 'Eliminar', journalFavorite: 'Adicionar aos favoritos', journalUnfavorite: 'Remover dos favoritos', journalEntrySaved: 'Entrada guardada.', journalEntryDeleted: 'Entrada eliminada.', journalConfirmDelete: 'Eliminar esta entrada do diário?', journalEntryCloudError: 'Falha ao guardar na cloud. A entrada continua guardada neste dispositivo; verifica a migração SQL do diário.' }
};
for (const [lang, copy] of Object.entries(journalHistoryLocaleCopy)) {
  Object.assign(translations[lang], copy);
  Object.assign(extraTranslations[lang], copy);
}
const journalEntryStatusCopy = {
  en: { journalEntrySavedLocal: 'Saved on this device.', journalEntryCloudUnavailable: 'Cloud journal unavailable. Your entries are still saved on this device; check the journal SQL migration.', journalEntryValidation: 'Add a title and some text before saving.', journalStreakText: '🔥 {count}-day journal streak', journalStreakStart: 'Start your journal streak today', journalWeekRecap: '📅 Weekly recap', journalMonthRecap: '🗓️ Monthly recap', journalDaysLabel: '{count} journal days', journalCountLabel: '{count} entries', journalEntriesRecap: 'Entries', journalReflectionsRecap: 'Daily reflections', journalFavoritesRecap: 'Favorite entries', journalNoRecap: 'No journal activity in this period yet.', journalReminderTitle: '📓 Journal reminder', journalReminderIntro: 'A daily nudge if you have not written an entry yet. Works while the app is open.', journalReminderEnable: 'Remind me to journal', journalReminderTime: 'Reminder time', journalReminderSave: '💾 Save journal reminder', journalReminderSaved: 'Journal reminder saved.', journalReminderDisabled: 'Journal reminders are off.', journalReminderPermission: 'Allow browser notifications to enable journal reminders.', journalReminderUnsupported: 'This browser does not support notifications.', journalReminderNoticeTitle: 'Time for your journal ✍️', journalReminderNoticeBody: 'Take a moment to write today’s journal entry.' },
  de: { journalEntrySavedLocal: 'Auf diesem Gerät gespeichert.', journalEntryCloudUnavailable: 'Cloud-Journal nicht verfügbar. Deine Einträge bleiben auf diesem Gerät gespeichert; prüfe die Journal-SQL-Migration.', journalEntryValidation: 'Gib vor dem Speichern einen Titel und Text ein.', journalStreakText: '🔥 {count} Tage Journal-Serie', journalStreakStart: 'Starte heute deine Journal-Serie', journalWeekRecap: '📅 Wochenrückblick', journalMonthRecap: '🗓️ Monatsrückblick', journalDaysLabel: '{count} Journaltage', journalCountLabel: '{count} Einträge', journalEntriesRecap: 'Einträge', journalReflectionsRecap: 'Tägliche Reflexionen', journalFavoritesRecap: 'Favoriten', journalNoRecap: 'In diesem Zeitraum gibt es noch keine Journaleinträge.', journalReminderTitle: '📓 Journal-Erinnerung', journalReminderIntro: 'Tägliche Erinnerung, wenn du noch keinen Eintrag geschrieben hast. Funktioniert bei geöffneter App.', journalReminderEnable: 'Mich ans Journaling erinnern', journalReminderTime: 'Erinnerungszeit', journalReminderSave: '💾 Journal-Erinnerung speichern', journalReminderSaved: 'Journal-Erinnerung gespeichert.', journalReminderDisabled: 'Journal-Erinnerungen sind ausgeschaltet.', journalReminderPermission: 'Erlaube Browser-Benachrichtigungen für Journal-Erinnerungen.', journalReminderUnsupported: 'Dieser Browser unterstützt keine Benachrichtigungen.', journalReminderNoticeTitle: 'Zeit für dein Journal ✍️', journalReminderNoticeBody: 'Nimm dir einen Moment für deinen heutigen Tagebucheintrag.' },
  es: { journalEntrySavedLocal: 'Guardado en este dispositivo.', journalEntryCloudUnavailable: 'El diario en la nube no está disponible. Las entradas siguen guardadas en este dispositivo; comprueba la migración SQL.', journalEntryValidation: 'Añade un título y escribe algo antes de guardar.', journalStreakText: '🔥 {count} días seguidos con el diario', journalWeekRecap: '📅 Resumen semanal', journalMonthRecap: '🗓️ Resumen mensual', journalDaysLabel: '{count} días con diario', journalCountLabel: '{count} entradas', journalEntriesRecap: 'Entradas', journalFavoritesRecap: 'Favoritas', journalNoRecap: 'Aún no hay actividad del diario en este periodo.', journalReminderTitle: '📓 Recordatorio del diario', journalReminderIntro: 'Un aviso diario si aún no has escrito. Funciona mientras la app está abierta.', journalReminderEnable: 'Recordarme escribir en el diario', journalReminderTime: 'Hora del recordatorio', journalReminderSave: '💾 Guardar recordatorio del diario', journalReminderSaved: 'Recordatorio del diario guardado.', journalReminderDisabled: 'Los recordatorios del diario están desactivados.', journalReminderPermission: 'Permite las notificaciones del navegador para activar los recordatorios.', journalReminderUnsupported: 'Este navegador no admite notificaciones.', journalReminderNoticeTitle: 'Es hora de escribir ✍️', journalReminderNoticeBody: 'Tómate un momento para escribir la entrada de hoy.' },
  it: { journalEntrySavedLocal: 'Salvato su questo dispositivo.', journalEntryCloudUnavailable: 'Diario cloud non disponibile. Le voci restano salvate su questo dispositivo; controlla la migrazione SQL.', journalEntryValidation: 'Aggiungi un titolo e scrivi qualcosa prima di salvare.', journalStreakText: '🔥 {count} giorni consecutivi di diario', journalWeekRecap: '📅 Riepilogo settimanale', journalMonthRecap: '🗓️ Riepilogo mensile', journalDaysLabel: '{count} giorni con il diario', journalCountLabel: '{count} voci', journalEntriesRecap: 'Voci', journalFavoritesRecap: 'Preferite', journalNoRecap: 'Nessuna attività del diario in questo periodo.', journalReminderTitle: '📓 Promemoria diario', journalReminderIntro: 'Un promemoria quotidiano se non hai ancora scritto. Funziona mentre l’app è aperta.', journalReminderEnable: 'Ricordami di scrivere il diario', journalReminderTime: 'Orario del promemoria', journalReminderSave: '💾 Salva promemoria diario', journalReminderSaved: 'Promemoria diario salvato.', journalReminderDisabled: 'I promemoria del diario sono disattivati.', journalReminderPermission: 'Consenti le notifiche del browser per attivare i promemoria.', journalReminderUnsupported: 'Questo browser non supporta le notifiche.', journalReminderNoticeTitle: 'È ora di scrivere ✍️', journalReminderNoticeBody: 'Dedica un momento alla voce di diario di oggi.' },
  el: { journalEntrySavedLocal: 'Αποθηκεύτηκε σε αυτή τη συσκευή.', journalEntryCloudUnavailable: 'Το ημερολόγιο cloud δεν είναι διαθέσιμο. Οι καταχωρίσεις παραμένουν σε αυτή τη συσκευή· έλεγξε τη SQL migration.', journalEntryValidation: 'Πρόσθεσε τίτλο και κείμενο πριν από την αποθήκευση.', journalStreakText: '🔥 {count} συνεχόμενες ημέρες ημερολογίου', journalWeekRecap: '📅 Εβδομαδιαία ανασκόπηση', journalMonthRecap: '🗓️ Μηνιαία ανασκόπηση', journalDaysLabel: '{count} ημέρες με ημερολόγιο', journalCountLabel: '{count} καταχωρίσεις', journalEntriesRecap: 'Καταχωρίσεις', journalFavoritesRecap: 'Αγαπημένες', journalNoRecap: 'Δεν υπάρχει ακόμη δραστηριότητα ημερολογίου για αυτή την περίοδο.', journalReminderTitle: '📓 Υπενθύμιση ημερολογίου', journalReminderIntro: 'Καθημερινή υπενθύμιση αν δεν έχεις γράψει ακόμη. Λειτουργεί όσο η εφαρμογή είναι ανοιχτή.', journalReminderEnable: 'Υπενθύμισέ μου να γράψω', journalReminderTime: 'Ώρα υπενθύμισης', journalReminderSave: '💾 Αποθήκευση υπενθύμισης ημερολογίου', journalReminderSaved: 'Η υπενθύμιση ημερολογίου αποθηκεύτηκε.', journalReminderDisabled: 'Οι υπενθυμίσεις ημερολογίου είναι απενεργοποιημένες.', journalReminderPermission: 'Επίτρεψε τις ειδοποιήσεις του προγράμματος περιήγησης για τις υπενθυμίσεις.', journalReminderUnsupported: 'Αυτό το πρόγραμμα περιήγησης δεν υποστηρίζει ειδοποιήσεις.', journalReminderNoticeTitle: 'Ώρα για ημερολόγιο ✍️', journalReminderNoticeBody: 'Αφιέρωσε λίγο χρόνο για τη σημερινή καταχώριση.' },
  pt: { journalEntrySavedLocal: 'Guardado neste dispositivo.', journalEntryCloudUnavailable: 'O diário na cloud não está disponível. As entradas continuam guardadas neste dispositivo; verifica a migração SQL.', journalEntryValidation: 'Adiciona um título e escreve algo antes de guardar.', journalStreakText: '🔥 {count} dias seguidos de diário', journalWeekRecap: '📅 Resumo semanal', journalMonthRecap: '🗓️ Resumo mensal', journalDaysLabel: '{count} dias com diário', journalCountLabel: '{count} entradas', journalEntriesRecap: 'Entradas', journalFavoritesRecap: 'Favoritas', journalNoRecap: 'Ainda não há atividade do diário neste período.', journalReminderTitle: '📓 Lembrete do diário', journalReminderIntro: 'Um lembrete diário se ainda não escreveste. Funciona com a app aberta.', journalReminderEnable: 'Lembrar-me de escrever no diário', journalReminderTime: 'Hora do lembrete', journalReminderSave: '💾 Guardar lembrete do diário', journalReminderSaved: 'Lembrete do diário guardado.', journalReminderDisabled: 'Os lembretes do diário estão desligados.', journalReminderPermission: 'Permite notificações do navegador para ativar os lembretes.', journalReminderUnsupported: 'Este navegador não suporta notificações.', journalReminderNoticeTitle: 'Está na hora de escrever ✍️', journalReminderNoticeBody: 'Reserva um momento para escrever a entrada de hoje.' }
};
const journalAddonCopy = {
  es: { journalStreakStart: 'Empieza hoy tu racha de escritura', journalReflectionsRecap: 'Reflexiones diarias' },
  it: { journalStreakStart: 'Inizia oggi la tua serie di scrittura', journalReflectionsRecap: 'Riflessioni quotidiane' },
  el: { journalStreakStart: 'Ξεκίνα σήμερα το σερί ημερολογίου σου', journalReflectionsRecap: 'Καθημερινές σκέψεις' },
  pt: { journalStreakStart: 'Começa hoje a tua sequência de escrita', journalReflectionsRecap: 'Reflexões diárias' }
};
for (const [lang, additions] of Object.entries(journalAddonCopy)) Object.assign(journalEntryStatusCopy[lang], additions);
for (const [lang, copy] of Object.entries(journalEntryStatusCopy)) {
  Object.assign(translations[lang], copy);
  Object.assign(extraTranslations[lang], copy);
}
const defaultNewUiCopy = {
  monthTasksDone: 'Tasks this month', overallCompletionRate: 'Overall completion rate', bossTowerNextReward: '{count} wins until the next tower reward.',
  dailyRewardAlreadyClaimed: 'You already claimed today’s bonus.', dailyRewardClaimed: 'You earned 10 bonus points!',
  dataExported: 'Your data export is ready.', feedNewest: 'Newest', feedFriends: 'Friends', feedMine: 'My posts', postLike: 'Like', postLiked: 'Liked', postComments: 'Comments', postCommentPlaceholder: 'Write a comment…', postCommentSend: 'Send', postDelete: 'Delete', postDeleteConfirm: 'Delete this post?',
  refreshFeed: '↻ Refresh', feedNoFriendPosts: 'Your friends have not posted yet.', feedOnlyMineEmpty: 'You have not posted yet.',
  accessibilityTitle: '♿ Display & accessibility', largeTextLabel: 'Larger text', reduceMotionLabel: 'Reduce motion',
  highContrastLabel: 'High contrast', exportDataButton: '⬇️ Download my data',
  journalTitle: '📓 Daily journal', journalIntro: 'A small check-in for today. Your entry is private.',
  journalGood: 'What went well today?', journalTomorrow: 'What can go better tomorrow?', journalGrateful: 'Things I’m grateful for:',
  journalGoodPlaceholder: 'Write something that went well…', journalTomorrowPlaceholder: 'One thing you want to improve…',
  journalGratefulPlaceholder: 'People, moments, or little things…', journalSave: 'Save today’s journal', journalSaved: 'Today’s journal saved.'
};
Object.assign(translations.en, defaultNewUiCopy);
Object.assign(extraTranslations.en, defaultNewUiCopy);
const germanNewUiCopy = { ...defaultNewUiCopy, journalTitle: '📓 Tagesjournal', journalIntro: 'Ein kurzer Tagesrückblick. Dein Eintrag ist privat.', journalGood: 'Was lief heute gut?', journalTomorrow: 'Was kann morgen besser laufen?', journalGrateful: 'Dinge, für die ich dankbar bin:', journalGoodPlaceholder: 'Schreib auf, was heute gut lief …', journalTomorrowPlaceholder: 'Eine Sache, die du verbessern möchtest …', journalGratefulPlaceholder: 'Menschen, Momente oder Kleinigkeiten …', journalSave: 'Journal für heute speichern', journalSaved: 'Dein Journal für heute wurde gespeichert.', monthTasksDone: 'Aufgaben diesen Monat', overallCompletionRate: 'Gesamt-Abschlussquote', bossTowerNextReward: 'Noch {count} Siege bis zur nächsten Turmbelohnung.', dailyRewardAlreadyClaimed: 'Du hast den Tagesbonus schon abgeholt.', dailyRewardClaimed: 'Du hast 10 Bonuspunkte erhalten!', dataExported: 'Dein Datenexport ist bereit.', feedNewest: 'Neueste', feedFriends: 'Freunde', feedMine: 'Meine Beiträge', refreshFeed: '↻ Aktualisieren', feedNoFriendPosts: 'Deine Freunde haben noch nichts veröffentlicht.', feedOnlyMineEmpty: 'Du hast noch nichts veröffentlicht.', accessibilityTitle: '♿ Anzeige & Barrierefreiheit', largeTextLabel: 'Größere Schrift', reduceMotionLabel: 'Bewegungen reduzieren', highContrastLabel: 'Hoher Kontrast', exportDataButton: '⬇️ Meine Daten herunterladen', postLike: 'Gefällt mir', postLiked: 'Gefällt dir', postComments: 'Kommentare', postCommentPlaceholder: 'Kommentar schreiben…', postCommentSend: 'Senden', postDelete: 'Löschen', postDeleteConfirm: 'Diesen Beitrag löschen?', shopSoftBell: 'Sanfte Glocke', shopSoftBellDesc: 'Helle, ruhige Glockentöne als kleine Belohnung.', shopWoodblock: 'Holzklang', shopWoodblockDesc: 'Warme, kurze Klopfklänge.', shopArcade: 'Arcade', shopArcadeDesc: 'Ein verspielter Retro-Sound für erledigte Aufgaben.', shopRaindrop: 'Regentropfen', shopRaindropDesc: 'Sanfte, fallende Töne wie kleine Regentropfen.' };
const spanishNewUiCopy = { ...defaultNewUiCopy, journalTitle: '📓 Diario diario', journalIntro: 'Un pequeño repaso del día. Tu entrada es privada.', journalGood: '¿Qué ha ido bien hoy?', journalTomorrow: '¿Qué puede ir mejor mañana?', journalGrateful: 'Cosas por las que estoy agradecido/a:', journalGoodPlaceholder: 'Escribe algo que haya ido bien…', journalTomorrowPlaceholder: 'Algo que quieras mejorar…', journalGratefulPlaceholder: 'Personas, momentos o pequeños detalles…', journalSave: 'Guardar el diario de hoy', journalSaved: 'El diario de hoy se ha guardado.', monthTasksDone: 'Tareas este mes', overallCompletionRate: 'Tasa total de finalización', bossTowerNextReward: 'Faltan {count} victorias para la próxima recompensa de la torre.', dailyRewardAlreadyClaimed: 'Ya has reclamado el bonus de hoy.', dailyRewardClaimed: '¡Has ganado 10 puntos extra!', dataExported: 'La exportación de datos está lista.', feedNewest: 'Más recientes', feedFriends: 'Amigos', feedMine: 'Mis publicaciones', refreshFeed: '↻ Actualizar', feedNoFriendPosts: 'Tus amigos aún no han publicado.', feedOnlyMineEmpty: 'Aún no has publicado.', accessibilityTitle: '♿ Pantalla y accesibilidad', largeTextLabel: 'Texto más grande', reduceMotionLabel: 'Reducir movimiento', highContrastLabel: 'Alto contraste', exportDataButton: '⬇️ Descargar mis datos', postLike: 'Me gusta', postLiked: 'Te gusta', postComments: 'Comentarios', postCommentPlaceholder: 'Escribe un comentario…', postCommentSend: 'Enviar', postDelete: 'Eliminar', postDeleteConfirm: '¿Eliminar esta publicación?', shopSoftBell: 'Campana suave', shopSoftBellDesc: 'Notas de campana suaves y brillantes como pequeña recompensa.', shopWoodblock: 'Madera', shopWoodblockDesc: 'Golpecitos cálidos y breves de madera.', shopArcade: 'Arcade', shopArcadeDesc: 'Un sonido retro divertido para las tareas completadas.', shopRaindrop: 'Gotas de lluvia', shopRaindropDesc: 'Tonos suaves y descendentes como pequeñas gotas.' };
Object.assign(translations.de, germanNewUiCopy); Object.assign(extraTranslations.de, germanNewUiCopy);
Object.assign(translations.es, spanishNewUiCopy); Object.assign(extraTranslations.es, spanishNewUiCopy);
const journalShopLeaderboardCopy = {
  en: { profileReport: 'Profile report', postReport: 'Post report', messageReport: 'Message report', xpLeaderboard: '🏆 XP leaderboard', xpLeaderboardIntro: 'Compare levels with the community or your friends.', leaderboardGlobal: 'Global', leaderboardFriends: 'Friends', leaderboardLoading: 'Loading leaderboard…', leaderboardError: 'Could not load leaderboard: {error}', leaderboardEmpty: 'No results yet.', leaderboardYou: 'You', leaderboardXp: '{xp} XP', socialReportTitle: '⚑ Report profile or post', reportProfile: '⚑ Report profile', reportPost: '⚑ Report post', reportedProfile: 'Profile reported', reportedPost: 'Post reported' },
  de: { profileReport: 'Profilmeldung', postReport: 'Beitragsmeldung', messageReport: 'Nachrichtenmeldung', shopSoftBell: 'Sanfte Glocke', shopSoftBellDesc: 'Helle, ruhige Glockentöne als kleine Belohnung.', shopWoodblock: 'Holzklang', shopWoodblockDesc: 'Warme, kurze Klopfklänge.', shopArcade: 'Arcade', shopArcadeDesc: 'Ein verspielter Retro-Sound für erledigte Aufgaben.', shopRaindrop: 'Regentropfen', shopRaindropDesc: 'Sanfte, fallende Töne wie kleine Regentropfen.', journalTitle: '📓 Tagesjournal', journalIntro: 'Ein kurzer Tagesrückblick. Dein Eintrag ist privat.', journalGood: 'Was lief heute gut?', journalTomorrow: 'Was kann morgen besser laufen?', journalGrateful: 'Dinge, für die ich dankbar bin:', journalGoodPlaceholder: 'Schreib auf, was heute gut lief …', journalTomorrowPlaceholder: 'Eine Sache, die du verbessern möchtest …', journalGratefulPlaceholder: 'Menschen, Momente oder Kleinigkeiten …', journalSave: 'Journal für heute speichern', journalSaved: 'Dein Journal für heute wurde gespeichert.', journalSavedLocal: 'Auf diesem Gerät gespeichert.', journalSaving: 'Wird gespeichert …', journalSaveError: 'Journal konnte nicht gespeichert werden. Prüfe die Journal-Migration in Supabase.', journalCloudUnavailable: 'Cloud-Journal nicht verfügbar. Dein lokaler Entwurf bleibt erhalten; führe die Journal-SQL-Migration aus.', xpLeaderboard: '🏆 XP-Rangliste', xpLeaderboardIntro: 'Vergleiche dein Level mit der Community oder deinen Freunden.', leaderboardGlobal: 'Global', leaderboardFriends: 'Freunde', leaderboardLoading: 'Rangliste wird geladen…', leaderboardError: 'Rangliste konnte nicht geladen werden: {error}', leaderboardEmpty: 'Noch keine Ergebnisse.', leaderboardYou: 'Du', leaderboardXp: '{xp} XP', socialReportTitle: '⚑ Profil oder Beitrag melden', reportProfile: '⚑ Profil melden', reportPost: '⚑ Beitrag melden', reportedProfile: 'Profil gemeldet', reportedPost: 'Beitrag gemeldet' },
  es: { profileReport: 'Denuncia de perfil', postReport: 'Denuncia de publicación', messageReport: 'Denuncia de mensaje', shopSoftBell: 'Campana suave', shopSoftBellDesc: 'Notas de campana suaves y brillantes como pequeña recompensa.', shopWoodblock: 'Madera', shopWoodblockDesc: 'Golpecitos cálidos y breves de madera.', shopArcade: 'Arcade', shopArcadeDesc: 'Un sonido retro divertido para las tareas completadas.', shopRaindrop: 'Gotas de lluvia', shopRaindropDesc: 'Tonos suaves y descendentes como pequeñas gotas.', journalTitle: '📓 Diario diario', journalIntro: 'Un pequeño repaso del día. Tu entrada es privada.', journalGood: '¿Qué ha ido bien hoy?', journalTomorrow: '¿Qué puede ir mejor mañana?', journalGrateful: 'Cosas por las que estoy agradecido/a:', journalGoodPlaceholder: 'Escribe algo que haya ido bien…', journalTomorrowPlaceholder: 'Algo que quieras mejorar…', journalGratefulPlaceholder: 'Personas, momentos o pequeños detalles…', journalSave: 'Guardar el diario de hoy', journalSaved: 'El diario de hoy se ha guardado.', journalSavedLocal: 'Guardado en este dispositivo.', journalSaving: 'Guardando…', journalSaveError: 'No se pudo guardar el diario. Comprueba la migración de la tabla en Supabase.', journalCloudUnavailable: 'El diario en la nube no está disponible. El borrador local se conserva; ejecuta la migración SQL del diario.', xpLeaderboard: '🏆 Clasificación de XP', xpLeaderboardIntro: 'Compara tu nivel con la comunidad o tus amigos.', leaderboardGlobal: 'Global', leaderboardFriends: 'Amigos', leaderboardLoading: 'Cargando clasificación…', leaderboardError: 'No se pudo cargar la clasificación: {error}', leaderboardEmpty: 'Aún no hay resultados.', leaderboardYou: 'Tú', leaderboardXp: '{xp} XP', socialReportTitle: '⚑ Denunciar perfil o publicación', reportProfile: '⚑ Denunciar perfil', reportPost: '⚑ Denunciar publicación', reportedProfile: 'Perfil denunciado', reportedPost: 'Publicación denunciada' }
};
for (const [lang, copy] of Object.entries(journalShopLeaderboardCopy)) {
  Object.assign(translations[lang], copy);
  Object.assign(extraTranslations[lang], copy);
}
const socialEnhancementCopy = {
  en: { socialSavedPosts: '🔖 Saved', socialSavedEmpty: 'You have no saved posts yet.', socialSavePost: '🔖 Save', socialPostSaved: '✓ Saved', socialPollTypeLabel: 'Add a poll', socialPollNone: 'No poll', socialPollSingle: 'Single choice', socialPollMultiple: 'Multiple choice', socialPollYesNo: 'Yes / No', socialPollOptionsLabel: 'Answer options', socialPollOptionsPlaceholder: 'One option per line', socialPollOptionsHint: 'Enter 2 to 6 options, one per line.', socialPollDurationLabel: 'Poll duration', socialPollNoExpiry: 'No expiry', socialPoll24h: '24 hours', socialPoll7d: '7 days', socialPollVote: 'Vote', socialPollUpdateVote: 'Update vote', socialPollResults: 'Results', socialPollVotes: '{count} votes', socialPollExpired: 'Poll ended', socialPollYes: 'Yes', socialPollNo: 'No', socialPollInvalidOptions: 'Add 2 to 6 different poll options.', socialPollVoteError: 'Your vote could not be saved: {error}', socialPollCreated: 'Poll published.' },
  de: { socialSavedPosts: '🔖 Gespeichert', socialSavedEmpty: 'Du hast noch keine Beiträge gespeichert.', socialSavePost: '🔖 Speichern', socialPostSaved: '✓ Gespeichert', socialPollTypeLabel: 'Umfrage hinzufügen', socialPollNone: 'Keine Umfrage', socialPollSingle: 'Einzelauswahl', socialPollMultiple: 'Mehrfachauswahl', socialPollYesNo: 'Ja / Nein', socialPollOptionsLabel: 'Antwortoptionen', socialPollOptionsPlaceholder: 'Eine Option pro Zeile', socialPollOptionsHint: 'Gib 2 bis 6 Optionen ein, eine pro Zeile.', socialPollDurationLabel: 'Laufzeit', socialPollNoExpiry: 'Ohne Ablauf', socialPoll24h: '24 Stunden', socialPoll7d: '7 Tage', socialPollVote: 'Abstimmen', socialPollUpdateVote: 'Stimme ändern', socialPollResults: 'Ergebnisse', socialPollVotes: '{count} Stimmen', socialPollExpired: 'Umfrage beendet', socialPollYes: 'Ja', socialPollNo: 'Nein', socialPollInvalidOptions: 'Füge 2 bis 6 unterschiedliche Optionen hinzu.', socialPollVoteError: 'Deine Stimme konnte nicht gespeichert werden: {error}', socialPollCreated: 'Umfrage veröffentlicht.' },
  es: { socialSavedPosts: '🔖 Guardadas', socialSavedEmpty: 'Aún no tienes publicaciones guardadas.', socialSavePost: '🔖 Guardar', socialPostSaved: '✓ Guardada', socialPollTypeLabel: 'Añadir encuesta', socialPollNone: 'Sin encuesta', socialPollSingle: 'Una opción', socialPollMultiple: 'Varias opciones', socialPollYesNo: 'Sí / No', socialPollOptionsLabel: 'Opciones de respuesta', socialPollOptionsPlaceholder: 'Una opción por línea', socialPollOptionsHint: 'Escribe de 2 a 6 opciones, una por línea.', socialPollDurationLabel: 'Duración', socialPollNoExpiry: 'Sin caducidad', socialPoll24h: '24 horas', socialPoll7d: '7 días', socialPollVote: 'Votar', socialPollUpdateVote: 'Cambiar voto', socialPollResults: 'Resultados', socialPollVotes: '{count} votos', socialPollExpired: 'Encuesta finalizada', socialPollYes: 'Sí', socialPollNo: 'No', socialPollInvalidOptions: 'Añade de 2 a 6 opciones diferentes.', socialPollVoteError: 'No se pudo guardar tu voto: {error}', socialPollCreated: 'Encuesta publicada.' },
  it: { socialSavedPosts: '🔖 Salvati', socialSavedEmpty: 'Non hai ancora post salvati.', socialSavePost: '🔖 Salva', socialPostSaved: '✓ Salvato', socialPollTypeLabel: 'Aggiungi un sondaggio', socialPollNone: 'Nessun sondaggio', socialPollSingle: 'Scelta singola', socialPollMultiple: 'Scelta multipla', socialPollYesNo: 'Sì / No', socialPollOptionsLabel: 'Opzioni di risposta', socialPollOptionsPlaceholder: 'Un’opzione per riga', socialPollOptionsHint: 'Inserisci da 2 a 6 opzioni, una per riga.', socialPollDurationLabel: 'Durata del sondaggio', socialPollNoExpiry: 'Senza scadenza', socialPoll24h: '24 ore', socialPoll7d: '7 giorni', socialPollVote: 'Vota', socialPollUpdateVote: 'Modifica voto', socialPollResults: 'Risultati', socialPollVotes: '{count} voti', socialPollExpired: 'Sondaggio terminato', socialPollYes: 'Sì', socialPollNo: 'No', socialPollInvalidOptions: 'Aggiungi da 2 a 6 opzioni diverse.', socialPollVoteError: 'Impossibile salvare il voto: {error}', socialPollCreated: 'Sondaggio pubblicato.' },
  el: { socialSavedPosts: '🔖 Αποθηκευμένα', socialSavedEmpty: 'Δεν έχεις αποθηκευμένες αναρτήσεις ακόμα.', socialSavePost: '🔖 Αποθήκευση', socialPostSaved: '✓ Αποθηκεύτηκε', socialPollTypeLabel: 'Προσθήκη δημοσκόπησης', socialPollNone: 'Χωρίς δημοσκόπηση', socialPollSingle: 'Μία επιλογή', socialPollMultiple: 'Πολλαπλές επιλογές', socialPollYesNo: 'Ναι / Όχι', socialPollOptionsLabel: 'Επιλογές απάντησης', socialPollOptionsPlaceholder: 'Μία επιλογή ανά γραμμή', socialPollOptionsHint: 'Γράψε 2 έως 6 επιλογές, μία ανά γραμμή.', socialPollDurationLabel: 'Διάρκεια', socialPollNoExpiry: 'Χωρίς λήξη', socialPoll24h: '24 ώρες', socialPoll7d: '7 ημέρες', socialPollVote: 'Ψήφος', socialPollUpdateVote: 'Αλλαγή ψήφου', socialPollResults: 'Αποτελέσματα', socialPollVotes: '{count} ψήφοι', socialPollExpired: 'Η δημοσκόπηση έληξε', socialPollYes: 'Ναι', socialPollNo: 'Όχι', socialPollInvalidOptions: 'Πρόσθεσε 2 έως 6 διαφορετικές επιλογές.', socialPollVoteError: 'Δεν ήταν δυνατή η αποθήκευση της ψήφου: {error}', socialPollCreated: 'Η δημοσκόπηση δημοσιεύτηκε.' },
  pt: { socialSavedPosts: '🔖 Guardadas', socialSavedEmpty: 'Ainda não tens publicações guardadas.', socialSavePost: '🔖 Guardar', socialPostSaved: '✓ Guardada', socialPollTypeLabel: 'Adicionar sondagem', socialPollNone: 'Sem sondagem', socialPollSingle: 'Escolha única', socialPollMultiple: 'Escolha múltipla', socialPollYesNo: 'Sim / Não', socialPollOptionsLabel: 'Opções de resposta', socialPollOptionsPlaceholder: 'Uma opção por linha', socialPollOptionsHint: 'Escreve 2 a 6 opções, uma por linha.', socialPollDurationLabel: 'Duração', socialPollNoExpiry: 'Sem prazo', socialPoll24h: '24 horas', socialPoll7d: '7 dias', socialPollVote: 'Votar', socialPollUpdateVote: 'Alterar voto', socialPollResults: 'Resultados', socialPollVotes: '{count} votos', socialPollExpired: 'Sondagem encerrada', socialPollYes: 'Sim', socialPollNo: 'Não', socialPollInvalidOptions: 'Adiciona 2 a 6 opções diferentes.', socialPollVoteError: 'Não foi possível guardar o teu voto: {error}', socialPollCreated: 'Sondagem publicada.' }
};
for (const [lang, copy] of Object.entries(socialEnhancementCopy)) {
  Object.assign(translations[lang], copy);
  Object.assign(extraTranslations[lang], copy);
}
const groupUiCopy = {
  en: { socialGroupsTitle: '👥 Groups', socialGroupsIntro: 'Create group chats with friends and work toward shared goals.', socialGroupNameLabel: 'Group name', socialGroupNamePlaceholder: 'Name your group', socialGroupMembersLabel: 'Invite friends', socialGroupMembersHint: 'Select at least one confirmed friend.', socialCreateGroup: 'Create group', socialNoGroups: 'No groups yet. Create one and invite friends.', socialGroupCreated: 'Group created.', socialGroupChat: 'Open group chat', socialGroupMemberCount: '{count} members', socialGroupGoalsTitle: '🎯 Group goals', socialGroupGoalNamePlaceholder: 'Goal name', socialGroupGoalDescriptionPlaceholder: 'Description (optional)', socialGroupGoalTargetLabel: 'Check-ins needed', socialGroupGoalDateLabel: 'Target date', socialCreateGroupGoal: 'Create group goal', socialGroupGoalCreated: 'Group goal created.', socialNoGroupGoals: 'No group goals yet.', socialGroupCheckin: '+1 check-in', socialReportGroupMessage: '⚑ Report message', socialGroupLoading: 'Loading groups…', socialGroupError: 'Could not load groups: {error}', socialGroupChoose: 'Choose a group or friend to chat.' },
  de: { socialGroupsTitle: '👥 Gruppen', socialGroupsIntro: 'Erstelle Gruppenchats mit Freunden und erreicht gemeinsam Ziele.', socialGroupNameLabel: 'Gruppenname', socialGroupNamePlaceholder: 'Name der Gruppe', socialGroupMembersLabel: 'Freunde einladen', socialGroupMembersHint: 'Wähle mindestens einen bestätigten Freund aus.', socialCreateGroup: 'Gruppe erstellen', socialNoGroups: 'Noch keine Gruppen. Erstelle eine und lade Freunde ein.', socialGroupCreated: 'Gruppe erstellt.', socialGroupChat: 'Gruppenchat öffnen', socialGroupMemberCount: '{count} Mitglieder', socialGroupGoalsTitle: '🎯 Gruppenziele', socialGroupGoalNamePlaceholder: 'Name des Ziels', socialGroupGoalDescriptionPlaceholder: 'Beschreibung (optional)', socialGroupGoalTargetLabel: 'Benötigte Check-ins', socialGroupGoalDateLabel: 'Zieldatum', socialCreateGroupGoal: 'Gruppenziel erstellen', socialGroupGoalCreated: 'Gruppenziel erstellt.', socialNoGroupGoals: 'Noch keine Gruppenziele.', socialGroupCheckin: '+1 Check-in', socialReportGroupMessage: '⚑ Nachricht melden', socialGroupLoading: 'Gruppen werden geladen …', socialGroupError: 'Gruppen konnten nicht geladen werden: {error}', socialGroupChoose: 'Wähle einen Gruppenchat oder Freund aus.' },
  es: { socialGroupsTitle: '👥 Grupos', socialGroupsIntro: 'Crea chats de grupo con amigos y avanzad juntos hacia objetivos.', socialGroupNameLabel: 'Nombre del grupo', socialGroupNamePlaceholder: 'Pon nombre al grupo', socialGroupMembersLabel: 'Invitar amigos', socialGroupMembersHint: 'Elige al menos un amigo confirmado.', socialCreateGroup: 'Crear grupo', socialNoGroups: 'Aún no hay grupos. Crea uno e invita a tus amigos.', socialGroupCreated: 'Grupo creado.', socialGroupChat: 'Abrir chat de grupo', socialGroupMemberCount: '{count} miembros', socialGroupGoalsTitle: '🎯 Objetivos del grupo', socialGroupGoalNamePlaceholder: 'Nombre del objetivo', socialGroupGoalDescriptionPlaceholder: 'Descripción (opcional)', socialGroupGoalTargetLabel: 'Registros necesarios', socialGroupGoalDateLabel: 'Fecha objetivo', socialCreateGroupGoal: 'Crear objetivo de grupo', socialGroupGoalCreated: 'Objetivo de grupo creado.', socialNoGroupGoals: 'Aún no hay objetivos de grupo.', socialGroupCheckin: '+1 registro', socialReportGroupMessage: '⚑ Denunciar mensaje', socialGroupLoading: 'Cargando grupos…', socialGroupError: 'No se pudieron cargar los grupos: {error}', socialGroupChoose: 'Elige un chat de grupo o un amigo.' },
  it: { socialGroupsTitle: '👥 Gruppi', socialGroupsIntro: 'Crea chat di gruppo con gli amici e raggiungete insieme i vostri obiettivi.', socialGroupNameLabel: 'Nome del gruppo', socialGroupNamePlaceholder: 'Dai un nome al gruppo', socialGroupMembersLabel: 'Invita amici', socialGroupMembersHint: 'Seleziona almeno un amico confermato.', socialCreateGroup: 'Crea gruppo', socialNoGroups: 'Non ci sono ancora gruppi. Creane uno e invita gli amici.', socialGroupCreated: 'Gruppo creato.', socialGroupChat: 'Apri chat di gruppo', socialGroupMemberCount: '{count} membri', socialGroupGoalsTitle: '🎯 Obiettivi del gruppo', socialGroupGoalNamePlaceholder: 'Nome dell’obiettivo', socialGroupGoalDescriptionPlaceholder: 'Descrizione (facoltativa)', socialGroupGoalTargetLabel: 'Check-in necessari', socialGroupGoalDateLabel: 'Data obiettivo', socialCreateGroupGoal: 'Crea obiettivo di gruppo', socialGroupGoalCreated: 'Obiettivo di gruppo creato.', socialNoGroupGoals: 'Nessun obiettivo di gruppo.', socialGroupCheckin: '+1 check-in', socialReportGroupMessage: '⚑ Segnala messaggio', socialGroupLoading: 'Caricamento gruppi…', socialGroupError: 'Impossibile caricare i gruppi: {error}', socialGroupChoose: 'Scegli una chat di gruppo o un amico.' },
  el: { socialGroupsTitle: '👥 Ομάδες', socialGroupsIntro: 'Δημιούργησε ομαδικές συνομιλίες με φίλους και πετύχετε κοινούς στόχους.', socialGroupNameLabel: 'Όνομα ομάδας', socialGroupNamePlaceholder: 'Δώσε όνομα στην ομάδα', socialGroupMembersLabel: 'Πρόσκληση φίλων', socialGroupMembersHint: 'Επίλεξε τουλάχιστον έναν επιβεβαιωμένο φίλο.', socialCreateGroup: 'Δημιουργία ομάδας', socialNoGroups: 'Δεν υπάρχουν ομάδες ακόμη. Δημιούργησε μία και κάλεσε φίλους.', socialGroupCreated: 'Η ομάδα δημιουργήθηκε.', socialGroupChat: 'Άνοιγμα ομαδικής συνομιλίας', socialGroupMemberCount: '{count} μέλη', socialGroupGoalsTitle: '🎯 Στόχοι ομάδας', socialGroupGoalNamePlaceholder: 'Όνομα στόχου', socialGroupGoalDescriptionPlaceholder: 'Περιγραφή (προαιρετική)', socialGroupGoalTargetLabel: 'Απαιτούμενα check-in', socialGroupGoalDateLabel: 'Ημερομηνία στόχου', socialCreateGroupGoal: 'Δημιουργία στόχου ομάδας', socialGroupGoalCreated: 'Ο στόχος ομάδας δημιουργήθηκε.', socialNoGroupGoals: 'Δεν υπάρχουν στόχοι ομάδας ακόμη.', socialGroupCheckin: '+1 καταχώριση', socialReportGroupMessage: '⚑ Αναφορά μηνύματος', socialGroupLoading: 'Φόρτωση ομάδων…', socialGroupError: 'Δεν ήταν δυνατή η φόρτωση ομάδων: {error}', socialGroupChoose: 'Επίλεξε ομαδική συνομιλία ή φίλο.' },
  pt: { socialGroupsTitle: '👥 Grupos', socialGroupsIntro: 'Cria conversas de grupo com amigos e avancem juntos nos objetivos.', socialGroupNameLabel: 'Nome do grupo', socialGroupNamePlaceholder: 'Dá um nome ao grupo', socialGroupMembersLabel: 'Convidar amigos', socialGroupMembersHint: 'Seleciona pelo menos um amigo confirmado.', socialCreateGroup: 'Criar grupo', socialNoGroups: 'Ainda não há grupos. Cria um e convida amigos.', socialGroupCreated: 'Grupo criado.', socialGroupChat: 'Abrir conversa de grupo', socialGroupMemberCount: '{count} membros', socialGroupGoalsTitle: '🎯 Objetivos do grupo', socialGroupGoalNamePlaceholder: 'Nome do objetivo', socialGroupGoalDescriptionPlaceholder: 'Descrição (opcional)', socialGroupGoalTargetLabel: 'Check-ins necessários', socialGroupGoalDateLabel: 'Data alvo', socialCreateGroupGoal: 'Criar objetivo de grupo', socialGroupGoalCreated: 'Objetivo de grupo criado.', socialNoGroupGoals: 'Ainda não há objetivos de grupo.', socialGroupCheckin: '+1 check-in', socialReportGroupMessage: '⚑ Denunciar mensagem', socialGroupLoading: 'A carregar grupos…', socialGroupError: 'Não foi possível carregar os grupos: {error}', socialGroupChoose: 'Escolhe uma conversa de grupo ou um amigo.' }
};
for (const [lang, copy] of Object.entries(groupUiCopy)) { Object.assign(translations[lang], copy); Object.assign(extraTranslations[lang], copy); }
const groupProfileRoleCopy = {
  en: { socialGroupDescriptionLabel: 'Description', socialGroupIconLabel: 'Group icon (emoji)', socialGroupBannerLabel: 'Banner image URL (https)', socialGroupManageTitle: '⚙️ Manage group', socialGroupManageButton: '⚙️ Manage', socialGroupSaveProfile: 'Save group profile', socialGroupProfileSaved: 'Group profile saved.', socialGroupRoleOwner: 'Owner', socialGroupRoleAdmin: 'Admin', socialGroupRoleModerator: 'Moderator', socialGroupRoleMember: 'Member', socialGroupMembersManage: 'Members & roles', socialGroupRoleSaved: 'Member role updated.', socialGroupProfileError: 'Could not save group profile: {error}', socialGroupRoleError: 'Could not update role: {error}', socialGroupBannerHint: 'Optional image URL; must start with https://' },
  de: { socialGroupDescriptionLabel: 'Beschreibung', socialGroupIconLabel: 'Gruppen-Icon (Emoji)', socialGroupBannerLabel: 'Banner-Bild-URL (https)', socialGroupManageTitle: '⚙️ Gruppe verwalten', socialGroupManageButton: '⚙️ Verwalten', socialGroupSaveProfile: 'Gruppenprofil speichern', socialGroupProfileSaved: 'Gruppenprofil gespeichert.', socialGroupRoleOwner: 'Besitzer', socialGroupRoleAdmin: 'Admin', socialGroupRoleModerator: 'Moderator', socialGroupRoleMember: 'Mitglied', socialGroupMembersManage: 'Mitglieder & Rollen', socialGroupRoleSaved: 'Mitgliederrolle aktualisiert.', socialGroupProfileError: 'Gruppenprofil konnte nicht gespeichert werden: {error}', socialGroupRoleError: 'Rolle konnte nicht geändert werden: {error}', socialGroupBannerHint: 'Optionaler Bildlink; muss mit https:// beginnen' },
  es: { socialGroupDescriptionLabel: 'Descripción', socialGroupIconLabel: 'Icono del grupo (emoji)', socialGroupBannerLabel: 'URL de la imagen del banner (https)', socialGroupManageTitle: '⚙️ Administrar grupo', socialGroupManageButton: '⚙️ Administrar', socialGroupSaveProfile: 'Guardar perfil del grupo', socialGroupProfileSaved: 'Perfil del grupo guardado.', socialGroupRoleOwner: 'Propietario', socialGroupRoleAdmin: 'Admin', socialGroupRoleModerator: 'Moderador', socialGroupRoleMember: 'Miembro', socialGroupMembersManage: 'Miembros y roles', socialGroupRoleSaved: 'Rol actualizado.', socialGroupProfileError: 'No se pudo guardar el perfil del grupo: {error}', socialGroupRoleError: 'No se pudo cambiar el rol: {error}', socialGroupBannerHint: 'URL de imagen opcional; debe empezar por https://' },
  it: { socialGroupDescriptionLabel: 'Descrizione', socialGroupIconLabel: 'Icona del gruppo (emoji)', socialGroupBannerLabel: 'URL immagine banner (https)', socialGroupManageTitle: '⚙️ Gestisci gruppo', socialGroupManageButton: '⚙️ Gestisci', socialGroupSaveProfile: 'Salva profilo del gruppo', socialGroupProfileSaved: 'Profilo del gruppo salvato.', socialGroupRoleOwner: 'Proprietario', socialGroupRoleAdmin: 'Admin', socialGroupRoleModerator: 'Moderatore', socialGroupRoleMember: 'Membro', socialGroupMembersManage: 'Membri e ruoli', socialGroupRoleSaved: 'Ruolo aggiornato.', socialGroupProfileError: 'Impossibile salvare il profilo del gruppo: {error}', socialGroupRoleError: 'Impossibile modificare il ruolo: {error}', socialGroupBannerHint: 'URL immagine facoltativo; deve iniziare con https://' },
  el: { socialGroupDescriptionLabel: 'Περιγραφή', socialGroupIconLabel: 'Εικονίδιο ομάδας (emoji)', socialGroupBannerLabel: 'URL εικόνας banner (https)', socialGroupManageTitle: '⚙️ Διαχείριση ομάδας', socialGroupManageButton: '⚙️ Διαχείριση', socialGroupSaveProfile: 'Αποθήκευση προφίλ ομάδας', socialGroupProfileSaved: 'Το προφίλ της ομάδας αποθηκεύτηκε.', socialGroupRoleOwner: 'Ιδιοκτήτης', socialGroupRoleAdmin: 'Διαχειριστής', socialGroupRoleModerator: 'Συντονιστής', socialGroupRoleMember: 'Μέλος', socialGroupMembersManage: 'Μέλη και ρόλοι', socialGroupRoleSaved: 'Ο ρόλος ενημερώθηκε.', socialGroupProfileError: 'Δεν ήταν δυνατή η αποθήκευση: {error}', socialGroupRoleError: 'Δεν ήταν δυνατή η αλλαγή ρόλου: {error}', socialGroupBannerHint: 'Προαιρετικό URL εικόνας· πρέπει να ξεκινά με https://' },
  pt: { socialGroupDescriptionLabel: 'Descrição', socialGroupIconLabel: 'Ícone do grupo (emoji)', socialGroupBannerLabel: 'URL da imagem do banner (https)', socialGroupManageTitle: '⚙️ Gerir grupo', socialGroupManageButton: '⚙️ Gerir', socialGroupSaveProfile: 'Guardar perfil do grupo', socialGroupProfileSaved: 'Perfil do grupo guardado.', socialGroupRoleOwner: 'Proprietário', socialGroupRoleAdmin: 'Admin', socialGroupRoleModerator: 'Moderador', socialGroupRoleMember: 'Membro', socialGroupMembersManage: 'Membros e funções', socialGroupRoleSaved: 'Função atualizada.', socialGroupProfileError: 'Não foi possível guardar o perfil do grupo: {error}', socialGroupRoleError: 'Não foi possível alterar a função: {error}', socialGroupBannerHint: 'URL de imagem opcional; deve começar por https://' }
};
for (const [lang, copy] of Object.entries(groupProfileRoleCopy)) { Object.assign(translations[lang], copy); Object.assign(extraTranslations[lang], copy); }
const groupCommerceCopy = {
  en: { groupInviteHeading: '🔗 Invite link', groupInviteExpiry: 'Link expires in', groupInviteOneDay: '1 day', groupInviteSevenDays: '7 days', groupInviteThirtyDays: '30 days', groupInviteCreate: 'Create invite link', groupInviteCopy: 'Copy link', groupInviteReady: 'Link ready · expires {date}', groupInviteCopied: 'Invite link copied.', groupInviteCopyManual: 'Copy the selected link manually.', groupInviteJoined: 'You joined {name}.', groupInviteJoinError: 'Could not join this group: {error}', groupInviteNoToken: 'Invite link is missing.', groupActivityHeading: '⚡ Group activity', groupActivityEmpty: 'No group activity yet.', groupActivityMessage: '{name} sent a message', groupActivityGoalCreated: '{name} created a group goal: {title}', groupActivityGoalCompleted: '{name} completed a group goal: {title}', shopPurchaseHistoryHeading: '🧾 Purchase history', shopHistoryEmpty: 'No purchases yet.', shopRefundButton: 'Return · +{points} points (50%)', shopRefunded: 'Returned · +{points} points', shopUnequipBeforeRefund: 'Unequip or use it first', shopRefundExpired: 'Return window closed (7 days)', shopRefundConfirm: 'Return {item} for {points} points? The item will be removed permanently.', streakShieldName: 'Streak Shield' },
  de: { groupInviteHeading: '🔗 Einladungslink', groupInviteExpiry: 'Link läuft ab nach', groupInviteOneDay: '1 Tag', groupInviteSevenDays: '7 Tagen', groupInviteThirtyDays: '30 Tagen', groupInviteCreate: 'Einladungslink erstellen', groupInviteCopy: 'Link kopieren', groupInviteReady: 'Link erstellt · gültig bis {date}', groupInviteCopied: 'Einladungslink kopiert.', groupInviteCopyManual: 'Markiere den Link und kopiere ihn manuell.', groupInviteJoined: 'Du bist {name} beigetreten.', groupInviteJoinError: 'Gruppe konnte nicht beigetreten werden: {error}', groupInviteNoToken: 'Einladungstoken fehlt.', groupActivityHeading: '⚡ Gruppenaktivität', groupActivityEmpty: 'Noch keine Gruppenaktivität.', groupActivityMessage: '{name} hat eine Nachricht gesendet', groupActivityGoalCreated: '{name} hat ein Gruppenziel erstellt: {title}', groupActivityGoalCompleted: '{name} hat ein Gruppenziel erreicht: {title}', shopPurchaseHistoryHeading: '🧾 Kaufhistorie', shopHistoryEmpty: 'Noch keine Käufe.', shopRefundButton: 'Zurückgeben · +{points} Punkte (50 %)', shopRefunded: 'Zurückgegeben · +{points} Punkte', shopUnequipBeforeRefund: 'Erst ablegen oder verbrauchen', shopRefundExpired: 'Rückgabefrist abgelaufen (7 Tage)', shopRefundConfirm: '{item} für {points} Punkte zurückgeben? Der Gegenstand wird dauerhaft entfernt.', streakShieldName: 'Streak-Schild' },
  es: { groupInviteHeading: '🔗 Enlace de invitación', groupInviteExpiry: 'El enlace caduca en', groupInviteOneDay: '1 día', groupInviteSevenDays: '7 días', groupInviteThirtyDays: '30 días', groupInviteCreate: 'Crear enlace', groupInviteCopy: 'Copiar enlace', groupInviteReady: 'Enlace listo · caduca {date}', groupInviteCopied: 'Enlace copiado.', groupInviteCopyManual: 'Selecciona y copia el enlace manualmente.', groupInviteJoined: 'Te has unido a {name}.', groupInviteJoinError: 'No se pudo entrar al grupo: {error}', groupInviteNoToken: 'Falta el enlace de invitación.', groupActivityHeading: '⚡ Actividad del grupo', groupActivityEmpty: 'Aún no hay actividad.', groupActivityMessage: '{name} envió un mensaje', groupActivityGoalCreated: '{name} creó un objetivo: {title}', groupActivityGoalCompleted: '{name} completó un objetivo: {title}', shopPurchaseHistoryHeading: '🧾 Historial de compras', shopHistoryEmpty: 'Aún no hay compras.', shopRefundButton: 'Devolver · +{points} puntos (50 %)', shopRefunded: 'Devuelto · +{points} puntos', shopUnequipBeforeRefund: 'Quítatelo o úsalo primero', shopRefundExpired: 'Plazo de devolución vencido (7 días)', shopRefundConfirm: '¿Devolver {item} por {points} puntos? El artículo se eliminará permanentemente.', streakShieldName: 'Escudo de racha' },
  it: { groupInviteHeading: '🔗 Link di invito', groupInviteExpiry: 'Il link scade tra', groupInviteOneDay: '1 giorno', groupInviteSevenDays: '7 giorni', groupInviteThirtyDays: '30 giorni', groupInviteCreate: 'Crea link di invito', groupInviteCopy: 'Copia link', groupInviteReady: 'Link pronto · scade il {date}', groupInviteCopied: 'Link copiato.', groupInviteCopyManual: 'Seleziona e copia il link manualmente.', groupInviteJoined: 'Ti sei unito a {name}.', groupInviteJoinError: 'Impossibile entrare nel gruppo: {error}', groupInviteNoToken: 'Link di invito mancante.', groupActivityHeading: '⚡ Attività del gruppo', groupActivityEmpty: 'Nessuna attività del gruppo.', groupActivityMessage: '{name} ha inviato un messaggio', groupActivityGoalCreated: '{name} ha creato un obiettivo: {title}', groupActivityGoalCompleted: '{name} ha completato un obiettivo: {title}', shopPurchaseHistoryHeading: '🧾 Cronologia acquisti', shopHistoryEmpty: 'Nessun acquisto.', shopRefundButton: 'Restituisci · +{points} punti (50%)', shopRefunded: 'Restituito · +{points} punti', shopUnequipBeforeRefund: 'Rimuovilo o usalo prima', shopRefundExpired: 'Periodo di reso scaduto (7 giorni)', shopRefundConfirm: 'Restituire {item} per {points} punti? L’articolo verrà rimosso definitivamente.', streakShieldName: 'Scudo serie' },
  el: { groupInviteHeading: '🔗 Σύνδεσμος πρόσκλησης', groupInviteExpiry: 'Λήξη συνδέσμου σε', groupInviteOneDay: '1 ημέρα', groupInviteSevenDays: '7 ημέρες', groupInviteThirtyDays: '30 ημέρες', groupInviteCreate: 'Δημιουργία συνδέσμου', groupInviteCopy: 'Αντιγραφή συνδέσμου', groupInviteReady: 'Ο σύνδεσμος είναι έτοιμος · λήγει {date}', groupInviteCopied: 'Ο σύνδεσμος αντιγράφηκε.', groupInviteCopyManual: 'Επίλεξε και αντέγραψε τον σύνδεσμο χειροκίνητα.', groupInviteJoined: 'Έγινες μέλος της ομάδας {name}.', groupInviteJoinError: 'Δεν ήταν δυνατή η συμμετοχή: {error}', groupInviteNoToken: 'Λείπει ο σύνδεσμος πρόσκλησης.', groupActivityHeading: '⚡ Δραστηριότητα ομάδας', groupActivityEmpty: 'Δεν υπάρχει ακόμη δραστηριότητα.', groupActivityMessage: 'Ο/Η {name} έστειλε μήνυμα', groupActivityGoalCreated: 'Ο/Η {name} δημιούργησε στόχο ομάδας: {title}', groupActivityGoalCompleted: 'Ο/Η {name} ολοκλήρωσε στόχο ομάδας: {title}', shopPurchaseHistoryHeading: '🧾 Ιστορικό αγορών', shopHistoryEmpty: 'Δεν υπάρχουν αγορές ακόμη.', shopRefundButton: 'Επιστροφή · +{points} πόντοι (50%)', shopRefunded: 'Επιστράφηκε · +{points} πόντοι', shopUnequipBeforeRefund: 'Αφαίρεσε ή χρησιμοποίησέ το πρώτα', shopRefundExpired: 'Η περίοδος επιστροφής έληξε (7 ημέρες)', shopRefundConfirm: 'Επιστροφή του {item} για {points} πόντους; Το αντικείμενο θα αφαιρεθεί οριστικά.', streakShieldName: 'Ασπίδα σερί' },
  pt: { groupInviteHeading: '🔗 Link de convite', groupInviteExpiry: 'O link expira em', groupInviteOneDay: '1 dia', groupInviteSevenDays: '7 dias', groupInviteThirtyDays: '30 dias', groupInviteCreate: 'Criar link de convite', groupInviteCopy: 'Copiar link', groupInviteReady: 'Link pronto · expira {date}', groupInviteCopied: 'Link copiado.', groupInviteCopyManual: 'Seleciona e copia o link manualmente.', groupInviteJoined: 'Juntaste-te a {name}.', groupInviteJoinError: 'Não foi possível entrar no grupo: {error}', groupInviteNoToken: 'Falta o link de convite.', groupActivityHeading: '⚡ Atividade do grupo', groupActivityEmpty: 'Ainda não há atividade.', groupActivityMessage: '{name} enviou uma mensagem', groupActivityGoalCreated: '{name} criou um objetivo: {title}', groupActivityGoalCompleted: '{name} concluiu um objetivo: {title}', shopPurchaseHistoryHeading: '🧾 Histórico de compras', shopHistoryEmpty: 'Ainda não há compras.', shopRefundButton: 'Devolver · +{points} pontos (50%)', shopRefunded: 'Devolvido · +{points} pontos', shopUnequipBeforeRefund: 'Retira ou usa primeiro', shopRefundExpired: 'Prazo de devolução expirado (7 dias)', shopRefundConfirm: 'Devolver {item} por {points} pontos? O artigo será removido permanentemente.', streakShieldName: 'Escudo de sequência' }
};
for (const [lang, copy] of Object.entries(groupCommerceCopy)) { Object.assign(translations[lang], copy); Object.assign(extraTranslations[lang], copy); }
const testTimeCopy = {
  en: { testTimeHeading: '🧪 Test time', testTimeHint: 'Advance the app date to test streaks and shields. This only changes the date inside the app.', testTimeOneDay: '+1 day', testTimeSevenDays: '+7 days', testTimeThirtyDays: '+30 days', testTimeReset: 'Reset date', testTimeStatus: 'App date: {date} · test shift: +{days} days', streakShieldHomeTitle: '🛡️ Streak shield', streakShieldHomeHint: 'No equipping needed. It is used automatically for one missed day with planned tasks to protect your streak, if you owned it before that day.', streakShieldAvailable: 'Available shields: {count}', streakShieldShopButton: 'Open shop' },
  de: { testTimeHeading: '🧪 Testzeit', testTimeHint: 'Stelle das App-Datum vor, um Serien und Schutzschilde zu testen. Es ändert nur das Datum innerhalb der App.', testTimeOneDay: '+1 Tag', testTimeSevenDays: '+7 Tage', testTimeThirtyDays: '+30 Tage', testTimeReset: 'Datum zurücksetzen', testTimeStatus: 'App-Datum: {date} · Testverschiebung: +{days} Tage', streakShieldHomeTitle: '🛡️ Streak-Schild', streakShieldHomeHint: 'Du musst es nicht ausrüsten. Es wird automatisch für einen verpassten Tag mit geplanten Aufgaben verbraucht und schützt deine Serie, wenn du es vor diesem Tag hattest.', streakShieldAvailable: 'Verfügbare Schilde: {count}', streakShieldShopButton: 'Zum Shop' },
  es: { testTimeHeading: '🧪 Hora de prueba', testTimeHint: 'Adelanta la fecha de la app para probar rachas y escudos. Solo cambia la fecha dentro de la app.', testTimeOneDay: '+1 día', testTimeSevenDays: '+7 días', testTimeThirtyDays: '+30 días', testTimeReset: 'Restablecer fecha', testTimeStatus: 'Fecha de la app: {date} · cambio de prueba: +{days} días', streakShieldHomeTitle: '🛡️ Escudo de racha', streakShieldHomeHint: 'No hace falta equiparlo. Se consume automáticamente para proteger la racha durante un día perdido con tareas previstas, si ya lo tenías antes de ese día.', streakShieldAvailable: 'Escudos disponibles: {count}', streakShieldShopButton: 'Ir a la tienda' },
  it: { testTimeHeading: '🧪 Ora di prova', testTimeHint: 'Anticipa la data dell’app per provare serie e scudi. Cambia solo la data all’interno dell’app.', testTimeOneDay: '+1 giorno', testTimeSevenDays: '+7 giorni', testTimeThirtyDays: '+30 giorni', testTimeReset: 'Ripristina data', testTimeStatus: 'Data dell’app: {date} · spostamento test: +{days} giorni', streakShieldHomeTitle: '🛡️ Scudo serie', streakShieldHomeHint: 'Non serve equipaggiarlo. Si consuma automaticamente per proteggere la serie durante un giorno saltato con attività pianificate, se lo possedevi già prima di quel giorno.', streakShieldAvailable: 'Scudi disponibili: {count}', streakShieldShopButton: 'Apri il negozio' },
  el: { testTimeHeading: '🧪 Δοκιμαστικός χρόνος', testTimeHint: 'Προχώρησε την ημερομηνία της εφαρμογής για να δοκιμάσεις σερί και ασπίδες. Αλλάζει μόνο την ημερομηνία μέσα στην εφαρμογή.', testTimeOneDay: '+1 ημέρα', testTimeSevenDays: '+7 ημέρες', testTimeThirtyDays: '+30 ημέρες', testTimeReset: 'Επαναφορά ημερομηνίας', testTimeStatus: 'Ημερομηνία εφαρμογής: {date} · δοκιμαστική μετατόπιση: +{days} ημέρες', streakShieldHomeTitle: '🛡️ Ασπίδα σερί', streakShieldHomeHint: 'Δεν χρειάζεται να την εξοπλίσεις. Χρησιμοποιείται αυτόματα για να προστατεύσει το σερί από μία χαμένη ημέρα με προγραμματισμένες εργασίες, αν την είχες πριν από εκείνη την ημέρα.', streakShieldAvailable: 'Διαθέσιμες ασπίδες: {count}', streakShieldShopButton: 'Άνοιγμα καταστήματος' },
  pt: { testTimeHeading: '🧪 Hora de teste', testTimeHint: 'Avança a data da aplicação para testar sequências e escudos. Só altera a data dentro da aplicação.', testTimeOneDay: '+1 dia', testTimeSevenDays: '+7 dias', testTimeThirtyDays: '+30 dias', testTimeReset: 'Repor data', testTimeStatus: 'Data da aplicação: {date} · avanço de teste: +{days} dias', streakShieldHomeTitle: '🛡️ Escudo de sequência', streakShieldHomeHint: 'Não é preciso equipá-lo. É consumido automaticamente para proteger a sequência durante um dia falhado com tarefas planeadas, se já o tinhas antes desse dia.', streakShieldAvailable: 'Escudos disponíveis: {count}', streakShieldShopButton: 'Abrir loja' }
};
for (const [lang, copy] of Object.entries(testTimeCopy)) { Object.assign(translations[lang], copy); Object.assign(extraTranslations[lang], copy); }
const socialCommentUiCopy = {
  en: { commentReply: 'Reply', commentEdit: 'Edit', commentDelete: 'Delete', commentSave: 'Save', commentCancelReply: 'Cancel reply', commentReplyingTo: 'Replying to {name}', commentEditPrompt: 'Edit your comment:', commentDeleteConfirm: 'Delete this comment?', commentEdited: 'edited', commentDeleted: 'Comment deleted', overallCompletionRate: 'Overall completion rate' },
  de: { commentReply: 'Antworten', commentEdit: 'Bearbeiten', commentDelete: 'Löschen', commentSave: 'Speichern', commentCancelReply: 'Antwort abbrechen', commentReplyingTo: 'Antwort an {name}', commentEditPrompt: 'Kommentar bearbeiten:', commentDeleteConfirm: 'Diesen Kommentar löschen?', commentEdited: 'bearbeitet', commentDeleted: 'Kommentar gelöscht', overallCompletionRate: 'Gesamt-Abschlussquote' },
  es: { commentReply: 'Responder', commentEdit: 'Editar', commentDelete: 'Eliminar', commentSave: 'Guardar', commentCancelReply: 'Cancelar respuesta', commentReplyingTo: 'Respondiendo a {name}', commentEditPrompt: 'Editar comentario:', commentDeleteConfirm: '¿Eliminar este comentario?', commentEdited: 'editado', commentDeleted: 'Comentario eliminado', overallCompletionRate: 'Tasa total de finalización' },
  it: { commentReply: 'Rispondi', commentEdit: 'Modifica', commentDelete: 'Elimina', commentSave: 'Salva', commentCancelReply: 'Annulla risposta', commentReplyingTo: 'Risposta a {name}', commentEditPrompt: 'Modifica il commento:', commentDeleteConfirm: 'Eliminare questo commento?', commentEdited: 'modificato', commentDeleted: 'Commento eliminato', overallCompletionRate: 'Tasso complessivo di completamento' },
  el: { commentReply: 'Απάντηση', commentEdit: 'Επεξεργασία', commentDelete: 'Διαγραφή', commentSave: 'Αποθήκευση', commentCancelReply: 'Ακύρωση απάντησης', commentReplyingTo: 'Απάντηση στον/στη {name}', commentEditPrompt: 'Επεξεργασία σχολίου:', commentDeleteConfirm: 'Να διαγραφεί αυτό το σχόλιο;', commentEdited: 'έγινε επεξεργασία', commentDeleted: 'Το σχόλιο διαγράφηκε', overallCompletionRate: 'Συνολικό ποσοστό ολοκλήρωσης' },
  pt: { commentReply: 'Responder', commentEdit: 'Editar', commentDelete: 'Eliminar', commentSave: 'Guardar', commentCancelReply: 'Cancelar resposta', commentReplyingTo: 'A responder a {name}', commentEditPrompt: 'Editar comentário:', commentDeleteConfirm: 'Eliminar este comentário?', commentEdited: 'editado', commentDeleted: 'Comentário eliminado', overallCompletionRate: 'Taxa geral de conclusão' }
};
for (const [lang, copy] of Object.entries(socialCommentUiCopy)) { Object.assign(translations[lang], copy); Object.assign(extraTranslations[lang], copy); }
const socialGroupLifecycleCopy = {
  en: { socialGroupDelete: 'Delete group', socialGroupLeave: 'Leave group', socialGroupDeleteConfirm: 'Delete “{name}” for everyone? This also removes its messages and goals.', socialGroupLeaveConfirm: 'Leave “{name}”?', socialGroupDeleted: 'Group deleted.', socialGroupLeft: 'You left the group.' },
  de: { socialGroupDelete: 'Gruppe löschen', socialGroupLeave: 'Gruppe verlassen', socialGroupDeleteConfirm: '„{name}“ für alle löschen? Nachrichten und Ziele der Gruppe werden ebenfalls entfernt.', socialGroupLeaveConfirm: '„{name}“ verlassen?', socialGroupDeleted: 'Gruppe gelöscht.', socialGroupLeft: 'Du hast die Gruppe verlassen.' },
  es: { socialGroupDelete: 'Eliminar grupo', socialGroupLeave: 'Salir del grupo', socialGroupDeleteConfirm: '¿Eliminar “{name}” para todos? También se borrarán sus mensajes y objetivos.', socialGroupLeaveConfirm: '¿Salir de “{name}”?', socialGroupDeleted: 'Grupo eliminado.', socialGroupLeft: 'Has salido del grupo.' },
  it: { socialGroupDelete: 'Elimina gruppo', socialGroupLeave: 'Lascia il gruppo', socialGroupDeleteConfirm: 'Eliminare “{name}” per tutti? Verranno rimossi anche i messaggi e gli obiettivi.', socialGroupLeaveConfirm: 'Vuoi lasciare “{name}”?', socialGroupDeleted: 'Gruppo eliminato.', socialGroupLeft: 'Hai lasciato il gruppo.' },
  el: { socialGroupDelete: 'Διαγραφή ομάδας', socialGroupLeave: 'Αποχώρηση από την ομάδα', socialGroupDeleteConfirm: 'Να διαγραφεί η ομάδα «{name}» για όλους; Θα διαγραφούν και τα μηνύματα και οι στόχοι της.', socialGroupLeaveConfirm: 'Να αποχωρήσεις από την ομάδα «{name}»;', socialGroupDeleted: 'Η ομάδα διαγράφηκε.', socialGroupLeft: 'Αποχώρησες από την ομάδα.' },
  pt: { socialGroupDelete: 'Eliminar grupo', socialGroupLeave: 'Sair do grupo', socialGroupDeleteConfirm: 'Eliminar “{name}” para todos? As mensagens e os objetivos também serão removidos.', socialGroupLeaveConfirm: 'Sair de “{name}”?', socialGroupDeleted: 'Grupo eliminado.', socialGroupLeft: 'Saíste do grupo.' }
};
for (const [lang, copy] of Object.entries(socialGroupLifecycleCopy)) { Object.assign(translations[lang], copy); Object.assign(extraTranslations[lang], copy); }
const shopFrameUiCopy = {
  en: { avatarFramesHeading: '🖼️ Avatar frames', avatarFramesIntro: 'Buy a frame, preview it, and equip it on your profile.', previewItem: '👁 Preview', equipAvatarFrame: '🖼 Equip frame', avatarFrameRemove: 'Remove frame', shopPreviewTitle: 'Item preview', shopPreviewSound: 'Sound preview played.', frameEquipped: 'Frame equipped.', frameRemoved: 'Avatar frame removed.', shopPreviewClose: 'Close' },
  de: { avatarFramesHeading: '🖼️ Profilrahmen', avatarFramesIntro: 'Kaufe einen Rahmen, sieh ihn dir an und rüste ihn in deinem Profil aus.', previewItem: '👁 Vorschau', equipAvatarFrame: '🖼 Rahmen ausrüsten', avatarFrameRemove: 'Rahmen entfernen', shopPreviewTitle: 'Artikelvorschau', shopPreviewSound: 'Soundvorschau abgespielt.', frameEquipped: 'Rahmen ausgerüstet.', frameRemoved: 'Profilrahmen entfernt.', shopPreviewClose: 'Schließen' },
  es: { avatarFramesHeading: '🖼️ Marcos de avatar', avatarFramesIntro: 'Compra un marco, previsualízalo y equípalo en tu perfil.', previewItem: '👁 Vista previa', equipAvatarFrame: '🖼 Equipar marco', avatarFrameRemove: 'Quitar marco', shopPreviewTitle: 'Vista previa del artículo', shopPreviewSound: 'Vista previa del sonido reproducida.', frameEquipped: 'Marco equipado.', frameRemoved: 'Marco de avatar quitado.', shopPreviewClose: 'Cerrar' },
  it: { avatarFramesHeading: '🖼️ Cornici avatar', avatarFramesIntro: 'Acquista una cornice, visualizzala in anteprima e applicala al profilo.', previewItem: '👁 Anteprima', equipAvatarFrame: '🖼 Equipaggia cornice', avatarFrameRemove: 'Rimuovi cornice', shopPreviewTitle: 'Anteprima articolo', shopPreviewSound: 'Anteprima audio riprodotta.', frameEquipped: 'Cornice equipaggiata.', frameRemoved: 'Cornice avatar rimossa.', shopPreviewClose: 'Chiudi' },
  el: { avatarFramesHeading: '🖼️ Πλαίσια avatar', avatarFramesIntro: 'Αγόρασε ένα πλαίσιο, δες την προεπισκόπηση και φόρεσέ το στο προφίλ σου.', previewItem: '👁 Προεπισκόπηση', equipAvatarFrame: '🖼 Εξόπλισε πλαίσιο', avatarFrameRemove: 'Αφαίρεση πλαισίου', shopPreviewTitle: 'Προεπισκόπηση αντικειμένου', shopPreviewSound: 'Έγινε αναπαραγωγή προεπισκόπησης ήχου.', frameEquipped: 'Το πλαίσιο εξοπλίστηκε.', frameRemoved: 'Το πλαίσιο avatar αφαιρέθηκε.', shopPreviewClose: 'Κλείσιμο' },
  pt: { avatarFramesHeading: '🖼️ Molduras de avatar', avatarFramesIntro: 'Compra uma moldura, pré-visualiza-a e equipa-a no teu perfil.', previewItem: '👁 Pré-visualizar', equipAvatarFrame: '🖼 Equipar moldura', avatarFrameRemove: 'Remover moldura', shopPreviewTitle: 'Pré-visualização do artigo', shopPreviewSound: 'Pré-visualização do som reproduzida.', frameEquipped: 'Moldura equipada.', frameRemoved: 'Moldura de avatar removida.', shopPreviewClose: 'Fechar' }
};
for (const [lang, copy] of Object.entries(shopFrameUiCopy)) { Object.assign(translations[lang], copy); Object.assign(extraTranslations[lang], copy); }

function getTranslatedDays() {
  const lang = getSupportedLanguage();
  const t = translations[lang] || translations.en;

  return [t.mon, t.tue, t.wed, t.thu, t.fri, t.sat, t.sun];
}

function translateKnownText(rawText, lang = storage.getItem('siteLanguage') || 'en') {
  if (!SUPPORTED_LANGUAGE_CODES.includes(lang)) lang = 'en';
  const original = String(rawText ?? '');
  const normalized = original.trim().replace(/\s+/g, ' ');
  if (!normalized) return original;
  const keys = new Set([...Object.keys(translations.en), ...Object.keys(extraTranslations.en)]);
  for (const key of keys) {
    const variants = ['en', 'de', 'es'].flatMap(code => [translations[code]?.[key], extraTranslations[code]?.[key]]).filter(Boolean);
    if (!variants.includes(normalized)) continue;
    const translated = extraTranslations[lang]?.[key] || translations[lang]?.[key]
      || extraTranslations.en[key] || translations.en[key] || normalized;
    const leading = original.match(/^\s*/)?.[0] || '';
    const trailing = original.match(/\s*$/)?.[0] || '';
    return leading + translated + trailing;
  }
  for (const key of keys) {
    const sourceTemplates = ['en', 'de', 'es'].flatMap(code => [translations[code]?.[key], extraTranslations[code]?.[key]]).filter(value => value?.includes('{'));
    for (const source of sourceTemplates) {
      const names = [...source.matchAll(/\{(\w+)\}/g)].map(match => match[1]);
      const parts = source.split(/\{\w+\}/g);
      const pattern = new RegExp(`^${parts.map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.*?)')}$`);
      const match = normalized.match(pattern);
      if (!match) continue;
      const translated = extraTranslations[lang]?.[key] || translations[lang]?.[key]
        || extraTranslations.en[key] || translations.en[key] || source;
      const values = Object.fromEntries(names.map((name, index) => [name, match[index + 1]]));
      const output = translated.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
      const leading = original.match(/^\s*/)?.[0] || '';
      const trailing = original.match(/\s*$/)?.[0] || '';
      return leading + output + trailing;
    }
  }
  return original;
}

function localizeTextNodes(root, lang) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach(node => {
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style,textarea,input,[contenteditable="true"]')) return;
    const translated = translateKnownText(node.nodeValue, lang);
    if (translated !== node.nodeValue) node.nodeValue = translated;
  });
}

function textFor(key, replacements = {}) {
  const lang = getSupportedLanguage();
  let value = extraTranslations[lang]?.[key]
    || translations[lang]?.[key]
    || extraTranslations.en[key]
    || translations.en[key]
    || key;
  Object.entries(replacements).forEach(([name, replacement]) => {
    value = value.replaceAll(`{${name}}`, String(replacement));
  });
  return value;
}

const moderationAppealShopCopy = {
  en: { shopSectionSounds: '🔊 Sounds & rewards', shopSectionPurchaseHistory: '🧾 Purchase history', shopSectionTitles: '✨ Titles', shopSectionFrames: '🖼️ Avatar frames', shopSectionThemes: '🌈 Themes & streak shield', shopSectionLevelEffects: '⚡ Level-up effects', shopSectionAchievementEffects: '🏆 Achievement effects', reportHistoryHeading: '📋 My report history', myModerationHistoryHeading: '🛡️ Moderation decisions & appeals', moderationAppealsHeading: '🧾 Appeals from users', spamDetectionsHeading: '🚨 Automated spam detections', appealOpen: 'Open', appealAccepted: 'Accepted', appealRejected: 'Rejected', appealPending: 'Appeal pending', appealSubmit: 'Submit appeal', appealReason: 'Why should this decision be reviewed? (10–1000 characters)', appealSent: 'Appeal submitted for admin review.', appealError: 'Could not submit appeal: {error}', appealResponse: 'Admin response', appealAccept: 'Accept appeal', appealReject: 'Reject appeal', appealResponsePlaceholder: 'Write a response (at least 3 characters)', appealReviewed: 'Decision overturned', noReportHistory: 'You have not submitted any reports yet.', noModerationHistory: 'No moderation decisions on your account.', reportDecision: 'Decision', reportPending: 'No decision recorded yet', reportHistoryError: 'Could not load your report history.', moderationHistoryError: 'Could not load moderation history.', warningOverturned: 'Overturned', spamEmpty: 'No automated spam detections.', spamConfirmed: 'Confirmed', spamDismissed: 'Dismissed', spamReviewError: 'Could not update spam review: {error}', spamBlocked: 'This message looks like spam and was stopped. Please wait or edit it.', spamCheckError: 'Could not check this message for spam: {error}', restrictionAppealNotice: 'An account restriction is active. You can still view your account and submit an appeal below. Reason: {reason}{expiry}', reportStatus: 'Report status: {status}', appealAlreadySent: 'An appeal was already submitted.' },
  de: { shopSectionSounds: '🔊 Sounds & Belohnungen', shopSectionPurchaseHistory: '🧾 Kaufhistorie', shopSectionTitles: '✨ Titel', shopSectionFrames: '🖼️ Profilrahmen', shopSectionThemes: '🌈 Themes & Streak-Schutz', shopSectionLevelEffects: '⚡ Level-up-Effekte', shopSectionAchievementEffects: '🏆 Achievement-Effekte', reportHistoryHeading: '📋 Meine Meldehistorie', myModerationHistoryHeading: '🛡️ Moderationsentscheidungen & Einsprüche', moderationAppealsHeading: '🧾 Einsprüche von Nutzern', spamDetectionsHeading: '🚨 Automatische Spam-Erkennung', appealOpen: 'Offen', appealAccepted: 'Angenommen', appealRejected: 'Abgelehnt', appealPending: 'Einspruch eingereicht', appealSubmit: 'Einspruch einreichen', appealReason: 'Warum soll diese Entscheidung überprüft werden? (10–1000 Zeichen)', appealSent: 'Einspruch wurde zur Prüfung eingereicht.', appealError: 'Einspruch konnte nicht eingereicht werden: {error}', appealResponse: 'Antwort des Admins', appealAccept: 'Einspruch annehmen', appealReject: 'Einspruch ablehnen', appealResponsePlaceholder: 'Antwort schreiben (mindestens 3 Zeichen)', appealReviewed: 'Entscheidung aufgehoben', noReportHistory: 'Du hast noch keine Meldungen eingereicht.', noModerationHistory: 'Es liegen keine Moderationsentscheidungen für dein Konto vor.', reportDecision: 'Entscheidung', reportPending: 'Noch keine Entscheidung erfasst', reportHistoryError: 'Meldehistorie konnte nicht geladen werden.', moderationHistoryError: 'Moderationsverlauf konnte nicht geladen werden.', warningOverturned: 'Aufgehoben', spamEmpty: 'Keine automatischen Spam-Erkennungen.', spamConfirmed: 'Bestätigt', spamDismissed: 'Entkräftet', spamReviewError: 'Spam-Prüfung konnte nicht aktualisiert werden: {error}', spamBlocked: 'Diese Nachricht sieht nach Spam aus und wurde gestoppt. Bitte warte kurz oder bearbeite sie.', spamCheckError: 'Spam-Prüfung fehlgeschlagen: {error}', restrictionAppealNotice: 'Eine Kontosperre ist aktiv. Du kannst dein Konto weiterhin ansehen und unten Einspruch einreichen. Grund: {reason}{expiry}', reportStatus: 'Meldungsstatus: {status}', appealAlreadySent: 'Für diese Entscheidung wurde bereits Einspruch eingereicht.' },
  es: { shopSectionSounds: '🔊 Sonidos y recompensas', shopSectionPurchaseHistory: '🧾 Historial de compras', shopSectionTitles: '✨ Títulos', shopSectionFrames: '🖼️ Marcos de avatar', shopSectionThemes: '🌈 Temas y protección de racha', shopSectionLevelEffects: '⚡ Efectos de subida de nivel', shopSectionAchievementEffects: '🏆 Efectos de logros', reportHistoryHeading: '📋 Mi historial de denuncias', myModerationHistoryHeading: '🛡️ Decisiones de moderación y apelaciones', moderationAppealsHeading: '🧾 Apelaciones de usuarios', spamDetectionsHeading: '🚨 Detección automática de spam', appealOpen: 'Abierta', appealAccepted: 'Aceptada', appealRejected: 'Rechazada', appealPending: 'Apelación enviada', appealSubmit: 'Enviar apelación', appealReason: '¿Por qué debería revisarse esta decisión? (10–1000 caracteres)', appealSent: 'Apelación enviada para revisión.', appealError: 'No se pudo enviar la apelación: {error}', appealResponse: 'Respuesta del administrador', appealAccept: 'Aceptar apelación', appealReject: 'Rechazar apelación', appealResponsePlaceholder: 'Escribe una respuesta (mínimo 3 caracteres)', appealReviewed: 'Decisión anulada', noReportHistory: 'Aún no has enviado denuncias.', noModerationHistory: 'No hay decisiones de moderación en tu cuenta.', reportDecision: 'Decisión', reportPending: 'Aún no hay una decisión registrada', reportHistoryError: 'No se pudo cargar el historial.', moderationHistoryError: 'No se pudo cargar el historial de moderación.', warningOverturned: 'Anulada', spamEmpty: 'No hay detecciones automáticas de spam.', spamConfirmed: 'Confirmada', spamDismissed: 'Descartada', spamReviewError: 'No se pudo actualizar la revisión: {error}', spamBlocked: 'Este mensaje parece spam y se ha bloqueado. Espera o edítalo.', spamCheckError: 'No se pudo comprobar el spam: {error}', restrictionAppealNotice: 'Hay una restricción activa. Puedes consultar tu cuenta y presentar una apelación abajo. Motivo: {reason}{expiry}', reportStatus: 'Estado de la denuncia: {status}', appealAlreadySent: 'Ya se envió una apelación para esta decisión.' },
  it: { shopSectionSounds: '🔊 Suoni e premi', shopSectionPurchaseHistory: '🧾 Cronologia acquisti', shopSectionTitles: '✨ Titoli', shopSectionFrames: '🖼️ Cornici avatar', shopSectionThemes: '🌈 Temi e protezione serie', shopSectionLevelEffects: '⚡ Effetti di avanzamento livello', shopSectionAchievementEffects: '🏆 Effetti obiettivi', reportHistoryHeading: '📋 Le mie segnalazioni', myModerationHistoryHeading: '🛡️ Decisioni di moderazione e ricorsi', moderationAppealsHeading: '🧾 Ricorsi degli utenti', spamDetectionsHeading: '🚨 Rilevamento automatico dello spam', appealOpen: 'Aperto', appealAccepted: 'Accettato', appealRejected: 'Rifiutato', appealPending: 'Ricorso inviato', appealSubmit: 'Invia ricorso', appealReason: 'Perché questa decisione dovrebbe essere riesaminata? (10–1000 caratteri)', appealSent: 'Ricorso inviato per la revisione.', appealError: 'Impossibile inviare il ricorso: {error}', appealResponse: 'Risposta dell’amministratore', appealAccept: 'Accetta ricorso', appealReject: 'Rifiuta ricorso', appealResponsePlaceholder: 'Scrivi una risposta (almeno 3 caratteri)', appealReviewed: 'Decisione annullata', noReportHistory: 'Non hai ancora inviato segnalazioni.', noModerationHistory: 'Nessuna decisione di moderazione sul tuo account.', reportDecision: 'Decisione', reportPending: 'Nessuna decisione registrata', reportHistoryError: 'Impossibile caricare le segnalazioni.', moderationHistoryError: 'Impossibile caricare lo storico di moderazione.', warningOverturned: 'Annullata', spamEmpty: 'Nessun rilevamento automatico di spam.', spamConfirmed: 'Confermato', spamDismissed: 'Archiviato', spamReviewError: 'Impossibile aggiornare la revisione: {error}', spamBlocked: 'Questo messaggio sembra spam ed è stato bloccato. Attendi o modificalo.', spamCheckError: 'Impossibile verificare lo spam: {error}', restrictionAppealNotice: 'È attiva una restrizione sull’account. Puoi visualizzare l’account e inviare un ricorso qui sotto. Motivo: {reason}{expiry}', reportStatus: 'Stato della segnalazione: {status}', appealAlreadySent: 'È già stato inviato un ricorso per questa decisione.' },
  el: { shopSectionSounds: '🔊 Ήχοι και ανταμοιβές', shopSectionPurchaseHistory: '🧾 Ιστορικό αγορών', shopSectionTitles: '✨ Τίτλοι', shopSectionFrames: '🖼️ Πλαίσια avatar', shopSectionThemes: '🌈 Θέματα και προστασία σερί', shopSectionLevelEffects: '⚡ Εφέ ανόδου επιπέδου', shopSectionAchievementEffects: '🏆 Εφέ επιτευγμάτων', reportHistoryHeading: '📋 Το ιστορικό αναφορών μου', myModerationHistoryHeading: '🛡️ Αποφάσεις εποπτείας και ενστάσεις', moderationAppealsHeading: '🧾 Ενστάσεις χρηστών', spamDetectionsHeading: '🚨 Αυτόματος εντοπισμός ανεπιθύμητων μηνυμάτων', appealOpen: 'Ανοιχτή', appealAccepted: 'Έγινε δεκτή', appealRejected: 'Απορρίφθηκε', appealPending: 'Η ένσταση υποβλήθηκε', appealSubmit: 'Υποβολή ένστασης', appealReason: 'Γιατί πρέπει να επανεξεταστεί αυτή η απόφαση; (10–1000 χαρακτήρες)', appealSent: 'Η ένσταση υποβλήθηκε για έλεγχο.', appealError: 'Δεν ήταν δυνατή η υποβολή: {error}', appealResponse: 'Απάντηση διαχειριστή', appealAccept: 'Αποδοχή ένστασης', appealReject: 'Απόρριψη ένστασης', appealResponsePlaceholder: 'Γράψε απάντηση (τουλάχιστον 3 χαρακτήρες)', appealReviewed: 'Η απόφαση ακυρώθηκε', noReportHistory: 'Δεν έχεις υποβάλει ακόμη αναφορές.', noModerationHistory: 'Δεν υπάρχουν αποφάσεις εποπτείας στον λογαριασμό σου.', reportDecision: 'Απόφαση', reportPending: 'Δεν έχει καταγραφεί ακόμη απόφαση', reportHistoryError: 'Δεν ήταν δυνατή η φόρτωση αναφορών.', moderationHistoryError: 'Δεν ήταν δυνατή η φόρτωση ιστορικού εποπτείας.', warningOverturned: 'Ακυρώθηκε', spamEmpty: 'Δεν υπάρχουν αυτόματοι εντοπισμοί spam.', spamConfirmed: 'Επιβεβαιώθηκε', spamDismissed: 'Απορρίφθηκε', spamReviewError: 'Δεν ήταν δυνατή η ενημέρωση: {error}', spamBlocked: 'Αυτό το μήνυμα μοιάζει με spam και σταμάτησε. Περίμενε ή επεξεργάσου το.', spamCheckError: 'Δεν ήταν δυνατός ο έλεγχος spam: {error}', restrictionAppealNotice: 'Υπάρχει ενεργός περιορισμός. Μπορείς να δεις τον λογαριασμό σου και να υποβάλεις ένσταση παρακάτω. Αιτία: {reason}{expiry}', reportStatus: 'Κατάσταση αναφοράς: {status}', appealAlreadySent: 'Έχει ήδη υποβληθεί ένσταση για αυτή την απόφαση.' },
  pt: { shopSectionSounds: '🔊 Sons e recompensas', shopSectionPurchaseHistory: '🧾 Histórico de compras', shopSectionTitles: '✨ Títulos', shopSectionFrames: '🖼️ Molduras de avatar', shopSectionThemes: '🌈 Temas e proteção de sequência', shopSectionLevelEffects: '⚡ Efeitos de subida de nível', shopSectionAchievementEffects: '🏆 Efeitos de conquistas', reportHistoryHeading: '📋 O meu histórico de denúncias', myModerationHistoryHeading: '🛡️ Decisões de moderação e recursos', moderationAppealsHeading: '🧾 Recursos dos utilizadores', spamDetectionsHeading: '🚨 Deteção automática de spam', appealOpen: 'Aberto', appealAccepted: 'Aceite', appealRejected: 'Recusado', appealPending: 'Recurso enviado', appealSubmit: 'Enviar recurso', appealReason: 'Porque deve esta decisão ser revista? (10–1000 caracteres)', appealSent: 'Recurso enviado para análise.', appealError: 'Não foi possível enviar o recurso: {error}', appealResponse: 'Resposta do administrador', appealAccept: 'Aceitar recurso', appealReject: 'Rejeitar recurso', appealResponsePlaceholder: 'Escreve uma resposta (mínimo 3 caracteres)', appealReviewed: 'Decisão anulada', noReportHistory: 'Ainda não enviaste denúncias.', noModerationHistory: 'Não há decisões de moderação na tua conta.', reportDecision: 'Decisão', reportPending: 'Ainda não foi registada nenhuma decisão', reportHistoryError: 'Não foi possível carregar o histórico.', moderationHistoryError: 'Não foi possível carregar o histórico de moderação.', warningOverturned: 'Anulada', spamEmpty: 'Não há deteções automáticas de spam.', spamConfirmed: 'Confirmado', spamDismissed: 'Ignorado', spamReviewError: 'Não foi possível atualizar a análise: {error}', spamBlocked: 'Esta mensagem parece spam e foi bloqueada. Aguarda ou edita-a.', spamCheckError: 'Não foi possível verificar spam: {error}', restrictionAppealNotice: 'Há uma restrição ativa. Ainda podes consultar a conta e apresentar recurso abaixo. Motivo: {reason}{expiry}', reportStatus: 'Estado da denúncia: {status}', appealAlreadySent: 'Já foi enviado um recurso para esta decisão.' }
};
for (const [lang, copy] of Object.entries(moderationAppealShopCopy)) { Object.assign(translations[lang], copy); Object.assign(extraTranslations[lang], copy); }

function setLanguage(lang) {
  if (!SUPPORTED_LANGUAGE_CODES.includes(lang)) lang = 'en';
  const dictionary = translations[lang];

  if (!dictionary) return;

  document.documentElement.lang = lang;

  // Normale Texte übersetzen
  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;

    if (dictionary[key]) {
      element.textContent = dictionary[key];
    }
  });

  // Placeholder übersetzen
  document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
    const key = element.dataset.i18nPlaceholder;

    if (dictionary[key]) {
      element.placeholder = dictionary[key];
    }
  });

  document.querySelectorAll('[data-i18n-alt]').forEach(element => {
    const key = element.dataset.i18nAlt;
    if (dictionary[key]) element.alt = dictionary[key];
  });

  document.querySelectorAll('[placeholder]').forEach(element => {
    element.placeholder = translateKnownText(element.placeholder, lang);
  });
  document.querySelectorAll('[aria-label]').forEach(element => {
    element.setAttribute('aria-label', translateKnownText(element.getAttribute('aria-label'), lang));
  });
  document.querySelectorAll('[title]').forEach(element => {
    element.title = translateKnownText(element.title, lang);
  });

  storage.setItem("siteLanguage", lang);
  localizeTextNodes(document.body, lang);
}

function getTotalPoints() {
  let pts = 0;

  for (const d in S.done) {
    pts += doneOn(d).length;
  }

  return pts + Math.max(0, Math.floor(Number(S.bonusPoints) || 0));
}
const languageSelect = document.getElementById("languageSelect");

languageSelect.addEventListener("change", async () => {
  setLanguage(languageSelect.value);
  render();
  updateAuthUI();
  if (document.querySelector('#achievementsDlg')?.open) renderAchievements();
  const shareToggle = document.querySelector('#shareProgressWithFriends');
  const shareStatus = document.querySelector('#shareProgressStatus');
  if (shareToggle && shareStatus) shareStatus.textContent = textFor(shareToggle.checked ? 'shareProgressEnabled' : 'shareProgressPrivateDefault');
  if (!document.querySelector('#v-social')?.hidden && currentUser) await loadSocialPage();
  if (document.querySelector('#socialDlg')?.open && currentUser) {
    await loadSocialFriends();
    if (activeChatFriend) await loadChatMessages();
    else if (activeSocialGroupId) { await loadMyGroups(); await Promise.all([loadSocialGroupMessages(), loadSocialGroupGoals(), loadSocialGroupMemberRoster(), loadSocialGroupActivity()]); }
  }
  if (document.querySelector('#friendsDlg')?.open && currentUser) {
    await Promise.all([loadFriendOverview(), loadBlockedUsers()]);
    const query = document.querySelector('#friendSearchInput')?.value?.trim();
    if (query?.length >= 2) await searchFriendUsers(query);
    else if (query) document.querySelector('#friendSearchResults').innerHTML = `<p>${textFor('searchAtLeastTwo')}</p>`;
  }
  if (document.querySelector('#friendProgressDlg')?.open && friendProgressData) renderFriendProgress();
});

// Gespeicherte Sprache laden
const savedLanguage = getSupportedLanguage();

languageSelect.value = savedLanguage;
setLanguage(savedLanguage);

const languageMutationObserver = new MutationObserver(records => {
  const lang = getSupportedLanguage();
  records.forEach(record => {
    record.addedNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (parent && !parent.closest('script,style,textarea,input,[contenteditable="true"]')) {
          node.nodeValue = translateKnownText(node.nodeValue, lang);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        localizeTextNodes(node, lang);
      }
    });
  });
});
languageMutationObserver.observe(document.body, { childList: true, subtree: true });

const nativeAlert = window.alert.bind(window);
const nativeConfirm = window.confirm.bind(window);
window.alert = message => nativeAlert(translateKnownText(message));
window.confirm = message => nativeConfirm(translateKnownText(message));


// Satisfying habit completion sound
let soundEnabled =
  storage.getItem('habitSound') !== 'false';

function playHabitSound() {
  if (!soundEnabled) return;

  try {
    const ctx = new (window.AudioContext ||
      window.webkitAudioContext)();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      990, ctx.currentTime + 0.07
    );

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.18, ctx.currentTime + 0.015
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001, ctx.currentTime + 0.22
    );

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.23);
    osc.onended = () => ctx.close();
  } catch (error) {
    console.warn('Sound could not be played:', error);
  }
}


function playPremiumHabitSound() {
  if (!soundEnabled) return;

  let ctx;

  try {
    ctx = new (window.AudioContext ||
      window.webkitAudioContext)();

    const notes = [
      { frequency: 523.25, start: 0, duration: 0.16 },
      { frequency: 659.25, start: 0.11, duration: 0.16 },
      { frequency: 783.99, start: 0.22, duration: 0.28 }
    ];

    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + note.start;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.frequency, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.13, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        start + note.duration
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + note.duration + 0.02);
    });

    setTimeout(() => ctx.close(), 900);
  } catch (error) {
    if (ctx && ctx.state !== 'closed') ctx.close();
    console.warn('Premium sound could not be played:', error);
  }
}

function playSelectedHabitSound() {
  const selected = storage.getItem('activeHabitSound') || 'normal';
  if (selected === 'normal') return playHabitSound();
  if (selected === 'premium' || selected === 'premiumSound') return playPremiumHabitSound();
  playSoundEffect(selected);
}

// Kleine Synthesizer-Sounds, damit für den Shop keine Audiodateien nötig sind.
function playSoundEffect(id) {
  if (!soundEnabled) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const ctx = new AudioContextClass();
  const sounds = {
    softPop: [{ f: 520, t: 0, d: 0.12, type: 'sine', end: 760 }],
    crystal: [
      { f: 880, t: 0, d: 0.3, type: 'sine' },
      { f: 1174.66, t: 0.08, d: 0.42, type: 'sine' }
    ],
    bubble: [
      { f: 430, t: 0, d: 0.16, type: 'sine', end: 680 },
      { f: 620, t: 0.12, d: 0.22, type: 'sine', end: 900 }
    ],
    softBell: [
      { f: 740, t: 0, d: 0.3, type: 'sine', end: 900 },
      { f: 988, t: 0.09, d: 0.4, type: 'sine' }
    ],
    woodblock: [
      { f: 280, t: 0, d: 0.09, type: 'triangle', end: 180 },
      { f: 360, t: 0.12, d: 0.11, type: 'triangle', end: 220 }
    ],
    arcade: [
      { f: 440, t: 0, d: 0.09, type: 'square', end: 660 },
      { f: 660, t: 0.1, d: 0.1, type: 'square', end: 880 },
      { f: 880, t: 0.21, d: 0.16, type: 'triangle' }
    ],
    raindrop: [
      { f: 980, t: 0, d: 0.18, type: 'sine', end: 620 },
      { f: 740, t: 0.16, d: 0.25, type: 'sine', end: 440 }
    ],
    premiumSound: [
      { f: 523.25, t: 0, d: 0.16, type: 'sine' },
      { f: 659.25, t: 0.11, d: 0.16, type: 'sine' },
      { f: 783.99, t: 0.22, d: 0.28, type: 'sine' }
    ]
  };
  const notes = sounds[id];
  if (!notes) { ctx.close(); return; }
  notes.forEach(note => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + note.t;
    osc.type = note.type;
    osc.frequency.setValueAtTime(note.f, start);
    if (note.end) osc.frequency.exponentialRampToValueAtTime(note.end, start + note.d);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.d);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(start); osc.stop(start + note.d + 0.02);
  });
  setTimeout(() => ctx.close(), 1000);
}


function ownsPremiumSound() {
  return storage.getItem('ownedCompletionSound') === 'true';
}

function usePremiumSound() {
  if (!ownsPremiumSound()) {
    alert('Du musst den Premium Sound zuerst im Point Shop kaufen!');
    return;
  }

  storage.setItem('activeHabitSound', 'premium');
  alert('🔊 Premium Sound aktiviert!');
}

function useNormalSound() {
  storage.setItem('activeHabitSound', 'normal');
  alert('🔔 Normaler Sound aktiviert!');
}


// Sound-Einstellung initialisieren
const soundToggle = document.getElementById('soundToggle');

if (soundToggle) {
  soundToggle.checked = soundEnabled;

  soundToggle.addEventListener('change', () => {
    soundEnabled = soundToggle.checked;
    storage.setItem(
      'habitSound',
      String(soundEnabled)
    );
  });
}

const PREMIUM_SKIN_IDS = ['obsidiangold', 'nocturnal', 'ruby', 'amethyst', 'rose', 'arctic', 'golden', 'midnight', 'ocean', 'forest', 'sunset', 'lavender', 'paper', 'neon', 'cherrynoir', 'aurora', 'synthwave', 'glacier', 'peachglow', 'sakura', 'deepspace', 'matcha', 'coralreef', 'cyberpunk', 'ember', 'toxicbloom', 'bloodmoon', 'hologram', 'volcanicash', 'enchantedforest', 'nebuladrift', 'auroraflow', 'lavapulse', 'galaxy', 'sageminimal', 'solareclipse', 'cottoncandy', 'retroarcade', 'oceanglass', 'rosequartz', 'emeraldcity', 'cloudnine', 'prism'];

function getUnlockedThemeSkins() {
  return getOwnedItems('unlockedThemeSkins', 'themePurchases');
}

function getOwnedItems(storageKey, stateKey) {
  let local = [];
  try { local = JSON.parse(storage.getItem(storageKey) || '[]'); } catch { local = []; }
  return [...new Set([...(Array.isArray(S?.[stateKey]) ? S[stateKey] : []), ...(Array.isArray(local) ? local : [])])];
}
function setOwnedItems(storageKey, stateKey, values) {
  const clean = [...new Set(values)];
  storage.setItem(storageKey, JSON.stringify(clean));
  if (S) { S[stateKey] = clean; save(); }
}

function refreshThemeOptions() {
  const unlocked = getUnlockedThemeSkins();
  document.querySelectorAll('[data-skin-choice]').forEach(button => {
    const skin = button.dataset.skinChoice;
    const locked = skin !== 'falloutterminal' && PREMIUM_SKIN_IDS.includes(skin) && !unlocked.includes(skin);
    button.classList.toggle('locked', locked);
    let lockBadge = button.querySelector('[data-theme-lock]');
    if (locked && !lockBadge) {
      lockBadge = document.createElement('span');
      lockBadge.className = 'theme-premium-lock';
      lockBadge.dataset.themeLock = skin;
      button.appendChild(lockBadge);
    }
    if (lockBadge) {
      lockBadge.textContent = locked ? '🔒' : '';
      lockBadge.hidden = !locked;
    }
  });
}

const skinChoices = [
  'obsidiangold',
  'falloutterminal',
  'nocturnal',
  'ruby',
  'amethyst',
  'rose',
  'arctic',
  'golden',
  'midnight',
  'ocean',
  'forest',
  'sunset',
  'lavender',
  'paper',
  'neon',
  "cherrynoir",
  "aurora",
  "synthwave",
  "glacier",
  "peachglow",
  'sakura',
  'deepspace',
  'matcha',
  'coralreef',
  'cyberpunk',
  'ember',
  ...PREMIUM_SKIN_IDS,
];

function setSkin(skin) {
  if (!skinChoices.includes(skin)) return;
  if (PREMIUM_SKIN_IDS.includes(skin) && !getUnlockedThemeSkins().includes(skin)) {
    alert(textFor('themeLockedHint'));
    tab('shop');
    renderShop();
    return;
  }

  document.documentElement.dataset.skin = skin;
  storage.setItem('consistlySkin', skin);

  document.querySelectorAll('[data-skin-choice]').forEach(button => {
    const selected = button.dataset.skinChoice === skin;

    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  refreshThemeOptions();
}

document.querySelectorAll('[data-skin-choice]').forEach(button => {
  button.addEventListener('click', () => {
    setSkin(button.dataset.skinChoice);
  });
});

const savedSkin = storage.getItem('consistlySkin') || 'falloutterminal';
setSkin(PREMIUM_SKIN_IDS.includes(savedSkin) && !getUnlockedThemeSkins().includes(savedSkin) ? 'falloutterminal' : savedSkin);

function settle() {                                  // decide finished weeks (Sunday 18:00 or later)
  const t = today(), cm = monOf(t); week(cm);
  for (const m in S.weeks) {
    const w = S.weeks[m]; if (w.result) continue;
    if (!(m < cm || (m === cm && wd(t) === 6 && new Date().getHours() >= 18))) continue;
    const s = weekStat(m);
    if (!s.p) { w.result = 'none'; w.seen = true; }
    else if (s.pct >= w.goal) { recordBossWin(w, m, s.pct); }
    else w.result = 'lost';
  }
  save();
}
function showResult() {
  const m = Object.keys(S.weeks).sort().find(k => S.weeks[k].result && !S.weeks[k].seen); if (!m) return;
  const w = S.weeks[m], s = weekStat(m), b = BOSSES[w.boss % BOSSES.length];
  const boss = bossName(w.boss);
  const quote = textFor(`weeklyBossQuote${Math.floor(Math.random() * 4) + 1}`);
  $('#resBody').innerHTML = w.result === 'won'
    ? `<div class="res"><div class="e">🏆</div><h3>${boss} ${textFor('bossDefeated')}</h3><p>${textFor('goalReached', { pct: R(s.pct), goal: w.goal })}</p>${w.boss % BOSSES.length === STREAK_GUARDIAN_BOSS_INDEX ? `<p><b>🛡️ ${['One Streak Shield added to your inventory!', 'Ein Streak-Schild wurde deinem Inventar hinzugefügt!', '¡Se añadió un escudo de racha a tu inventario!', 'Uno scudo serie aggiunto all’inventario!', 'Μία ασπίδα σερί προστέθηκε στο απόθεμά σου!', 'Foi adicionado um escudo de sequência ao inventário!'][['en', 'de', 'es', 'it', 'el', 'pt'].indexOf(getSupportedLanguage())] || 'Streak Shield reward'}</b></p>` : ''}${w.reward ? `<p><b>🎁 ${textFor('rewardUnlocked')}</b><br>${esc(w.reward)}</p>` : ''}</div>`
    : `<div class="res"><div class="e">${b[1]}</div><h3>${boss} ${textFor('bossSurvived')}</h3><p>${textFor('goalWas', { pct: R(s.pct), goal: w.goal })}</p><p>${quote}</p></div>`;
  $('#resOk').onclick = () => { w.seen = true; save(); $('#resDlg').close(); render(); showResult(); };
  $('#resDlg').showModal();
}

/* ----- rendering ----- */
let sel = today(), cur = 'home';
let statsMonthCursor = new Date(parse(today()).getFullYear(), parse(today()).getMonth(), 1);
let journalMonthCursor = new Date(parse(today()).getFullYear(), parse(today()).getMonth(), 1);
let lastRenderedPlayerLevel = null;
const habitCelebrationCopy = {
  en: ['Habit completed!', 'Achievement animation preview'], de: ['Habit geschafft!', 'Achievement-Animation als Test'],
  es: ['¡Hábito completado!', 'Prueba de animación de logro'], it: ['Abitudine completata!', 'Anteprima animazione obiettivo'],
  el: ['Η συνήθεια ολοκληρώθηκε!', 'Δοκιμή κίνησης επιτεύγματος'], pt: ['Hábito concluído!', 'Pré-visualização da animação de conquista']
};
const rewardAnimationCopy = {
  en: ['LEVEL UP!', 'ACHIEVEMENT UNLOCKED!'], de: ['LEVEL AUFGESTIEGEN!', 'ERFOLG FREIGESCHALTET!'],
  es: ['¡SUBISTE DE NIVEL!', '¡LOGRO DESBLOQUEADO!'], it: ['LIVELLO AUMENTATO!', 'OBIETTIVO SBLOCCATO!'],
  el: ['ΑΝΕΒΗΚΕΣ ΕΠΙΠΕΔΟ!', 'ΞΕΚΛΕΙΔΩΘΗΚΕ ΕΠΙΤΕΥΓΜΑ!'], pt: ['SUBISTE DE NÍVEL!', 'CONQUISTA DESBLOQUEADA!']
};
const rewardAnimationQueue = [];
let rewardAnimationPlaying = false;
let rewardAnimationStartTimer = 0;
function showHabitAchievementTest() {
  const copy = habitCelebrationCopy[getSupportedLanguage()] || habitCelebrationCopy.en;
  const toast = document.createElement('div');
  toast.className = 'achievement-test-toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span aria-hidden="true">🏆</span><div><b>${copy[0]}</b><small>${copy[1]}</small></div>`;
  document.body.appendChild(toast);
  playRewardAnimation('achievement');
  window.setTimeout(() => toast.remove(), 2600);
}
function playRewardAnimation(kind) {
  if (kind !== 'achievement' && kind !== 'level') return;
  rewardAnimationQueue.push(kind);
  if (rewardAnimationStartTimer) return;
  // Batch events from the same habit completion so achievements always play before level-ups.
  rewardAnimationStartTimer = window.setTimeout(runNextRewardAnimation, 60);
}
function runNextRewardAnimation() {
  rewardAnimationStartTimer = 0;
  if (rewardAnimationPlaying || !rewardAnimationQueue.length) return;
  rewardAnimationQueue.sort((a, b) => (a === 'achievement' ? 0 : 1) - (b === 'achievement' ? 0 : 1));
  const kind = rewardAnimationQueue.shift();
  rewardAnimationPlaying = true;
  const effectId = S[effectEquippedKey(kind)] || '';
  const title = (rewardAnimationCopy[getSupportedLanguage()] || rewardAnimationCopy.en)[kind === 'level' ? 0 : 1];
  const overlay = document.createElement('div');
  overlay.className = `reward-fx reward-fx-${kind}${effectId ? ` effect-${effectId}` : ' effect-default'}`;
  overlay.dataset.rewardKind = kind;
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'assertive');
  overlay.innerHTML = `<span class="reward-fx-orbit"></span><span class="reward-fx-mark">${kind === 'level' ? '⬆️' : '🏆'}</span><b class="reward-fx-title">${title}</b><span class="reward-fx-spark spark-a">✦</span><span class="reward-fx-spark spark-b">✧</span><span class="reward-fx-spark spark-c">✦</span>`;
  document.body.appendChild(overlay);
  const duration = document.documentElement.classList.contains('reduce-motion') ? 250 : 1900;
  window.setTimeout(() => {
    overlay.remove();
    rewardAnimationPlaying = false;
    if (rewardAnimationQueue.length) runNextRewardAnimation();
  }, duration);
}
function getPlayerXp() {
  const completed = Object.values(S.done || {}).reduce((sum, values) => sum + (Array.isArray(values) ? values.length : 0), 0);
  return completed * 10 + (S.defeated || []).length * 75;
}
function renderLevelProgress() {
  const xp = getPlayerXp(), level = Math.floor(xp / 250) + 1, inLevel = xp % 250;
  if (lastRenderedPlayerLevel !== null && level > lastRenderedPlayerLevel) playRewardAnimation('level');
  lastRenderedPlayerLevel = level;
  const levelValue = document.querySelector('#playerLevelValue');
  if (levelValue) levelValue.textContent = String(level);
  const xpText = document.querySelector('#playerXpText');
  if (xpText) xpText.textContent = `${inLevel} / 250 XP`;
  const xpBar = document.querySelector('#playerXpBar');
  if (xpBar) xpBar.style.width = `${inLevel / 250 * 100}%`;
  const floor = document.querySelector('#bossTowerFloorValue');
  if (floor) floor.textContent = String((S.defeated || []).length + 1);
  const reward = document.querySelector('#bossTowerReward');
  if (reward) {
    const remaining = 5 - ((S.defeated || []).length % 5);
    reward.textContent = textFor('bossTowerNextReward', { count: remaining });
  }
}
function renderStatsCalendar() {
  const title = document.querySelector('#statsMonthTitle'), grid = document.querySelector('#statsCalendar');
  if (!title || !grid) return;
  const year = statsMonthCursor.getFullYear(), month = statsMonthCursor.getMonth();
  title.textContent = statsMonthCursor.toLocaleDateString(localeForLanguage(), { month: 'long', year: 'numeric' });
  const first = new Date(year, month, 1), count = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const days = getTranslatedDays();
  const weekdayHeads = days.map(day => `<span class="stats-weekday">${escapeFriendHTML(day.slice(0, 2))}</span>`).join('');
  const blanks = Array.from({ length: offset }, () => '<span class="stats-day-blank"></span>').join('');
  let cells = '';
  for (let day = 1; day <= count; day++) {
    const date = iso(new Date(year, month, day));
    const stat = dayStat(date), intensity = stat.p ? Math.min(4, Math.ceil(stat.pct / 25)) : 0;
    cells += `<button type="button" class="stats-day intensity-${intensity} ${date === today() ? 'is-today' : ''}" data-act="statsDay" data-date="${date}" title="${escapeFriendHTML(stat.p ? `${stat.k}/${stat.p}` : textFor('progressNoTasks'))}"><span>${day}</span><small>${stat.p ? `${R(stat.pct)}%` : '·'}</small></button>`;
  }
  grid.innerHTML = weekdayHeads + blanks + cells;
}

function taskRow(t, d) {
  const on = (S.done[d] || []).includes(t.id);

  const r = {
    once: textFor('taskOneTime'),
    daily: textFor('taskDaily'),
    days: (t.days || []).map(i => DAYS[i]).join(' ')
  }[t.rep];

  const taskStyle = t.color
    ? `style="--task-color: ${esc(t.color)}"`
    : '';

  return `
    <div class="task ${on ? 'done' : ''}" data-id="${t.id}" ${taskStyle}>
      <button class="chk" data-act="tog" data-id="${t.id}" data-d="${d}" aria-label="Done">✓</button>
      <div class="tt">
        <span>${esc(t.title)}</span>
        <small>${t.cat ? esc(t.cat) + ' · ' : ''}${r}</small>
      </div>
      <button class="ico" data-act="edit" data-id="${t.id}" aria-label="Edit">✎</button>
    </div>`;
}

const list = d => planned(d).map(t => taskRow(t, d)).join('') || `<div class="empty">${textFor('noTasksPlanned')}</div>`;
function chart(el, n) {                               // weekly consistency line chart (SVG, no library)
  const m0 = monOf(today()), pts = []; for (let i = n - 1; i >= 0; i--) pts.push(weekStat(add(m0, -7 * i)).pct);
  const W = 300, H = 90, x = i => 10 + i * (W - 20) / (n - 1), y = v => H - 8 - v / 100 * (H - 16); let p = '', c = '';
  pts.forEach((v, i) => { if (v === null) return; p += (p ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); c += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.5"/>`; });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}"><line class="g" x1="10" x2="${W - 10}" y1="${y(80)}" y2="${y(80)}"/><path d="${p}"/>${c}</svg>`;
}

const SHOP_ITEMS = [
  {
    id: 'premiumSound',
    name: '🎵 Premium-Abschluss-Sound',
    description: 'Ein besonderer dreistufiger Sound beim Erledigen einer Aufgabe.',
    price: 100,
    sound: 'premiumSound'
  },
  { id: 'softPop', name: '🫧 Sanftes Plopp', description: 'Ein weiches, kurzes Plopp mit hellem Ausklang.', price: 60, sound: 'softPop' },
  { id: 'crystal', name: '💎 Kristall-Klingeln', description: 'Zwei klare, funkelnde Töne als kleine Belohnung.', price: 80, sound: 'crystal' },
  { id: 'bubble', name: '🪄 Seifenblasen', description: 'Zwei blubbernde Töne, die nach oben schweben.', price: 70, sound: 'bubble' }
  , { id: 'softBell', name: '🔔 Sanfte Glocke', description: 'Helle, ruhige Glockentöne als kleine Belohnung.', price: 90, sound: 'softBell' }
  , { id: 'woodblock', name: '🪵 Holzklang', description: 'Warme, kurze Klopfklänge.', price: 70, sound: 'woodblock' }
  , { id: 'arcade', name: '🕹️ Arcade', description: 'Ein verspielter Retro-Sound für erledigte Aufgaben.', price: 110, sound: 'arcade' }
  , { id: 'raindrop', name: '💧 Regentropfen', description: 'Sanfte, fallende Töne wie kleine Regentropfen.', price: 100, sound: 'raindrop' }
];

const TITLE_ITEMS = [
  { id: 'comet', nameKey: 'titleComet', price: 120, color: 'comet' },
  { id: 'starlight', nameKey: 'titleStarlight', price: 160, color: 'starlight' },
  { id: 'neondream', nameKey: 'titleNeonDream', price: 200, color: 'neondream' },
  { id: 'royalaura', nameKey: 'titleRoyalAura', price: 240, color: 'royalaura' },
  { id: 'solarflare', nameKey: 'titleSolarFlare', price: 280, color: 'solarflare' },
  { id: 'voidwalker', nameKey: 'titleVoidWalker', price: 320, color: 'voidwalker' },
  { id: 'crimsoncrown', nameKey: 'titleCrimsonCrown', price: 360, color: 'crimsoncrown' },
  { id: 'forestphantom', nameKey: 'titleForestPhantom', price: 380, color: 'forestphantom' }
  , { id: 'stardustkeeper', nameKey: 'titleStardustKeeper', price: 420, color: 'stardustkeeper' }
  , { id: 'sageoracle', nameKey: 'titleSageOracle', price: 440, color: 'sageoracle' }
  , { id: 'prismheart', nameKey: 'titlePrismHeart', price: 460, color: 'prismheart' }
];

const AVATAR_FRAME_ITEMS = [
  { id: 'aurora', price: 180, names: ['Aurora Ring', 'Aurora-Ring', 'Aro aurora', 'Anello aurora', 'Δακτύλιος σέλαος', 'Anel aurora'], colors: ['#65e7d3', '#65e7d3', '#65e7d3', '#65e7d3', '#65e7d3', '#65e7d3'] },
  { id: 'ember', price: 180, names: ['Ember Halo', 'Glut-Halo', 'Halo de brasas', 'Aureola di brace', 'Στεφάνι χόβολης', 'Halo de brasas'], colors: ['#ff764d', '#ff764d', '#ff764d', '#ff764d', '#ff764d', '#ff764d'] },
  { id: 'royal', price: 220, names: ['Royal Crest', 'Königswappen', 'Emblema real', 'Emblema reale', 'Βασιλικό έμβλημα', 'Brasão real'], colors: ['#f5c95d', '#f5c95d', '#f5c95d', '#f5c95d', '#f5c95d', '#f5c95d'] },
  { id: 'ocean', price: 200, names: ['Ocean Current', 'Meeresströmung', 'Corriente marina', 'Corrente marina', 'Ωκεάνιο ρεύμα', 'Corrente oceânica'], colors: ['#57a8ff', '#57a8ff', '#57a8ff', '#57a8ff', '#57a8ff', '#57a8ff'] },
  { id: 'prism', price: 280, names: ['Prism Crown', 'Prisma-Krone', 'Corona prisma', 'Corona prisma', 'Πρισματικό στέμμα', 'Coroa prisma'], colors: ['#e87cff', '#e87cff', '#e87cff', '#e87cff', '#e87cff', '#e87cff'] }
];

function avatarFrameClass(id) { return AVATAR_FRAME_ITEMS.some(item => item.id === id) ? `avatar-frame-${id}` : ''; }
function applyAvatarFrame(element, frameId) {
  if (!element) return;
  element.classList.remove(...AVATAR_FRAME_ITEMS.map(item => `avatar-frame-${item.id}`));
  const className = avatarFrameClass(frameId);
  if (className) element.classList.add(className);
}
function frameName(item) {
  const index = ['en', 'de', 'es', 'it', 'el', 'pt'].indexOf(getSupportedLanguage());
  return item.names[index] || item.names[0];
}

const PREMIUM_THEME_ITEMS = [
  { id: 'obsidiangold', nameKey: 'themeObsidianGold', descriptionKey: 'themeObsidianGoldDesc', price: 350 },
  { id: 'nocturnal', nameKey: 'themeNocturnal', descriptionKey: 'themeNocturnalDesc', price: 300 },
  { id: 'ruby', nameKey: 'themeRuby', descriptionKey: 'themeRubyDesc', price: 320 },
  { id: 'amethyst', nameKey: 'themeAmethyst', descriptionKey: 'themeAmethystDesc', price: 320 },
  { id: 'rose', nameKey: 'themeRose', descriptionKey: 'themeRoseDesc', price: 280 },
  { id: 'arctic', nameKey: 'themeArctic', descriptionKey: 'themeArcticDesc', price: 320 },
  { id: 'golden', nameKey: 'themeGolden', descriptionKey: 'themeGoldenDesc', price: 300 },
  { id: 'midnight', nameKey: 'themeMidnight', descriptionKey: 'themeMidnightDesc', price: 250 },
  { id: 'ocean', nameKey: 'themeOcean', descriptionKey: 'themeOceanDesc', price: 280 },
  { id: 'forest', nameKey: 'themeForest', descriptionKey: 'themeForestDesc', price: 280 },
  { id: 'sunset', nameKey: 'themeSunset', descriptionKey: 'themeSunsetDesc', price: 280 },
  { id: 'lavender', nameKey: 'themeLavender', descriptionKey: 'themeLavenderDesc', price: 280 },
  { id: 'paper', nameKey: 'themePaper', descriptionKey: 'themePaperDesc', price: 250 },
  { id: 'neon', nameKey: 'themeNeon', descriptionKey: 'themeNeonDesc', price: 300 },
  { id: 'cherrynoir', nameKey: 'themeCherryNoir', descriptionKey: 'themeCherryNoirDesc', price: 330 },
  { id: 'aurora', nameKey: 'themeAurora', descriptionKey: 'themeAuroraDesc', price: 350 },
  { id: 'synthwave', nameKey: 'themeSynthwave', descriptionKey: 'themeSynthwaveDesc', price: 340 },
  { id: 'glacier', nameKey: 'themeGlacier', descriptionKey: 'themeGlacierDesc', price: 320 },
  { id: 'peachglow', nameKey: 'themePeachGlow', descriptionKey: 'themePeachGlowDesc', price: 280 },
  { id: 'sakura', nameKey: 'themeSakura', descriptionKey: 'themeSakuraDesc', price: 300 },
  { id: 'deepspace', nameKey: 'themeDeepSpace', descriptionKey: 'themeDeepSpaceDesc', price: 350 },
  { id: 'matcha', nameKey: 'themeMatcha', descriptionKey: 'themeMatchaDesc', price: 270 },
  { id: 'coralreef', nameKey: 'themeCoralReef', descriptionKey: 'themeCoralReefDesc', price: 320 },
  { id: 'cyberpunk', nameKey: 'themeCyberpunk', descriptionKey: 'themeCyberpunkDesc', price: 380 },
  { id: 'ember', nameKey: 'themeEmber', descriptionKey: 'themeEmberDesc', price: 300 },
  { id: 'toxicbloom', nameKey: 'themeToxicBloom', descriptionKey: 'themeToxicBloomDesc', price: 420 },
  { id: 'bloodmoon', nameKey: 'themeBloodMoon', descriptionKey: 'themeBloodMoonDesc', price: 420 },
  { id: 'hologram', nameKey: 'themeHologram', descriptionKey: 'themeHologramDesc', price: 480 },
  { id: 'volcanicash', nameKey: 'themeVolcanicAsh', descriptionKey: 'themeVolcanicAshDesc', price: 480 },
  { id: 'enchantedforest', nameKey: 'themeEnchantedForest', descriptionKey: 'themeEnchantedForestDesc', price: 500 },
  { id: 'nebuladrift', nameKey: 'themeNebulaDrift', descriptionKey: 'themeNebulaDriftDesc', price: 560, animated: true },
  { id: 'auroraflow', nameKey: 'themeAuroraFlow', descriptionKey: 'themeAuroraFlowDesc', price: 560, animated: true },
  { id: 'lavapulse', nameKey: 'themeLavaPulse', descriptionKey: 'themeLavaPulseDesc', price: 560, animated: true },
  { id: 'galaxy', nameKey: 'themeGalaxy', descriptionKey: 'themeGalaxyDesc', price: 620, animated: true },
  { id: 'sageminimal', nameKey: 'themeSageMinimal', descriptionKey: 'themeSageMinimalDesc', price: 400 },
  { id: 'solareclipse', nameKey: 'themeSolarEclipse', descriptionKey: 'themeSolarEclipseDesc', price: 460 },
  { id: 'cottoncandy', nameKey: 'themeCottonCandy', descriptionKey: 'themeCottonCandyDesc', price: 420 },
  { id: 'retroarcade', nameKey: 'themeRetroArcade', descriptionKey: 'themeRetroArcadeDesc', price: 480 },
  { id: 'oceanglass', nameKey: 'themeOceanGlass', descriptionKey: 'themeOceanGlassDesc', price: 460 },
  { id: 'rosequartz', nameKey: 'themeRoseQuartz', descriptionKey: 'themeRoseQuartzDesc', price: 420 },
  { id: 'emeraldcity', nameKey: 'themeEmeraldCity', descriptionKey: 'themeEmeraldCityDesc', price: 500 },
  { id: 'cloudnine', nameKey: 'themeCloudNine', descriptionKey: 'themeCloudNineDesc', price: 400 },
  { id: 'prism', nameKey: 'themePrism', descriptionKey: 'themePrismDesc', price: 520 }
];

const REWARD_EFFECTS = {
  level: [
    { id: 'aurora', price: 180, names: ['Aurora Rise', 'Polarlicht-Aufstieg', 'Ascenso auroral', 'Ascesa dell’aurora', 'Άνοδος σέλαος', 'Ascensão da aurora'], desc: ['A smooth teal and violet level-up glow.', 'Sanfter Level-up-Glow in Türkis und Violett.', 'Brillo suave turquesa y violeta al subir de nivel.', 'Bagliore morbido turchese e viola al salire di livello.', 'Απαλή λάμψη σε τιρκουάζ και μοβ κατά την άνοδο.', 'Brilho suave turquesa e violeta ao subir de nível.'] },
    { id: 'solflare', price: 300, names: ['Solar Flare', 'Sonnenflare', 'Llamarada solar', 'Bagliore solare', 'Ηλιακή έκλαμψη', 'Explosão solar'], desc: ['A warm golden ring and a crisp level-up pulse.', 'Warmer goldener Ring mit klarem Level-up-Puls.', 'Un anillo dorado cálido y un pulso al subir de nivel.', 'Un anello dorato caldo con un impulso al salire di livello.', 'Χρυσός δακτύλιος και φωτεινός παλμός ανόδου.', 'Um anel dourado e um pulso ao subir de nível.'] },
    { id: 'pixelwave', price: 450, names: ['Pixel Wave', 'Pixel-Welle', 'Ola de píxeles', 'Onda pixel', 'Κυματισμός pixel', 'Onda pixel'], desc: ['A tidy retro scan wave with bright pixel sparks.', 'Aufgeräumte Retro-Welle mit leuchtenden Pixel-Funken.', 'Una onda retro ordenada con destellos de píxeles.', 'Un’onda retrò pulita con scintille pixel luminose.', 'Ρετρό κύμα με φωτεινές σπίθες pixel.', 'Uma onda retro com faíscas pixel brilhantes.'] }
  ],
  achievement: [
    { id: 'confetti', price: 180, names: ['Confetti Bloom', 'Konfetti-Blüte', 'Lluvia de confeti', 'Pioggia di coriandoli', 'Άνθη κομφετί', 'Chuva de confetes'], desc: ['A short, polished burst of colorful confetti.', 'Kurzer, sauberer Burst aus buntem Konfetti.', 'Una breve explosión elegante de confeti colorido.', 'Un breve e curato scoppio di coriandoli colorati.', 'Σύντομη, κομψή έκρηξη πολύχρωμου κομφετί.', 'Uma explosão breve e cuidada de confetes coloridos.'] },
    { id: 'starfall', price: 300, names: ['Starfall', 'Sternschnuppen', 'Lluvia de estrellas', 'Pioggia di stelle', 'Βροχή αστεριών', 'Chuva de estrelas'], desc: ['A clean starburst with a soft gold shimmer.', 'Ein klarer Sternenburst mit sanftem Goldschimmer.', 'Un estallido de estrellas con un brillo dorado suave.', 'Un’esplosione di stelle con un tenue bagliore dorato.', 'Αστρική έκρηξη με απαλή χρυσή λάμψη.', 'Um clarão de estrelas com brilho dourado suave.'] },
    { id: 'trophybloom', price: 450, names: ['Trophy Bloom', 'Trophäen-Glow', 'Brillo de trofeo', 'Bagliore del trofeo', 'Λάμψη τροπαίου', 'Brilho de troféu'], desc: ['A focused trophy glow with a gentle expanding ring.', 'Fokussierter Trophäen-Glow mit sanft wachsendem Ring.', 'Brillo de trofeo con un anillo expansivo suave.', 'Bagliore del trofeo con un anello che si espande.', 'Λάμψη τροπαίου με απαλό επεκτεινόμενο δακτύλιο.', 'Brilho de troféu com um anel suave em expansão.'] }
  ]
};

function effectCollection(kind) { return kind === 'level' ? 'levelUpEffectPurchases' : 'achievementEffectPurchases'; }
function effectEquippedKey(kind) { return kind === 'level' ? 'equippedLevelUpEffect' : 'equippedAchievementEffect'; }
function effectOwned(kind) { return getOwnedItems(effectCollection(kind), effectCollection(kind)); }
function effectCopy(item, field) { return item[field][['en', 'de', 'es', 'it', 'el', 'pt'].indexOf(getSupportedLanguage())] || item[field][0]; }
function renderAnimationShop() {
  const languageIndex = ['en', 'de', 'es', 'it', 'el', 'pt'].indexOf(getSupportedLanguage());
  const headers = {
    level: [['✨ Level-up animations', '✨ Level-up-Animationen', '✨ Animaciones de nivel', '✨ Animazioni livello', '✨ Κινήσεις ανόδου επιπέδου', '✨ Animações de nível'], ['Choose the effect shown when you gain a level.', 'Wähle den Effekt für einen neuen Level.', 'Elige el efecto al subir de nivel.', 'Scegli l’effetto quando sali di livello.', 'Διάλεξε το εφέ όταν ανεβαίνεις επίπεδο.', 'Escolhe o efeito ao subir de nível.']],
    achievement: [['🏆 Achievement animations', '🏆 Achievement-Animationen', '🏆 Animaciones de logros', '🏆 Animazioni obiettivi', '🏆 Κινήσεις επιτευγμάτων', '🏆 Animações de conquistas'], ['Choose the celebration shown when you unlock an achievement.', 'Wähle die Feier beim Freischalten eines Achievements.', 'Elige la celebración al desbloquear un logro.', 'Scegli la celebrazione quando sblocchi un obiettivo.', 'Διάλεξε τον εορτασμό όταν ξεκλειδώνεις επίτευγμα.', 'Escolhe a celebração ao desbloquear uma conquista.']]
  };
  for (const kind of ['level', 'achievement']) {
    const [title, intro] = headers[kind];
    const titleNode = document.getElementById(`${kind === 'level' ? 'level' : 'achievement'}EffectsHeading`);
    const introNode = document.getElementById(`${kind === 'level' ? 'level' : 'achievement'}EffectsIntro`);
    const grid = document.getElementById(`${kind === 'level' ? 'level' : 'achievement'}EffectsGrid`);
    if (!grid) continue;
    titleNode.textContent = title[languageIndex] || title[0];
    introNode.textContent = intro[languageIndex] || intro[0];
    const owned = effectOwned(kind), equipped = S[effectEquippedKey(kind)] || '';
    grid.innerHTML = REWARD_EFFECTS[kind].map(item => {
      const isOwned = owned.includes(item.id), isEquipped = equipped === item.id;
      const order = REWARD_EFFECTS[kind].indexOf(item);
      return `<article class="card reward-effect-card ${isEquipped ? 'is-equipped' : ''}" data-shop-kind="${kind}Effect" data-shop-order="${order}" data-shop-price="${item.price}" data-shop-owned="${isOwned}"><span class="reward-effect-swatch ${kind}-${item.id}" aria-hidden="true">${kind === 'level' ? '⬆' : '🏆'}</span><h3>${effectCopy(item, 'names')}</h3><p>${effectCopy(item, 'desc')}</p><p>${textFor('pointsPriceLine', { price: item.price })}</p><button type="button" data-shop-preview-effect="${kind}:${item.id}">${textFor('previewItem')}</button>${isOwned ? `<button type="button" data-effect-equip="${kind}:${item.id}" ${isEquipped ? 'disabled' : ''}>${isEquipped ? textFor('equipped') : effectCopy({ names: [['Equip', 'Ausrüsten', 'Equipar', 'Equipaggia', 'Εξόπλισε', 'Equipar'][languageIndex] || 'Equip'] }, 'names')}</button>` : `<button type="button" data-effect-buy="${kind}:${item.id}" ${getAvailablePoints() < item.price ? 'disabled' : ''}>${textFor('buyItem')}</button>`}</article>`;
    }).join('');
  }
}

document.addEventListener('click', event => {
  const buy = event.target.closest('[data-effect-buy]');
  const equip = event.target.closest('[data-effect-equip]');
  if (buy) {
    const [kind, id] = buy.dataset.effectBuy.split(':');
    const item = REWARD_EFFECTS[kind]?.find(effect => effect.id === id);
    const owned = effectOwned(kind);
    if (!item || owned.includes(id) || getAvailablePoints() < item.price) return;
    recordShopPurchase(`${kind}Effect`, id, item.price);
    owned.push(id); setOwnedItems(effectCollection(kind), effectCollection(kind), owned); renderShop();
  }
  if (equip) {
    const [kind, id] = equip.dataset.effectEquip.split(':');
    if (!REWARD_EFFECTS[kind]?.some(effect => effect.id === id) || !effectOwned(kind).includes(id)) return;
    S[effectEquippedKey(kind)] = id; save(); renderShop();
  }
});

function getTitlePurchases() { return getOwnedItems('titlePurchases', 'titlePurchases'); }

function renderThemeShop() {
  const grid = document.querySelector('#themeShopGrid');
  if (!grid) return;
  const unlocked = getUnlockedThemeSkins();
  const active = storage.getItem('consistlySkin') || 'falloutterminal';
  grid.innerHTML = PREMIUM_THEME_ITEMS.map((item, order) => {
    const owned = unlocked.includes(item.id);
    const previewClass = `preview-${item.id}`;
    return `<article class="card premium-theme-card ${item.animated ? 'animated-theme-card' : ''}" data-shop-kind="theme" data-shop-order="${order}" data-shop-price="${item.price}" data-shop-owned="${owned}">
      <span class="theme-preview ${previewClass}"></span><h3>${textFor(item.nameKey)}${item.animated ? ' ✨' : ''}</h3>
      <p>${textFor(item.descriptionKey)}</p><p>${textFor('pointsPriceLine', { price: item.price })}</p>
      <button type="button" data-shop-preview="theme:${item.id}">${textFor('previewItem')}</button>${owned ? `<button type="button" data-theme-equip="${item.id}" ${active === item.id ? 'disabled' : ''}>${active === item.id ? textFor('equipped') : textFor('equipTheme')}</button>` : `<button type="button" data-theme-buy="${item.id}" ${getAvailablePoints() < item.price ? 'disabled' : ''}>${textFor('buyTheme')}</button>`}
    </article>`;
  }).join('');
}

function buyTheme(id) {
  const item = PREMIUM_THEME_ITEMS.find(themeItem => themeItem.id === id);
  if (!item || getUnlockedThemeSkins().includes(id) || getAvailablePoints() < item.price) return;
  const unlocked = getUnlockedThemeSkins();
  recordShopPurchase('theme', id, item.price);
  unlocked.push(id);
  setOwnedItems('unlockedThemeSkins', 'themePurchases', unlocked);
  setSkin(id);
  renderShop();
}

function buyStreakShield() {
  if (getAvailablePoints() < STREAK_SHIELD_PRICE) {
    alert(textFor('notEnoughPoints', { price: STREAK_SHIELD_PRICE }));
    return;
  }
  grantStreakShield('shop');
  render();
  renderShop();
}

function equipTheme(id) {
  if (!getUnlockedThemeSkins().includes(id)) return;
  setSkin(id);
  renderThemeShop();
}

document.addEventListener('click', event => {
  const buy = event.target.closest('[data-theme-buy]');
  const equip = event.target.closest('[data-theme-equip]');
  if (buy) buyTheme(buy.dataset.themeBuy);
  if (equip) equipTheme(equip.dataset.themeEquip);
});

function renderEquippedTitle(container, titleId) {
  if (!container) return;
  const item = TITLE_ITEMS.find(title => title.id === titleId);
  container.dataset.titleId = item?.id || '';
  container.innerHTML = item
    ? `<span class="profile-title title-${item.color}">${textFor(item.nameKey)}</span>`
    : '';
}

function renderTitleShop() {
  const grid = document.querySelector('#titleShopGrid');
  const inventory = document.querySelector('#titlePurchasesList');
  if (!grid || !inventory) return;
  const owned = getTitlePurchases();
  const equipped = currentUser ? document.querySelector('#myEquippedTitle')?.dataset.titleId || '' : '';
  grid.innerHTML = TITLE_ITEMS.map((item, order) => {
    const purchased = owned.includes(item.id);
    return `<article class="card title-shop-card ${equipped === item.id ? 'is-equipped' : ''}" data-shop-kind="title" data-shop-order="${order}" data-shop-price="${item.price}" data-shop-owned="${purchased}"><span class="profile-title title-${item.color}">${textFor(item.nameKey)}</span>${equipped === item.id ? `<strong class="title-equipped-state">✓ ${textFor('equipped')}</strong>` : ''}<p>${textFor('pointsPriceLine', { price: item.price })}</p><button type="button" data-shop-preview="title:${item.id}">${textFor('previewItem')}</button>
      ${purchased ? `<button type="button" data-title-equip="${item.id}" ${equipped === item.id ? 'disabled' : ''}>${equipped === item.id ? textFor('equipped') : textFor('equipTitle')}</button>` : `<button type="button" data-title-buy="${item.id}" ${getAvailablePoints() < item.price ? 'disabled' : ''}>${textFor('buyItem')}</button>`}</article>`;
  }).join('');
  inventory.innerHTML = owned.length ? TITLE_ITEMS.filter(item => owned.includes(item.id)).map(item =>
    `<div class="card inventory-item"><span class="profile-title title-${item.color}">${textFor(item.nameKey)}</span><button type="button" data-shop-preview="title:${item.id}">${textFor('previewItem')}</button><button type="button" data-title-equip="${item.id}" ${equipped === item.id ? 'disabled' : ''}>${equipped === item.id ? textFor('equipped') : textFor('equipTitle')}</button></div>`
  ).join('') : `<p>${textFor('noTitles')}</p>`;
}

async function buyTitle(id) {
  const item = TITLE_ITEMS.find(title => title.id === id);
  if (!item) return;
  if (!currentUser) {
    alert(textFor('loginToContinue'));
    return;
  }
  const owned = getTitlePurchases();
  if (owned.includes(id) || getAvailablePoints() < item.price) return;
  recordShopPurchase('title', id, item.price);
  owned.push(id);
  setOwnedItems('titlePurchases', 'titlePurchases', owned);
  renderShop();
}

async function equipTitle(id) {
  if (!currentUser || !getTitlePurchases().includes(id)) return;
  const { error: rpcError } = await supabaseClient.rpc('set_my_profile_title', { p_title_id: id });
  let saveError = rpcError;
  if (rpcError) {
    const { data, error } = await supabaseClient.from('profiles')
      .update({ equipped_title: id }).eq('id', currentUser.id)
      .select('equipped_title').maybeSingle();
    saveError = error || (!data ? { message: 'Titel konnte nicht im Profil gespeichert werden. Bitte v3-Migration ausführen und PostgREST-Schema neu laden.' } : null);
  }
  if (saveError) {
    alert(textFor('titleEquipFailed', { error: saveError.message }));
    return;
  }
  storage.setItem('equippedProfileTitle', id);
  renderEquippedTitle(document.querySelector('#myEquippedTitle'), id);
  renderShop();
  await loadProfile();
  renderShop();
}

document.addEventListener('click', event => {
  const buy = event.target.closest('[data-title-buy]');
  const equip = event.target.closest('[data-title-equip]');
  if (buy) buyTitle(buy.dataset.titleBuy);
  if (equip) equipTitle(equip.dataset.titleEquip);
});

function getAvatarFramePurchases() { return getOwnedItems('avatarFramePurchases', 'avatarFramePurchases'); }
function renderAvatarFrameShop() {
  const grid = document.querySelector('#avatarFrameShopGrid');
  if (!grid) return;
  const owned = getAvatarFramePurchases();
  const equipped = storage.getItem('equippedAvatarFrame') || '';
  grid.innerHTML = AVATAR_FRAME_ITEMS.map((item, order) => {
    const purchased = owned.includes(item.id), isEquipped = equipped === item.id;
    return `<article class="card avatar-frame-card ${isEquipped ? 'is-equipped' : ''}" data-shop-kind="avatarFrame" data-shop-order="${order}" data-shop-price="${item.price}" data-shop-owned="${purchased}"><span class="shop-frame-sample avatar-frame-${item.id}" aria-hidden="true">👤</span><h3>${frameName(item)}</h3><p>${textFor('pointsPriceLine', { price: item.price })}</p><button type="button" data-shop-preview="frame:${item.id}">${textFor('previewItem')}</button>${purchased ? `<button type="button" data-avatar-frame-equip="${item.id}" ${isEquipped ? 'disabled' : ''}>${isEquipped ? textFor('equipped') : textFor('equipAvatarFrame')}</button>` : `<button type="button" data-avatar-frame-buy="${item.id}" ${getAvailablePoints() < item.price ? 'disabled' : ''}>${textFor('buyItem')}</button>`}</article>`;
  }).join('');
  if (equipped) grid.insertAdjacentHTML('beforeend', `<button type="button" class="avatar-frame-remove" data-avatar-frame-equip="none">${textFor('avatarFrameRemove')}</button>`);
}

function buyAvatarFrame(id) {
  const item = AVATAR_FRAME_ITEMS.find(frame => frame.id === id), owned = getAvatarFramePurchases();
  if (!item || owned.includes(id) || getAvailablePoints() < item.price) return;
  recordShopPurchase('frame', id, item.price);
  owned.push(id);
  setOwnedItems('avatarFramePurchases', 'avatarFramePurchases', owned);
  renderShop();
}

async function equipAvatarFrame(id) {
  const frameId = id === 'none' ? null : id;
  if (!currentUser) { alert(textFor('loginToContinue')); return; }
  if (frameId && (!AVATAR_FRAME_ITEMS.some(item => item.id === frameId) || !getAvatarFramePurchases().includes(frameId))) return;
  const { error } = await supabaseClient.rpc('set_my_avatar_frame', { p_frame_id: frameId });
  if (error) { alert(`${textFor('titleEquipFailed', { error: error.message })} (supabase-avatar-frames-v14.sql)`); return; }
  if (frameId) storage.setItem('equippedAvatarFrame', frameId); else storage.removeItem('equippedAvatarFrame');
  applyAvatarFrame(document.querySelector('#profileAvatarImage'), frameId);
  applyAvatarFrame(document.querySelector('#profileAvatar'), frameId);
  renderAvatarFrameShop();
}

function Purchases() { return getOwnedItems('shopPurchases', 'shopPurchases'); }

function getShopPurchaseHistory() {
  if (!Array.isArray(S.shopPurchaseHistory)) S.shopPurchaseHistory = [];
  const records = S.shopPurchaseHistory;
  const legacy = [];
  for (const item of SHOP_ITEMS.filter(item => getShopPurchases().includes(item.id))) legacy.push({ kind: 'sound', itemId: item.id, price: item.price });
  for (const item of TITLE_ITEMS.filter(item => getTitlePurchases().includes(item.id))) legacy.push({ kind: 'title', itemId: item.id, price: item.price });
  for (const item of AVATAR_FRAME_ITEMS.filter(item => getAvatarFramePurchases().includes(item.id))) legacy.push({ kind: 'frame', itemId: item.id, price: item.price });
  for (const item of PREMIUM_THEME_ITEMS.filter(item => getUnlockedThemeSkins().includes(item.id))) legacy.push({ kind: 'theme', itemId: item.id, price: item.price });
  for (const kind of ['level', 'achievement']) for (const item of REWARD_EFFECTS[kind].filter(item => effectOwned(kind).includes(item.id))) legacy.push({ kind: `${kind}Effect`, itemId: item.id, price: item.price });
  for (const shield of (S.streakShields || []).filter(item => item.source !== 'guardian')) legacy.push({ kind: 'streakShield', itemId: shield.id, price: STREAK_SHIELD_PRICE });
  let changed = false;
  for (const item of legacy) {
    if (records.some(record => record.kind === item.kind && record.itemId === item.itemId && !record.refundedAt)) continue;
    records.push({ ...item, purchaseId: uid(), purchasedAt: new Date().toISOString(), purchasedOn: today(), refundPoints: 0 }); changed = true;
  }
  for (const record of records) if (!record.purchaseId) { record.purchaseId = uid(); changed = true; }
  for (const record of records) if (!record.purchasedOn && record.purchasedAt) { record.purchasedOn = iso(new Date(record.purchasedAt)); changed = true; }
  if (changed) save();
  return records;
}
function recordShopPurchase(kind, itemId, price) {
  const history = getShopPurchaseHistory();
  history.push({ kind, itemId, purchaseId: uid(), price: Number(price) || 0, purchasedAt: new Date().toISOString(), purchasedOn: today(), refundPoints: 0 });
  save();
}
function shopPurchaseName(record) {
  if (record.kind === 'sound') {
    const keys = { premiumSound: 'shopPremiumSound', softPop: 'shopSoftPop', crystal: 'shopCrystal', bubble: 'shopBubble', softBell: 'shopSoftBell', woodblock: 'shopWoodblock', arcade: 'shopArcade', raindrop: 'shopRaindrop' };
    return textFor(keys[record.itemId] || 'shopPremiumSound');
  }
  if (record.kind === 'title') { const item = TITLE_ITEMS.find(item => item.id === record.itemId); return item ? textFor(item.nameKey) : record.itemId; }
  if (record.kind === 'frame') { const item = AVATAR_FRAME_ITEMS.find(item => item.id === record.itemId); return item ? frameName(item) : record.itemId; }
  if (record.kind === 'theme') { const item = PREMIUM_THEME_ITEMS.find(item => item.id === record.itemId); return item ? textFor(item.nameKey) : record.itemId; }
  if (record.kind === 'levelEffect' || record.kind === 'achievementEffect') {
    const kind = record.kind === 'levelEffect' ? 'level' : 'achievement'; const item = REWARD_EFFECTS[kind].find(item => item.id === record.itemId); return item ? effectCopy(item, 'names') : record.itemId;
  }
  return textFor('streakShieldName');
}

function shopRefundWindowOpen(record) {
  const purchasedAt = Date.parse(record?.purchasedAt || '');
  const purchasedOn = record?.purchasedOn ||
    (Number.isFinite(purchasedAt)
      ? iso(new Date(purchasedAt))
      : '');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(purchasedOn)) {
    return false;
  }

  const ordinal = date => {
    const [year, month, day] = date.split('-').map(Number);
    return Math.floor(
      Date.UTC(year, month - 1, day) / 86400000
    );
  };

  const ageDays = ordinal(today()) - ordinal(purchasedOn);

  return ageDays >= 0 && ageDays <= 14;
}

function canRefundShopPurchase(record) {
  if (record.refundedAt) return false;
  if (!shopRefundWindowOpen(record)) return false;
  if (record.kind === 'sound') return getActiveSound() !== SHOP_ITEMS.find(item => item.id === record.itemId)?.sound;
  if (record.kind === 'theme') return (storage.getItem('consistlySkin') || 'falloutterminal') !== record.itemId;
  if (record.kind === 'title') return (storage.getItem('equippedProfileTitle') || document.querySelector('#myEquippedTitle')?.dataset.titleId || '') !== record.itemId;
  if (record.kind === 'frame') return (storage.getItem('equippedAvatarFrame') || '') !== record.itemId;
  if (record.kind === 'levelEffect') return S.equippedLevelUpEffect !== record.itemId;
  if (record.kind === 'achievementEffect') return S.equippedAchievementEffect !== record.itemId;
  if (record.kind === 'streakShield') return !(S.streakShields || []).find(shield => shield.id === record.itemId)?.usedOn;
  return false;
}
function renderShopPurchaseHistory() {
  const container = document.querySelector('#shopPurchaseHistory'); if (!container) return;
  const history = [...getShopPurchaseHistory()].sort((a, b) => new Date(b.purchasedAt || 0) - new Date(a.purchasedAt || 0));
  container.innerHTML = history.length ? history.map((record, index) => {
    const refunded = Boolean(record.refundedAt), refund = Math.floor((Number(record.price) || 0) * .5);
    const eligible = canRefundShopPurchase(record);
    const disabledLabel = shopRefundWindowOpen(record) ? textFor('shopUnequipBeforeRefund') : textFor('shopRefundExpired');
    return `<article class="card shop-history-item"><div><b>${escapeFriendHTML(shopPurchaseName(record))}</b><small>${escapeFriendHTML(new Date(record.purchasedAt || Date.now()).toLocaleString(localeForLanguage()))} · ${textFor('pointsPriceLine', { price: record.price })}</small></div>${refunded ? `<span class="shop-refunded-badge">${textFor('shopRefunded', { points: record.refundPoints })}</span>` : `<button type="button" data-shop-refund="${escapeFriendHTML(record.purchaseId)}" ${eligible ? '' : 'disabled'}>${eligible ? textFor('shopRefundButton', { points: refund }) : disabledLabel}</button>`}</article>`;
  }).join('') : `<p>${textFor('shopHistoryEmpty')}</p>`;
}
function refundShopPurchase(purchaseId) {
  const record = getShopPurchaseHistory().find(item => item.purchaseId === purchaseId);
  if (!record || !canRefundShopPurchase(record)) return;
  const refund = Math.floor((Number(record.price) || 0) * .5);
  if (!confirm(textFor('shopRefundConfirm', { item: shopPurchaseName(record), points: refund }))) return;
  const collections = { sound: ['shopPurchases', 'shopPurchases'], title: ['titlePurchases', 'titlePurchases'], frame: ['avatarFramePurchases', 'avatarFramePurchases'], theme: ['unlockedThemeSkins', 'themePurchases'], levelEffect: ['levelUpEffectPurchases', 'levelUpEffectPurchases'], achievementEffect: ['achievementEffectPurchases', 'achievementEffectPurchases'] };
  if (record.kind === 'streakShield') S.streakShields = (S.streakShields || []).filter(shield => shield.id !== record.itemId);
  else if (collections[record.kind]) {
    const [storageKey, stateKey] = collections[record.kind];
    setOwnedItems(storageKey, stateKey, getOwnedItems(storageKey, stateKey).filter(id => id !== record.itemId));
  }
  record.refundedAt = new Date().toISOString(); record.refundPoints = refund; save();
  render(); renderShop();
}
document.querySelector('#shopPurchaseHistory')?.addEventListener('click', event => {
  const button = event.target.closest('[data-shop-refund]'); if (button) refundShopPurchase(button.dataset.shopRefund);
});

function getShopPurchases() {
  return getOwnedItems('shopPurchases', 'shopPurchases');
}

function hasShopItem(id) {
  return getShopPurchases().includes(id);
}

function getAvailablePoints() {
  const spent = getShopPurchaseHistory().reduce((sum, record) => sum + Math.max(0, (Number(record.price) || 0) - (Number(record.refundPoints) || 0)), 0);
  return getTotalPoints() - spent;
}

function renderStreakShieldShop() {
  const grid = document.querySelector('#streakShieldShopGrid');
  if (!grid) return;
  const lang = getSupportedLanguage();
  const copy = {
    en: ['🛡️ Streak Shield', 'Protects one missed day with planned tasks. Buy it before the missed day; unused shields stay in your inventory.', 'Available: {count}', '🪙 Buy shield'],
    de: ['🛡️ Streak-Schild', 'Schützt einen verpassten Tag mit geplanten Aufgaben. Kaufe es vor dem Fehltag; unbenutzte Schilde bleiben im Inventar.', 'Verfügbar: {count}', '🪙 Schild kaufen'],
    es: ['🛡️ Escudo de racha', 'Protege un día perdido con tareas programadas. Cómpralo antes del día perdido; los escudos sin usar permanecen en tu inventario.', 'Disponibles: {count}', '🪙 Comprar escudo'],
    it: ['🛡️ Scudo serie', 'Protegge un giorno saltato con attività pianificate. Acquistalo prima del giorno saltato; gli scudi inutilizzati restano nell’inventario.', 'Disponibili: {count}', '🪙 Acquista scudo'],
    el: ['🛡️ Ασπίδα σερί', 'Προστατεύει μία χαμένη ημέρα με προγραμματισμένες εργασίες. Αγόρασέ την πριν από τη χαμένη ημέρα· οι αχρησιμοποίητες ασπίδες μένουν στο απόθεμα.', 'Διαθέσιμες: {count}', '🪙 Αγορά ασπίδας'],
    pt: ['🛡️ Escudo de sequência', 'Protege um dia falhado com tarefas planeadas. Compra-o antes do dia falhado; os escudos não usados ficam no inventário.', 'Disponíveis: {count}', '🪙 Comprar escudo']
  }[lang] || ['🛡️ Streak Shield', 'Protects one missed day with planned tasks. Buy it before the missed day; unused shields stay in your inventory.', 'Available: {count}', '🪙 Buy shield'];
  const shields = Array.isArray(S.streakShields) ? S.streakShields : [];
  const unused = shields.filter(item => !item.usedOn).length;
  const owned = unused > 0;
  grid.innerHTML = `<article class="card" data-shop-kind="streakShield" data-shop-order="0" data-shop-price="${STREAK_SHIELD_PRICE}" data-shop-owned="${owned}"><div aria-hidden="true" style="font-size:2rem">🛡️</div><h3>${copy[0]}</h3><p>${copy[1]}</p><p>${copy[2].replace('{count}', unused)}</p><p>${textFor('pointsPriceLine', { price: STREAK_SHIELD_PRICE })}</p><button type="button" data-act="buyStreakShield" ${getAvailablePoints() < STREAK_SHIELD_PRICE ? 'disabled' : ''}>${copy[3]}</button></article>`;
}


function renderShop() {
  const grid = document.querySelector('#shopGrid');
  const purchases = document.querySelector('#purchasesList');

  if (!grid || !purchases) return;

  const shopCopy = {
    premiumSound: ['shopPremiumSound', 'shopPremiumDesc'],
    softPop: ['shopSoftPop', 'shopSoftPopDesc'],
    crystal: ['shopCrystal', 'shopCrystalDesc'],
    bubble: ['shopBubble', 'shopBubbleDesc'],
    softBell: ['shopSoftBell', 'shopSoftBellDesc'],
    woodblock: ['shopWoodblock', 'shopWoodblockDesc'],
    arcade: ['shopArcade', 'shopArcadeDesc'],
    raindrop: ['shopRaindrop', 'shopRaindropDesc']
  };

  grid.innerHTML = SHOP_ITEMS.map((item, order) => {
    const owned = hasShopItem(item.id);
    const active = getActiveSound() === item.sound;
    const [nameKey, descriptionKey] = shopCopy[item.id];
    const itemEmoji = item.name.split(' ')[0];

    return `
      <div class="card" data-shop-kind="sound" data-shop-order="${order}" data-shop-price="${item.price}" data-shop-owned="${owned}">
        <div aria-hidden="true">${itemEmoji}</div>
        <h3>${textFor(nameKey)}</h3>
        <p>${textFor(descriptionKey)}</p>
        <p>${textFor('pointsPriceLine', { price: item.price })}</p>
        <button type="button" data-shop-preview="sound:${item.sound}">${textFor('previewItem')}</button>

        ${owned
        ? `
              <button data-act="previewSound" data-id="${item.sound}">${textFor('listen')}</button>
              <button data-act="equipSound" data-id="${item.sound}" ${active ? 'disabled' : ''}>
                ${active ? textFor('equipped') : textFor('equipSound')}
              </button>
            `
        : `
              <button
                data-act="buy"
                data-id="${item.id}"
                ${getAvailablePoints() < item.price ? 'disabled' : ''}
              >
                ${textFor('buyItem')}
              </button>
            `
      }
      </div>
    `;
  }).join('');

  purchases.innerHTML = SHOP_ITEMS
    .filter(item => hasShopItem(item.id))
    .map(item => `
      <div class="card inventory-item">
        <div class="inventory-emoji">${item.name.split(' ')[0]}</div>
        <div class="inventory-copy"><b>${textFor(shopCopy[item.id][0])}</b><small>${getActiveSound() === item.sound ? textFor('justEquipped') : textFor('purchased')}</small></div>
        <button data-act="previewSound" data-id="${item.sound}" aria-label="${textFor(shopCopy[item.id][0])}">${textFor('listen')}</button>
        <button data-act="equipSound" data-id="${item.sound}" ${getActiveSound() === item.sound ? 'disabled' : ''}>${getActiveSound() === item.sound ? textFor('equipped') : textFor('equipSound')}</button>
      </div>
    `)
    .join('') || `<p>${textFor('emptyPurchases')}</p>`;

  const points = document.querySelector('#shopPoints');

  if (points) {
    points.textContent = getAvailablePoints();
  }
  renderTitleShop();
  renderStreakShieldShop();
  renderAvatarFrameShop();
  renderThemeShop();
  renderAnimationShop();
  renderShopPurchaseHistory();
  applyShopFilters();
}

let shopPreviewOriginalSkin;
function showShopPreview(kind, id) {
  const dialog = document.querySelector('#shopPreviewDlg');
  const title = document.querySelector('#shopPreviewTitle');
  const content = document.querySelector('#shopPreviewContent');
  if (!dialog || !title || !content) return;
  document.querySelector('#closeShopPreview')?.setAttribute('aria-label', textFor('shopPreviewClose'));
  title.textContent = textFor('shopPreviewTitle');
  if (kind === 'sound') {
    content.innerHTML = `<div class="shop-preview-sound">🔊<p>${textFor('shopPreviewSound')}</p></div>`;
    if (id === 'premiumSound') playPremiumHabitSound(); else playSoundEffect(id);
  } else if (kind === 'frame') {
    const frame = AVATAR_FRAME_ITEMS.find(item => item.id === id);
    if (!frame) return;
    content.innerHTML = `<div class="shop-preview-avatar ${avatarFrameClass(id)}">👤</div><h3>${escapeFriendHTML(frameName(frame))}</h3>`;
  } else if (kind === 'title') {
    const item = TITLE_ITEMS.find(titleItem => titleItem.id === id);
    if (!item) return;
    content.innerHTML = `<div class="shop-preview-profile"><div class="shop-preview-avatar">👤</div><span class="profile-title title-${item.color}">${textFor(item.nameKey)}</span></div>`;
  } else if (kind === 'theme') {
    const item = PREMIUM_THEME_ITEMS.find(theme => theme.id === id);
    if (!item) return;
    if (shopPreviewOriginalSkin === undefined) shopPreviewOriginalSkin = document.documentElement.dataset.skin || '';
    document.documentElement.dataset.skin = id;
    content.innerHTML = `<div class="shop-theme-preview"><span class="theme-preview preview-${id}"></span><h3>${textFor(item.nameKey)}</h3><p>${textFor(item.descriptionKey)}</p><article class="card">${textFor('shopPreviewTitle')} · ${textFor(item.nameKey)}</article></div>`;
  }
  if (!dialog.open) dialog.showModal();
}

function playShopRewardPreview(kind, id) {
  const item = REWARD_EFFECTS[kind]?.find(effect => effect.id === id);
  if (!item) return;
  const overlay = document.createElement('div');
  overlay.className = `reward-fx reward-fx-${kind} effect-${id}`;
  overlay.setAttribute('role', 'status');
  const languageIndex = ['en', 'de', 'es', 'it', 'el', 'pt'].indexOf(getSupportedLanguage());
  const heading = (rewardAnimationCopy[getSupportedLanguage()] || rewardAnimationCopy.en)[kind === 'level' ? 0 : 1];
  overlay.innerHTML = `<span class="reward-fx-orbit"></span><span class="reward-fx-mark">${kind === 'level' ? '⬆️' : '🏆'}</span><b class="reward-fx-title">${heading}</b><small class="shop-effect-preview-label">${effectCopy(item, 'names')}</small><span class="reward-fx-spark spark-a">✦</span><span class="reward-fx-spark spark-b">✧</span><span class="reward-fx-spark spark-c">✦</span>`;
  document.body.appendChild(overlay);
  window.setTimeout(() => overlay.remove(), document.documentElement.classList.contains('reduce-motion') ? 300 : 2100);
}

document.querySelector('#closeShopPreview')?.addEventListener('click', () => document.querySelector('#shopPreviewDlg')?.close());
document.querySelector('#shopPreviewDlg')?.addEventListener('close', () => {
  if (shopPreviewOriginalSkin !== undefined) {
    if (shopPreviewOriginalSkin) document.documentElement.dataset.skin = shopPreviewOriginalSkin;
    else delete document.documentElement.dataset.skin;
    shopPreviewOriginalSkin = undefined;
  }
});
document.addEventListener('click', event => {
  const preview = event.target.closest('[data-shop-preview]');
  const previewEffect = event.target.closest('[data-shop-preview-effect]');
  const buyFrame = event.target.closest('[data-avatar-frame-buy]');
  const equipFrame = event.target.closest('[data-avatar-frame-equip]');
  if (buyFrame) { buyAvatarFrame(buyFrame.dataset.avatarFrameBuy); return; }
  if (equipFrame) { equipAvatarFrame(equipFrame.dataset.avatarFrameEquip); return; }
  if (previewEffect) {
    const [kind, id] = previewEffect.dataset.shopPreviewEffect.split(':');
    playShopRewardPreview(kind, id); return;
  }
  if (preview) {
    const [kind, id] = preview.dataset.shopPreview.split(':');
    showShopPreview(kind, id);
  }
});

function applyShopFilters() {
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase(localeForLanguage()).trim();
  const query = normalize(document.querySelector('#shopSearch')?.value || '');
  const ownedOnly = Boolean(document.querySelector('#shopOwnedOnly')?.checked);
  const sort = document.querySelector('#shopSort')?.value || 'featured';
  const cards = [...document.querySelectorAll('[data-shop-kind]')];
  cards.forEach(card => {
    const matches = (!query || normalize(card.textContent).includes(query)) && (!ownedOnly || card.dataset.shopOwned === 'true');
    card.hidden = !matches;
    card.style.display = matches ? '' : 'none';
  });
  ['#shopGrid', '#titleShopGrid', '#avatarFrameShopGrid', '#themeShopGrid'].forEach(selector => {
    const grid = document.querySelector(selector);
    if (!grid) return;
    const sorted = [...grid.children].sort((a, b) => {
      const orderA = Number(a.dataset.shopOrder) || 0, orderB = Number(b.dataset.shopOrder) || 0;
      if (sort === 'featured') return orderA - orderB;
      const priceA = Number(a.dataset.shopPrice) || 0, priceB = Number(b.dataset.shopPrice) || 0;
      const priceOrder = sort === 'priceDown' ? priceB - priceA : priceA - priceB;
      return priceOrder || orderA - orderB;
    });
    sorted.forEach(card => grid.appendChild(card));
  });
}

document.querySelector('#shopSearch')?.addEventListener('input', applyShopFilters);
document.querySelector('#shopOwnedOnly')?.addEventListener('change', applyShopFilters);
document.querySelector('#shopSort')?.addEventListener('change', applyShopFilters);
document.querySelector('#v-shop')?.addEventListener('click', event => {
  const toggle = event.target.closest('[data-shop-accordion]');
  if (!toggle) return;
  const section = toggle.closest('[data-shop-category]');
  const expanded = section.dataset.expanded === 'true';
  section.dataset.expanded = String(!expanded);
  toggle.setAttribute('aria-expanded', String(!expanded));
});
document.querySelector('#shopSearch')?.addEventListener('input', event => {
  if (!event.currentTarget.value.trim()) return;
  document.querySelectorAll('[data-shop-category]').forEach(section => {
    section.dataset.expanded = 'true';
    section.querySelector('[data-shop-accordion]')?.setAttribute('aria-expanded', 'true');
  });
});

async function checkContentSpam(content, channel) {
  const { data, error } = await supabaseClient.rpc('check_my_content_spam', { p_content: content, p_channel: channel });
  if (error) { alert(textFor('spamCheckError', { error: error.message })); return false; }
  if (data?.[0]?.blocked) { alert(textFor('spamBlocked')); return false; }
  return true;
}
document.querySelector('#claimDailyReward')?.addEventListener('click', () => {
  const claimedToday = S.dailyRewardClaimedOn === today();
  const status = document.querySelector('#dailyRewardStatus');
  if (claimedToday) { status.textContent = textFor('dailyRewardAlreadyClaimed'); return; }
  S.bonusPoints = Math.max(0, Number(S.bonusPoints) || 0) + 10;
  S.dailyRewardClaimedOn = today();
  save();
  status.textContent = textFor('dailyRewardClaimed');
  render();
});

function getActiveSound() {
  const stored = storage.getItem('activeHabitSound') || 'normal';
  return stored === 'premium' ? 'premiumSound' : stored;
}

function equipSound(id) {
  const item = SHOP_ITEMS.find(sound => sound.sound === id);
  if (!item || !hasShopItem(item.id)) return;
  storage.setItem('activeHabitSound', id);
  renderShop();
}

function renderDailyJournal() {
  const entry = dailyJournalEntries?.[today()] || {};
  const fields = [['journalGood', 'good'], ['journalTomorrow', 'tomorrow'], ['journalGrateful', 'grateful']];
  fields.forEach(([id, key]) => {
    const field = document.getElementById(id);
    if (field && document.activeElement !== field) field.value = entry[key] || '';
  });
  const date = document.getElementById('journalDate');
  if (date) date.textContent = parse(today()).toLocaleDateString(localeForLanguage(), { weekday: 'long', day: 'numeric', month: 'long' });
  const entryDateField = document.getElementById('journalEntryDate');
  if (entryDateField && !entryDateField.value && !editingJournalEntryId) entryDateField.value = localDateTimeValue();
  const status = document.getElementById('journalStatus');
  if (status) {
    status.textContent = status.dataset.journalError === 'load' ? textFor('journalCloudUnavailable')
      : status.dataset.journalError === 'save' ? textFor('journalSaveError')
        : status.dataset.savedDate === today() ? textFor('journalSaved') : '';
  }
}

function renderJournalHistory(date) {
  const container = document.getElementById('journalHistory');
  if (!container) return;
  const reflection = dailyJournalEntries?.[date];
  const entries = (journalEntryRecords || []).filter(entry => {
    const entryDate = new Date(entry.entry_at);
    return !Number.isNaN(entryDate.getTime()) && iso(entryDate) === date;
  }).sort((a, b) => new Date(b.entry_at) - new Date(a.entry_at));
  if (!reflection && !entries.length) {
    container.innerHTML = `<h3>${textFor('journalHistoryTitle')}</h3><p class="settings-desc">${textFor('journalHistoryEmpty')}</p>`;
    return;
  }
  const fields = reflection ? [['journalGood', reflection.good], ['journalTomorrow', reflection.tomorrow], ['journalGrateful', reflection.grateful]].filter(([, value]) => String(value || '').trim()) : [];
  const reflectionsMarkup = fields.map(([key, value]) => `<div class="journal-history-field"><b>${textFor(key)}</b><p>${esc(String(value))}</p></div>`).join('');
  const entriesMarkup = entries.map(entry => `<article class="journal-history-entry"><div class="journal-history-entry-head"><b>${esc(entry.title)}</b><small>${esc(new Date(entry.entry_at).toLocaleString(localeForLanguage()))}</small></div><p>${esc(entry.body)}</p><small>${textFor('journalPrivateBadge')}${entry.is_favorite ? ' · ★' : ''}</small></article>`).join('');
  container.innerHTML = `<h3>${textFor('journalHistoryTitle')}</h3>${reflectionsMarkup}${entriesMarkup}`;
}

function journalHasDay(date) {
  const reflection = dailyJournalEntries?.[date];
  const hasReflection = Boolean(reflection && ['good', 'tomorrow', 'grateful'].some(key => String(reflection[key] || '').trim()));
  const hasEntry = (journalEntryRecords || []).some(entry => {
    const entryDate = new Date(entry.entry_at);
    return !Number.isNaN(entryDate.getTime()) && iso(entryDate) === date;
  });
  return hasReflection || hasEntry;
}

function renderJournalRecap(containerId, dates) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const dateSet = new Set(dates);
  const activeDays = dates.filter(journalHasDay).length;
  const entries = (journalEntryRecords || []).filter(entry => {
    const entryDate = new Date(entry.entry_at);
    return !Number.isNaN(entryDate.getTime()) && dateSet.has(iso(entryDate));
  }).sort((a, b) => new Date(b.entry_at) - new Date(a.entry_at));
  const favorites = entries.filter(entry => entry.is_favorite);
  const reflectionItems = [];
  for (const date of dates) {
    const reflection = dailyJournalEntries?.[date];
    if (!reflection) continue;
    for (const [key, label] of [['good', 'journalGood'], ['tomorrow', 'journalTomorrow'], ['grateful', 'journalGrateful']]) {
      const value = String(reflection[key] || '').trim();
      if (value) reflectionItems.push(`<li><b>${textFor(label)}:</b> ${esc(value)}</li>`);
    }
  }
  const formatCount = key => textFor(key, { count: key === 'journalDaysLabel' ? activeDays : entries.length });
  if (!activeDays && !entries.length) {
    container.innerHTML = `<p class="settings-desc">${textFor('journalNoRecap')}</p>`;
    return;
  }
  const entryTitles = entries.slice(0, 5).map(entry => `<li>${esc(entry.title || '')}</li>`).join('');
  const favoriteTitles = favorites.slice(0, 3).map(entry => `<li>${esc(entry.title || '')}</li>`).join('');
  container.innerHTML = `<div class="journal-recap-stats"><span>${formatCount('journalDaysLabel')}</span><span>${formatCount('journalCountLabel')}</span></div>`
    + (reflectionItems.length ? `<div class="journal-recap-section"><b>${textFor('journalReflectionsRecap')}</b><ul>${reflectionItems.slice(0, 6).join('')}</ul></div>` : '')
    + (entryTitles ? `<div class="journal-recap-section"><b>${textFor('journalEntriesRecap')}</b><ul>${entryTitles}</ul></div>` : '')
    + (favoriteTitles ? `<div class="journal-recap-section"><b>${textFor('journalFavoritesRecap')}</b><ul>${favoriteTitles}</ul></div>` : '');
}

function renderJournalRecaps() {
  const streakNode = document.getElementById('journalStreak');
  if (streakNode) {
    let cursor = today();
    if (!journalHasDay(cursor)) cursor = add(cursor, -1);
    let streakCount = 0;
    while (journalHasDay(cursor) && streakCount < 3660) { streakCount++; cursor = add(cursor, -1); }
    streakNode.textContent = streakCount ? textFor('journalStreakText', { count: streakCount }) : textFor('journalStreakStart');
  }

  const selectedWeekStart = monOf(sel);
  const weekRange = document.getElementById('journalWeekRange');
  if (weekRange) weekRange.textContent = `${fmt(selectedWeekStart)} – ${fmt(add(selectedWeekStart, 6))}`;
  const weekDates = Array.from({ length: 7 }, (_, index) => add(selectedWeekStart, index));
  renderJournalRecap('journalWeekRecapBody', weekDates);

  const year = journalMonthCursor.getFullYear(), month = journalMonthCursor.getMonth();
  const monthStart = iso(new Date(year, month, 1)), monthEnd = iso(new Date(year, month + 1, 0));
  const monthLabel = document.getElementById('journalRecapMonth');
  if (monthLabel) monthLabel.textContent = journalMonthCursor.toLocaleDateString(localeForLanguage(), { month: 'long', year: 'numeric' });
  const monthDates = [];
  for (let date = monthStart; date <= monthEnd; date = add(date, 1)) monthDates.push(date);
  renderJournalRecap('journalMonthRecapBody', monthDates);
}

function localDateTimeValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function makeJournalEntryId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.random() * 16 | 0;
    return (char === 'x' ? random : (random & 3 | 8)).toString(16);
  });
}
function renderJournalEntryList() {
  const list = document.getElementById('journalEntriesList');
  if (!list) return;
  document.getElementById('journalEntrySave').textContent = textFor(editingJournalEntryId ? 'journalEntryUpdate' : 'journalEntrySave');
  const query = (document.getElementById('journalEntrySearch')?.value || '').trim().toLocaleLowerCase(localeForLanguage());
  const favoritesOnly = Boolean(document.getElementById('journalFavoritesOnly')?.checked);
  const entries = (journalEntryRecords || []).filter(entry => {
    const textMatches = !query || `${entry.title || ''} ${entry.body || ''}`.toLocaleLowerCase(localeForLanguage()).includes(query);
    return textMatches && (!favoritesOnly || entry.is_favorite);
  }).sort((a, b) => new Date(b.entry_at) - new Date(a.entry_at));
  list.innerHTML = entries.map(entry => `<article class="journal-entry-card card">
    <div class="journal-entry-card-heading"><div><h4>${esc(entry.title)}</h4><small>${esc(new Date(entry.entry_at).toLocaleString(localeForLanguage()))}</small></div><span class="journal-private-badge">${textFor('journalPrivateBadge')}</span></div>
    <p class="journal-entry-card-body">${esc(entry.body)}</p>
    <div class="journal-entry-actions"><button type="button" data-journal-favorite="${esc(entry.id)}" aria-pressed="${entry.is_favorite ? 'true' : 'false'}" aria-label="${textFor(entry.is_favorite ? 'journalUnfavorite' : 'journalFavorite')}">${entry.is_favorite ? '★' : '☆'} ${textFor(entry.is_favorite ? 'journalUnfavorite' : 'journalFavorite')}</button><button type="button" data-journal-edit="${esc(entry.id)}">${textFor('journalEdit')}</button><button type="button" data-journal-delete="${esc(entry.id)}">${textFor('journalDelete')}</button></div>
  </article>`).join('') || `<p class="settings-desc">${textFor('journalNoEntries')}</p>`;
}

async function saveJournalEntryRecord(entry) {
  persistLocalJournalRecords();
  const status = document.getElementById('journalEntryStatus');
  if (!currentUser) { status.textContent = textFor('journalEntrySavedLocal'); return true; }
  const userId = currentUser.id;
  const { error } = await supabaseClient.from('journal_entries').upsert({ ...entry, user_id: userId }, { onConflict: 'id' });
  if (currentUser?.id !== userId) return false;
  if (error) {
    console.error('Tagebucheintrag konnte nicht gespeichert werden:', error.message);
    status.textContent = textFor('journalEntryCloudError');
    return false;
  }
  status.textContent = textFor('journalEntrySaved');
  return true;
}

function resetJournalEntryForm() {
  editingJournalEntryId = null;
  const form = document.getElementById('journalEntryForm');
  form?.reset();
  document.getElementById('journalEntryDate').value = localDateTimeValue();
  document.getElementById('journalEntrySave').textContent = textFor('journalEntrySave');
  document.getElementById('journalEntryCancel').hidden = true;
}


// Journal mode switch: Small Check-in / Journal Entry
(() => {
  const modeButtons = document.querySelectorAll('[data-journal-mode]');
  const checkinPanel = document.getElementById('journalCheckinPanel');
  const entryPanel = document.getElementById('journalEntryPanel');

  if (!modeButtons.length || !checkinPanel || !entryPanel) return;

  function setJournalMode(mode) {
    const showCheckin = mode === 'checkin';

    checkinPanel.hidden = !showCheckin;
    entryPanel.hidden = showCheckin;

    modeButtons.forEach(button => {
      const active = button.dataset.journalMode === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  modeButtons.forEach(button => {
    button.addEventListener('click', () => {
      setJournalMode(button.dataset.journalMode);
    });
  });

  setJournalMode('checkin');
})();


document.getElementById('journalEntryForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const timestamp = new Date(document.getElementById('journalEntryDate').value);
  if (Number.isNaN(timestamp.getTime())) return;
  if (!document.getElementById('journalEntryTitle').value.trim() || !document.getElementById('journalEntryText').value.trim()) {
    document.getElementById('journalEntryStatus').textContent = textFor('journalEntryValidation');
    return;
  }
  const existing = journalEntryRecords.find(entry => entry.id === editingJournalEntryId);
  const now = new Date().toISOString();
  const entry = {
    id: existing?.id || makeJournalEntryId(),
    entry_at: timestamp.toISOString(),
    title: document.getElementById('journalEntryTitle').value.trim(),
    body: document.getElementById('journalEntryText').value.trim(),
    is_favorite: Boolean(existing?.is_favorite),
    is_private: true,
    created_at: existing?.created_at || now,
    updated_at: now
  };
  if (existing) journalEntryRecords = journalEntryRecords.map(item => item.id === existing.id ? entry : item);
  else journalEntryRecords = [entry, ...journalEntryRecords];
  journalEntryRecords.sort((a, b) => new Date(b.entry_at) - new Date(a.entry_at));
  const saved = await saveJournalEntryRecord(entry);
  renderJournalEntryList();
  renderJournalHistory(sel);
  renderJournalRecaps();
  if (saved) resetJournalEntryForm();
});
document.getElementById('journalEntryCancel')?.addEventListener('click', resetJournalEntryForm);
document.getElementById('journalEntrySearch')?.addEventListener('input', renderJournalEntryList);
document.getElementById('journalFavoritesOnly')?.addEventListener('change', renderJournalEntryList);
document.getElementById('journalEntriesList')?.addEventListener('click', async event => {
  const favorite = event.target.closest('[data-journal-favorite]');
  const edit = event.target.closest('[data-journal-edit]');
  const remove = event.target.closest('[data-journal-delete]');
  const id = favorite?.dataset.journalFavorite || edit?.dataset.journalEdit || remove?.dataset.journalDelete;
  const entry = journalEntryRecords.find(item => item.id === id);
  if (!entry) return;
  if (favorite) {
    const updated = { ...entry, is_favorite: !entry.is_favorite, is_private: true, updated_at: new Date().toISOString() };
    journalEntryRecords = journalEntryRecords.map(item => item.id === id ? updated : item);
    await saveJournalEntryRecord(updated);
    renderJournalEntryList();
    renderJournalHistory(sel);
    renderJournalRecaps();
    return;
  }
  if (edit) {
    editingJournalEntryId = id;
    document.getElementById('journalEntryDate').value = localDateTimeValue(new Date(entry.entry_at));
    document.getElementById('journalEntryTitle').value = entry.title;
    document.getElementById('journalEntryText').value = entry.body;
    document.getElementById('journalEntrySave').textContent = textFor('journalEntryUpdate');
    document.getElementById('journalEntryCancel').hidden = false;
    document.getElementById('journalEntryTitle').focus();
    return;
  }
  if (remove && confirm(textFor('journalConfirmDelete'))) {
    const status = document.getElementById('journalEntryStatus');
    if (currentUser) {
      const { error } = await supabaseClient.from('journal_entries').delete().eq('id', id).eq('user_id', currentUser.id);
      if (error) { status.textContent = textFor('journalEntryCloudError'); return; }
    }
    journalEntryRecords = journalEntryRecords.filter(item => item.id !== id);
    persistLocalJournalRecords();
    status.textContent = textFor('journalEntryDeleted');
    renderJournalEntryList();
    renderJournalHistory(sel);
    renderJournalRecaps();
    if (editingJournalEntryId === id) resetJournalEntryForm();
  }
});

document.getElementById('dailyJournalForm')?.addEventListener('submit', event => {
  event.preventDefault();
  const date = today();
  dailyJournalEntries[date] = {
    good: document.getElementById('journalGood').value.trim(),
    tomorrow: document.getElementById('journalTomorrow').value.trim(),
    grateful: document.getElementById('journalGrateful').value.trim(),
    updatedAt: new Date().toISOString()
  };
  persistLocalJournalEntries();
  renderJournalRecaps();
  const status = document.getElementById('journalStatus');
  status.dataset.savedDate = date;
  delete status.dataset.journalError;
  status.textContent = currentUser ? textFor('journalSaving') : textFor('journalSavedLocal');
  if (currentUser) {
    const userId = currentUser.id;
    const entry = dailyJournalEntries[date];
    supabaseClient.from('daily_journal_entries').upsert({
      user_id: userId,
      entry_date: date,
      good: entry.good,
      tomorrow: entry.tomorrow,
      grateful: entry.grateful,
      updated_at: entry.updatedAt
    }, { onConflict: 'user_id,entry_date' }).then(({ error }) => {
      if (currentUser?.id !== userId) return;
      status.textContent = error ? textFor('journalSaveError') : textFor('journalSaved');
      if (error) status.dataset.journalError = 'save';
      if (error) console.error('Tagesjournal konnte nicht gespeichert werden:', error.message);
    });
  }
});



function buyShopItem(id) {
  const item = SHOP_ITEMS.find(item => item.id === id);

  if (!item) return;

  if (hasShopItem(id)) {
    alert(textFor('itemAlreadyOwned'));
    return;
  }

  const availablePoints = getAvailablePoints();

  if (availablePoints < item.price) {
    alert(textFor('notEnoughPoints', { price: item.price }));
    return;
  }

  const purchases = getShopPurchases();
  recordShopPurchase('sound', id, item.price);
  purchases.push(id);

  setOwnedItems('shopPurchases', 'shopPurchases', purchases);

  render();
  const nameKey = ({ premiumSound: 'shopPremiumSound', softPop: 'shopSoftPop', crystal: 'shopCrystal', bubble: 'shopBubble', softBell: 'shopSoftBell', woodblock: 'shopWoodblock', arcade: 'shopArcade', raindrop: 'shopRaindrop' })[id];
  alert(textFor('itemPurchased', { item: textFor(nameKey) }));
}


function updateTestTimeStatus() {
  const status = document.querySelector('#testTimeStatus'); if (!status) return;
  status.textContent = textFor('testTimeStatus', { date: parse(today()).toLocaleDateString(localeForLanguage(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }), days: getTestDayOffset() });
}
function updateHomeStreakShieldStatus() {
  const status = document.querySelector('#homeStreakShieldStatus'); if (!status) return;
  status.textContent = textFor('streakShieldAvailable', { count: (S.streakShields || []).filter(shield => !shield.usedOn).length });
}

function render() {
  const t = today(), cm = monOf(t), ws = weekStat(cm), ds = dayStat(t), w = week(cm), b = BOSSES[w.boss % BOSSES.length];
  const currentBossLevel = w.level || w.boss + 1;
  const maxReachableBossHp = bossHpForLevel(currentBossLevel, ws.p);
  if (!Number.isFinite(w.bossHp) || w.bossHp > maxReachableBossHp || w.bossHp < 1) {
    w.bossHp = maxReachableBossHp;
    save();
  }
  // Convert older weeks from derived task-count damage to explicit hit records.
  if (!Array.isArray(w.bossHitKeys)) {
    w.bossHitKeys = [];
    for (const [day, ids] of Object.entries(S.done || {})) {
      if (monOf(day) !== cm) continue;
      for (const id of ids || []) w.bossHitKeys.push(`${day}:${id}`);
    }
    if (w.result !== 'won') w.bossDamage = Math.min(w.bossHp, Math.max(Number(w.bossDamage) || 0, ws.k));
    save();
  }
  // HP is authoritative: never leave a zero-HP boss alive because an older week
  // record happens to say "lost" or "none" instead of "won".
  if (w.result !== 'won' && (w.bossDamage || 0) >= w.bossHp) recordBossWin(w, cm, ws.pct || 100);
  ensureBossSpawnAfterSavedWin(w, cm);
  // Resolve a follow-up boss already saved at 0 HP, even without another habit click.
  const followUpBossHp = Number.isFinite(w.nextBossHp) ? w.nextBossHp : BOSS_SPAWN_HP;
  if (w.result === 'won' && Number.isInteger(w.nextBoss) && (w.nextBossDamage || 0) >= followUpBossHp) {
    defeatSpawnedBoss(w, cm);
  }
  // Home: ring + numbers
  $('#ringArc').style.strokeDashoffset = 326.73 * (1 - (ws.pct || 0) / 100);
  $('#wPct').textContent = R(ws.pct || 0) + '%';
  $('#dPct').textContent = ds.pct === null ? '–' : R(ds.pct) + '%';
  const a = avg4(); $('#avg4').textContent = a === null ? '–' : R(a) + '%';
  chart($('#homeChart'), 8);
  updateTestTimeStatus();
  // Home: boss HP uses unique completed-task hits stored on the current boss level.
  const nextBossSpawned = w.result === 'won' && Number.isInteger(w.nextBoss);
  const shownBossId = nextBossSpawned ? w.nextBoss : w.boss;
  const shownBossLevel = nextBossSpawned ? w.nextLevel : (w.level || w.boss + 1);
  const totalBossHp = nextBossSpawned ? Math.max(0, Number.isFinite(w.nextBossHp) ? w.nextBossHp : BOSS_SPAWN_HP) : Math.max(1, w.bossHp || ws.p);
  const left = nextBossSpawned ? Math.max(0, totalBossHp - (w.nextBossDamage || 0)) : Math.max(0, totalBossHp - (w.bossDamage || 0));
  $('#bossEmoji').textContent = BOSSES[shownBossId % BOSSES.length][1]; $('#bossEmoji').classList.toggle('dead', w.result === 'won' && (!nextBossSpawned || left === 0));
  $('#bossName').textContent = bossName(shownBossId); $('#bossLvl').textContent = `Lv. ${shownBossLevel}`;
  $('#hpFill').style.width = (totalBossHp ? left / totalBossHp * 100 : 100) + '%';
  $('#hpText').textContent = totalBossHp ? textFor('hp', { left, total: totalBossHp }) : textFor('planBoss');
  const tr = translations[storage.getItem('siteLanguage') || 'en']
    || translations.en;

  $('#goalTxt').textContent =
    `${textFor('goalLabelWeek')} ${w.goal}%` +
    (w.reward
      ? ` · ${textFor('rewardLabelWeek')} ${w.reward}${w.result === 'won' ? ' ✅' : ' 🔒'}`
      : ` · ${textFor('noReward')}`);
  $('#todayList').innerHTML = list(t);
  renderDailyJournal();
  renderJournalEntryList();
  renderJournalRecaps();
  // Week view
  const m = monOf(sel), s = weekStat(m);
  $('#wkLabel').textContent = `${fmt(m)} – ${fmt(add(m, 6))}`;
  $('#wkSub').textContent = s.pct === null ? textFor('weekNoTasks') : textFor('weekDone', { pct: R(s.pct), done: s.k, planned: s.p });
  const translatedDays = getTranslatedDays();

  $('#dayChips').innerHTML = translatedDays.map((n, i) => {
    const d = add(m, i), q = dayStat(d);
    return `<button data-act="day" data-d="${d}" class="${d === sel ? 'sel' : ''} ${d === t ? 'today' : ''}">${n}<b>${parse(d).getDate()}</b><i>${q.pct === null ? '·' : R(q.pct) + '%'}</i></button>`
  }).join('');
  $('#dayList').innerHTML = `<h2>${fmt(sel, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>` + list(sel) + `<section class="card journal-history" id="journalHistory"></section>`;
  renderJournalHistory(sel);
  // Stats
  const pts = getTotalPoints();
  $('#shopPoints').textContent = pts;
  renderShop();
  let bd = null, bw = null; const f = firstDay();
  if (f) {
    for (let d = f; d <= t; d = add(d, 1)) { const q = dayStat(d); if (q.p && (!bd || q.pct > bd.pct || (q.pct === bd.pct && q.k > bd.k))) bd = { ...q, d }; }
    for (let d = monOf(f); d <= cm; d = add(d, 7)) { const q = weekStat(d); if (q.p && (!bw || q.pct > bw.pct)) bw = { ...q, d }; }
  }
  const card = (l, v) => `<div class="card"><div class="v">${v}</div><small>${l}</small></div>`;
  const monthStart = iso(new Date(statsMonthCursor.getFullYear(), statsMonthCursor.getMonth(), 1));
  const monthEnd = iso(new Date(statsMonthCursor.getFullYear(), statsMonthCursor.getMonth() + 1, 0));
  let monthDone = 0, monthPlanned = 0;
  for (let date = monthStart; date <= monthEnd; date = add(date, 1)) { const day = dayStat(date); monthDone += day.k; monthPlanned += day.p; }
  const overallRate = overallCompletionRate();
  $('#statGrid').innerHTML = card(textFor('totalPoints'), pts) + card(textFor('currentStreak'), streak() + ' 🔥') +
    card(textFor('bestDay'), bd ? `${R(bd.pct)}%<br><small>${fmt(bd.d)}</small>` : '–') + card(textFor('bestWeek'), bw ? `${R(bw.pct)}%<br><small>${fmt(bw.d)}</small>` : '–') +
    card(textFor('monthTasksDone'), `${monthDone}/${monthPlanned}`) + card(textFor('overallCompletionRate'), overallRate === null ? '–' : `${overallRate}%`) + card(textFor('playerLevelLabel'), `Lv. ${Math.floor(getPlayerXp() / 250) + 1}`);
  updateHomeStreakShieldStatus();
  chart($('#statChart'), 8);
  renderLevelProgress();
  renderStatsCalendar();
  // Boss collection
  $('#bossGrid').innerHTML = (S.defeated.length
    ? S.defeated.map(x => {
      const q = BOSSES[x.boss % BOSSES.length];
      return `<div class="card"><div style="font-size:2.6rem">${q[1]}</div><b>${bossName(x.boss)}</b><br><small>Lv. ${x.level || x.boss + 1} · ${x.pct}%<br>${fmt(x.week)}${x.reward ? '<br>🎁 ' + esc(x.reward) : ''}</small></div>`;
    }).join('')
    : `<div class="empty" style="grid-column:1/3">${tr.noBossDefeated || translations.en.noBossDefeated}</div>`) + `<div class="card"><div style="font-size:2.6rem">🛡️</div><b>${bossName(STREAK_GUARDIAN_BOSS_INDEX)}</b><br><small>${['A lucky spawn, averaging about once per 9 bosses · Defeat it to earn a Streak Shield.', 'Ein Glücks-Spawn, durchschnittlich etwa jeder 9. Boss · Besiege ihn für ein Streak-Schild.', 'Aparición afortunada, aproximadamente 1 de cada 9 jefes · Derrótalo para ganar un escudo de racha.', 'Apparizione fortunata, in media circa 1 ogni 9 boss · Sconfiggilo per ottenere uno scudo serie.', 'Τυχερή εμφάνιση, κατά μέσο όρο περίπου 1 στα 9 αφεντικά · Νίκησέ το για μία ασπίδα σερί.', 'Aparição sortuda, em média cerca de 1 em cada 9 chefes · Derrota-o para ganhar um escudo de sequência.'][['en', 'de', 'es', 'it', 'el', 'pt'].indexOf(getSupportedLanguage())] || 'Defeat it to earn a Streak Shield.'}</small></div>`;
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js');
  }
  renderAchievementPreview();
}


/* Click handling */
document.addEventListener('click', e => {
  const target = e.target instanceof Element ? e.target : e.target?.parentElement;
  if (!target) return;
  const moreFeedButton = target.closest('[data-social-feed-more]');

  if (moreFeedButton) {
    socialFeedVisibleCount += 10;
    loadSocialFeed().catch(console.error);
    return;
  }
  const testTimeButton = target.closest('[data-test-time]');
  if (testTimeButton) {
    const change = testTimeButton.dataset.testTime;
    try {
      if (change === 'reset') localStorage.removeItem(TEST_DAY_OFFSET_KEY);
      else localStorage.setItem(TEST_DAY_OFFSET_KEY, String(Math.max(0, Math.min(365, getTestDayOffset() + Number(change || 0)))));
    } catch { }
    sel = today(); render(); return;
  }
  const avatarButton = target.closest('[data-avatar]');

  if (avatarButton) {
    saveAvatar(avatarButton.dataset.avatar);
    return;
  }
  const b = target.closest('[data-act]');
  if (b) {
    console.log('BUTTON:', b);
    console.log('ACTION:', b.dataset.act);
    console.log('VIEW:', b.dataset.v);
  }
  if (!b) return;

  const D = b.dataset;

  console.log('🖱️ Klick erkannt:', D.act);

  const actions = {
    openAuth,
    signUp,
    signIn,
    logout,
    taskMode: () => setTaskMode(D.mode),
    addTemplates,
    buy: () => buyShopItem(D.id),
    buyStreakShield,
    tog: () => toggle(D.id, D.d),
    edit: () => openTask(D.id),
    add: () => openTask(),
    tab: () => {
      tab(D.v);

      if (D.v === 'settings') {
        document.querySelector('#settingsMenu')?.classList.remove('open');
        document.querySelector('#settingsMenuBackdrop')?.classList.remove('open');
      }
    },
    openFriends: openFriendsDialog,
    openFriendRequests: openFriendsDialog,
    openSocial: openSocialDialog,

    wk: () => {
      sel = add(sel, 7 * Number(D.n));
      render();
    },
    statsMonth: () => {
      statsMonthCursor = new Date(statsMonthCursor.getFullYear(), statsMonthCursor.getMonth() + Number(D.n), 1);
      render();
      tab('stats');
    },
    statsDay: () => {
      sel = D.date;
      tab('week');
      render();
    },
    refreshFeed: () => { cachedSocialFriendIds = null; loadSocialFeed(); },

    day: () => {
      sel = D.d;
      render();
    },

    sound: () => {
      if (!hasShopItem('premiumSound')) return;

      storage.setItem(
        'activeHabitSound',
        D.mode === 'premium' ? 'premium' : 'normal'
      );

      renderShop();
    },
    previewSound: () => {
      if (D.id === 'premiumSound') playPremiumHabitSound();
      else playSoundEffect(D.id);
    },
    equipSound: () => equipSound(D.id),

    theme,
    goal: openGoal,
    saveTask,
    delTask,
    saveGoal,
    close: () => b.closest('dialog')?.close()
  };

  if (!actions[D.act]) {
    console.warn('Keine Aktion gefunden:', D.act);
    return;
  }

  try {
    const result = actions[D.act]();
    if (result && typeof result.then === 'function') {
      result.catch(error => {
        console.error(`Action '${D.act}' failed:`, error);
        const status = document.querySelector('#socialStatus, #socialFeedStatus, #sharedGoalsStatus');
        if (status) status.textContent = error?.message || String(error);
      });
    }
  } catch (error) {
    console.error(`Action '${D.act}' failed:`, error);
    const status = document.querySelector('#socialStatus, #socialFeedStatus, #sharedGoalsStatus');
    if (status) status.textContent = error?.message || String(error);
  }
});



$('#gRange')?.addEventListener('input', e => {
  $('#gVal').textContent = e.target.value + '%';
});

/* ----- achievements ----- */

const achievementData = [
  {
    id: 'first_habit',
    emoji: '🌱',
    nameKey: 'achievementFirstStep',
    descriptionKey: 'achievementFirstDesc',
    unlocked: completed => completed >= 1
  },
  {
    id: 'five_habits', emoji: '✨', nameKey: 'achievementHabitKeeper',
    descriptionKey: 'achievementFiveDesc', unlocked: completed => completed >= 5
  },
  {
    id: 'twentyfive_habits', emoji: '🌿', nameKey: 'achievementRoutine',
    descriptionKey: 'achievement25Desc', unlocked: completed => completed >= 25
  },
  {
    id: 'hundred_habits', emoji: '💯', nameKey: 'achievementPro',
    descriptionKey: 'achievement100Desc', unlocked: completed => completed >= 100
  },
  {
    id: 'three_day_streak', emoji: '🔥', nameKey: 'achievementThreeDay',
    descriptionKey: 'achievement3DayDesc', unlocked: () => streak() >= 3
  },
  {
    id: 'first_boss', emoji: '👹', nameKey: 'achievementBoss',
    descriptionKey: 'achievementBossDesc', unlocked: () => S.defeated.length >= 1
  }
];

function renderAchievementPreview() {
  const preview = document.querySelector('#achievementPreview');
  if (!preview) return;
  if (!S.achievements) S.achievements = [];
  const unlockedCount = achievementData.filter(item => S.achievements.includes(item.id)).length;
  preview.innerHTML = `<p class="achievement-preview-summary">${textFor('achievementsCount', { count: unlockedCount, total: achievementData.length })}</p>` +
    `<div class="achievement-preview-grid">${achievementData.map(item => {
      const unlocked = S.achievements.includes(item.id);
      return `<div class="achievement-preview-item ${unlocked ? 'unlocked' : ''}" title="${textFor(item.descriptionKey)}"><span>${unlocked ? item.emoji : '🔒'}</span><b>${textFor(item.nameKey)}</b></div>`;
    }).join('')}</div>`;
}

function renderAchievements() {
  if (!S.achievements) S.achievements = [];

  const unlocked = achievementData.filter(item => S.achievements.includes(item.id)).length;

  $('#achievementSummary').textContent = textFor('achievementsCount', { count: unlocked, total: achievementData.length });

  $('#achievementsList').innerHTML = achievementData.map(a => {
    const isUnlocked = S.achievements.includes(a.id);

    return `
      <div class="card">
        <div style="font-size: 2rem">${a.emoji}</div>
        <b>${textFor(a.nameKey)}</b>
        <p>${textFor(a.descriptionKey)}</p>
        <small>${isUnlocked ? textFor('unlocked') : textFor('locked')}</small>
      </div>
    `;
  }).join('');
  renderAchievementPreview();
}

$('#openAchievements')?.addEventListener('click', () => {
  renderAchievements();
  $('#achievementsDlg').showModal();
});

$('#closeAchievements')?.addEventListener('click', () => {
  $('#achievementsDlg').close();
});

/* Start only once everything is defined */
applyTheme();
settle();
checkAchievements();
render();
showResult();
// Initialize auth only after the UI catalog (including profile titles) exists.
updateAuthUI();

setInterval(() => {
  settle();
  checkAchievements();
  render();
  showResult();
}, 60000);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js');
}
const specialShopItems = [
  {
    id: 'streak-shield',
    name: '🛡️ Streak Shield',
    description: 'Schützt deine Serie einmal vor einem verpassten Tag.',
    price: 500
  },
  {
    id: 'completion-sound',
    name: '🔊 Premium Completion Sound',
    description: 'Ein besonderer Sound beim Abhaken einer Aufgabe.',
    price: 350
  }
];


function loadReminderSettings() {
  const enabled = storage.getItem('remindersEnabled');
  const time = storage.getItem('reminderTime');

  const checkbox = document.querySelector('#remindersEnabled');
  const timeInput = document.querySelector('#reminderTime');

  if (!checkbox || !timeInput) return;

  checkbox.checked = enabled === 'true';
  timeInput.value = time || '18:00';
}

document.querySelector('#saveReminderSettings')
  ?.addEventListener('click', () => {
    const enabled =
      document.querySelector('#remindersEnabled').checked;

    const time =
      document.querySelector('#reminderTime').value;

    storage.setItem('remindersEnabled', String(enabled));
    storage.setItem('reminderTime', time);

    document.querySelector('#reminderStatus').textContent =
      enabled
        ? `✅ Erinnerung für ${time} gespeichert.`
        : '🔕 Erinnerungen sind ausgeschaltet.';
  });

loadReminderSettings();

let journalReminderCheckRunning = false;

function loadJournalReminderSettings() {
  const enabled = document.getElementById('journalReminderEnabled');
  const time = document.getElementById('journalReminderTime');

  if (!enabled || !time) return;

  enabled.checked = storage.getItem('journalReminderEnabled') === 'true';
  time.value = storage.getItem('journalReminderTime') || '20:00';
}

const journalReminderMessages = {
  en: { secure: 'Open the app over HTTPS or localhost to use notifications.', tested: '✅ Test journal notification sent.', failed: 'The test notification could not be shown.' },
  de: { secure: 'Öffne die App über HTTPS oder localhost, damit Benachrichtigungen funktionieren.', tested: '✅ Journal-Testbenachrichtigung gesendet.', failed: 'Die Testbenachrichtigung konnte nicht angezeigt werden.' },
  es: { secure: 'Abre la app con HTTPS o localhost para usar notificaciones.', tested: '✅ Notificación de prueba del diario enviada.', failed: 'No se pudo mostrar la notificación de prueba.' },
  it: { secure: 'Apri l’app tramite HTTPS o localhost per usare le notifiche.', tested: '✅ Notifica di prova del diario inviata.', failed: 'Impossibile mostrare la notifica di prova.' },
  el: { secure: 'Άνοιξε την εφαρμογή μέσω HTTPS ή localhost για να λειτουργούν οι ειδοποιήσεις.', tested: '✅ Στάλθηκε δοκιμαστική ειδοποίηση ημερολογίου.', failed: 'Δεν ήταν δυνατή η εμφάνιση της δοκιμαστικής ειδοποίησης.' },
  pt: { secure: 'Abre a app por HTTPS ou localhost para usar notificações.', tested: '✅ Notificação de teste do diário enviada.', failed: 'Não foi possível mostrar a notificação de teste.' }
};


document.querySelectorAll('[data-journal-month]').forEach(button => button.addEventListener('click', () => {
  journalMonthCursor = new Date(journalMonthCursor.getFullYear(), journalMonthCursor.getMonth() + Number(button.dataset.journalMonth), 1);
  renderJournalRecaps();
}));

document.getElementById('saveJournalReminder')?.addEventListener('click', async () => {
  const enabled = document.getElementById('journalReminderEnabled');
  const time = document.getElementById('journalReminderTime');
  const status = document.getElementById('journalReminderStatus');
  if (!enabled || !time || !status) return;
  if (enabled.checked && !('Notification' in window)) {
    status.textContent = textFor('journalReminderUnsupported');
    return;
  }
  if (enabled.checked && (!window.isSecureContext || location.protocol === 'file:')) {
    status.textContent = journalReminderMessages[getSupportedLanguage()].secure;
    enabled.checked = false;
    return;
  }
  if (enabled.checked && Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      enabled.checked = false;
      status.textContent = textFor('journalReminderPermission');
      return;
    }
  }
  storage.setItem('journalReminderEnabled', String(enabled.checked));
  storage.setItem('journalReminderTime', time.value || '20:00');
  status.textContent = textFor(enabled.checked ? 'journalReminderSaved' : 'journalReminderDisabled');
  if (!enabled.checked) storage.removeItem('lastJournalReminderDate');
  else checkJournalReminder();
});

document.getElementById('testJournalReminder')?.addEventListener('click', async () => {
  const status = document.getElementById('journalReminderStatus');
  if (!window.isSecureContext || location.protocol === 'file:') { status.textContent = journalReminderMessages[getSupportedLanguage()].secure; return; }
  if (!('Notification' in window)) { status.textContent = textFor('journalReminderUnsupported'); return; }
  try {
    if (Notification.permission !== 'granted' && await Notification.requestPermission() !== 'granted') {
      status.textContent = textFor('journalReminderPermission'); return;
    }
    await showJournalReminderNotification(true);
    status.textContent = journalReminderMessages[getSupportedLanguage()].tested;
  } catch (error) {
    console.error('[Journal reminder test]', error);
    status.textContent = journalReminderMessages[getSupportedLanguage()].failed;
  }
});

loadJournalReminderSettings();


document.querySelector('#testReminder')
  ?.addEventListener('click', async () => {
    const status = document.querySelector('#reminderStatus');

    if (!('serviceWorker' in navigator) ||
      !('Notification' in window)) {
      status.textContent =
        'Dein Browser unterstützt diese Benachrichtigungen nicht.';
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        status.textContent =
          'Bitte erlaube Benachrichtigungen in deinem Browser.';
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      registration.active?.postMessage({
        type: 'TEST_REMINDER'
      });

      status.textContent = '✅ Test-Benachrichtigung angefordert!';
    } catch (error) {
      console.error(error);
      status.textContent =
        'Die Test-Benachrichtigung konnte nicht gestartet werden.';
    }
  });



let reminderCheckRunning = false;


async function checkDailyReminder() {
  if (reminderCheckRunning) return;
  reminderCheckRunning = true;

  try {
    const enabled = storage.getItem('remindersEnabled') === 'true';

    if (!enabled || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (!('serviceWorker' in navigator)) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');

    // Ruhezeiten prüfen
    if (storage.getItem('quietHoursEnabled') === 'true') {
      const [sh, sm] = (storage.getItem('quietHoursStart') || '22:00')
        .split(':').map(Number);
      const [eh, em] = (storage.getItem('quietHoursEnd') || '08:00')
        .split(':').map(Number);

      const start = sh * 60 + sm;
      const end = eh * 60 + em;

      const isQuiet = start < end
        ? currentMinutes >= start && currentMinutes < end
        : currentMinutes >= start || currentMinutes < end;

      if (isQuiet) return;
    }

    const registration = await navigator.serviceWorker.ready;

    // 1. Allgemeine Daily-Erinnerungen
    let reminderTimes = [];

    try {
      const savedTimes = JSON.parse(
        storage.getItem('reminderTimes') || 'null'
      );

      if (Array.isArray(savedTimes)) {
        reminderTimes = savedTimes;
      }
    } catch (error) {
      console.warn('[Reminder] Ungültige Erinnerungszeiten:', error);
    }

    if (!reminderTimes.length) {
      reminderTimes = [
        storage.getItem('reminderTime') || '18:00'
      ];
    }

    reminderTimes = [...new Set(reminderTimes)]
      .filter(time =>
        typeof time === 'string' &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
      );

    for (const time of reminderTimes) {
      const [h, m] = time.split(':').map(Number);
      if (currentMinutes < h * 60 + m) continue;

      const key = `lastReminder:${today}:${time}`;

      if (storage.getItem(key) === 'true') continue;

      try {
        await registration.showNotification('Consistly 🔔', {
          body: 'Zeit für deine Habits!',
          tag: `habit-reminder-${today}-${time}`
        });

        storage.setItem(key, 'true');
      } catch (error) {
        console.error('[Reminder] Fehler:', error);
      }
    }

    // 2. Individuelle Task-Erinnerungen
    console.log('[Task Debug] Anzahl Tasks:', S.tasks.length);

    for (const task of S.tasks) {
      const doneToday = (S.done[today] || []).includes(task.id);

      console.log('[Task Debug] Aufgabe:', {
        title: task.title,
        id: task.id,
        enabled: task.reminderEnabled,
        time: task.reminderTime,
        repetition: task.rep,
        doneToday
      });

      if (doneToday) continue;

      if (
        task.reminderEnabled !== true &&
        task.reminderEnabled !== 'true'
      ) continue;

      if (!task.reminderTime) continue;

      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(task.reminderTime)) continue;

      let isDueToday = false;

      if (task.rep === 'daily') {
        isDueToday = true;
      } else if (task.rep === 'days') {
        const dayIndex = (now.getDay() + 6) % 7;
        isDueToday = (task.days || []).includes(dayIndex);
      } else if (task.rep === 'once') {
        isDueToday = task.date === today;
      }

      console.log('[Task Debug] Fälligkeitsprüfung:', {
        title: task.title,
        isDueToday,
        currentMinutes,
        taskMinutes: (() => {
          const [h, m] = task.reminderTime.split(':').map(Number);
          return h * 60 + m;
        })()
      });

      if (!isDueToday) continue;

      const [h, m] = task.reminderTime.split(':').map(Number);
      const taskMinutes = h * 60 + m;

      if (currentMinutes < taskMinutes) continue;

      const key = `lastTaskReminder:${today}:${task.id}`;

      if (storage.getItem(key) === 'true') continue;

      try {
        await registration.showNotification(
          `Consistly – ${task.title}`,
          {
            body: 'Zeit für deine Aufgabe!',
            tag: `task-reminder-${today}-${task.id}`
          }
        );

        storage.setItem(key, 'true');

        console.log('[Task Debug] ERFOLGREICH:', task.title);

      } catch (error) {
        console.error('[Task Debug] Benachrichtigungsfehler:', error);
      }
    }

  } catch (error) {
    console.error('[Reminder] Allgemeiner Fehler:', error);
  } finally {
    reminderCheckRunning = false;
  }
}


// Journal-Benachrichtigung anzeigen
async function showJournalReminderNotification(test = false) {
  console.log('[Journal Test] Starte');

  if (!('Notification' in window)) {
    throw new Error('Notifications werden nicht unterstützt');
  }

  if (Notification.permission !== 'granted') {
    throw new Error('Keine Benachrichtigungserlaubnis');
  }

  const registration = await navigator.serviceWorker.ready;

  console.log('[Journal Test] Service Worker:', {
    active: registration.active?.state,
    permission: Notification.permission
  });

  const title = test
    ? 'Consistly – TEST 🔔'
    : 'Consistly 📖';

  const options = {
    body: test
      ? 'Das ist eine neue Testbenachrichtigung!'
      : 'Nimm dir Zeit für deinen Journaleintrag.',
    tag: test
      ? `journal-test-${Date.now()}`
      : `journal-reminder-${today()}`
  };

  await registration.showNotification(title, options);

  console.log('[Journal Test] showNotification erfolgreich');

  const notifications = await registration.getNotifications();

  console.log(
    '[Journal Test] Registrierte Benachrichtigungen:',
    notifications.length
  );
}


// Task-Erinnerungen regelmäßig prüfen
setInterval(checkDailyReminder, 15000);


// Journal-Erinnerungen prüfen
async function checkJournalReminder() {
  if (journalReminderCheckRunning) return;

  journalReminderCheckRunning = true;

  try {
    console.log('[Journal Debug] 1 – Funktion gestartet');

    console.log('[Journal Debug] 2 – Einstellungen:', {
      enabled: storage.getItem('journalReminderEnabled'),
      permission: Notification.permission,
      serviceWorker: 'serviceWorker' in navigator,
      secure: window.isSecureContext,
      hasEntry: journalHasDay(today()),
      lastReminder: storage.getItem('lastJournalReminderDate'),
      reminderTime: storage.getItem('journalReminderTime'),
      now: new Date().toLocaleTimeString()
    });

    if (
      storage.getItem('journalReminderEnabled') !== 'true' ||
      !('Notification' in window) ||
      Notification.permission !== 'granted' ||
      !('serviceWorker' in navigator)
    ) {
      console.log('[Journal Debug] ABBRUCH – Einstellung oder Berechtigung');
      return;
    }

    if (!window.isSecureContext || location.protocol === 'file:') {
      console.log('[Journal Debug] ABBRUCH – Unsicherer Kontext');
      return;
    }

    const currentDate = today();

    if (journalHasDay(currentDate)) {
      console.log('[Journal Debug] ABBRUCH – Eintrag bereits vorhanden');
      return;
    }

    if (storage.getItem('lastJournalReminderDate') === currentDate) {
      console.log('[Journal Debug] ABBRUCH – Heute bereits ausgelöst');
      return;
    }

    const reminderTime =
      storage.getItem('journalReminderTime') || '20:00';

    console.log('[Journal Debug] 3 – Erinnerungszeit:', reminderTime);

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) {
      console.log('[Journal Debug] ABBRUCH – Ungültige Uhrzeit');
      return;
    }

    const [hour, minute] = reminderTime.split(':').map(Number);
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const reminderMinutes = hour * 60 + minute;

    if (currentMinutes < reminderMinutes) {
      console.log('[Journal Debug] ABBRUCH – Uhrzeit noch nicht erreicht');
      return;
    }

    console.log('[Journal Debug] 4 – Uhrzeit erreicht');

    if (storage.getItem('quietHoursEnabled') === 'true') {
      const [sh, sm] = (storage.getItem('quietHoursStart') || '22:00')
        .split(':').map(Number);
      const [eh, em] = (storage.getItem('quietHoursEnd') || '08:00')
        .split(':').map(Number);

      const start = sh * 60 + sm;
      const end = eh * 60 + em;

      const isQuiet = start < end
        ? currentMinutes >= start && currentMinutes < end
        : currentMinutes >= start || currentMinutes < end;

      if (isQuiet) {
        console.log('[Journal Debug] ABBRUCH – Ruhezeit aktiv');
        return;
      }
    }

    console.log('[Journal Debug] 5 – Benachrichtigung wird gesendet');

    await showJournalReminderNotification();

    storage.setItem('lastJournalReminderDate', currentDate);

    console.log('[Journal Debug] 6 – Erfolgreich ausgelöst');

  } catch (error) {
    console.warn('[Journal Debug] FEHLER:', error);
  } finally {
    journalReminderCheckRunning = false;
  }
}




checkJournalReminder();
setInterval(checkJournalReminder, 15000);






function loadQuietHours() {
  const enabled = storage.getItem('quietHoursEnabled');
  const start = storage.getItem('quietHoursStart');
  const end = storage.getItem('quietHoursEnd');

  const checkbox = document.querySelector('#quietHoursEnabled');
  const startInput = document.querySelector('#quietHoursStart');
  const endInput = document.querySelector('#quietHoursEnd');

  if (!checkbox || !startInput || !endInput) return;

  checkbox.checked = enabled === 'true';
  startInput.value = start || '22:00';
  endInput.value = end || '08:00';
}

document.querySelector('#saveQuietHours')
  ?.addEventListener('click', () => {
    const enabled =
      document.querySelector('#quietHoursEnabled').checked;

    const start =
      document.querySelector('#quietHoursStart').value;

    const end =
      document.querySelector('#quietHoursEnd').value;

    if (!start || !end || start === end) {
      document.querySelector('#quietHoursStatus').textContent =
        '⚠️ Bitte wähle zwei unterschiedliche Uhrzeiten.';
      return;
    }

    storage.setItem('quietHoursEnabled', String(enabled));
    storage.setItem('quietHoursStart', start);
    storage.setItem('quietHoursEnd', end);

    document.querySelector('#quietHoursStatus').textContent =
      enabled
        ? `🌙 Ruhezeiten gespeichert: ${start}–${end} Uhr.`
        : '🔔 Ruhezeiten sind ausgeschaltet.';
  });

loadQuietHours();
// ===== PASSWORD RECOVERY =====

const resetDlg = document.querySelector('#resetPasswordDlg');

let recoveryHandled = false;

async function showPasswordReset() {
  if (recoveryHandled) return;

  recoveryHandled = true;

  if (authDlg?.open) {
    authDlg.close();
  }

  if (resetDlg && !resetDlg.open) {
    resetDlg.showModal();
  }
}

supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === 'PASSWORD_RECOVERY' && session) {
    await showPasswordReset();
  }
});

// Falls die Recovery-Sitzung bereits beim Laden erkannt wurde:
(async () => {
  const { data: { session }, error } =
    await supabaseClient.auth.getSession();

  if (error) {
    console.error('Recovery-Fehler:', error.message);
    return;
  }

  if (
    session &&
    new URLSearchParams(window.location.search).has('reset')
  ) {
    await showPasswordReset();
  }
})();

document.querySelector('#saveNewPassword')
  .addEventListener('click', async () => {

    const password = document.querySelector('#newPassword').value;
    const confirmPassword = document.querySelector('#confirmPassword').value;
    const message = document.querySelector('#resetMessage');

    if (password.length < 8) {
      message.textContent = textFor('resetPasswordMin');
      return;
    }

    if (password !== confirmPassword) {
      message.textContent = textFor('resetPasswordsMismatch');
      return;
    }

    message.textContent = textFor('passwordSaving');

    const { error } = await supabaseClient.auth.updateUser({
      password: password
    });

    if (error) {
      message.textContent = textFor('genericError', { error: error.message });
      return;
    }

    message.textContent = textFor('passwordUpdated');

    document.querySelector('#newPassword').value = '';
    document.querySelector('#confirmPassword').value = '';

    setTimeout(() => {
      resetDlg.close();
      window.history.replaceState({}, document.title, '/app.html');
    }, 1500);
  });

// ===== PROFILBILD UPLOAD =====

const avatarInput = document.querySelector('#avatarFile');
console.log('Avatar-Input gefunden:', !!avatarInput);

if (avatarInput) {
  avatarInput.addEventListener('change', async (event) => {
    console.log('DATEI AUSGEWÄHLT!');

    const file = event.target.files[0];
    if (!file) return;

    const message = document.querySelector('#avatarUploadMessage');

    message.textContent = textFor('profileImageDetected', { name: file.name });

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      message.textContent = textFor('imageTypeError');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      message.textContent = textFor('imageTooLarge');
      return;
    }

    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (error || !user) {
      message.textContent = textFor('loginToContinue');
      return;
    }

    message.textContent = textFor('imageUploading');

    const extension = file.type.split('/')[1];
    const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      message.textContent = textFor('imageUploadFailed', { error: uploadError.message });
      console.error(uploadError);
      return;
    }

    const { data } = supabaseClient.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = data.publicUrl;

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    if (updateError) {
      message.textContent = textFor('profileImageDbFailed', { error: updateError.message });
      console.error(updateError);
      return;
    }

    const image = document.querySelector('#profileAvatarImage');
    image.src = avatarUrl;
    image.hidden = false;

    document.querySelector('#profileAvatar').hidden = true;

    message.textContent = textFor('profileImageSaved');
  });
}

// ===== FRIEND SEARCH =====

function escapeFriendHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

async function openFriendsDialog() {
  const { data: { user }, error } =
    await supabaseClient.auth.getUser();

  if (error || !user) {
    alert(textFor('loginToContinue'));
    return;
  }

  const dialog = document.querySelector('#friendsDlg');
  const searchInput = document.querySelector('#friendSearchInput');

  if (!dialog || !searchInput) {
    console.error('Freunde-Dialog oder Suchfeld fehlt.');
    return;
  }

  dialog.showModal();
  searchInput.value = '';
  searchInput.focus();
  await loadFriendOverview();
  await loadBlockedUsers();
  document.querySelector('#friendSearchResults').innerHTML =
    `<p>${textFor('friendSearchHint')}</p>`;
}

async function searchFriendUsers(searchTerm) {
  const results = document.querySelector('#friendSearchResults');

  if (searchTerm.trim().length < 2) {
    results.innerHTML = `<p>${textFor('searchAtLeastTwo')}</p>`;
    return;
  }

  const { data, error } = await supabaseClient.rpc(
    'search_profiles',
    { search_term: searchTerm.trim() }
  );

  if (error) {
    console.error('Freundesuche:', error.message);
    results.innerHTML = `<p>${textFor('userSearchFailed')}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    results.innerHTML = `<p>${textFor('noUsersFound')}</p>`;
    return;
  }

  await attachSocialTitles(data);

  results.innerHTML = data.map(user => {
    const username = escapeFriendHTML(user.username);
    const bio = escapeFriendHTML(user.bio || textFor('noBio'));

    const avatar = user.avatar_url
      ? `<img src="${escapeFriendHTML(user.avatar_url)}"
        alt="${textFor('profilePicture')}"
        class="friend-avatar ${avatarFrameClass(user.equipped_avatar_frame)}">`
      : `<span class="friend-avatar-emoji ${avatarFrameClass(user.equipped_avatar_frame)}">
        ${escapeFriendHTML(user.avatar || '👤')}
      </span>`;

    return `
  <div class="friend-search-result">
    ${avatar}
    <div class="friend-search-info">
      <strong>${username}</strong>
      <p>${bio}</p>
    </div>
    <button
      type="button"
      data-friend-action="send"
      data-user-id="${escapeFriendHTML(user.id)}">
      ${textFor('addFriend')}
    </button>
  </div>
`;
  }).join('');
}

// Suche beim Tippen
document.querySelector('#friendSearchInput')
  ?.addEventListener('input', event => {
    searchFriendUsers(event.target.value);
  });

// Dialog schließen
document.querySelector('#closeFriends')
  ?.addEventListener('click', () => {
    document.querySelector('#friendsDlg')?.close();
  });

// ===== SEND FRIEND REQUEST =====

async function sendFriendRequest(targetUserId) {
  if (!currentUser) {
    alert(textFor('loginToContinue'));
    return;
  }

  const { error } = await supabaseClient.rpc(
    'send_friend_request',
    { target_user: targetUserId }
  );

  if (error) {
    alert(textFor('friendRequestFailed', { error: error.message }));
    console.error('Friend request error:', error);
    return;
  }

  alert(textFor('friendRequestSent'));
}

// Add-Buttons in den Suchergebnissen
document.querySelector('#friendSearchResults')
  ?.addEventListener('click', async event => {
    const button = event.target.closest(
      '[data-friend-action="send"]'
    );

    if (!button) return;

    const userId = button.dataset.userId;

    if (!userId) return;

    button.disabled = true;
    button.textContent = '⏳';

    await sendFriendRequest(userId);

    button.disabled = false;
    button.textContent = textFor('addFriend');
  });

// ===== FRIEND OVERVIEW =====

async function attachSocialTitles(users) {
  if (!currentUser || !users.length) return users;
  const ids = [...new Set(users.map(user => user.user_id || user.id).filter(Boolean))];
  if (!ids.length) return users;
  const [titleResult, frameResult] = await Promise.all([
    supabaseClient.rpc('get_social_profile_titles', { p_user_ids: ids }),
    supabaseClient.rpc('get_social_profile_frames', { p_user_ids: ids })
  ]);
  if (titleResult.error) console.warn('Profil-Titel konnten nicht geladen werden:', titleResult.error.message);
  if (frameResult.error) console.warn('Profilrahmen konnten nicht geladen werden:', frameResult.error.message);
  const titles = new Map((titleResult.data || []).map(row => [row.user_id, row.equipped_title]));
  const frames = new Map((frameResult.data || []).map(row => [row.user_id, row.equipped_avatar_frame]));
  users.forEach(user => {
    const id = user.user_id || user.id;
    user.equipped_title = titles.get(id) || null;
    user.equipped_avatar_frame = frames.get(id) || null;
  });
  return users;
}

function titleMarkup(titleId) {
  const item = TITLE_ITEMS.find(title => title.id === titleId);
  return item ? `<span class="profile-title title-${item.color}">${textFor(item.nameKey)}</span>` : '';
}

function renderFriendProfile(user, actionButton = '') {
  const username = escapeFriendHTML(user.username);
  const bio = escapeFriendHTML(user.bio || textFor('noBio'));

  const avatar = user.avatar_url
    ? `<img src="${escapeFriendHTML(user.avatar_url)}"
      alt="${textFor('profilePicture')}" class="friend-avatar ${avatarFrameClass(user.equipped_avatar_frame)}">`
    : `<span class="friend-avatar-emoji ${avatarFrameClass(user.equipped_avatar_frame)}">
      ${escapeFriendHTML(user.avatar || '👤')}
    </span>`;

  return `
<div class="friend-search-result">
  ${avatar}

  <div class="friend-search-info">
    <strong>${username}</strong>
    ${titleMarkup(user.equipped_title)}
    <p>${bio}</p>
  </div>

  ${actionButton}
</div>
`;
}

async function loadFriendOverview() {
  const incoming = document.querySelector('#incomingRequests');
  const outgoing = document.querySelector('#outgoingRequests');
  const friends = document.querySelector('#friendsList');

  if (!incoming || !outgoing || !friends) return;

  const { data, error } = await supabaseClient.rpc(
    'get_friend_overview'
  );

  if (error) {
    console.error('Freundesübersicht:', error.message);
    incoming.innerHTML = `<p>${textFor('friendOverviewError')}</p>`;
    return;
  }

  const rows = data || [];
  const { data: presenceData, error: presenceError } =
    await supabaseClient.rpc('get_friend_presence');

  if (presenceError) {
    console.error('Online-Status:', presenceError.message);
  }

  const presenceMap = new Map(
    (presenceData || []).map(item => [
      item.user_id,
      item.is_online
    ])
  );
  const incomingRows = rows.filter(row => row.entry_type === 'incoming');
  const outgoingRows = rows.filter(row => row.entry_type === 'outgoing');
  const friendRows = rows.filter(row => row.entry_type === 'friend');
  await attachSocialTitles(friendRows);
  friendRows.forEach(friend => {
    friend.is_online = presenceMap.get(friend.user_id) || false;
  });
  incoming.innerHTML = incomingRows.length
    ? incomingRows.map(user => renderFriendProfile(
      user,
      `<div class="friend-actions">
      <button type="button"
        data-friend-action="accept"
        data-request-id="${user.request_id}">
        ${textFor('friendAccept')}
      </button>
      <button type="button"
        data-friend-action="reject"
        data-request-id="${user.request_id}">
        ${textFor('friendReject')}
      </button>
    </div>`
    )).join('')
    : `<p>${textFor('noIncoming')}</p>`;

  outgoing.innerHTML = outgoingRows.length
    ? outgoingRows.map(user => renderFriendProfile(
      user,
      `<span class="friend-status">
      ${user.status === 'rejected' ? textFor('friendRejected') : textFor('friendPending')}
    </span>`
    )).join('')
    : `<p>${textFor('noOutgoing')}</p>`;

  friends.innerHTML = friendRows.length
    ? friendRows.map(user => renderFriendProfile(
      user,
      `<div class="friend-actions">
      <span class="friend-status">
        ${textFor(user.is_online ? 'onlineState' : 'offlineState')}
      </span>

      <button type="button" data-view-friend-progress="${escapeFriendHTML(user.user_id)}" data-friend-name="${escapeFriendHTML(user.username || user.friend_tag || '')}">
        ${textFor('progressViewButton')}
      </button>

      <button type="button"
        data-friend-action="remove"
        data-user-id="${escapeFriendHTML(user.user_id)}">
        ${textFor('friendRemove')}
      </button>

      <button type="button"
        data-friend-action="block"
        data-user-id="${escapeFriendHTML(user.user_id)}">
        ${textFor('friendBlock')}
      </button>
    </div>`
    )).join('')
    : `<p>${textFor('noFriendsYet')}</p>`;
}

let friendProgressData = null;
let friendProgressWeek = null;
let friendProgressDay = null;

function friendWeekSummary(state, weekStart) {
  let plannedCount = 0;
  let doneCount = 0;
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const day = add(weekStart, dayIndex);
    const scheduled = tasks.filter(task => occurs(task, day));
    const completedIds = state.done?.[day] || [];
    plannedCount += scheduled.length;
    doneCount += scheduled.filter(task => completedIds.includes(task.id)).length;
  }
  return { plannedCount, doneCount, percent: plannedCount ? Math.round(doneCount / plannedCount * 100) : null };
}

function renderFriendProgress() {
  const body = document.querySelector('#friendProgressBody');
  if (!body || !friendProgressData) return;
  const state = friendProgressData.app_data || {};
  const weekStart = friendProgressWeek || monOf(today());
  const selectedDay = friendProgressDay || today();
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const weeklySummary = friendWeekSummary(state, weekStart);
  const weekInfo = state.weeks?.[weekStart] || null;
  const completedAll = Object.values(state.done || {}).reduce((sum, ids) => sum + (Array.isArray(ids) ? ids.length : 0), 0);
  const dayTasks = tasks.filter(task => occurs(task, selectedDay));
  const doneIds = state.done?.[selectedDay] || [];
  const days = getTranslatedDays();
  const chips = days.map((label, index) => {
    const day = add(weekStart, index);
    const scheduled = tasks.filter(task => occurs(task, day));
    const completed = scheduled.filter(task => (state.done?.[day] || []).includes(task.id)).length;
    const pct = scheduled.length ? `${Math.round(completed / scheduled.length * 100)}%` : '·';
    return `<button type="button" class="friend-progress-day ${day === selectedDay ? 'selected' : ''}" data-fprogress-day="${day}">${escapeFriendHTML(label)}<b>${parse(day).getDate()}</b><small>${pct}</small></button>`;
  }).join('');
  const taskRows = dayTasks.length ? dayTasks.map(task => {
    const completed = doneIds.includes(task.id);
    return `<li class="${completed ? 'completed' : ''}"><span>${completed ? '✅' : '◯'}</span><div><b>${escapeFriendHTML(task.title || '')}</b>${task.cat ? `<small>${escapeFriendHTML(task.cat)}</small>` : ''}</div><small>${textFor(completed ? 'progressCompleted' : 'progressNotCompleted')}</small></li>`;
  }).join('') : `<li class="friend-progress-empty">${textFor('progressNoTasks')}</li>`;
  const history = Array.from({ length: 8 }, (_, index) => {
    const monday = add(weekStart, -7 * (7 - index));
    const summary = friendWeekSummary(state, monday);
    return `<div class="friend-week-stat"><span>${escapeFriendHTML(fmt(monday))}</span><div class="friend-week-track"><i style="width:${summary.percent ?? 0}%"></i></div><b>${summary.percent === null ? '–' : `${summary.percent}%`}</b></div>`;
  }).join('');

  body.innerHTML = `
<div class="grid friend-progress-stats">
  <article class="card"><b>${completedAll}</b><small>${textFor('progressAllTime')}</small></article>
  <article class="card"><b>${weeklySummary.percent === null ? '–' : `${weeklySummary.percent}%`}</b><small>${textFor('progressWeekRate', { done: weeklySummary.doneCount, planned: weeklySummary.plannedCount, pct: weeklySummary.percent ?? 0 })}</small></article>
  <article class="card"><b>${escapeFriendHTML(textFor(weekInfo?.goal ? 'progressWeekGoal' : 'progressNoGoal', { goal: weekInfo?.goal ?? '' }))}</b>${weekInfo?.reward ? `<small>🎁 ${escapeFriendHTML(weekInfo.reward)}</small>` : ''}</article>
  <article class="card"><b>${(state.defeated || []).length}</b><small>${textFor('progressDefeatedBosses', { count: (state.defeated || []).length })}</small></article>
</div>
<div class="friend-progress-weeknav"><button type="button" data-fprogress-week="-1">‹</button><b>${escapeFriendHTML(fmt(weekStart))} – ${escapeFriendHTML(fmt(add(weekStart, 6)))}</b><button type="button" data-fprogress-week="1">›</button></div>
<div class="friend-progress-days">${chips}</div>
<h3>${escapeFriendHTML(new Date(`${selectedDay}T12:00:00`).toLocaleDateString(localeForLanguage(), { weekday: 'long', day: 'numeric', month: 'long' }))}</h3>
<ul class="friend-progress-tasks">${taskRows}</ul>
<h3>${textFor('progressHistory')}</h3><div class="friend-progress-history">${history}</div>`;
}

async function openFriendProgress(friendId, friendName) {
  const dialog = document.querySelector('#friendProgressDlg');
  const body = document.querySelector('#friendProgressBody');
  const title = document.querySelector('#friendProgressTitle');
  const intro = document.querySelector('#friendProgressIntro');
  title.textContent = `${textFor('friendProgressTitle')} · ${friendName}`;
  intro.textContent = textFor('friendProgressLoading');
  body.innerHTML = `<p>${textFor('friendProgressLoading')}</p>`;
  dialog.showModal();
  const { data, error } = await supabaseClient.rpc('get_friend_progress', { p_friend_id: friendId });
  if (error || !data?.length) {
    const privateOff = /not enabled/i.test(error?.message || '');
    intro.textContent = '';
    body.innerHTML = `<p>${privateOff ? textFor('friendProgressPrivate') : textFor('friendProgressUnavailable', { error: escapeFriendHTML(error?.message || '') })}</p>`;
    return;
  }
  friendProgressData = data[0];
  friendProgressWeek = monOf(today());
  friendProgressDay = today();
  title.textContent = `${textFor('friendProgressTitle')} · ${friendProgressData.username || friendName}`;
  intro.textContent = friendProgressData.friend_tag || '';
  renderFriendProgress();
}

document.querySelector('#friendsDlg')?.addEventListener('click', event => {
  const button = event.target.closest('[data-view-friend-progress]');
  if (button) openFriendProgress(button.dataset.viewFriendProgress, button.dataset.friendName || '');
});
document.querySelector('#friendProgressBody')?.addEventListener('click', event => {
  const dayButton = event.target.closest('[data-fprogress-day]');
  const weekButton = event.target.closest('[data-fprogress-week]');
  if (dayButton) friendProgressDay = dayButton.dataset.fprogressDay;
  if (weekButton) {
    friendProgressWeek = add(friendProgressWeek, Number(weekButton.dataset.fprogressWeek) * 7);
    friendProgressDay = friendProgressWeek;
  }
  if (dayButton || weekButton) renderFriendProgress();
});
document.querySelector('#closeFriendProgress')?.addEventListener('click', () => document.querySelector('#friendProgressDlg').close());
document.querySelector('#friendProgressDlg')?.addEventListener('click', event => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});

// ===== ACCEPT / REJECT REQUESTS =====

async function handleFriendRequest(action, requestId) {
  const functionName = action === 'accept'
    ? 'accept_friend_request'
    : 'reject_friend_request';

  const { error } = await supabaseClient.rpc(functionName, {
    request_id: requestId
  });

  if (error) {
    console.error('Anfrage bearbeiten:', error.message);
    alert(textFor('operationFailed', { error: error.message }));
    return;
  }

  await loadFriendOverview();

  if (action === 'accept') {
    alert(textFor('friendAccepted'));
  } else {
    alert(textFor('friendRejectedAlert'));
  }
}

// Klicks auf Annehmen und Ablehnen
document.querySelector('#friendsDlg')
  ?.addEventListener('click', async event => {
    const button = event.target.closest('[data-friend-action]');

    if (!button) return;

    const action = button.dataset.friendAction;

    if (action !== 'accept' && action !== 'reject') return;

    const requestId = button.dataset.requestId;

    if (!requestId) return;

    button.disabled = true;

    await handleFriendRequest(action, requestId);
  });


// ===== REMOVE FRIEND =====

async function removeFriend(friendId) {
  if (!confirm(textFor('friendEndConfirm'))) {
    return;
  }

  const { error } = await supabaseClient.rpc(
    'remove_friend',
    { target_user: friendId }
  );

  if (error) {
    console.error('Freund entfernen:', error.message);
    alert(textFor('friendRemoveFailed'));
    return;
  }

  await loadFriendOverview();
  alert(textFor('friendRemoved'));

  document.querySelector('#friendsDlg')
    ?.addEventListener('click', async event => {
      const button = event.target.closest(
        '[data-friend-action="remove"]'
      );

      if (!button) return;

      const friendId = button.dataset.userId;

      if (!friendId) return;

      button.disabled = true;
      await removeFriend(friendId);
    });
}


// ===== NUTZER BLOCKIEREN =====

async function blockUser(userId) {
  const confirmed = confirm(textFor('blockConfirm'));

  if (!confirmed) return;

  const { error } = await supabaseClient.rpc(
    'block_user',
    { target_user: userId }
  );

  if (error) {
    console.error('Nutzer blockieren:', error.message);
    alert(textFor('friendBlockFailed'));
    return;
  }

  await loadFriendOverview();

  alert(textFor('friendBlocked'));
}

// Klick auf Blockieren
document.querySelector('#friendsDlg')
  ?.addEventListener('click', async event => {
    const button = event.target.closest(
      '[data-friend-action="block"]'
    );

    if (!button) return;

    const userId = button.dataset.userId;

    if (!userId) return;

    button.disabled = true;
    await blockUser(userId);
  });
// ===== PRESENCE HEARTBEAT =====

async function updateMyPresence() {
  if (!currentUser) return;

  const { error } = await supabaseClient.rpc(
    'update_my_presence'
  );

  if (error) {
    console.error('Presence-Update:', error.message);
  }
}

// Alle 30 Sekunden aktualisieren
setInterval(() => {
  if (document.visibilityState === 'visible') {
    updateMyPresence();
  }
}, 30000);

// Beim Zurückkehren zur App aktualisieren
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    updateMyPresence();
  }
});

// Klick auf Entfernen
document.querySelector('#friendsDlg')
  ?.addEventListener('click', async event => {
    const button = event.target.closest(
      '[data-friend-action="remove"]'
    );

    if (!button) return;

    console.log('Entfernen wurde geklickt!');

    const friendId = button.dataset.userId;

    if (!friendId) {
      console.error('Keine User-ID gefunden!');
      return;
    }

    button.disabled = true;
    await removeFriend(friendId);
  });

// ===== BLOCKIERTE NUTZER LADEN =====

async function loadBlockedUsers() {
  const container = document.querySelector('#blockedUsersList');

  if (!container) return;

  const { data, error } = await supabaseClient.rpc(
    'get_blocked_users'
  );

  if (error) {
    console.error('Blockierte Nutzer:', error.message);
    container.innerHTML = `<p>${textFor('blockedUsersLoadError')}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<p>${textFor('noBlocked')}</p>`;
    return;
  }

  container.innerHTML = data.map(user => `
<div class="friend-search-result">
  ${user.avatar_url
      ? `<img src="${escapeFriendHTML(user.avatar_url)}"
          class="friend-avatar" alt="${textFor('profilePicture')}">`
      : `<span class="friend-avatar-emoji">
          ${escapeFriendHTML(user.avatar || '👤')}
        </span>`
    }

  <div class="friend-search-info">
    <strong>${escapeFriendHTML(user.username)}</strong>
    <p>${escapeFriendHTML(user.bio || textFor('noBio'))}</p>
  </div>

  <button type="button"
    data-friend-action="unblock"
    data-user-id="${escapeFriendHTML(user.user_id)}">
    ${textFor('friendUnblock')}
  </button>
</div>
`).join('');
}


// ===== NUTZER ENTBLOCKIEREN =====

async function unblockUser(userId) {
  if (!confirm(textFor('unblockConfirm'))) {
    return;
  }

  const { error } = await supabaseClient.rpc(
    'unblock_user',
    { target_user: userId }
  );

  if (error) {
    console.error('Entblockieren:', error.message);
    alert(textFor('userUnblockFailed'));
    return;
  }

  await loadBlockedUsers();

  alert(textFor('userUnblocked'));
}

// ===== PRIVATE CHATS WITH CONFIRMED FRIENDS =====
let activeChatFriend = null;
let activeSocialGroupId = null;
let managingSocialGroup = null;
let activeSocialGroupName = '';
let socialFeedRows = [];
let socialFeedVisibleCount = 10;
let socialFeedRenderedFilter = null;
let socialFeedFilter = 'explore';
let cachedSocialFriendIds = null;
const socialDiscoveryCopy = {
  en: { feedExplore: '🌐 Explore feed', feedFollowing: 'Following', feedPopular: '🔥 Popular', socialFollow: 'Follow', socialUnfollow: 'Following ✓', socialFollowersCount: '{count} followers', socialFollowError: 'Could not update follow: {error}', socialFollowingEmpty: 'No posts from people you follow yet.' },
  de: { feedExplore: '🌐 Explore-Feed', feedFollowing: 'Following', feedPopular: '🔥 Beliebt', socialFollow: 'Folgen', socialUnfollow: 'Folge ich ✓', socialFollowersCount: '{count} Follower', socialFollowError: 'Folgen konnte nicht aktualisiert werden: {error}', socialFollowingEmpty: 'Von Personen, denen du folgst, gibt es noch keine Beiträge.' },
  es: { feedExplore: '🌐 Explorar', feedFollowing: 'Siguiendo', feedPopular: '🔥 Populares', socialFollow: 'Seguir', socialUnfollow: 'Siguiendo ✓', socialFollowersCount: '{count} seguidores', socialFollowError: 'No se pudo actualizar el seguimiento: {error}', socialFollowingEmpty: 'Aún no hay publicaciones de las personas que sigues.' },
  it: { feedExplore: '🌐 Esplora', feedFollowing: 'Seguiti', feedPopular: '🔥 Popolari', socialFollow: 'Segui', socialUnfollow: 'Seguito ✓', socialFollowersCount: '{count} follower', socialFollowError: 'Impossibile aggiornare il follow: {error}', socialFollowingEmpty: 'Non ci sono ancora post delle persone che segui.' },
  el: { feedExplore: '🌐 Εξερεύνηση', feedFollowing: 'Ακολουθείς', feedPopular: '🔥 Δημοφιλή', socialFollow: 'Ακολούθησε', socialUnfollow: 'Ακολουθείς ✓', socialFollowersCount: '{count} ακόλουθοι', socialFollowError: 'Δεν ήταν δυνατή η ενημέρωση ακολούθησης: {error}', socialFollowingEmpty: 'Δεν υπάρχουν ακόμα αναρτήσεις από άτομα που ακολουθείς.' },
  pt: { feedExplore: '🌐 Explorar', feedFollowing: 'A seguir', feedPopular: '🔥 Populares', socialFollow: 'Seguir', socialUnfollow: 'A seguir ✓', socialFollowersCount: '{count} seguidores', socialFollowError: 'Não foi possível atualizar o seguimento: {error}', socialFollowingEmpty: 'Ainda não há publicações de pessoas que segues.' }
};
for (const [lang, copy] of Object.entries(socialDiscoveryCopy)) {
  Object.assign(translations[lang], copy);
  Object.assign(extraTranslations[lang], copy);
}

async function loadSocialPage() {
  if (!currentUser) {
    document.querySelector('#socialFeed').innerHTML = `<p>${textFor('loginToContinue')}</p>`;
    return;
  }
  await Promise.all([loadSocialFeed(), loadSocialGoalFriends(), loadSharedGoals(), loadXpLeaderboard(), loadMyGroups()]);
}
let leaderboardScope = 'global';
async function loadXpLeaderboard() {
  const list = document.querySelector('#xpLeaderboardList');
  const status = document.querySelector('#leaderboardStatus');
  if (!list || !currentUser) return;
  list.innerHTML = `<p>${textFor('leaderboardLoading')}</p>`;
  const { data, error } = await supabaseClient.rpc('get_xp_leaderboard', { p_scope: leaderboardScope });
  if (error) { list.innerHTML = ''; status.textContent = textFor('leaderboardError', { error: error.message }); return; }
  status.textContent = '';
  list.innerHTML = (data || []).map((row, index) => `<div class="leaderboard-row ${row.user_id === currentUser.id ? 'is-self' : ''}"><b class="leaderboard-rank">${index + 1}</b><span class="leaderboard-name">${escapeFriendHTML(row.user_id === currentUser.id ? textFor('leaderboardYou') : row.username || textFor('userLabel'))}</span><strong>${textFor('leaderboardXp', { xp: Number(row.xp) || 0 })}</strong></div>`).join('') || `<p>${textFor('leaderboardEmpty')}</p>`;
}
document.querySelectorAll('[data-leaderboard-scope]').forEach(button =>
  button.addEventListener('click', async () => {
    leaderboardScope = button.dataset.leaderboardScope;

    document.querySelectorAll('[data-leaderboard-scope]').forEach(tab => {
      tab.classList.toggle('active', tab === button);
    });

    await loadXpLeaderboard();
  })
);

async function loadSocialFeed() {
  const box = document.querySelector('#socialFeed');
  if (!box) return;

  if (socialFeedRenderedFilter !== socialFeedFilter) {
    socialFeedVisibleCount = 10;
    socialFeedRenderedFilter = socialFeedFilter;
  }

  const feedScope = ['following', 'popular'].includes(socialFeedFilter) ? socialFeedFilter : 'explore';
  const { data, error } = socialFeedFilter === 'saved'
    ? await supabaseClient.rpc('get_my_saved_social_feed')
    : await supabaseClient.rpc('get_social_feed_by_scope', { p_scope: feedScope });
  if (error) { box.innerHTML = `<p>${escapeFriendHTML(error.message)}</p>`; return; }
  socialFeedRows = (data || []).slice();
  if (socialFeedFilter !== 'popular') socialFeedRows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (socialFeedFilter === 'friends' && cachedSocialFriendIds === null) {
    const { data: friends } = await supabaseClient.rpc('get_friend_overview');
    cachedSocialFriendIds = new Set((friends || []).filter(row => row.entry_type === 'friend').map(row => row.user_id));
  }
  let visible = socialFeedRows;
  if (socialFeedFilter === 'friends') visible = visible.filter(post => cachedSocialFriendIds?.has(post.author_id));
  if (socialFeedFilter === 'mine') visible = visible.filter(post => post.author_id === currentUser?.id);
  if (visible.length) {
    const authorIds = [...new Set(visible.map(post => post.author_id).filter(Boolean))];
    const { data: frames, error: frameError } = await supabaseClient.rpc('get_social_profile_frames', { p_user_ids: authorIds });
    if (!frameError) {
      const frameMap = new Map((frames || []).map(row => [row.user_id, row.equipped_avatar_frame]));
      visible.forEach(post => { post.equipped_avatar_frame = frameMap.get(post.author_id) || null; });
    }
  }
  let engagement = new Map(), polls = new Map(), savedIds = new Set(), followStats = new Map();
  if (visible.length) {
    const postIds = visible.map(post => Number(post.post_id));
    const authorIds = [...new Set(visible.map(post => post.author_id).filter(id => id && id !== currentUser?.id))];
    const [engagementResult, pollResult, savedResult, followResult] = await Promise.all([
      supabaseClient.rpc('get_social_post_engagement', { p_post_ids: postIds }),
      supabaseClient.rpc('get_social_post_polls', { p_post_ids: postIds }),
      socialFeedFilter === 'saved' ? Promise.resolve({ data: postIds, error: null }) : supabaseClient.rpc('get_my_saved_social_post_ids', { p_post_ids: postIds }),
      authorIds.length ? supabaseClient.rpc('get_social_follow_stats', { p_user_ids: authorIds }) : Promise.resolve({ data: [], error: null })
    ]);
    if (!engagementResult.error) engagement = new Map((engagementResult.data || []).map(row => [String(row.post_id), row]));
    if (!pollResult.error) polls = new Map((pollResult.data || []).map(row => [String(row.post_id), row]));
    if (!savedResult.error) savedIds = new Set((savedResult.data || []).map(String));
    if (!followResult.error) followStats = new Map((followResult.data || []).map(row => [row.user_id, row]));
  }
  const displayed = visible.slice(0, socialFeedVisibleCount);

  box.innerHTML = displayed.map(post => {
    const counts = engagement.get(String(post.post_id)) || {};
    const own = post.author_id === currentUser?.id;
    const follow = followStats.get(post.author_id) || {};
    const isSaved = savedIds.has(String(post.post_id));
    const poll = polls.get(String(post.post_id));
    return `<article class="social-post card" data-social-post="${post.post_id}">
  <div class="social-post-heading"><button type="button" class="social-post-author" data-public-profile="${post.author_id}"><span class="social-post-avatar ${avatarFrameClass(post.equipped_avatar_frame)}">${escapeFriendHTML(post.avatar || '👤')}</span> <b>${escapeFriendHTML(post.username || textFor('userLabel'))}</b>${titleMarkup(post.equipped_title)}</button>${own ? '' : `<div class="social-post-author-actions"><button type="button" data-follow-user="${post.author_id}" aria-pressed="${follow.is_following ? 'true' : 'false'}">${textFor(follow.is_following ? 'socialUnfollow' : 'socialFollow')} · ${textFor('socialFollowersCount', { count: Number(follow.followers_count || 0) })}</button><button type="button" data-report-social="profile" data-target-id="${post.author_id}" data-target-user="${post.author_id}">${textFor('reportProfile')}</button><button type="button" data-report-social="post" data-target-id="${post.post_id}" data-target-user="${post.author_id}">${textFor('reportPost')}</button></div>`}</div>
  ${post.body ? `<p>${escapeFriendHTML(post.body)}</p>` : ''}${poll ? renderSocialPoll(post.post_id, poll) : ''}<small>${escapeFriendHTML(new Date(post.created_at).toLocaleString(localeForLanguage()))}${post.edited_at ? ` · ${textFor('messageEdited')}` : ''}</small>
  <div class="post-actions"><button type="button" data-like-post="${post.post_id}" aria-pressed="${counts.liked_by_me ? 'true' : 'false'}">${counts.liked_by_me ? '♥' : '♡'} ${textFor(counts.liked_by_me ? 'postLiked' : 'postLike')} · ${Number(counts.likes_count || 0)}</button><button type="button" data-open-comments="${post.post_id}">💬 ${textFor('postComments')} · ${Number(counts.comments_count || 0)}</button><button type="button" data-save-post="${post.post_id}" aria-pressed="${isSaved ? 'true' : 'false'}">${textFor(isSaved ? 'socialPostSaved' : 'socialSavePost')}</button>${own ? `<button type="button" data-delete-post="${post.post_id}">${textFor('postDelete')}</button>` : ''}</div>
  <section class="post-comments" data-post-comments="${post.post_id}" hidden><div class="post-comment-list"></div><form data-comment-form="${post.post_id}"><div class="comment-reply-context" hidden><span></span><button type="button" data-cancel-comment-reply aria-label="${escapeFriendHTML(textFor('commentCancelReply'))}">×</button></div><input type="hidden" name="parent_comment_id"><input name="body" maxlength="500" required placeholder="${escapeFriendHTML(textFor('postCommentPlaceholder'))}"><button type="submit">${textFor('postCommentSend')}</button></form></section>
</article>`;
  }).join('') || `<p>${textFor(socialFeedFilter === 'following' ? 'socialFollowingEmpty' : socialFeedFilter === 'friends' ? 'feedNoFriendPosts' : socialFeedFilter === 'mine' ? 'feedOnlyMineEmpty' : socialFeedFilter === 'saved' ? 'socialSavedEmpty' : 'feedEmpty')}</p>`;
  if (visible.length > displayed.length) {
    box.insertAdjacentHTML('beforeend', `
    <button
      type="button"
      class="social-feed-more"
      data-social-feed-more
    >
      Mehr laden ↓
    </button>
`);
  }
}

function renderSocialCommentList(comments, postId) {
  const known = new Set((comments || []).map(comment => String(comment.comment_id)));
  const children = new Map();
  for (const comment of comments || []) {
    const parentId = comment.parent_comment_id && known.has(String(comment.parent_comment_id)) ? String(comment.parent_comment_id) : '';
    if (!children.has(parentId)) children.set(parentId, []);
    children.get(parentId).push(comment);
  }
  const renderBranch = (parentId = '', depth = 0) => (children.get(parentId) || []).map(comment => {
    const id = String(comment.comment_id), mine = Boolean(comment.is_mine), deleted = Boolean(comment.is_deleted);
    const date = new Date(comment.created_at).toLocaleString(localeForLanguage());
    const actions = deleted ? '' : `<div class="post-comment-actions"><button type="button" data-comment-reply="${id}" data-comment-author="${escapeFriendHTML(comment.username)}">${textFor('commentReply')}</button>${mine ? `<button type="button" data-comment-edit="${id}" data-comment-body="${escapeFriendHTML(comment.body)}">${textFor('commentEdit')}</button><button type="button" data-comment-delete="${id}">${textFor('commentDelete')}</button>` : ''}</div>`;
    return `<article class="post-comment" data-comment-id="${id}" style="margin-left:${Math.min(depth, 4) * 16}px"><div><b>${escapeFriendHTML(comment.username)}</b> <span>${deleted ? `<em>${textFor('commentDeleted')}</em>` : escapeFriendHTML(comment.body)}</span></div><small>${escapeFriendHTML(date)}${comment.edited_at ? ` · ${textFor('commentEdited')}` : ''}</small>${actions}${depth < 4 ? renderBranch(id, depth + 1) : ''}</article>`;
  }).join('');
  return renderBranch() || `<p>${textFor('feedEmpty')}</p>`;
}

async function loadSocialPostComments(section, postId) {
  const list = section?.querySelector('.post-comment-list');
  if (!list) return;
  list.innerHTML = `<p>${textFor('loading')}</p>`;
  const { data, error } = await supabaseClient.rpc('get_social_post_comments', { p_post_id: Number(postId) });
  list.innerHTML = error ? `<p>${escapeFriendHTML(error.message)}</p>` : renderSocialCommentList(data || [], postId);
}

function renderSocialPoll(postId, poll) {
  const options = Array.isArray(poll.options) ? poll.options : [];
  const counts = Array.isArray(poll.option_counts) ? poll.option_counts.map(Number) : [];
  const myVotes = Array.isArray(poll.my_votes) ? poll.my_votes.map(Number) : [];
  const total = counts.reduce((sum, count) => sum + (Number.isFinite(count) ? count : 0), 0);
  const expired = Boolean(poll.ends_at && new Date(poll.ends_at).getTime() <= Date.now());
  const showResults = myVotes.length > 0 || expired;
  const inputType = poll.poll_type === 'multiple' ? 'checkbox' : 'radio';
  const rows = options.map((rawOption, index) => {
    const label = poll.poll_type === 'yes_no' ? textFor(index === 0 ? 'socialPollYes' : 'socialPollNo') : rawOption;
    const count = counts[index] || 0, percent = total ? Math.round(count / total * 100) : 0;
    return `<label class="social-poll-option ${showResults ? 'show-result' : ''}"><span class="social-poll-choice">${expired ? '' : `<input type="${inputType}" name="poll-${postId}" value="${index}" ${myVotes.includes(index) ? 'checked' : ''}>`}<span>${escapeFriendHTML(label)}</span></span>${showResults ? `<span class="social-poll-result"><i style="width:${percent}%"></i><b>${count} · ${percent}%</b></span>` : ''}</label>`;
  }).join('');
  const pollLabelKey = poll.poll_type === 'multiple' ? 'socialPollMultiple' : poll.poll_type === 'yes_no' ? 'socialPollYesNo' : 'socialPollSingle';
  const closeText = poll.ends_at ? `${textFor('socialPollDurationLabel')}: ${escapeFriendHTML(new Date(poll.ends_at).toLocaleString(localeForLanguage()))}` : '';
  return `<form class="social-poll" data-poll-form="${postId}" data-poll-type="${poll.poll_type}"><b>${textFor(showResults ? 'socialPollResults' : pollLabelKey)}</b><div class="social-poll-options">${rows}</div><div class="social-poll-footer"><small>${textFor('socialPollVotes', { count: total })}${closeText ? ` · ${closeText}` : ''}${expired ? ` · ${textFor('socialPollExpired')}` : ''}</small>${!expired ? `<button type="submit">${textFor(myVotes.length ? 'socialPollUpdateVote' : 'socialPollVote')}</button>` : ''}</div></form>`;
}
document.querySelectorAll('[data-feed-filter]').forEach(button => button.addEventListener('click', async () => {
  socialFeedFilter = button.dataset.feedFilter;
  document.querySelectorAll('[data-feed-filter]').forEach(item => item.classList.toggle('active', item === button));
  await loadSocialFeed();
}));
document.querySelector('#refreshSocialFeed')?.addEventListener('click', async () => {
  cachedSocialFriendIds = null;
  await loadSocialFeed();
});
async function loadSocialGoalFriends() {
  const select = document.querySelector('#sharedGoalFriend');
  const groupSelect = document.querySelector('#socialGroupMembers');
  if ((!select && !groupSelect) || !currentUser) return;
  const { data, error } = await supabaseClient.rpc('get_friend_overview');
  if (error) { if (select) select.innerHTML = `<option value="">${textFor('friendsLoadError')}</option>`; if (groupSelect) groupSelect.innerHTML = ''; return; }
  const friends = (data || []).filter(row => row.entry_type === 'friend');
  if (select) select.innerHTML = `<option value="">${textFor('chooseFriend')}</option>` + friends.map(friend => `<option value="${escapeFriendHTML(friend.user_id)}">${escapeFriendHTML(friend.username || friend.friend_tag || textFor('friend'))}</option>`).join('');
  if (groupSelect) groupSelect.innerHTML = friends.map(friend => `<option value="${escapeFriendHTML(friend.user_id)}">${escapeFriendHTML(friend.username || friend.friend_tag || textFor('friend'))}</option>`).join('');
}
async function loadMyGroups() {
  if (!currentUser) return;
  const { data, error } = await supabaseClient.rpc('get_my_social_groups_v17');
  const cards = document.querySelector('#socialGroupCards');
  const list = document.querySelector('#socialGroupList');
  const status = document.querySelector('#socialGroupsStatus');
  if (error) {
    if (cards) cards.innerHTML = `<p>${textFor('socialGroupError', { error: escapeFriendHTML(error.message) })}</p>`;
    if (list) list.innerHTML = '';
    if (status) status.textContent = textFor('socialGroupError', { error: error.message });
    return;
  }
  if (status) status.textContent = '';
  const groups = data || [];
  const empty = `<p>${textFor('socialNoGroups')}</p>`;
  const roleText = role => textFor(({ owner: 'socialGroupRoleOwner', admin: 'socialGroupRoleAdmin', moderator: 'socialGroupRoleModerator', member: 'socialGroupRoleMember' })[role] || 'socialGroupRoleMember');
  const canManage = group => ['owner', 'admin', 'moderator'].includes(group.member_role);
  if (cards) cards.innerHTML = groups.length ? groups.map(group => `<article class="card social-group-card"><div class="social-group-banner">${group.banner_url ? `<img src="${escapeFriendHTML(group.banner_url)}" alt="">` : ''}<span>${escapeFriendHTML(group.icon || '👥')}</span></div><h4>${escapeFriendHTML(group.group_name)}</h4><small class="social-group-owner">👑 ${escapeFriendHTML(group.creator_name)} · ${roleText(group.member_role)} · ${textFor('socialGroupMemberCount', { count: Number(group.member_count) || 0 })}</small>${group.description ? `<p>${escapeFriendHTML(group.description)}</p>` : ''}<button type="button" data-social-group-chat="${group.group_id}" data-social-group-name="${escapeFriendHTML(group.group_name)}" data-social-group-icon="${escapeFriendHTML(group.icon || '👥')}">${textFor('socialGroupChat')}</button>${canManage(group) ? `<button type="button" data-manage-social-group="${group.group_id}">${textFor('socialGroupManageButton')}</button>` : ''}${group.is_creator ? `<button type="button" class="danger-button" data-social-group-delete="${group.group_id}" data-social-group-name="${escapeFriendHTML(group.group_name)}">${textFor('socialGroupDelete')}</button>` : `<button type="button" data-social-group-leave="${group.group_id}" data-social-group-name="${escapeFriendHTML(group.group_name)}">${textFor('socialGroupLeave')}</button>`}</article>`).join('') : empty;
  if (list) list.innerHTML = groups.map(group => `<div class="social-group-list-item"><button type="button" class="social-group-chat-button ${Number(group.group_id) === Number(activeSocialGroupId) ? 'selected' : ''}" data-social-group-chat="${group.group_id}" data-social-group-name="${escapeFriendHTML(group.group_name)}" data-social-group-icon="${escapeFriendHTML(group.icon || '👥')}"><span>${escapeFriendHTML(group.icon || '👥')} ${escapeFriendHTML(group.group_name)}</span><small>${roleText(group.member_role)} · ${escapeFriendHTML(group.creator_name)}</small></button>${canManage(group) ? `<button type="button" class="social-group-mini-action" data-manage-social-group="${group.group_id}" aria-label="${escapeFriendHTML(textFor('socialGroupManageButton'))}">⚙</button>` : ''}${!group.is_creator ? `<button type="button" class="social-group-mini-action" data-social-group-leave="${group.group_id}" data-social-group-name="${escapeFriendHTML(group.group_name)}" aria-label="${escapeFriendHTML(textFor('socialGroupLeave'))}">↪</button>` : ''}</div>`).join('') || `<small>${textFor('socialNoGroups')}</small>`;
}

async function openSocialGroupManager(groupId) {
  const { data: groups, error: groupError } = await supabaseClient.rpc('get_my_social_groups_v17');
  const item = (groups || []).find(row => Number(row.group_id) === Number(groupId));
  const dialog = document.querySelector('#socialGroupManageDlg');
  const status = document.querySelector('#socialGroupManageStatus');
  if (groupError || !item || !dialog) { if (status) status.textContent = groupError?.message || textFor('socialGroupError', { error: 'Group not found' }); return; }
  managingSocialGroup = item;
  document.querySelector('#managedSocialGroupId').value = String(item.group_id);
  document.querySelector('#managedSocialGroupName').value = item.group_name;
  document.querySelector('#managedSocialGroupDescription').value = item.description || '';
  document.querySelector('#managedSocialGroupIcon').value = item.icon || '👥';
  document.querySelector('#managedSocialGroupBanner').value = item.banner_url || '';
  document.querySelector('#socialGroupInviteLink').value = '';
  document.querySelector('#socialGroupInviteLink').hidden = true;
  document.querySelector('#copySocialGroupInvite').hidden = true;
  document.querySelector('#socialGroupInviteStatus').textContent = '';
  status.textContent = '';
  const { data: members, error } = await supabaseClient.rpc('get_social_group_members_v17', { p_group_id: Number(groupId) });
  const membersEl = document.querySelector('#socialGroupMembersManage');
  if (membersEl) membersEl.innerHTML = `<h3>${textFor('socialGroupMembersManage')}</h3>` + (error ? `<p>${escapeFriendHTML(error.message)}</p>` : (members || []).map(member => {
    const canEditRole = item.is_creator || (item.member_role === 'admin' && !['owner', 'admin'].includes(member.member_role));
    const options = ['member', 'moderator', ...(item.is_creator ? ['admin'] : [])];
    return `<div class="social-group-member-role"><span>${escapeFriendHTML(member.username)}${member.is_me ? ` · ${textFor('leaderboardYou')}` : ''}</span><span>${textFor(({ owner: 'socialGroupRoleOwner', admin: 'socialGroupRoleAdmin', moderator: 'socialGroupRoleModerator', member: 'socialGroupRoleMember' })[member.member_role])}</span>${canEditRole && member.member_role !== 'owner' ? `<select data-group-member-role="${escapeFriendHTML(member.user_id)}" data-group-id="${item.group_id}">${options.map(role => `<option value="${role}" ${role === member.member_role ? 'selected' : ''}>${textFor(({ admin: 'socialGroupRoleAdmin', moderator: 'socialGroupRoleModerator', member: 'socialGroupRoleMember' })[role])}</option>`).join('')}</select>` : ''}</div>`;
  }).join(''));
  dialog.showModal();
}

document.querySelector('#socialGroupMembersManage')?.addEventListener('change', async event => {
  const select = event.target.closest('[data-group-member-role]'); if (!select) return;
  select.disabled = true;
  const { error } = await supabaseClient.rpc('set_social_group_member_role_v17', { p_group_id: Number(select.dataset.groupId), p_user_id: select.dataset.groupMemberRole, p_role: select.value });
  document.querySelector('#socialGroupManageStatus').textContent = error ? textFor('socialGroupRoleError', { error: error.message }) : textFor('socialGroupRoleSaved');
  select.disabled = false;
  if (!error) { document.querySelector('#socialGroupManageDlg').close(); await openSocialGroupManager(Number(select.dataset.groupId)); await loadMyGroups(); document.querySelector('#socialGroupManageStatus').textContent = textFor('socialGroupRoleSaved'); await loadSocialGroupMemberRoster(Number(select.dataset.groupId)); }
});
document.querySelector('#createSocialGroupInvite')?.addEventListener('click', async event => {
  if (!managingSocialGroup) return;
  const button = event.currentTarget, status = document.querySelector('#socialGroupInviteStatus');
  button.disabled = true; status.textContent = '';
  const { data, error } = await supabaseClient.rpc('create_social_group_invite_v18', { p_group_id: Number(managingSocialGroup.group_id), p_expiration_hours: Number(document.querySelector('#socialGroupInviteExpiry').value) });
  button.disabled = false;
  if (error) { status.textContent = textFor('groupInviteJoinError', { error: error.message }); return; }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.invite_token) { status.textContent = textFor('groupInviteJoinError', { error: textFor('groupInviteNoToken') }); return; }
  const url = new URL(window.location.href); url.searchParams.set('groupInvite', row.invite_token);
  const input = document.querySelector('#socialGroupInviteLink'); input.value = url.toString(); input.hidden = false;
  document.querySelector('#copySocialGroupInvite').hidden = false;
  status.textContent = textFor('groupInviteReady', { date: new Date(row.expires_at).toLocaleString(localeForLanguage()) });
});
document.querySelector('#copySocialGroupInvite')?.addEventListener('click', async () => {
  const input = document.querySelector('#socialGroupInviteLink');
  try { await navigator.clipboard.writeText(input.value); document.querySelector('#socialGroupInviteStatus').textContent = textFor('groupInviteCopied'); }
  catch { input.focus(); input.select(); document.querySelector('#socialGroupInviteStatus').textContent = textFor('groupInviteCopyManual'); }
});
document.querySelector('#socialGroupProfileForm')?.addEventListener('submit', async event => {
  event.preventDefault(); if (!managingSocialGroup) return;
  const button = event.submitter; if (button) button.disabled = true;
  const { error } = await supabaseClient.rpc('update_social_group_profile_v17', { p_group_id: Number(managingSocialGroup.group_id), p_name: document.querySelector('#managedSocialGroupName').value.trim(), p_description: document.querySelector('#managedSocialGroupDescription').value.trim(), p_icon: document.querySelector('#managedSocialGroupIcon').value.trim(), p_banner_url: document.querySelector('#managedSocialGroupBanner').value.trim() });
  if (button) button.disabled = false;
  const status = document.querySelector('#socialGroupManageStatus');
  if (error) { status.textContent = textFor('socialGroupProfileError', { error: error.message }); return; }
  status.textContent = textFor('socialGroupProfileSaved');
  await loadMyGroups();
  if (Number(activeSocialGroupId) === Number(managingSocialGroup.group_id)) { activeSocialGroupName = document.querySelector('#managedSocialGroupName').value.trim(); document.querySelector('#chatHeader').textContent = `${document.querySelector('#managedSocialGroupIcon').value.trim()} ${activeSocialGroupName}`; }
});
for (const id of ['closeSocialGroupManage', 'cancelSocialGroupManage']) document.querySelector(`#${id}`)?.addEventListener('click', () => document.querySelector('#socialGroupManageDlg').close());
document.querySelector('#socialGroupManageDlg')?.addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });

async function openSocialGroup(groupId, groupName, groupIcon = '👥') {
  activeSocialGroupId = Number(groupId);
  activeSocialGroupName = groupName || '';
  activeChatFriend = null;
  document.querySelectorAll('[data-social-group-chat]').forEach(button => button.classList.toggle('selected', Number(button.dataset.socialGroupChat) === activeSocialGroupId));
  document.querySelectorAll('.social-friend').forEach(button => button.classList.remove('selected'));
  document.querySelector('#chatHeader').textContent = `${groupIcon || '👥'} ${activeSocialGroupName}`;
  document.querySelector('#socialGroupMembersSidebar').hidden = false;
  document.querySelector('.social-layout')?.classList.add('group-chat-open');
  document.querySelector('#chatForm').hidden = false;
  document.querySelector('#groupGoalsPanel').hidden = false;
  document.querySelector('#socialGroupGoalDate').min = today();
  document.querySelector('#socialGroupGoalDate').value = today();
  document.querySelector('#socialStatus').textContent = '';
  await Promise.all([loadSocialGroupMessages(), loadSocialGroupGoals(), loadSocialGroupMemberRoster(groupId), loadSocialGroupActivity(groupId)]);
  document.querySelector('#chatMessageInput').focus();
}

async function loadSocialGroupMemberRoster(groupId = activeSocialGroupId) {
  const box = document.querySelector('#socialGroupMemberRoster');
  if (!box || !groupId || !currentUser) return;
  box.innerHTML = `<p>${textFor('socialGroupLoading')}</p>`;
  const { data, error } = await supabaseClient.rpc('get_social_group_members_v17', { p_group_id: Number(groupId) });
  if (error) { box.innerHTML = `<p>${escapeFriendHTML(error.message)}</p>`; return; }
  const roleKey = { owner: 'socialGroupRoleOwner', admin: 'socialGroupRoleAdmin', moderator: 'socialGroupRoleModerator', member: 'socialGroupRoleMember' };
  box.innerHTML = (data || []).map(member => `<article class="social-group-roster-member"><span class="social-group-roster-avatar">${member.member_role === 'owner' ? '👑' : member.member_role === 'admin' ? '🛡️' : '👤'}</span><span class="social-group-roster-name"><b>${escapeFriendHTML(member.username)}${member.is_me ? ` · ${textFor('leaderboardYou')}` : ''}</b><small>${textFor(roleKey[member.member_role] || 'socialGroupRoleMember')}</small></span></article>`).join('') || `<p>${textFor('socialNoGroups')}</p>`;
}

async function loadSocialGroupActivity(groupId = activeSocialGroupId) {
  const box = document.querySelector('#socialGroupActivityFeed'); if (!box || !groupId || !currentUser) return;
  const { data, error } = await supabaseClient.rpc('get_social_group_activity_v18', { p_group_id: Number(groupId) });
  if (error) { box.innerHTML = `<p>${escapeFriendHTML(error.message)}</p>`; return; }
  const templates = { message_sent: 'groupActivityMessage', goal_created: 'groupActivityGoalCreated', goal_completed: 'groupActivityGoalCompleted' };
  box.innerHTML = (data || []).map(item => `<article class="social-group-activity-item"><b>${escapeFriendHTML(textFor(templates[item.activity_type] || 'groupActivityMessage', { name: item.actor_name, title: item.summary }))}</b><small>${escapeFriendHTML(new Date(item.created_at).toLocaleString(localeForLanguage()))}</small></article>`).join('') || `<p>${textFor('groupActivityEmpty')}</p>`;
}

async function handlePendingGroupInvite() {
  if (handlePendingGroupInvite.running) return;
  let url; try { url = new URL(window.location.href); } catch { return; }
  let savedToken = ''; try { savedToken = localStorage.getItem('pendingSocialGroupInvite') || ''; } catch { }
  const token = (handlePendingGroupInvite.tokenOverride || url.searchParams.get('groupInvite') || savedToken || '').trim();
  handlePendingGroupInvite.tokenOverride = '';
  if (!token) return;
  if (!currentUser) { try { localStorage.setItem('pendingSocialGroupInvite', token); } catch { } if (!authDlg?.open) openAuth(); return; }
  handlePendingGroupInvite.running = true;
  try {
    const { data, error } = await supabaseClient.rpc('join_social_group_by_invite_v18', { p_token: token });
    if (error) { alert(textFor('groupInviteJoinError', { error: error.message })); return; }
    const group = Array.isArray(data) ? data[0] : data;
    if (url.searchParams.get('groupInvite') === token) { url.searchParams.delete('groupInvite'); try { history.replaceState({}, '', url.toString()); } catch { } }
    try { if (localStorage.getItem('pendingSocialGroupInvite') === token) localStorage.removeItem('pendingSocialGroupInvite'); } catch { }
    await loadMyGroups();
    tab('social');
    await loadSocialPage();
    alert(textFor('groupInviteJoined', { name: group?.group_name || textFor('socialGroupsTitle') }));
  } catch (error) { alert(textFor('groupInviteJoinError', { error: error?.message || String(error) })); }
  finally { handlePendingGroupInvite.running = false; }
}

function renderChatBodyWithGroupInvites(value) {
  const text = String(value || ''), urlPattern = /(?:https?:\/\/|file:\/\/\/)[^\s<>"']+/gi;
  let html = '', cursor = 0, match;
  while ((match = urlPattern.exec(text))) {
    const raw = match[0], candidate = raw.replace(/[),.!?]+$/, ''), suffix = raw.slice(candidate.length);
    html += escapeFriendHTML(text.slice(cursor, match.index));
    let inviteToken = ''; try { inviteToken = new URL(candidate).searchParams.get('groupInvite') || ''; } catch { }
    html += inviteToken ? `<a href="#" class="group-invite-chat-link" data-group-invite-token="${escapeFriendHTML(inviteToken)}">${escapeFriendHTML(candidate)}</a>` : escapeFriendHTML(candidate);
    html += escapeFriendHTML(suffix); cursor = match.index + raw.length;
  }
  return html + escapeFriendHTML(text.slice(cursor));
}

async function loadSocialGroupMessages() {
  if (!activeSocialGroupId || !currentUser) return;
  const box = document.querySelector('#chatMessages');
  box.innerHTML = `<p>${textFor('socialLoadingMessages')}</p>`;
  const { data, error } = await supabaseClient.rpc('get_social_group_messages', { p_group_id: activeSocialGroupId });
  if (error) { box.innerHTML = `<p>${escapeFriendHTML(error.message)}</p>`; return; }
  box.innerHTML = (data || []).map(message => {
    const mine = message.sender_id === currentUser.id;
    const time = new Date(message.created_at).toLocaleString(localeForLanguage(), { dateStyle: 'short', timeStyle: 'short' });
    const reportButton = mine ? '' : `<button type="button" class="report-message-button" data-report-group-message="${message.message_id}" ${message.reported_by_me ? 'disabled' : ''}>${textFor(message.reported_by_me ? 'reportSentButton' : 'socialReportGroupMessage')}</button>`;
    return `<div class="chat-bubble ${mine ? 'mine' : ''}" data-group-message="${message.message_id}">${mine ? '' : `<b class="group-message-sender">${escapeFriendHTML(message.sender_name)}</b>`}<p>${renderChatBodyWithGroupInvites(message.body)}</p><small>${escapeFriendHTML(time)}</small>${reportButton}</div>`;
  }).join('') || `<p class="chat-empty">${textFor('socialNoMessages')}</p>`;
  box.scrollTop = box.scrollHeight;
}

document.addEventListener('click', async event => {
  const inviteLink = event.target.closest('[data-group-invite-token]');
  if (inviteLink) { event.preventDefault(); handlePendingGroupInvite.tokenOverride = inviteLink.dataset.groupInviteToken; await handlePendingGroupInvite(); return; }
  const manageGroup = event.target.closest('[data-manage-social-group]');
  if (manageGroup) { await openSocialGroupManager(Number(manageGroup.dataset.manageSocialGroup)); return; }
  const deleteGroup = event.target.closest('[data-social-group-delete]');
  const leaveGroup = event.target.closest('[data-social-group-leave]');
  if (deleteGroup || leaveGroup) {
    const action = deleteGroup ? 'delete' : 'leave';
    const button = deleteGroup || leaveGroup;
    const groupId = Number(button.dataset.socialGroupDelete || button.dataset.socialGroupLeave);
    const groupName = button.dataset.socialGroupName || '';
    const confirmKey = action === 'delete' ? 'socialGroupDeleteConfirm' : 'socialGroupLeaveConfirm';
    if (!confirm(textFor(confirmKey, { name: groupName }))) return;
    button.disabled = true;
    const { error } = await supabaseClient.rpc(action === 'delete' ? 'delete_social_group' : 'leave_social_group', { p_group_id: groupId });
    button.disabled = false;
    const status = document.querySelector('#socialGroupsStatus');
    if (error) { if (status) status.textContent = textFor('socialGroupError', { error: error.message }); return; }
    if (Number(activeSocialGroupId) === groupId) {
      activeSocialGroupId = null; activeSocialGroupName = ''; activeChatFriend = null;
      document.querySelector('#chatHeader').textContent = textFor('socialGroupChoose');
      document.querySelector('#chatMessages').innerHTML = '';
      document.querySelector('#chatForm').hidden = true;
      document.querySelector('#groupGoalsPanel').hidden = true;
      document.querySelector('#socialGroupMembersSidebar').hidden = true;
      document.querySelector('.social-layout')?.classList.remove('group-chat-open');
    }
    await loadMyGroups();
    if (status) status.textContent = textFor(action === 'delete' ? 'socialGroupDeleted' : 'socialGroupLeft');
    return;
  }
  const button = event.target.closest('[data-social-group-chat]');
  if (!button || !currentUser) return;
  const dialog = document.querySelector('#socialDlg');
  if (!dialog.open) {
    dialog.showModal();
    await Promise.all([loadSocialFriends(), loadMyGroups()]);
  }
  await openSocialGroup(button.dataset.socialGroupChat, button.dataset.socialGroupName, button.dataset.socialGroupIcon);
});

document.querySelector('#createSocialGroupForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!currentUser) { alert(textFor('loginToContinue')); return; }
  const status = document.querySelector('#socialGroupsStatus'), button = event.submitter;
  const selected = [...document.querySelector('#socialGroupMembers').selectedOptions].map(option => option.value);
  if (!selected.length) { status.textContent = textFor('socialGroupMembersHint'); return; }
  if (button) button.disabled = true;
  const { error } = await supabaseClient.rpc('create_social_group', { p_name: document.querySelector('#socialGroupName').value.trim(), p_member_ids: selected });
  if (button) button.disabled = false;
  status.textContent = error ? textFor('socialGroupError', { error: error.message }) : textFor('socialGroupCreated');
  if (!error) {
    event.currentTarget.reset();
    await loadMyGroups();
  }
});

document.querySelector('#socialGroupGoalForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!activeSocialGroupId) return;
  const status = document.querySelector('#socialGroupGoalStatus');
  const { error } = await supabaseClient.rpc('create_social_group_goal', {
    p_group_id: activeSocialGroupId,
    p_title: document.querySelector('#socialGroupGoalName').value.trim(),
    p_description: document.querySelector('#socialGroupGoalDescription').value.trim(),
    p_target_count: Number(document.querySelector('#socialGroupGoalTarget').value),
    p_target_date: document.querySelector('#socialGroupGoalDate').value
  });
  status.textContent = error ? error.message : textFor('socialGroupGoalCreated');
  if (!error) { event.currentTarget.reset(); document.querySelector('#socialGroupGoalTarget').value = '10'; document.querySelector('#socialGroupGoalDate').value = today(); await loadSocialGroupGoals(); }
});

document.querySelector('#socialGroupGoalsList')?.addEventListener('click', async event => {
  const button = event.target.closest('[data-social-group-goal-checkin]');
  if (!button) return;
  const { error } = await supabaseClient.rpc('advance_social_group_goal', { p_goal_id: Number(button.dataset.socialGroupGoalCheckin), p_amount: 1 });
  document.querySelector('#socialGroupGoalStatus').textContent = error?.message || '';
  if (!error) await loadSocialGroupGoals();
});

async function loadSocialGroupGoals() {
  if (!activeSocialGroupId) return;
  const list = document.querySelector('#socialGroupGoalsList');
  const { data, error } = await supabaseClient.rpc('get_social_group_goals', { p_group_id: activeSocialGroupId });
  if (error) { list.innerHTML = `<p>${escapeFriendHTML(error.message)}</p>`; return; }
  list.innerHTML = (data || []).map(goal => {
    const total = Number(goal.total_progress) || 0, percent = Math.min(100, Math.round(total / Number(goal.target_count) * 100));
    const date = new Date(`${goal.target_date}T12:00:00`).toLocaleDateString(localeForLanguage());
    return `<article class="card social-group-goal-card"><h4>${escapeFriendHTML(goal.title)}</h4>${goal.description ? `<p>${escapeFriendHTML(goal.description)}</p>` : ''}<small>${escapeFriendHTML(goal.creator_name)} · ${total}/${goal.target_count} · ${escapeFriendHTML(date)}</small><div class="goal-progress"><span style="width:${percent}%"></span></div>${goal.status === 'active' ? `<button type="button" data-social-group-goal-checkin="${goal.goal_id}">${textFor('socialGroupCheckin')}</button>` : `<small>✓ ${textFor('goalCompleted')}</small>`}</article>`;
  }).join('') || `<p>${textFor('socialNoGroupGoals')}</p>`;
}

async function loadSharedGoals() {
  const box = document.querySelector('#sharedGoalsList');
  if (!currentUser) { box.innerHTML = `<p>${textFor('loginToContinue')}</p>`; return; }
  const { data, error } = await supabaseClient.rpc('get_shared_goals');
  if (error) { box.innerHTML = `<p>${escapeFriendHTML(error.message)}</p>`; return; }
  box.innerHTML = (data || []).map(goal => {
    const mine = goal.creator_id === currentUser.id, total = Number(goal.creator_progress) + Number(goal.partner_progress);
    const peer = mine ? goal.partner_name : goal.creator_name;
    const actions = goal.status === 'pending' && !mine
      ? `<button data-goal-respond="${goal.goal_id}" data-accept="true">${textFor('acceptGoal')}</button><button data-goal-respond="${goal.goal_id}" data-accept="false">${textFor('declineGoal')}</button>`
      : goal.status === 'active' ? `<button data-goal-checkin="${goal.goal_id}">+1 ${textFor('goalCheckin')}</button>` : '';
    const statusKey = ({ pending: 'goalPending', active: 'goalActive', completed: 'goalCompleted', declined: 'goalDeclined' })[goal.status] || 'goalPending';
    const targetDate = new Date(`${goal.target_date}T12:00:00`).toLocaleDateString(localeForLanguage());
    return `<article class="card shared-goal-card"><h4>${escapeFriendHTML(goal.title)}</h4><p>${escapeFriendHTML(goal.description || '')}</p><small>${textFor('goalWith')} ${escapeFriendHTML(peer || '')} · ${textFor(statusKey)} · ${total}/${goal.target_count} · ${escapeFriendHTML(targetDate)}</small><div class="goal-progress"><span style="width:${Math.min(100, total / goal.target_count * 100)}%"></span></div>${actions}</article>`;
  }).join('') || `<p>${textFor('noSharedGoals')}</p>`;
}
document.querySelector('#socialPostContent')?.addEventListener('input', event => {
  document.querySelector('#socialPostCount').textContent = `${event.currentTarget.value.length}/1000`;
});
document.querySelector('#socialPollType')?.addEventListener('change', event => {
  const selected = event.currentTarget.value;
  document.querySelector('#socialPollOptionsWrap').hidden = !['single', 'multiple'].includes(selected);
  document.querySelector('#socialPollDurationWrap').hidden = selected === 'none';
});
document.querySelector('#socialPostForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const body = document.querySelector('#socialPostContent').value.trim();
  if (!await checkContentSpam(body, 'post')) return;
  const pollType = document.querySelector('#socialPollType').value;
  const status = document.querySelector('#socialFeedStatus');
  let result;
  if (pollType === 'none') result = await supabaseClient.rpc('create_social_post', { p_body: body });
  else {
    const options = ['single', 'multiple'].includes(pollType)
      ? document.querySelector('#socialPollOptions').value.split(/\r?\n/).map(option => option.trim()).filter(Boolean)
      : [];
    const normalized = options.map(option => option.toLocaleLowerCase(localeForLanguage()));
    if (pollType !== 'yes_no' && (options.length < 2 || options.length > 6 || new Set(normalized).size !== options.length)) {
      status.textContent = textFor('socialPollInvalidOptions'); return;
    }
    const duration = document.querySelector('#socialPollDuration').value;
    const endsAt = duration === '24h' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : duration === '7d' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null;
    result = await supabaseClient.rpc('create_social_poll_post', { p_body: body, p_poll_type: pollType, p_options: options, p_ends_at: endsAt });
  }
  const { error } = result;
  status.textContent = error ? error.message : textFor('postPublished');
  if (!error) {
    if (pollType !== 'none') status.textContent = textFor('socialPollCreated');
    event.currentTarget.reset(); document.querySelector('#socialPostCount').textContent = '0/1000';
    document.querySelector('#socialPollOptionsWrap').hidden = true; document.querySelector('#socialPollDurationWrap').hidden = true;
    await loadSocialFeed();
  }
});
document.querySelector('#sharedGoalForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.querySelector('#sharedGoalsStatus');
  const { error } = await supabaseClient.rpc('create_shared_goal', {
    p_friend_id: document.querySelector('#sharedGoalFriend').value,
    p_title: document.querySelector('#sharedGoalTitle').value.trim(),
    p_description: document.querySelector('#sharedGoalDescription').value.trim(),
    p_target_count: Number(document.querySelector('#sharedGoalTarget').value),
    p_target_date: document.querySelector('#sharedGoalDate').value
  });
  status.textContent = error ? error.message : textFor('goalInviteSent');
  if (!error) { event.currentTarget.reset(); document.querySelector('#sharedGoalTarget').value = '7'; await loadSharedGoals(); }
});
document.querySelector('#sharedGoalsList')?.addEventListener('click', async event => {
  const respond = event.target.closest('[data-goal-respond]'), checkin = event.target.closest('[data-goal-checkin]');
  let error;
  if (respond) ({ error } = await supabaseClient.rpc('respond_shared_goal', { p_goal_id: Number(respond.dataset.goalRespond), p_accept: respond.dataset.accept === 'true' }));
  if (checkin) ({ error } = await supabaseClient.rpc('advance_shared_goal', { p_goal_id: Number(checkin.dataset.goalCheckin), p_amount: 1 }));
  if (respond || checkin) { document.querySelector('#sharedGoalsStatus').textContent = error?.message || ''; await loadSharedGoals(); }
});

// Groups-Section öffnen und schließen
(() => {
  const button = document.querySelector('[data-act="openSocialGroups"]');
  const groups = document.querySelector('.social-groups-panel');

  if (!button || !groups) return;

  // Groups zunächst ausblenden
  groups.hidden = true;
  button.setAttribute('aria-expanded', 'false');

  button.addEventListener('click', () => {
    const isOpen = !groups.hidden;

    groups.hidden = isOpen;
    button.setAttribute('aria-expanded', String(!isOpen));

    if (!isOpen) {
      groups.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
})();


(() => {
  const button = document.getElementById('toggleSharedGoals');
  const content = document.getElementById('sharedGoalsContent');

  if (!button || !content) return;

  button.addEventListener('click', () => {
    const isExpanded = button.getAttribute('aria-expanded') === 'true';

    content.hidden = isExpanded;
    button.setAttribute('aria-expanded', String(!isExpanded));

    button.textContent = isExpanded
      ? 'Ausklappen ▼'
      : 'Einklappen ▲';
  });
})();

// Community Feed einklappen / ausklappen
(() => {
  const button = document.getElementById('toggleSocialFeed');
  const content = document.getElementById('socialFeedContent');

  if (!button || !content) return;

  button.addEventListener('click', () => {
    const isExpanded = button.getAttribute('aria-expanded') === 'true';

    content.hidden = isExpanded;
    button.setAttribute('aria-expanded', String(!isExpanded));
    button.textContent = isExpanded ? 'Ausklappen ▼' : 'Einklappen ▲';
  });
})();

document.querySelector('#socialFeed')?.addEventListener('click', async event => {
  const reply = event.target.closest('[data-comment-reply]');
  const cancelReply = event.target.closest('[data-cancel-comment-reply]');
  const editComment = event.target.closest('[data-comment-edit]');
  const deleteComment = event.target.closest('[data-comment-delete]');
  if (reply) {
    const section = reply.closest('.post-comments'), form = section?.querySelector('[data-comment-form]');
    if (!form) return;
    form.elements.parent_comment_id.value = reply.dataset.commentReply;
    const context = form.querySelector('.comment-reply-context');
    context.querySelector('span').textContent = textFor('commentReplyingTo', { name: reply.dataset.commentAuthor });
    context.hidden = false;
    form.elements.body.focus();
    return;
  }
  if (cancelReply) {
    const form = cancelReply.closest('form');
    form.elements.parent_comment_id.value = '';
    form.querySelector('.comment-reply-context').hidden = true;
    form.elements.body.focus();
    return;
  }
  if (editComment) {
    const body = prompt(textFor('commentEditPrompt'), editComment.dataset.commentBody);
    if (body == null || !body.trim()) return;
    const { error } = await supabaseClient.rpc('edit_my_social_post_comment', { p_comment_id: Number(editComment.dataset.commentEdit), p_body: body.trim() });
    if (error) { alert(error.message); return; }
    await loadSocialPostComments(editComment.closest('.post-comments'), editComment.closest('[data-social-post]').dataset.socialPost);
    return;
  }
  if (deleteComment) {
    if (!confirm(textFor('commentDeleteConfirm'))) return;
    const post = deleteComment.closest('[data-social-post]'), postId = post.dataset.socialPost;
    const { error } = await supabaseClient.rpc('delete_my_social_post_comment', { p_comment_id: Number(deleteComment.dataset.commentDelete) });
    if (error) { alert(error.message); return; }
    const section = post.querySelector('.post-comments');
    await loadSocialFeed();
    const updatedSection = document.querySelector(`[data-post-comments="${postId}"]`);
    if (updatedSection) { updatedSection.hidden = false; await loadSocialPostComments(updatedSection, postId); }
    return;
  }
  const report = event.target.closest('[data-report-social]');
  if (report) {
    if (!currentUser) { alert(textFor('loginToContinue')); return; }
    socialReportTarget = { type: report.dataset.reportSocial, id: report.dataset.targetId, userId: report.dataset.targetUser };
    document.querySelector('#socialReportForm').reset();
    document.querySelector('#socialReportStatus').textContent = '';
    document.querySelector('#socialReportDlg').showModal();
    return;
  }
  const follow = event.target.closest('[data-follow-user]');
  if (follow) {
    const { error } = await supabaseClient.rpc('toggle_social_user_follow', { p_user_id: follow.dataset.followUser });
    const status = document.querySelector('#socialFeedStatus');
    if (error) status.textContent = textFor('socialFollowError', { error: error.message });
    else { status.textContent = ''; await loadSocialFeed(); }
    return;
  }
  const profileButton = event.target.closest('[data-public-profile]');
  const savePost = event.target.closest('[data-save-post]');
  const like = event.target.closest('[data-like-post]'), comments = event.target.closest('[data-open-comments]'), remove = event.target.closest('[data-delete-post]');
  if (savePost) {
    const { error } = await supabaseClient.rpc('toggle_social_post_save', { p_post_id: Number(savePost.dataset.savePost) });
    if (error) document.querySelector('#socialFeedStatus').textContent = error.message;
    else await loadSocialFeed();
    return;
  }
  if (profileButton) {
    const { data, error } = await supabaseClient.rpc('get_public_profile', { p_user_id: profileButton.dataset.publicProfile });
    const p = data?.[0]; alert(error ? error.message : p ? `${p.username}\n${p.bio || ''}` : textFor('profileUnavailable')); return;
  }
  if (like) {
    const { error } = await supabaseClient.rpc('toggle_social_post_like', { p_post_id: Number(like.dataset.likePost) });
    if (error) alert(error.message); else await loadSocialFeed(); return;
  }
  if (comments) {
    const section = document.querySelector(`[data-post-comments="${comments.dataset.openComments}"]`);
    if (!section) return;
    section.hidden = !section.hidden;
    if (!section.hidden) await loadSocialPostComments(section, comments.dataset.openComments);
    return;
  }
  if (remove) {
    if (!confirm(textFor('postDeleteConfirm'))) return;
    const { error } = await supabaseClient.rpc('delete_my_social_post', { p_post_id: Number(remove.dataset.deletePost) });
    if (error) alert(error.message); else await loadSocialFeed();
  }
});
document.querySelector('#socialFeed')?.addEventListener('submit', async event => {
  const pollForm = event.target.closest('[data-poll-form]');
  if (!pollForm) return;
  event.preventDefault();
  const selected = [...pollForm.querySelectorAll('input:checked')].map(input => Number(input.value));
  const status = document.querySelector('#socialFeedStatus');
  if (!selected.length) { status.textContent = textFor('socialPollInvalidOptions'); return; }
  const submitButton = pollForm.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  const { error } = await supabaseClient.rpc('vote_social_post_poll', { p_post_id: Number(pollForm.dataset.pollForm), p_option_indices: selected });
  if (error) {
    status.textContent = textFor('socialPollVoteError', { error: error.message });
    if (submitButton) submitButton.disabled = false;
  } else {
    status.textContent = '';
    await loadSocialFeed();
  }
});
let socialReportTarget = null;
document.querySelector('#cancelSocialReport')?.addEventListener('click', () => document.querySelector('#socialReportDlg').close());
document.querySelector('#socialReportForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!currentUser || !socialReportTarget) return;
  const button = document.querySelector('#submitSocialReport');
  const status = document.querySelector('#socialReportStatus');
  button.disabled = true;
  status.textContent = textFor('reportSendBusy');
  const { data, error } = await supabaseClient.rpc('submit_social_content_report', {
    p_target_type: socialReportTarget.type,
    p_target_id: String(socialReportTarget.id),
    p_category: document.querySelector('#socialReportCategory').value,
    p_reason: document.querySelector('#socialReportReason').value.trim()
  });
  button.disabled = false;
  if (error) { status.textContent = textFor('reportFailure', { error: error.message }); return; }
  document.querySelectorAll(`[data-report-social][data-target-id="${CSS.escape(socialReportTarget.id)}"]`).forEach(item => {
    if (item.dataset.reportSocial === socialReportTarget.type) { item.textContent = textFor(socialReportTarget.type === 'profile' ? 'reportedProfile' : 'reportedPost'); item.disabled = true; }
  });
  status.textContent = textFor('reportSubmitted');
  socialReportTarget = null;
  setTimeout(() => document.querySelector('#socialReportDlg').close(), 1000);
});
document.querySelector('#socialFeed')?.addEventListener('submit', async event => {
  const form = event.target.closest('[data-comment-form]'); if (!form) return;
  event.preventDefault(); const input = form.elements.body;
  const postId = form.dataset.commentForm;
  if (!await checkContentSpam(input.value.trim(), 'comment')) return;
  const parentId = form.elements.parent_comment_id.value ? Number(form.elements.parent_comment_id.value) : null;
  const { error } = await supabaseClient.rpc('add_social_post_comment_v2', { p_post_id: Number(postId), p_body: input.value.trim(), p_parent_comment_id: parentId });
  if (error) { alert(error.message); return; }
  input.value = '';
  form.elements.parent_comment_id.value = '';
  form.querySelector('.comment-reply-context').hidden = true;
  await loadSocialFeed();
  const section = document.querySelector(`[data-post-comments="${postId}"]`);
  if (section) { section.hidden = false; await loadSocialPostComments(section, postId); }
});
let lastMessageNotificationCheck = Date.now();
async function checkNewMessageNotifications() {
  if (!currentUser || storage.getItem('messageNotificationsEnabled') !== 'true' || document.hidden) return;
  const since = new Date(lastMessageNotificationCheck).toISOString();
  lastMessageNotificationCheck = Date.now();
  const { data, error } = await supabaseClient.from('direct_messages').select('id,sender_id,created_at')
    .eq('recipient_id', currentUser.id).is('read_at', null).gt('created_at', since).limit(20);
  if (error || !data?.length || Notification.permission !== 'granted') return;
  new Notification(textFor('newMessagesTitle'), { body: textFor(data.length === 1 ? 'newMessageBody' : 'newMessagesBody', { count: data.length }), tag: 'consistly-new-messages' });
  const badge = document.querySelector('#unreadChatBadge');
  if (badge) { badge.hidden = false; badge.textContent = String(data.length); }
}
setInterval(checkNewMessageNotifications, 10000);

async function openSocialDialog() {
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) {
    alert(textFor('loginToContinue'));
    return;
  }

  activeChatFriend = null;
  activeSocialGroupId = null;
  activeSocialGroupName = '';
  document.querySelector('#socialGroupMembersSidebar').hidden = true;
  document.querySelector('.social-layout')?.classList.remove('group-chat-open');
  document.querySelector('#chatHeader').textContent = textFor('socialGroupChoose');
  document.querySelector('#chatMessages').innerHTML = '';
  document.querySelector('#chatForm').hidden = true;
  document.querySelector('#groupGoalsPanel').hidden = true;
  document.querySelector('#socialStatus').textContent = '';
  document.querySelector('#socialDlg').showModal();
  await Promise.all([loadSocialFriends(), loadMyGroups()]);
}

async function loadSocialFriends() {
  const list = document.querySelector('#socialFriendList');
  list.innerHTML = `<p>${textFor('socialLoadingFriends')}</p>`;
  const { data, error } = await supabaseClient.rpc('get_friend_overview');
  if (error) {
    list.innerHTML = `<p>${textFor('friendsLoadError')}</p>`;
    document.querySelector('#socialStatus').textContent = error.message;
    return;
  }

  const friends = (data || []).filter(row => row.entry_type === 'friend');
  await attachSocialTitles(friends);
  if (!friends.length) {
    list.innerHTML = `<p>${textFor('socialNoFriends')}</p>`;
    return;
  }

  list.innerHTML = friends.map(friend => {
    const label = friend.username || friend.friend_tag || textFor('friend');
    const avatar = friend.avatar_url
      ? `<img src="${escapeFriendHTML(friend.avatar_url)}" alt="" class="social-avatar ${avatarFrameClass(friend.equipped_avatar_frame)}">`
      : `<span class="social-avatar-emoji ${avatarFrameClass(friend.equipped_avatar_frame)}">${escapeFriendHTML(friend.avatar || '👤')}</span>`;
    return `<button type="button" class="social-friend" data-chat-user="${escapeFriendHTML(friend.user_id)}" data-chat-name="${escapeFriendHTML(label)}">${avatar}<span>${escapeFriendHTML(label)}${titleMarkup(friend.equipped_title)}</span></button>`;
  }).join('');
}

async function loadChatMessages() {
  if (!activeChatFriend || !currentUser) return;
  const chatBadge = document.querySelector('#unreadChatBadge');
  if (chatBadge) { chatBadge.hidden = true; chatBadge.textContent = ''; }
  const box = document.querySelector('#chatMessages');
  box.innerHTML = `<p>${textFor('socialLoadingMessages')}</p>`;
  const { error: readError } = await supabaseClient.rpc('mark_direct_messages_read', { p_sender_id: activeChatFriend.id });
  const socialStatus = document.querySelector('#socialStatus');
  if (readError) {
    console.warn('Lesebestätigung konnte nicht gespeichert werden:', readError.message);
    socialStatus.textContent = textFor('readReceiptError', { error: readError.message });
    socialStatus.dataset.readReceiptError = 'true';
  } else if (socialStatus.dataset.readReceiptError === 'true') {
    socialStatus.textContent = '';
    delete socialStatus.dataset.readReceiptError;
  }
  let { data, error } = await supabaseClient
    .from('direct_messages')
    .select('id, sender_id, recipient_id, body, created_at, read_at, edited_at, deleted_at')
    .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${activeChatFriend.id}),and(sender_id.eq.${activeChatFriend.id},recipient_id.eq.${currentUser.id})`)
    .order('created_at', { ascending: true })
    .limit(200);

  // Keep chat readable before the read-receipt migration is applied.
  if (error && /read_at|column/i.test(error.message)) {
    socialStatus.textContent = textFor('readReceiptsNeedMigration');
    socialStatus.dataset.readReceiptError = 'true';
    const fallback = await supabaseClient
      .from('direct_messages')
      .select('id, sender_id, recipient_id, body, created_at')
      .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${activeChatFriend.id}),and(sender_id.eq.${activeChatFriend.id},recipient_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true })
      .limit(200);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    box.innerHTML = `<p>${textFor('socialLoadError')}</p>`;
    document.querySelector('#socialStatus').textContent = error.message;
    return;
  }
  box.innerHTML = (data || []).map(message => {
    const mine = message.sender_id === currentUser.id;
    const time = new Date(message.created_at).toLocaleString(localeForLanguage(), { dateStyle: 'short', timeStyle: 'short' });
    const delivery = mine ? (message.read_at ? textFor('messageRead') : textFor('messageSent')) : escapeFriendHTML(activeChatFriend.name);
    const content = message.deleted_at ? `<em>${textFor('messageDeleted')}</em>` : renderChatBodyWithGroupInvites(message.body);
    const mineActions = mine && !message.deleted_at ? `<div class="chat-message-actions"><button type="button" data-edit-message="${message.id}" data-message-body="${escapeFriendHTML(message.body)}">${textFor('editMessage')}</button><button type="button" data-delete-message="${message.id}">${textFor('deleteMessage')}</button></div>` : '';
    const reactions = `<div class="message-reactions"><span class="reaction-list" data-reaction-list="${message.id}"></span><span class="reaction-buttons">${['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '✨'].map(emoji => `<button type="button" data-react-message="${message.id}" data-reaction-emoji="${emoji}" aria-label="${emoji}">${emoji}</button>`).join('')}</span></div>`;
    return `<div class="chat-bubble ${mine ? 'mine' : ''} ${message.deleted_at ? 'deleted-message' : ''}"><p>${content}</p><small class="message-delivery ${mine && message.read_at ? 'read' : ''}">${delivery}${message.edited_at ? ` · ${textFor('messageEdited')}` : ''} · ${escapeFriendHTML(time)}</small>${mineActions}${reactions}${mine ? '' : `<button type="button" class="report-message-button" data-report-message="${message.id}">${textFor('reportMessageButton')}</button>`}</div>`;
  }).join('') || `<p class="chat-empty">${textFor('socialNoMessages')}</p>`;
  const ids = (data || []).map(message => message.id);
  if (ids.length) {
    const { data: reactionRows } = await supabaseClient.rpc('get_direct_message_reactions', { p_message_ids: ids });
    for (const reaction of reactionRows || []) {
      const list = box.querySelector(`[data-reaction-list="${reaction.message_id}"]`);
      if (list) list.insertAdjacentHTML('beforeend', `<button type="button" class="reaction-chip ${reaction.reacted_by_me ? 'reacted' : ''}" data-react-message="${reaction.message_id}" data-reaction-emoji="${reaction.emoji}">${reaction.emoji} ${reaction.reaction_count}</button>`);
    }
  }
  box.scrollTop = box.scrollHeight;
}

document.querySelector('#chatMessages')?.addEventListener('click', async event => {
  const edit = event.target.closest('[data-edit-message]'), remove = event.target.closest('[data-delete-message]'), react = event.target.closest('[data-react-message]');
  let error;
  if (edit) {
    const body = prompt(textFor('editMessagePrompt'), edit.dataset.messageBody);
    if (body == null || !body.trim()) return;
    ({ error } = await supabaseClient.rpc('edit_my_direct_message', { p_message_id: Number(edit.dataset.editMessage), p_body: body.trim() }));
  } else if (remove) {
    if (!confirm(textFor('deleteMessageConfirm'))) return;
    ({ error } = await supabaseClient.rpc('delete_my_direct_message', { p_message_id: Number(remove.dataset.deleteMessage) }));
  } else if (react) {
    ({ error } = await supabaseClient.rpc('toggle_direct_message_reaction', { p_message_id: Number(react.dataset.reactMessage), p_emoji: react.dataset.reactionEmoji }));
  } else return;
  if (error) document.querySelector('#socialStatus').textContent = error.message;
  else await loadChatMessages();
});

document.querySelector('#socialFriendList')?.addEventListener('click', async event => {
  const button = event.target.closest('[data-chat-user]');
  if (!button) return;
  activeSocialGroupId = null;
  activeSocialGroupName = '';
  document.querySelector('#groupGoalsPanel').hidden = true;
  document.querySelector('#socialGroupGoalStatus').textContent = '';
  activeChatFriend = { id: button.dataset.chatUser, name: button.dataset.chatName };
  document.querySelectorAll('.social-friend').forEach(item => item.classList.toggle('selected', item === button));
  document.querySelector('#chatHeader').textContent = `${textFor('chatWith')} ${activeChatFriend.name}`;
  document.querySelector('#chatForm').hidden = false;
  await loadChatMessages();
  document.querySelector('#chatMessageInput').focus();
});

document.querySelector('#chatForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const input = document.querySelector('#chatMessageInput');
  const body = input.value.trim();
  if (!body || (!activeChatFriend && !activeSocialGroupId) || !currentUser) return;
  if (!await checkContentSpam(body, activeSocialGroupId ? 'group_message' : 'direct_message')) return;
  const submit = event.submitter;
  if (submit) submit.disabled = true;
  const { error } = activeSocialGroupId
    ? await supabaseClient.rpc('send_social_group_message', { p_group_id: activeSocialGroupId, p_body: body })
    : await supabaseClient.from('direct_messages').insert({ sender_id: currentUser.id, recipient_id: activeChatFriend.id, body });
  if (submit) submit.disabled = false;
  if (error) {
    document.querySelector('#socialStatus').textContent = `${textFor('messageSending')} ${error.message}`;
    return;
  }
  input.value = '';
  document.querySelector('#socialStatus').textContent = '';
  if (activeSocialGroupId) await loadSocialGroupMessages(); else await loadChatMessages();
});

let reportingMessageId = null;
let reportingSocialGroupMessageId = null;
document.querySelector('#chatMessages')?.addEventListener('click', event => {
  const button = event.target.closest('[data-report-message]');
  const groupButton = event.target.closest('[data-report-group-message]');
  if ((!button && !groupButton) || !currentUser) return;
  reportingMessageId = button ? Number(button.dataset.reportMessage) : null;
  reportingSocialGroupMessageId = groupButton ? Number(groupButton.dataset.reportGroupMessage) : null;
  document.querySelector('#reportForm').reset();
  document.querySelector('#reportStatus').textContent = '';
  document.querySelector('#reportDlg').showModal();
});

document.querySelector('#cancelReport')?.addEventListener('click', () => document.querySelector('#reportDlg').close());
document.querySelector('#reportForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  if ((!reportingMessageId && !reportingSocialGroupMessageId) || !currentUser) return;
  const submit = document.querySelector('#submitReport');
  const status = document.querySelector('#reportStatus');
  submit.disabled = true;
  status.textContent = textFor('reportSendBusy');
  const reportArgs = { p_category: document.querySelector('#reportCategory').value, p_reason: document.querySelector('#reportReason').value.trim() };
  const { error } = reportingSocialGroupMessageId
    ? await supabaseClient.rpc('submit_social_group_message_report', { ...reportArgs, p_message_id: reportingSocialGroupMessageId })
    : await supabaseClient.rpc('submit_chat_report', { ...reportArgs, p_message_id: reportingMessageId });
  submit.disabled = false;
  if (error) {
    status.textContent = textFor('reportFailure', { error: error.message });
    return;
  }
  const submittedMessageId = reportingSocialGroupMessageId || reportingMessageId;
  document.querySelectorAll(`[data-report-message="${submittedMessageId}"],[data-report-group-message="${submittedMessageId}"]`).forEach(button => {
    button.textContent = textFor('reportSentButton');
    button.disabled = true;
  });
  status.textContent = textFor('reportSubmitted');
  reportingMessageId = null;
  reportingSocialGroupMessageId = null;
  setTimeout(() => document.querySelector('#reportDlg').close(), 900);
});

async function updateModerationAccess(isSignedIn) {
  const panel = document.querySelector('#moderationPanel');
  if (!panel) return;
  panel.hidden = true;
  if (!isSignedIn) return;
  const { data, error } = await supabaseClient.rpc('is_app_admin');
  if (error || data !== true) return;
  panel.hidden = false;
  await loadAdminReports();
  await loadActiveRestrictions();
  await loadAdminAppealsAndSpam();
}

async function loadAdminAppealsAndSpam() {
  if (document.querySelector('#moderationPanel')?.hidden) return;
  const appealsEl = document.querySelector('#moderationAppeals');
  const spamEl = document.querySelector('#automatedSpamEvents');
  const [{ data: appeals, error: appealError }, { data: detections, error: spamError }] = await Promise.all([
    supabaseClient.rpc('get_admin_moderation_appeals'), supabaseClient.rpc('get_admin_automated_spam_detections')
  ]);
  if (appealsEl) appealsEl.innerHTML = appealError ? `<p>${escapeFriendHTML(appealError.message)}</p>` : (appeals || []).map(item => `
<article class="card moderation-appeal-card"><b>${escapeFriendHTML(item.username)} · ${textFor(item.action === 'warn' ? 'warning' : item.action)}</b>
  <p>${escapeFriendHTML(item.reason)}</p><small>${escapeFriendHTML(new Date(item.created_at).toLocaleString(localeForLanguage()))} · ${textFor(item.status === 'open' ? 'appealOpen' : item.status === 'accepted' ? 'appealAccepted' : 'appealRejected')}</small>
  ${item.status === 'open' ? `<textarea data-appeal-response="${item.id}" maxlength="1000" placeholder="${textFor('appealResponsePlaceholder')}"></textarea><div class="moderation-appeal-actions"><button type="button" data-review-appeal="accepted" data-appeal-id="${item.id}">${textFor('appealAccept')}</button><button type="button" data-review-appeal="rejected" data-appeal-id="${item.id}">${textFor('appealReject')}</button></div>` : `<p><b>${textFor('appealResponse')}:</b> ${escapeFriendHTML(item.response)}</p>`}
</article>`).join('') || `<p>${textFor('noModerationHistory')}</p>`;
  if (spamEl) spamEl.innerHTML = spamError ? `<p>${escapeFriendHTML(spamError.message)}</p>` : (detections || []).map(item => `
<article class="card spam-detection-card"><b>${escapeFriendHTML(item.username || 'Account deleted')} · ${escapeFriendHTML(item.channel)} · ${escapeFriendHTML(item.reason)}</b>
  <p>${escapeFriendHTML(item.content)}</p><small>${escapeFriendHTML(new Date(item.created_at).toLocaleString(localeForLanguage()))} · ${escapeFriendHTML(item.status)}</small>
  ${item.status === 'open' ? `<div class="moderation-appeal-actions"><button type="button" data-spam-status="confirmed" data-spam-id="${item.id}">${textFor('spamConfirmed')}</button><button type="button" data-spam-status="dismissed" data-spam-id="${item.id}">${textFor('spamDismissed')}</button></div>` : ''}</article>`).join('') || `<p>${textFor('spamEmpty')}</p>`;
}

async function loadMyReportHistory() {
  const el = document.querySelector('#myReportHistory'); if (!el || !currentUser) return;
  const { data, error } = await supabaseClient.rpc('get_my_report_history');
  if (error) { el.innerHTML = `<p>${textFor('reportHistoryError')}</p>`; return; }
  el.innerHTML = data?.length ? data.map(r => `<article class="card my-report-card"><b>${escapeFriendHTML(r.target_username)} · ${escapeFriendHTML(r.category)}</b><p>${escapeFriendHTML(r.reason)}</p><small>${textFor('reportStatus', { status: escapeFriendHTML(r.status) })} · ${escapeFriendHTML(new Date(r.created_at).toLocaleString(localeForLanguage()))}</small>${r.decision_action ? `<p><b>${textFor('reportDecision')}:</b> ${escapeFriendHTML(r.decision_action)} — ${escapeFriendHTML(r.decision_note || '')}</p>` : `<p>${textFor('reportPending')}</p>`}</article>`).join('') : `<p>${textFor('noReportHistory')}</p>`;
}

async function loadMyModerationActionHistory() {
  const el = document.querySelector('#myModerationHistory'); if (!el || !currentUser) return;
  const { data, error } = await supabaseClient.rpc('get_my_moderation_action_history_v16');
  if (error) { el.innerHTML = `<p>${textFor('moderationHistoryError')}</p>`; return; }
  el.innerHTML = data?.length ? data.map(a => `<article class="card moderation-appeal-card"><b>${escapeFriendHTML(a.action)} · ${escapeFriendHTML(new Date(a.created_at).toLocaleString(localeForLanguage()))}</b><p>${escapeFriendHTML(a.note)}</p>${a.appeal_id ? `<p>${textFor(a.appeal_status === 'open' ? 'appealPending' : a.appeal_status === 'accepted' ? 'appealAccepted' : 'appealRejected')}</p>${a.appeal_response ? `<p><b>${textFor('appealResponse')}:</b> ${escapeFriendHTML(a.appeal_response)}</p>` : ''}` : `<form data-submit-appeal="${a.action_id}"><textarea name="reason" minlength="10" maxlength="1000" required placeholder="${textFor('appealReason')}"></textarea><button type="submit">${textFor('appealSubmit')}</button></form>`}</article>`).join('') : `<p>${textFor('noModerationHistory')}</p>`;
}

document.querySelector('#myModerationHistory')?.addEventListener('submit', async event => {
  const form = event.target.closest('[data-submit-appeal]'); if (!form) return; event.preventDefault();
  const { error } = await supabaseClient.rpc('submit_moderation_appeal', { p_action_id: Number(form.dataset.submitAppeal), p_reason: form.elements.reason.value.trim() });
  if (error) { alert(textFor('appealError', { error: error.message })); return; }
  alert(textFor('appealSent')); await loadMyModerationActionHistory();
});
document.querySelector('#moderationAppeals')?.addEventListener('click', async event => {
  const button = event.target.closest('[data-review-appeal]'); if (!button) return;
  const response = document.querySelector(`[data-appeal-response="${button.dataset.appealId}"]`)?.value.trim() || '';
  if (response.length < 3) { alert(textFor('appealResponsePlaceholder')); return; }
  button.disabled = true;
  const { error } = await supabaseClient.rpc('review_moderation_appeal', { p_appeal_id: Number(button.dataset.appealId), p_decision: button.dataset.reviewAppeal, p_response: response });
  if (error) { button.disabled = false; document.querySelector('#moderationStatus').textContent = error.message; return; }
  document.querySelector('#moderationStatus').textContent = textFor('appealReviewed');
  await loadAdminAppealsAndSpam(); await loadActiveRestrictions();
});
document.querySelector('#automatedSpamEvents')?.addEventListener('click', async event => {
  const button = event.target.closest('[data-spam-status]'); if (!button) return; button.disabled = true;
  const { error } = await supabaseClient.rpc('set_automated_spam_detection_status', { p_detection_id: Number(button.dataset.spamId), p_status: button.dataset.spamStatus });
  if (error) { button.disabled = false; document.querySelector('#moderationStatus').textContent = textFor('spamReviewError', { error: error.message }); return; }
  await loadAdminAppealsAndSpam();
});

async function loadAdminReports() {
  const list = document.querySelector('#moderationReports');
  const status = document.querySelector('#moderationStatus');
  if (!list || document.querySelector('#moderationPanel')?.hidden) return;
  status.textContent = textFor('adminLoading');
  const [{ data, error }, { data: socialData, error: socialError }] = await Promise.all([
    supabaseClient.rpc('get_admin_chat_reports'),
    supabaseClient.rpc('get_admin_social_content_reports')
  ]);
  if (error) {
    status.textContent = textFor('adminLoadError', { error: error.message });
    return;
  }
  if (socialError) console.warn('Social-Meldungen konnten nicht geladen werden:', socialError.message);
  const reports = [...(data || []).map(report => ({ ...report, source: 'chat', target_type: 'message' })), ...(socialData || []).map(report => ({ ...report, source: 'social' }))]
    .sort((a, b) => Number(b.status === 'open') - Number(a.status === 'open') || new Date(b.created_at) - new Date(a.created_at));
  status.textContent = reports.filter(report => report.status === 'open').length
    ? textFor('adminReportCount', { count: reports.filter(report => report.status === 'open').length })
    : textFor('adminNoOpen');
  list.innerHTML = reports.length ? reports.map(report => `
<article class="card moderation-report">
  <div class="moderation-report-heading"><b>${report.source === 'social' ? textFor(report.target_type === 'profile' ? 'profileReport' : 'postReport') : textFor('messageReport')} #${report.id}</b><span class="report-status status-${escapeFriendHTML(report.status)}">${escapeFriendHTML(report.status)}</span></div>
  <p><b>${textFor('reportedBy')}</b> ${escapeFriendHTML(report.reporter_username || 'Gelöschter Account')}</p>
  <p><b>${textFor('reportedUser')}</b> ${escapeFriendHTML(report.reported_username || 'Gelöschter Account')}</p>
  <p><b>${textFor('categoryLabel')}</b> ${escapeFriendHTML(textFor(`cat${report.category[0].toUpperCase()}${report.category.slice(1)}`) || report.category_label || report.category)}</p>
  <p><b>${textFor('descriptionLabel')}</b> ${escapeFriendHTML(report.reason)}</p>
  <blockquote>${escapeFriendHTML(report.message_text || report.content_snapshot || textFor('reportedContentUnavailable'))}</blockquote>
  <small>${escapeFriendHTML(new Date(report.created_at).toLocaleString())}</small>
  ${report.reported_user_id ? `<label for="moderationNote-${report.source}-${report.id}">${textFor('adminNote')}</label>
  <textarea id="moderationNote-${report.source}-${report.id}" data-moderation-note="${report.source}:${report.id}" maxlength="500" rows="2" placeholder="${textFor('adminNotePlaceholder')}"></textarea>` : `<p>${textFor('reportDeletedUser')}</p>`}
  <div class="moderation-report-actions">
    ${report.status === 'open' ? `<button type="button" data-report-status="reviewing" data-report-source="${report.source}" data-report-id="${report.id}">${textFor('reviewStatus')}</button>` : ''}
    ${report.status !== 'closed' ? `<button type="button" data-report-status="closed" data-report-source="${report.source}" data-report-id="${report.id}">${textFor('closeReport')}</button>` : ''}
    ${report.status !== 'open' ? `<button type="button" data-report-status="open" data-report-source="${report.source}" data-report-id="${report.id}">${textFor('reopenReport')}</button>` : ''}
    ${report.reported_user_id ? `<button type="button" data-moderation-action="warn" data-report-source="${report.source}" data-report-id="${report.id}" data-target-user="${report.reported_user_id}">${textFor('warnUser')}</button>
    <button type="button" data-moderation-action="timeout24" data-report-source="${report.source}" data-report-id="${report.id}" data-target-user="${report.reported_user_id}">${textFor('timeout24')}</button>
    <button type="button" data-moderation-action="timeout7" data-report-source="${report.source}" data-report-id="${report.id}" data-target-user="${report.reported_user_id}">${textFor('timeout7')}</button>
    <button type="button" data-moderation-action="ban" data-report-source="${report.source}" data-report-id="${report.id}" data-target-user="${report.reported_user_id}">${textFor('permanentBan')}</button>
    <button type="button" data-moderation-action="unban" data-report-source="${report.source}" data-report-id="${report.id}" data-target-user="${report.reported_user_id}">${textFor('liftBan')}</button>` : ''}
  </div>
</article>`).join('') : `<p>${textFor('adminNoReports')}</p>`;
}

async function loadActiveRestrictions() {
  const container = document.querySelector('#activeRestrictions');
  if (!container || document.querySelector('#moderationPanel')?.hidden) return;
  const { data, error } = await supabaseClient.rpc('get_active_user_restrictions');
  if (error) {
    container.innerHTML = `<p>${textFor('restrictionLiftError', { error: escapeFriendHTML(error.message) })}</p>`;
    return;
  }
  const restrictions = data || [];
  container.innerHTML = restrictions.length ? restrictions.map(item => {
    const duration = item.restriction_type === 'ban'
      ? textFor('permanentRestriction')
      : textFor('timeoutUntil', { date: item.expires_at ? new Date(item.expires_at).toLocaleString(localeForLanguage()) : '—' });
    return `<article class="card active-restriction"><b>${escapeFriendHTML(item.username || 'Gelöschter Account')}</b><p>${duration}</p><p>${escapeFriendHTML(item.reason)}</p><button type="button" data-lift-restriction="${escapeFriendHTML(item.user_id)}">${textFor('liftRestriction')}</button></article>`;
  }).join('') : `<p>${textFor('noActiveRestrictions')}</p>`;
}

document.querySelector('#refreshReports')?.addEventListener('click', async () => {
  await loadAdminReports();
  await loadActiveRestrictions();
  await loadAdminAppealsAndSpam();
});

document.querySelector('#activeRestrictions')?.addEventListener('click', async event => {
  const button = event.target.closest('[data-lift-restriction]');
  if (!button) return;
  if (!confirm(textFor('unbanConfirm'))) return;
  button.disabled = true;
  const { error } = await supabaseClient.rpc('lift_user_restriction', { p_user_id: button.dataset.liftRestriction });
  if (error) {
    button.disabled = false;
    document.querySelector('#moderationStatus').textContent = textFor('restrictionLiftError', { error: error.message });
    return;
  }
  document.querySelector('#moderationStatus').textContent = textFor('restrictionLifted');
  await loadActiveRestrictions();
});
document.querySelector('#moderationReports')?.addEventListener('click', async event => {
  const actionButton = event.target.closest('[data-moderation-action]');
  if (actionButton) {
    const note = document.querySelector(`[data-moderation-note="${actionButton.dataset.reportSource}:${actionButton.dataset.reportId}"]`)?.value.trim() || '';
    const action = actionButton.dataset.moderationAction;
    if (action !== 'unban' && !note) {
      alert(textFor('adminNoteRequired'));
      return;
    }
    const confirmation = action === 'ban'
      ? textFor('banConfirm')
      : action.startsWith('timeout') ? textFor('timeoutConfirm') : action === 'unban' ? textFor('unbanConfirm') : textFor('warnConfirm');
    if (!confirm(confirmation)) return;
    actionButton.disabled = true;
    const { error } = await supabaseClient.rpc(actionButton.dataset.reportSource === 'social' ? 'moderate_social_content_report' : 'moderate_chat_report', {
      p_action: action,
      p_target_user_id: actionButton.dataset.targetUser,
      p_report_id: Number(actionButton.dataset.reportId),
      p_note: note
    });
    actionButton.disabled = false;
    if (error) {
      document.querySelector('#moderationStatus').textContent = textFor('moderatingError', { error: error.message });
      return;
    }
    const resultKey = ({ warn: 'warningOk', timeout24: 'timeout24Ok', timeout7: 'timeout7Ok', ban: 'banOk', unban: 'unbanOk' })[action];
    document.querySelector('#moderationStatus').textContent = textFor(resultKey);
    await loadAdminReports();
    await loadActiveRestrictions();
    return;
  }
  const button = event.target.closest('[data-report-status]');
  if (!button) return;
  button.disabled = true;
  const { error } = await supabaseClient.rpc(button.dataset.reportSource === 'social' ? 'set_social_content_report_status' : 'set_chat_report_status', {
    p_report_id: Number(button.dataset.reportId),
    p_status: button.dataset.reportStatus
  });
  if (error) {
    button.disabled = false;
    document.querySelector('#moderationStatus').textContent = textFor('reportStatusError', { error: error.message });
    return;
  }
  await loadAdminReports();
});

setInterval(() => {
  if (!document.querySelector('#moderationPanel')?.hidden) {
    loadAdminReports();
    loadActiveRestrictions();
    loadAdminAppealsAndSpam();
  }
  if (currentUser) loadMyModerationWarnings();
}, 30000);

async function loadMyModerationWarnings() {
  const container = document.querySelector('#accountNotices');
  if (!container || !currentUser) return;
  const { data, error } = await supabaseClient.rpc('get_my_moderation_warnings_v16');
  loadMyReportHistory();
  loadMyModerationActionHistory();
  if (error) {
    container.innerHTML = `<p>${textFor('accountNoticesError')}</p>`;
    return;
  }
  const warnings = data || [];
  container.innerHTML = warnings.length ? warnings.map(warning => `
<article class="card user-warning ${warning.seen_at ? 'seen' : 'unseen'}">
  <b>${textFor('warning')} · ${escapeFriendHTML(new Date(warning.created_at).toLocaleString(localeForLanguage()))}</b>
  <p>${escapeFriendHTML(warning.note)}</p>
  ${warning.overturned_at ? `<small>${textFor('warningOverturned')}</small>` : ''}
  ${warning.seen_at ? `<small>${textFor('warningWasRead')}</small>` : `<button type="button" data-warning-seen="${warning.id}">${textFor('markWarningRead')}</button>`}
</article>`).join('') : `<p>${textFor('noAccountNotices')}</p>`;
}

document.querySelector('#accountNotices')?.addEventListener('click', async event => {
  const button = event.target.closest('[data-warning-seen]');
  if (!button) return;
  const { error } = await supabaseClient.rpc('mark_my_warning_seen', {
    p_warning_id: button.dataset.warningSeen
  });
  if (!error) await loadMyModerationWarnings();
});


async function enforceCurrentModerationStatus() {
  if (!currentUser) return;
  const { data, error } = await supabaseClient.rpc('get_my_moderation_status');
  const banner = document.querySelector('#restrictionAppealNotice');
  if (error || !data?.length) { if (banner) banner.hidden = true; restrictionNoticeShown = false; return; }
  const restriction = data[0];
  if (banner) {
    const expiryText = restriction.expires_at ? ` · ${new Date(restriction.expires_at).toLocaleString(localeForLanguage())}` : '';
    banner.textContent = textFor('restrictionAppealNotice', { reason: restriction.reason || '—', expiry: expiryText });
    banner.hidden = false;
  }
  if (restrictionNoticeShown) return;
  restrictionNoticeShown = true;
}

setInterval(enforceCurrentModerationStatus, 30000);

document.querySelector('#closeSocial')?.addEventListener('click', () => document.querySelector('#socialDlg').close());
document.querySelector('#socialDlg')?.addEventListener('click', event => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});
setInterval(() => {
  const dialog = document.querySelector('#socialDlg');
  if (!dialog?.open) return;
  if (activeChatFriend) loadChatMessages();
  else if (activeSocialGroupId) { loadSocialGroupMessages(); loadSocialGroupGoals(); loadSocialGroupMemberRoster(); loadSocialGroupActivity(); }
}, 8000);

// Deleting Auth users requires a server-side SECURITY DEFINER RPC; never use a service key in the app.
document.querySelector('#deleteAccountBtn')?.addEventListener('click', async event => {
  if (!currentUser) return;
  if (!confirm(textFor('accountDeleteConfirm'))) return;
  const button = event.currentTarget;
  button.disabled = true;
  const { error } = await supabaseClient.rpc('delete_my_account');
  button.disabled = false;
  if (error) {
    alert(textFor('accountDeleteFailed', { error: error.message }));
    return;
  }
  await supabaseClient.auth.signOut();
  storage.removeItem(KEY);
  alert(textFor('accountDeleted'));
  location.reload();
});


// Klick auf Entblockieren
document.querySelector('#friendsDlg')
  ?.addEventListener('click', async event => {
    const button = event.target.closest(
      '[data-friend-action="unblock"]'
    );

    if (!button) return;

    button.disabled = true;
    await unblockUser(button.dataset.userId);
  });



