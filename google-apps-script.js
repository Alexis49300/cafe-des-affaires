// ============================================================
//  LE CAFÉ DES AFFAIRES — Google Apps Script (back-end)
//  
//  INSTALLATION (5 minutes) :
//  1. Ouvrez votre Google Sheet
//  2. Extensions > Apps Script
//  3. Collez tout ce fichier, remplacez SPREADSHEET_ID
//  4. Déployer > Nouveau déploiement > Application web
//     - Exécuter en tant que : Moi
//     - Personnes ayant accès : Tout le monde
//  5. Copiez l'URL du déploiement dans votre fichier HTML
//     (constante SCRIPT_URL tout en haut du HTML)
// ============================================================

const SPREADSHEET_ID = 'VOTRE_SPREADSHEET_ID_ICI'; // ← remplacez cette valeur

const SS  = SpreadsheetApp.openById(SPREADSHEET_ID);

// Noms des onglets dans le Google Sheet
const SHEETS = {
  recos    : 'Recommandations',
  members  : 'Membres',
  meetings : 'Réunions',
  accounts : 'Comptes',
};

// En-têtes de chaque onglet (créés automatiquement si absents)
const HEADERS = {
  recos    : ['from','to','desc','amount','date','status'],
  members  : ['name','role','company','phone','email','sector','join','recos','ca','invites'],
  meetings : ['title','date','time','place','address','type','capacity','notes'],
  accounts : ['name','username','email','role','status','created'],
};

// ── Point d'entrée GET (lecture) ─────────────────────────────
function doGet(e) {
  const action = e.parameter.action;
  let data;
  try {
    switch (action) {
      case 'getRecos'    : data = readSheet('recos');    break;
      case 'getMembers'  : data = readSheet('members');  break;
      case 'getMeetings' : data = readSheet('meetings'); break;
      case 'getAccounts' : data = readSheet('accounts'); break;
      case 'getAll'      : data = {
          recos    : readSheet('recos'),
          members  : readSheet('members'),
          meetings : readSheet('meetings'),
          accounts : readSheet('accounts'),
        }; break;
      default: data = { error: 'Action inconnue : ' + action };
    }
    return jsonResponse(data);
  } catch(err) {
    return jsonResponse({ error: err.message });
  }
}

// ── Point d'entrée POST (écriture) ───────────────────────────
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch(err) {
    return jsonResponse({ error: 'JSON invalide' });
  }

  const { action, payload } = body;
  try {
    switch (action) {

      // ── Recommandations ──
      case 'addReco':
        appendRow('recos', payload);
        return jsonResponse({ ok: true });

      case 'updateRecoStatus': {
        // payload : { index, status }
        const sh = getOrCreateSheet('recos');
        const row = parseInt(payload.index) + 2; // +2 : 1 header + 1-based
        const headers = HEADERS.recos;
        const col = headers.indexOf('status') + 1;
        sh.getRange(row, col).setValue(payload.status);
        return jsonResponse({ ok: true });
      }

      case 'deleteReco': {
        deleteRow('recos', parseInt(payload.index));
        return jsonResponse({ ok: true });
      }

      // ── Membres ──
      case 'addMember':
        appendRow('members', payload);
        return jsonResponse({ ok: true });

      case 'updateMember': {
        const sh = getOrCreateSheet('members');
        const row = parseInt(payload.index) + 2;
        const vals = HEADERS.members.map(h => payload[h] !== undefined ? payload[h] : '');
        sh.getRange(row, 1, 1, vals.length).setValues([vals]);
        return jsonResponse({ ok: true });
      }

      case 'deleteMember': {
        deleteRow('members', parseInt(payload.index));
        return jsonResponse({ ok: true });
      }

      // ── Réunions ──
      case 'addMeeting':
        appendRow('meetings', payload);
        return jsonResponse({ ok: true });

      case 'deleteMeeting': {
        deleteRow('meetings', parseInt(payload.index));
        return jsonResponse({ ok: true });
      }

      // ── Comptes ──
      case 'addAccount':
        appendRow('accounts', payload);
        return jsonResponse({ ok: true });

      case 'updateAccountStatus': {
        const sh = getOrCreateSheet('accounts');
        const row = parseInt(payload.index) + 2;
        const col = HEADERS.accounts.indexOf('status') + 1;
        sh.getRange(row, col).setValue(payload.status);
        return jsonResponse({ ok: true });
      }

      case 'deleteAccount': {
        deleteRow('accounts', parseInt(payload.index));
        return jsonResponse({ ok: true });
      }

      default:
        return jsonResponse({ error: 'Action inconnue : ' + action });
    }
  } catch(err) {
    return jsonResponse({ error: err.message });
  }
}

// ── Helpers ──────────────────────────────────────────────────

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(key) {
  const name = SHEETS[key];
  let sh = SS.getSheetByName(name);
  if (!sh) {
    sh = SS.insertSheet(name);
    sh.getRange(1, 1, 1, HEADERS[key].length).setValues([HEADERS[key]]);
    sh.getRange(1, 1, 1, HEADERS[key].length)
      .setBackground('#3D2008')
      .setFontColor('#E8B84B')
      .setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readSheet(key) {
  const sh = getOrCreateSheet(key);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function appendRow(key, payload) {
  const sh = getOrCreateSheet(key);
  const vals = HEADERS[key].map(h => payload[h] !== undefined ? payload[h] : '');
  sh.appendRow(vals);
}

function deleteRow(key, index) {
  const sh = getOrCreateSheet(key);
  sh.deleteRow(index + 2); // +2 : header + 1-based
}

// ── Initialisation du Google Sheet ──────────────────────────
// Lancez cette fonction UNE FOIS manuellement depuis Apps Script
// pour créer tous les onglets avec les en-têtes.
function initialiserSheet() {
  Object.keys(SHEETS).forEach(key => getOrCreateSheet(key));
  SpreadsheetApp.getUi().alert('✅ Google Sheet initialisé avec succès !');
}
