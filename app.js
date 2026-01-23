let APPDATA = null;

// ======= LICENTIE-INSTELLINGEN =======
const LICENSE_PRICE_EUR = 99.00; // € per jaar, ex. btw
const LICENSE_EMAIL_TO = 'info@fietsserviceid.nl';
const LICENSE_SUBJECT = encodeURIComponent('Aanvraag installatiecode — Fiets Service ID');
const LICENSE_KEY = 'fsid_license_v1';

const fmt = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

function loadSavedApplicant() { try { const raw = localStorage.getItem('fsid_applicant'); return raw ? JSON.parse(raw) : {}; } catch { return {}; } }
function saveApplicant(data) { try { localStorage.setItem('fsid_applicant', JSON.stringify(data)); } catch {} }
function readLicense() { try { const raw = localStorage.getItem(LICENSE_KEY); if (!raw) return null; const lic = JSON.parse(raw); lic.expiresAt = lic.expiresAt ? new Date(lic.expiresAt) : null; lic.activatedAt = lic.activatedAt ? new Date(lic.activatedAt) : null; return lic; } catch { return null; } }
function writeLicense(lic) { try { localStorage.setItem(LICENSE_KEY, JSON.stringify(lic)); } catch {} }
function isLicenseValid(lic) { if (!lic || !lic.code || !lic.expiresAt) return false; return new Date() < new Date(lic.expiresAt); }
function licenseExpiryText(lic) { if (!lic || !lic.expiresAt) return ''; const d = new Date(lic.expiresAt); const pad=n=>String(n).padStart(2,'0'); return `${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear()}`; }

function updateLicenseUI() {
  const lic = readLicense();
  const banner = document.getElementById('licenseBanner');
  const footer = document.getElementById('licenseFooter');
  const priceHeader = document.getElementById('licensePriceHeader');
  const priceBody = document.getElementById('licensePriceBody');
  if (priceHeader) priceHeader.textContent = LICENSE_PRICE_EUR.toFixed(2).replace('.', ',');
  if (priceBody) priceBody.textContent = LICENSE_PRICE_EUR.toFixed(2).replace('.', ',');
  if (isLicenseValid(lic)) {
    const daysLeft = Math.ceil((lic.expiresAt - new Date()) / (1000*60*60*24));
    if (daysLeft <= 30) { banner.style.display = 'block'; banner.textContent = `Licentie verloopt over ${daysLeft} dag(en) — verloopt op ${licenseExpiryText(lic)}.`; }
    else { banner.style.display = 'none'; }
    if (footer) footer.textContent = `Licentie actief: ${lic.code} — geldig t/m ${licenseExpiryText(lic)}.`;
  } else {
    banner.style.display = 'block';
    banner.textContent = 'Geen geldige licentie. Activeer met installatiecode of vraag een code aan.';
    if (footer) footer.textContent = 'Geen geldige licentie geactiveerd.';
  }
}

function showLicenseGate(show) { const gate = document.getElementById('licenseGate'); if (!gate) return; gate.hidden = !show; document.body.style.overflow = show ? 'hidden' : ''; }
function validateCodeFormat(code) { const re = /^FSID-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i; return re.test((code||'').trim()); }

function activateLicenseFromInput() {
  const inp = document.getElementById('licCodeInput');
  const msg = document.getElementById('licMsg');
  const code = (inp.value||'').toUpperCase().trim();
  if (!validateCodeFormat(code)) { msg.textContent = 'Ongeldig formaat. Gebruik bijv. FSID-ABCD-EFGH-JKLM'; msg.className = 'small hint-warn'; return; }
  const now = new Date(); const expires = new Date(now); expires.setFullYear(expires.getFullYear() + 1);
  const lic = { code, activatedAt: now.toISOString(), expiresAt: expires.toISOString() };
  writeLicense(lic);
  try { document.getElementById('licenseGate').hidden = true; } catch(e){}
  updateLicenseUI();
  showLicenseGate(false);
}

