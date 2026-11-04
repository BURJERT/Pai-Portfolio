/* ==========================================================
   admin.js  —  the dashboard
   Uses Store (from script.js) to load and save.
   Flow: load data -> fill forms -> user edits -> Save changes.
   ========================================================== */

let data;               // the whole portfolio, kept in memory while editing
let editingId = null;   // which project is open in the form (null = new)
let projectImage = '';  // image for the project form

const $ = id => document.getElementById(id);

/* ---------- helpers ---------- */

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function markUnsaved() {
  $('status').textContent = 'Unsaved changes';
  $('status').classList.add('dirty');
}

async function persist(message = 'Saved') {
  readSimpleFields();
  const ok = await Store.save(data);
  if (ok) {
    $('status').textContent = 'All changes saved';
    $('status').classList.remove('dirty');
    toast(message);
  } else {
    toast('Could not save. Try smaller images.');
  }
}

// Shrink uploaded images so they fit in localStorage (about 5 MB total)
function readImage(file, maxSize = 1400) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = img.width * scale; c.height = img.height * scale;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function showPreview(box, src) {
  box.innerHTML = src ? `<img alt="Preview" src="${src}">` : '<span>No image</span>';
}

/* ---------- tabs ---------- */

document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.tab, .panel').forEach(n => n.classList.remove('active'));
  btn.classList.add('active');
  $('tab-' + btn.dataset.tab).classList.add('active');
}));

/* ---------- profile + contact (simple text fields) ---------- */

// Map each input to the place in the data where it belongs
const FIELDS = {
  pName: ['profile', 'name'], pTitle: ['profile', 'title'], pIntro: ['profile', 'intro'],
  aLead: ['about', 'lead'], aText: ['about', 'text'],
  cEmail: ['contact', 'email'], cGithub: ['contact', 'github'],
  cFacebook: ['contact', 'facebook'],
  cInstagram: ['contact', 'instagram'], cTelegram: ['contact', 'telegram'], cOther: ['contact', 'other']
};

function fillSimpleFields() {
  for (const [id, [group, key]] of Object.entries(FIELDS)) $(id).value = data[group][key] || '';
}
function readSimpleFields() {
  for (const [id, [group, key]] of Object.entries(FIELDS)) data[group][key] = $(id).value.trim();
}
Object.keys(FIELDS).forEach(id => $(id).addEventListener('input', markUnsaved));

$('pFile').addEventListener('change', async e => {
  if (!e.target.files[0]) return;
  data.profile.image = await readImage(e.target.files[0]);
  showPreview($('pPreview'), data.profile.image); markUnsaved();
});
$('pClear').onclick = () => { data.profile.image = ''; $('pFile').value = ''; showPreview($('pPreview'), ''); markUnsaved(); };

/* ---------- projects ---------- */

function renderProjectList() {
  const ul = $('projectList'); ul.innerHTML = '';
  if (!data.projects.length) ul.innerHTML = '<li class="empty">No projects yet.</li>';
  data.projects.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `<div class="thumb">${p.image ? `<img alt="" src="${p.image}">` : ''}</div>
      <div class="li-text"><strong></strong><small></small></div>
      <button class="btn btn-ghost btn-small" data-act="edit">Edit</button>
      <button class="btn btn-ghost btn-small danger" data-act="del">Delete</button>`;
    li.querySelector('strong').textContent = p.title;   // textContent keeps user text safe
    li.querySelector('small').textContent = p.category;
    li.querySelector('[data-act=edit]').onclick = () => openProjectForm(p);
    li.querySelector('[data-act=del]').onclick = () => deleteProject(p);
    ul.appendChild(li);
  });
}

function openProjectForm(p) {
  editingId = p ? p.id : null;
  $('formHeading').textContent = p ? 'Edit project' : 'New project';
  $('jTitle').value = p ? p.title : '';
  $('jCat').value = p ? p.category : '';
  $('jDesc').value = p ? p.description : '';
  $('jDetails').value = p ? p.details : '';
  $('jFile').value = '';
  projectImage = p ? p.image : '';
  showPreview($('jPreview'), projectImage);
}

