// ======= BASIS =======
let APPDATA = null;

const LICENSE_PRICE_EUR = 99.00; // € p/j ex. btw
const LICENSE_EMAIL_TO = 'info@fietsserviceid.nl';
const LICENSE_SUBJECT = 'Aanvraag installatiecode — Fiets Service ID';
const LICENSE_KEY = 'fsid_license_v1';

const fmtEUR0 = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fmtEUR2 = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

// ======= LICENTIE FUNCTIES =======
function readLicense() {
  try {
    const raw = localStorage.getItem(LICENSE_KEY);
    if (!raw) return null;
    const lic = JSON.parse(raw);
    lic.expiresAt = lic.expiresAt ? new Date(lic.expiresAt) : null;
    lic.activatedAt = lic.activatedAt ? new Date(lic.activatedAt) : null;
    return lic;
  } catch { return null; }
}
function writeLicense(lic) { try { localStorage.setItem(LICENSE_KEY, JSON.stringify(lic)); } catch {} }
function isLicenseValid(lic) { return !!(lic && lic.code && lic.expiresAt && new Date() < new Date(lic.expiresAt)); }
function licenseExpiryText(lic) {
  if (!lic || !lic.expiresAt) return '';
  const d = new Date(lic.expiresAt); const pad=n=>String(n).padStart(2,'0');
  return `${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear()}`;
}
function showLicenseGate(show) {
  const gate = document.getElementById('licenseGate');
  if (!gate) return;
  gate.hidden = !show;
  document.body.style.overflow = show ? 'hidden' : '';
}
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
    if (daysLeft <= 30) {
      banner.style.display = 'block';
      banner.textContent = `Licentie verloopt over ${daysLeft} dag(en) — verloopt op ${licenseExpiryText(lic)}.`;
    } else banner.style.display = 'none';
    if (footer) footer.textContent = `Licentie actief: ${lic.code} — geldig t/m ${licenseExpiryText(lic)}.`;
  } else {
    banner.style.display = 'block';
    banner.textContent = 'Geen geldige licentie. Activeer met installatiecode of vraag een code aan.';
    if (footer) footer.textContent = 'Geen geldige licentie geactiveerd.';
  }
}

// ======= ACTIVATIE =======
function activateLicenseFromInput() {
  const inp = document.getElementById('licCodeInput');
  const msg = document.getElementById('licMsg');
  const code = (inp?.value || '').toUpperCase().trim();

  // Formaat-check
  const re = /^FSID-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
  if (!re.test(code)) {
    if (msg) { msg.textContent = 'Ongeldig formaat. Gebruik bijv. FSID-ABCD-EFGH-JKLM'; msg.className = 'small hint-warn'; }
    return;
  }

  const now = new Date(); const exp = new Date(now); exp.setFullYear(exp.getFullYear() + 1);
  const lic = { code, activatedAt: now.toISOString(), expiresAt: exp.toISOString() };
  writeLicense(lic);

  try { document.getElementById('licenseGate').hidden = true; } catch(e){}
  updateLicenseUI();
  showLicenseGate(false);
}