function buildMailtoFromForm() {
  const f = {
    bedrijfsnaam: document.getElementById('licBedrijfsnaam').value || '',
    contact: document.getElementById('licContact').value || '',
    email: document.getElementById('licEmail').value || '',
    tel: document.getElementById('licTel').value || '',
    adres: document.getElementById('licAdres').value || '',
    postcode: document.getElementById('licPostcode').value || '',
    plaats: document.getElementById('licPlaats').value || '',
    kvk: document.getElementById('licKvK').value || '',
    btw: document.getElementById('licBTW').value || ''
  };
  saveApplicant(f);
  const prijs = fmt.format(LICENSE_PRICE_EUR) + ' p/j (ex. btw)';
  const body = (
`Beste licentiebeheer,\n\nGraag ontvang ik een installatiecode voor de "Inruilwaarde Fietsen" PWA.\n\nNAW-gegevens dealer:\n• Bedrijfsnaam: ${f.bedrijfsnaam}\n• Contactpersoon: ${f.contact}\n• E-mail: ${f.email}\n• Telefoon: ${f.tel}\n• Adres: ${f.adres}\n• Postcode: ${f.postcode}\n• Plaats: ${f.plaats}\n• KvK: ${f.kvk}\n• BTW: ${f.btw}\n\nIk ga akkoord met een 12-maanden licentie à ${prijs}.\n\nMet vriendelijke groet,\n${f.contact}`);
  const mailto = `mailto:${encodeURIComponent(LICENSE_EMAIL_TO)}?subject=${LICENSE_SUBJECT}&body=${encodeURIComponent(body)}`;
  return mailto;
}

function initLicenseGate() {
  const lic = readLicense();
  if (!isLicenseValid(lic)) { showLicenseGate(true); }
  updateLicenseUI();

  // Prefill applicant
  const saved = loadSavedApplicant();
  if (saved) {
    const map = {
      licBedrijfsnaam: saved.bedrijfsnaam,
      licContact: saved.contact,
      licEmail: saved.email,
      licTel: saved.tel,
      licAdres: saved.adres,
      licPostcode: saved.postcode,
      licPlaats: saved.plaats,
      licKvK: saved.kvk,
      licBTW: saved.btw
    };
    Object.keys(map).forEach(id => { const el = document.getElementById(id); if (el) el.value = map[id] || ''; });
  }

  // Event listeners (blijven bestaan) + inline onclicks als back-up
  const btnActivate = document.getElementById('activateLicBtn');
  const btnPaste = document.getElementById('pasteLicBtn');
  const btnRequest = document.getElementById('requestLicBtn');
  const btnSaveDraft = document.getElementById('saveDraftBtn');
  if (btnActivate) btnActivate.addEventListener('click', activateLicenseFromInput);
  if (btnPaste && navigator.clipboard) btnPaste.addEventListener('click', pasteFromClipboard);
  if (btnRequest) btnRequest.addEventListener('click', requestLicenseEmail);
  if (btnSaveDraft) btnSaveDraft.addEventListener('click', saveApplicantDraft);
}

// --- Fallbacks voor inline onclick-handlers ---
function pasteFromClipboard(){ if (navigator.clipboard && document.getElementById('licCodeInput')) { navigator.clipboard.readText().then(t=>{ document.getElementById('licCodeInput').value = t || ''; }).catch(()=>{}); } }
function requestLicenseEmail(){ const url = buildMailtoFromForm(); const el = document.getElementById('requestLicBtn'); if (el) { el.setAttribute('href', url); el.removeAttribute('target'); } /* geen programmatic openen: browser navigeert op de klik */ }
function saveApplicantDraft(){ buildMailtoFromForm(); const msg = document.getElementById('licMsg'); if (msg) { msg.textContent = 'Gegevens bewaard.'; msg.className = 'small hint-ok'; } }

// ======= APP-INIT =======
async function load() {
  initLicenseGate();
  const res = await fetch('./data.json');
  APPDATA = await res.json();
  initUI();
}

function initUI(){
  const typeSel = document.getElementById('typeSelect');
  APPDATA.types.forEach(t => { const opt = document.createElement('option'); opt.value = t.type; opt.textContent = t.type; typeSel.appendChild(opt); });
  const states = Object.keys(APPDATA.cond_factors);
  const stateSel = document.getElementById('stateSelect');
  states.forEach(s => { const o = document.createElement('option'); o.value=s; o.textContent=s; stateSel.appendChild(o); });
  const accuStates = Object.keys(APPDATA.accu_state_factors);
  const accuSel = document.getElementById('accuStateSelect');
  accuStates.forEach(s => { const o = document.createElement('option'); o.value=s; o.textContent=s; accuSel.appendChild(o); });
  document.getElementById('typeSelect').addEventListener('change', onTypeChange);
  document.getElementById('hasAccuSelect').addEventListener('change', updateAccuVisibility);
  document.getElementById('calcBtn').addEventListener('click', calculate);
  document.getElementById('printOfferBtn').addEventListener('click', showOffer);
  onTypeChange();
  updateAccuVisibility();
  document.getElementById('year').textContent = new Date().getFullYear();
}

