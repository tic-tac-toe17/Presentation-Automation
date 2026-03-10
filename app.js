// ============================================================
// Angebots-Präsentation Generator – Frontend Logic
// Matching Market Research UI/UX patterns
// ============================================================

const CONFIG = {
  // TODO: Set this to your n8n webhook POST URL when deploying
  POST_URL: 'https://mms-n8n.germanywestcentral.cloudapp.azure.com/webhook/presentation-generator-submit',
};

// ── DOM References ────────────────────────────────────────────

const sectionForm     = document.getElementById('section-form');
const sectionProgress = document.getElementById('section-progress');
const sectionResults  = document.getElementById('section-results');
const sectionError    = document.getElementById('section-error');

const allSections = [sectionForm, sectionProgress, sectionResults, sectionError];

// ── Theme Toggle ──────────────────────────────────────────────

const themeToggle = document.getElementById('theme-toggle');
if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

// ── Section Management ────────────────────────────────────────

function showSection(section) {
  allSections.forEach(s => s.classList.add('hidden'));
  section.classList.remove('hidden');
}

// ── Elapsed Timer ─────────────────────────────────────────────

let elapsedTimer = null;
let startTime = null;

function startTimer() {
  startTime = Date.now();
  const el = document.getElementById('elapsed-time');
  el.textContent = '0:00';
  elapsedTimer = setInterval(() => {
    const diff = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(diff / 60);
    const s = String(diff % 60).padStart(2, '0');
    el.textContent = `${m}:${s}`;
  }, 1000);
}

function stopTimer() {
  if (elapsedTimer) {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
}

// ── Progress Steps ────────────────────────────────────────────

function setStep(stepId) {
  const steps = ['step-ai', 'step-gamma', 'step-email'];
  const targetIdx = steps.indexOf(stepId);

  steps.forEach((id, idx) => {
    const el = document.getElementById(id);
    el.classList.remove('active', 'done');
    if (idx < targetIdx) {
      el.classList.add('done');
    } else if (idx === targetIdx) {
      el.classList.add('active');
    }
  });

  // Update subtitle text
  const statusEl = document.getElementById('progress-status');
  if (stepId === 'step-ai') statusEl.textContent = 'KI analysiert deine Eingaben...';
  if (stepId === 'step-gamma') statusEl.textContent = 'Gamma AI generiert die Präsentation...';
  if (stepId === 'step-email') statusEl.textContent = 'Ergebnisse werden zugestellt...';
}

function resetSteps() {
  ['step-ai', 'step-gamma', 'step-email'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('active', 'done');
  });
  document.getElementById('step-ai').classList.add('active');
  document.getElementById('progress-status').textContent = 'Daten werden verarbeitet...';
}

// ── File Upload Handling ──────────────────────────────────────

let selectedFiles = [];

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const browseLink = document.getElementById('file-browse-link');

dropZone.addEventListener('click', () => fileInput.click());
if (browseLink) {
  browseLink.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  });
}

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  addFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', () => {
  addFiles(fileInput.files);
  fileInput.value = '';
});

function addFiles(files) {
  const allowed = ['.txt', '.pdf', '.docx', '.md'];
  for (const f of files) {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) continue;
    if (f.size > 10 * 1024 * 1024) continue;
    if (!selectedFiles.find(s => s.name === f.name)) {
      selectedFiles.push(f);
    }
  }
  renderFiles();
}

function renderFiles() {
  fileList.innerHTML = selectedFiles.map((f, i) =>
    '<div class="file-item">' +
      '<span class="name">' + escapeHtml(f.name) + '</span>' +
      '<span class="size">' + (f.size / 1024).toFixed(1) + ' KB</span>' +
      '<button type="button" class="remove" onclick="removeFile(' + i + ')">&times;</button>' +
    '</div>'
  ).join('');
}

function removeFile(idx) {
  selectedFiles.splice(idx, 1);
  renderFiles();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Form Submit ───────────────────────────────────────────────

document.getElementById('presentationForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const clientName = document.getElementById('clientName').value.trim();
  const presentationType = document.getElementById('presentationType').value;
  const meetingNotes = document.getElementById('meetingNotes').value.trim();
  const email = document.getElementById('email').value.trim();
  const numSlides = document.getElementById('numSlides').value || '10';

  if (!clientName || !meetingNotes || !email) return;

  // Disable button
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;

  // Show progress
  resetSteps();
  showSection(sectionProgress);
  startTimer();

  const formData = new FormData();
  formData.append('clientName', clientName);
  formData.append('presentationType', presentationType);
  formData.append('meetingNotes', meetingNotes);
  formData.append('email', email);
  formData.append('numSlides', numSlides);
  selectedFiles.forEach(f => formData.append('files', f));

  try {
    // Step 1: AI analysis
    setStep('step-ai');

    // Simulate step progression with timeouts since the request is synchronous
    const stepTimer1 = setTimeout(() => setStep('step-gamma'), 15000);
    const stepTimer2 = setTimeout(() => setStep('step-email'), 60000);

    const res = await fetch(CONFIG.POST_URL, { method: 'POST', body: formData });

    clearTimeout(stepTimer1);
    clearTimeout(stepTimer2);

    if (!res.ok) throw new Error('Server-Fehler: ' + res.status);

    const data = await res.json();

    if (data.success) {
      // Mark all steps done
      ['step-ai', 'step-gamma', 'step-email'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.remove('active');
        el.classList.add('done');
      });

      stopTimer();
      showResult(data, email);
    } else {
      throw new Error(data.error || 'Unbekannter Fehler');
    }
  } catch (err) {
    stopTimer();
    showError(err.message);
  }
});

// ── Result View ───────────────────────────────────────────────

function showResult(data, email) {
  document.getElementById('resultEmail').textContent = email;

  const linkView = document.getElementById('linkView');
  const linkDownload = document.getElementById('linkDownload');

  linkView.href = data.url || '#';
  linkDownload.href = data.exportUrl || '#';

  if (!data.url) linkView.classList.add('disabled');
  else linkView.classList.remove('disabled');

  if (!data.exportUrl) linkDownload.classList.add('disabled');
  else linkDownload.classList.remove('disabled');

  const meta = document.getElementById('resultMeta');
  meta.textContent = data.cardCount ? data.cardCount + ' Slides erstellt' : '';

  showSection(sectionResults);
}

// ── Error View ────────────────────────────────────────────────

function showError(message) {
  document.getElementById('error-message').textContent = message || 'Ein unbekannter Fehler ist aufgetreten.';
  showSection(sectionError);
}

// ── Reset / Retry ─────────────────────────────────────────────

function resetForm() {
  document.getElementById('presentationForm').reset();
  selectedFiles = [];
  renderFiles();
  document.getElementById('submit-btn').disabled = false;
  stopTimer();
  resetSteps();
  showSection(sectionForm);
}

document.getElementById('new-presentation-btn').addEventListener('click', resetForm);
document.getElementById('retry-btn').addEventListener('click', resetForm);