// ======= MAILTO (v3c) =======
function fsid_buildMailto() {
  const take = (id) => (document.getElementById(id)?.value || '').trim();
  const f = {
    bedrijfsnaam: take('licBedrijfsnaam'),
    contact:      take('licContact'),
    email:        take('licEmail'),
    tel:          take('licTel'),
    adres:        take('licAdres'),
    postcode:     take('licPostcode'),
    plaats:       take('licPlaats'),
    kvk:          take('licKvK'),
    btw:          take('licBTW')
  };
  try { localStorage.setItem('fsid_applicant', JSON.stringify(f)); } catch {}

  const prijs = fmtEUR2.format(LICENSE_PRICE_EUR) + ' p/j (ex. btw)';
  const body =
`Beste licentiebeheer,\n\nGraag ontvang ik een installatiecode voor de "Inruilwaarde Fietsen" PWA.\n\nNAW-gegevens dealer:\n• Bedrijfsnaam: ${f.bedrijfsnaam}\n• Contactpersoon: ${f.contact}\n• E-mail: ${f.email}\n• Telefoon: ${f.tel}\n• Adres: ${f.adres}\n• Postcode: ${f.postcode}\n• Plaats: ${f.plaats}\n• KvK: ${f.kvk}\n• BTW: ${f.btw}\n\nIk ga akkoord met een 12-maanden licentie à ${prijs}.\n\nMet vriendelijke groet,\n${f.contact}`;

  const to = LICENSE_EMAIL_TO;
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(LICENSE_SUBJECT)}&body=${encodeURIComponent(body)}`;
}
function fsid_updateMailtoHref() {
  const a = document.getElementById('requestLicBtn');
  if (a) a.href = fsid_buildMailto();
}
function wireMailtoLive() {
  const ids = ['licBedrijfsnaam','licContact','licEmail','licTel','licAdres','licPostcode','licPlaats','licKvK','licBTW'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', fsid_updateMailtoHref);
  });
  const a = document.getElementById('requestLicBtn');
  if (a) {
    a.addEventListener('pointerdown', fsid_updateMailtoHref, { passive: true });
    a.addEventListener('mouseenter', fsid_updateMailtoHref, { passive: true });
    fsid_updateMailtoHref();
  }
}
function pasteFromClipboard(){
  if (navigator.clipboard && document.getElementById('licCodeInput')) {
    navigator.clipboard.readText()
      .then(t=>{ document.getElementById('licCodeInput').value = t || ''; })
      .catch(()=>{});
  }
}
function saveApplicantDraft(){
  fsid_updateMailtoHref();
  const msg = document.getElementById('licMsg');
  if (msg) { msg.textContent = 'Gegevens bewaard.'; msg.className = 'small hint-ok'; }
}

// ======= APP INIT (calculator + UI) =======
async function load() {
  // License gate
  const lic = readLicense();
  if (!isLicenseValid(lic)) showLicenseGate(true);
  updateLicenseUI();

  // Data laden
  const res = await fetch('./data.json');
  APPDATA = await res.json();
  initUI();
  wireMailtoLive();
}
function initUI(){
  const typeSel = document.getElementById('typeSelect');
  APPDATA.types.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.type; opt.textContent = t.type; typeSel.appendChild(opt);
  });
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
  Object.keys(brands).forEach(b => {
    const o = document.createElement('option'); o.value=b; o.textContent=b; brandSel.appendChild(o);
  });
  if(!brandSel.value && brandSel.options.length>0) brandSel.value = brandSel.options[0].value;
  const tcfg = APPDATA.types.find(x => x.type===t);
  const hint = document.getElementById('refPriceHint');
  hint.textContent = `Referentie nieuwprijs voor ${t}: € ${Math.round(tcfg.ref_price).toLocaleString('nl-NL')}`;
}
function updateAccuVisibility(){
  const wrap = document.getElementById('accuStateWrap');
  const t = document.getElementById('typeSelect').value;
  const tcfg = APPDATA.types.find(x => x.type===t);
  const override = document.getElementById('hasAccuSelect').value; // auto/ja/nee
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

  const override = document.getElementById('hasAccuSelect').value; // auto/ja/nee
  let hasAccu = tcfg?.has_accu_default;
  if(override==='ja') hasAccu = true; else if(override==='nee') hasAccu = false;

  const ageFactor = APPDATA.restwaarde.zonderaccu[age] ?? 0;
  const condFactor = APPDATA.cond_factors[state] ?? 1;
  const accuFactor = hasAccu ? (APPDATA.accu_state_factors[accuState] ?? 1) : 1;
  const brandFactor = (APPDATA.brands[t] && APPDATA.brands[t][brand]) ? APPDATA.brands[t][brand] : (APPDATA.brands[t]?.Overig ?? 0.85);

  const value = price * ageFactor * condFactor * accuFactor * brandFactor;
  const rounded = Math.round(value);

  document.getElementById('resultValue').textContent = fmtEUR0.format(rounded);
  document.getElementById('resultCard').hidden = false;
  document.getElementById('factorAge').textContent   = (ageFactor).toLocaleString('nl-NL');
  document.getElementById('factorState').textContent = (condFactor).toLocaleString('nl-NL');
  document.getElementById('factorAccu').textContent  = (accuFactor).toLocaleString('nl-NL');
  document.getElementById('factorBrand').textContent = (brandFactor).toLocaleString('nl-NL');

  document.getElementById('offerType').textContent = t;
  document.getElementById('offerBrand').textContent = brand;
  document.getElementById('offerState').textContent = state + (hasAccu?`, accustaat: ${accuState}`:'');
  document.getElementById('offerAge').textContent = `${age} jaar`;
  document.getElementById('offerTotal').textContent = fmtEUR0.format(rounded);

  const d = new Date(); const pad=n=>String(n).padStart(2,'0');
  document.getElementById('offerDate').textContent = `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}
function showOffer(){
  document.getElementById('offerCard').scrollIntoView({behavior:'smooth'});
  document.getElementById('offerCard').classList.add('print');
}

// Install‑prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('installBtn');
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    btn.hidden = true;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });
});

// Load
window.addEventListener('load', load);

// ======= GLOBAAL ZETTEN voor inline onclick =======
window.activateLicenseFromInput = activateLicenseFromInput;
window.pasteFromClipboard = pasteFromClipboard;
window.saveApplicantDraft = saveApplicantDraft;