$('newProject').onclick = () => openProjectForm(null);

$('jFile').addEventListener('change', async e => {
  if (!e.target.files[0]) return;
  projectImage = await readImage(e.target.files[0]);
  showPreview($('jPreview'), projectImage);
});

$('saveProject').onclick = async () => {
  const title = $('jTitle').value.trim();
  if (!title) { toast('Add a title first'); $('jTitle').focus(); return; }
  const project = {
    id: editingId || 'p' + Date.now(),
    title, category: $('jCat').value.trim() || 'Uncategorized',
    description: $('jDesc').value.trim(), details: $('jDetails').value.trim(), image: projectImage
  };
  const i = data.projects.findIndex(p => p.id === project.id);
  if (i >= 0) data.projects[i] = project; else data.projects.push(project);
  renderProjectList(); openProjectForm(null);
  await persist('Project saved');
};

async function deleteProject(p) {
  // Always ask before deleting
  if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
  data.projects = data.projects.filter(x => x.id !== p.id);
  renderProjectList(); openProjectForm(null);
  await persist('Project deleted');
}

/* ---------- skills ---------- */

function renderSkills() {
  const wrap = $('skillRows'); wrap.innerHTML = '';
  data.skills.forEach(s => {
    const row = document.createElement('div'); row.className = 'skill-row';
    row.innerHTML = `<input class="s-name" placeholder="Skill name" aria-label="Skill name">
      <input class="s-group" list="groups" placeholder="Group" aria-label="Group">
      <input class="s-level" type="range" min="0" max="100" aria-label="Level">
      <output></output>
      <button class="btn btn-ghost btn-small danger" type="button">Remove</button>`;
    const [name, group, level] = row.querySelectorAll('input');
    const out = row.querySelector('output');
    name.value = s.name; group.value = s.group; level.value = s.level; out.textContent = s.level;
    name.oninput = () => { s.name = name.value; markUnsaved(); };
    group.oninput = () => { s.group = group.value || 'Other'; markUnsaved(); };
    level.oninput = () => { s.level = +level.value; out.textContent = level.value; markUnsaved(); };
    row.querySelector('button').onclick = () => { data.skills = data.skills.filter(x => x !== s); renderSkills(); markUnsaved(); };
    wrap.appendChild(row);
  });
  wrap.insertAdjacentHTML('beforeend', '<datalist id="groups"><option value="Graphic Design"><option value="Web Development"></datalist>');
}

$('addSkill').onclick = () => {
  data.skills.push({ id: 's' + Date.now(), name: '', level: 70, group: 'Graphic Design' });
  renderSkills(); markUnsaved();
};

/* ---------- backup ---------- */

$('exportBtn').onclick = () => {
  readSimpleFields();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = 'content.json'; a.click();
};
$('importFile').addEventListener('change', async e => {
  try {
    data = { ...DEFAULT_DATA, ...JSON.parse(await e.target.files[0].text()) };
    await Store.save(data); init(); toast('Backup restored');
  } catch { toast('That file could not be read'); }
});
$('resetBtn').onclick = async () => {
  if (!confirm('Reset all content back to the starter version?')) return;
  await Store.reset(); data = await Store.load(); init(); toast('Reset done');
};

/* ---------- start ---------- */

$('saveBtn').onclick = () => persist('Changes saved');
window.addEventListener('beforeunload', e => { if ($('status').classList.contains('dirty')) e.preventDefault(); });

localStorage.setItem(OWNER_KEY, '1'); // shows the Edit button on the public page for you only

function init() {
  fillSimpleFields(); showPreview($('pPreview'), data.profile.image);
  renderProjectList(); openProjectForm(null); renderSkills();
}
Store.load().then(d => { data = d; init(); });