function onTypeChange(){
  const t = document.getElementById('typeSelect').value;
  const brands = APPDATA.brands[t] || {};
  const brandSel = document.getElementById('brandSelect');
  brandSel.innerHTML = '';
  Object.keys(brands).forEach(b => { const o = document.createElement('option'); o.value=b; o.textContent=b; brandSel.appendChild(o); });
  if(!brandSel.value && brandSel.options.length>0) brandSel.value = brandSel.options[0].value;
  const tcfg = APPDATA.types.find(x => x.type===t);
  const hint = document.getElementById('refPriceHint');
  hint.textContent = `Referentie nieuwprijs voor ${t}: € ${Math.round(tcfg.ref_price).toLocaleString('nl-NL')}`;
}

function updateAccuVisibility(){
  const wrap = document.getElementById('accuStateWrap');
  const t = document.getElementById('typeSelect').value;
  const tcfg = APPDATA.types.find(x => x.type===t);
  const override = document.getElementById('hasAccuSelect').value;
  let hasAccu = tcfg?.has_accu_default;
  if(override==='ja') hasAccu = true; else if(override==='nee') hasAccu = false;
  wrap.style.display = hasAccu ? 'flex' : 'none';
}

function calculate(){
  const t = document.getElementById('typeSelect').value;
  const brand = document.getElementById('brandSelect').value;
  const state = document.getElementById('stateSelect').value;
  const accuState = document.getElementById('accuStateSelect').value;
  const age = Math.max(0, Math.min(15, parseInt(document.getElementById('ageInput').value || '0', 10)));
  const priceInput = document.getElementById('priceInput').value;
  const tcfg = APPDATA.types.find(x => x.type===t);
  const price = priceInput ? parseFloat(priceInput) : tcfg.ref_price;
  const override = document.getElementById('hasAccuSelect').value;
  let hasAccu = tcfg?.has_accu_default;
  if(override==='ja') hasAccu = true; else if(override==='nee') hasAccu = false;
  const ageFactor = APPDATA.restwaarde.zonderaccu[age] ?? 0;
  const condFactor = APPDATA.cond_factors[state] ?? 1;
  const accuFactor = hasAccu ? (APPDATA.accu_state_factors[accuState] ?? 1) : 1;
  const brandFactor = (APPDATA.brands[t] && APPDATA.brands[t][brand]) ? APPDATA.brands[t][brand] : (APPDATA.brands[t]?.Overig ?? 0.85);
  let value = price * ageFactor * condFactor * accuFactor * brandFactor;
  const rounded = Math.round(value);
  document.getElementById('resultValue').textContent = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(rounded);
  document.getElementById('resultCard').hidden = false;
  document.getElementById('factorAge').textContent = ageFactor.toLocaleString('nl-NL');
  document.getElementById('factorState').textContent = condFactor.toLocaleString('nl-NL');
  document.getElementById('factorAccu').textContent = accuFactor.toLocaleString('nl-NL');
  document.getElementById('factorBrand').textContent = brandFactor.toLocaleString('nl-NL');
  document.getElementById('offerType').textContent = t;
  document.getElementById('offerBrand').textContent = brand;
  document.getElementById('offerState').textContent = state + (hasAccu?`, accustaat: ${accuState}`:'');
  document.getElementById('offerAge').textContent = `${age} jaar`;
  document.getElementById('offerTotal').textContent = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(rounded);
  const d = new Date(); const pad=n=>String(n).padStart(2,'0');
  document.getElementById('offerDate').textContent = `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}

function showOffer(){ document.getElementById('offerCard').scrollIntoView({behavior:'smooth'}); document.getElementById('offerCard').classList.add('print'); }

let deferredPrompt; window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; const btn = document.getElementById('installBtn'); btn.hidden = false; btn.addEventListener('click', async () => { btn.hidden = true; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; }); });
window.addEventListener('load', load);
