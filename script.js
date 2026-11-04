/* ==========================================================
   script.js  —  shared data layer + public portfolio
   ----------------------------------------------------------
   PART 1: Store  (all saving/loading lives here)
   PART 2: Rendering the public page
   admin.html also loads this file to reuse the Store.
   ========================================================== */

/* ---------- PART 1: DATA STORE ---------- */

const OWNER_KEY = 'arctic-portfolio-owner'; // set in YOUR browser when you log in; only used to show the Edit button
const isOwner = () => !!localStorage.getItem(OWNER_KEY);

// Starting content. Replace it from the dashboard, not here.
const DEFAULT_DATA = {
  profile: {
    name: 'Your Name',
    title: 'Graphic Designer & Web Developer',
    intro: 'I design bold visuals and build the websites that carry them. Open the dashboard to make this page yours.',
    image: ''
  },
  about: {
    lead: 'A student who draws in the morning and codes at night.',
    text: 'I started with posters and logos, then learned HTML and CSS so my designs could move. Now I move between Figma and the browser, and I like the work best where the two meet.'
  },
  projects: [
    { id: 'p1', title: 'Polar Type', category: 'Poster Design', description: 'A typographic poster series about melting ice.', details: 'Three posters exploring contrast, scale and cold color palettes. Printed on A2.', image: '' },
    { id: 'p2', title: 'Frost Brand Kit', category: 'Branding', description: 'Logo and identity for a fictional skincare label.', details: 'Includes logo, color system, packaging mockups and social templates.', image: '' },
    { id: 'p3', title: 'Aurora Magazine', category: 'Editorial', description: 'A six-page magazine spread layout.', details: 'Grid-based layout study with large photography and a serif/sans pairing.', image: '' }
  ],
  skills: [
    { id: 's1', name: 'Photoshop', level: 85, group: 'Graphic Design' },
    { id: 's2', name: 'Illustrator', level: 80, group: 'Graphic Design' },
    { id: 's3', name: 'Typography', level: 75, group: 'Graphic Design' },
    { id: 's4', name: 'HTML & CSS', level: 90, group: 'Web Development' },
    { id: 's5', name: 'JavaScript', level: 70, group: 'Web Development' },
    { id: 's6', name: 'Responsive design', level: 80, group: 'Web Development' }
  ],
  contact: { github: '', email: '', facebook: '', instagram: '', telegram: '', other: '' }
};

/* Supabase connection. Your URL and key live in supabase-config.js.
   Everything else in the project talks to the Store only, so this is
   the one place that knows where the data is kept. */
const CFG = window.SUPABASE_CONFIG || {};
const cloudReady = !!(window.supabase && CFG.url && CFG.anonKey && !CFG.url.includes('PASTE'));
const db = cloudReady ? window.supabase.createClient(CFG.url, CFG.anonKey) : null;
const BUCKET = 'portfolio-images';

const Store = {
  ready: cloudReady,

  // Everyone (visitors too) can read the portfolio
  async load() {
    if (db) {
      try {
        const { data, error } = await db.from('portfolio').select('data').eq('id', 1).maybeSingle();
        if (!error && data && data.data) return { ...DEFAULT_DATA, ...data.data };
        if (error) console.error(error);
      } catch (e) { console.error(e); }
    }
    return structuredClone(DEFAULT_DATA);   // starter content if nothing is saved yet
  },

  // Only the logged-in owner can write (the database enforces this)
  async save(content) {
    if (!db) return false;
    const { error } = await db.from('portfolio').upsert({ id: 1, data: content, updated_at: new Date().toISOString() });
    if (error) console.error(error);
    return !error;
  },

  async reset() { return Store.save(structuredClone(DEFAULT_DATA)); },

  // Uploads an image file to Supabase Storage and returns its public web address
  async uploadImage(blob) {
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await db.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
    if (error) throw error;
    return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  },

  // Login helpers used by the dashboard
  auth: {
    async session() { const { data } = await db.auth.getSession(); return data.session; },
    async signIn(email, password) {
      const { error } = await db.auth.signInWithPassword({ email, password });
      return error ? error.message : null;
    },
    async signOut() { await db.auth.signOut(); }
  }
};

/* ---------- PART 2: PUBLIC PAGE ---------- */

// Small helper: build an element safely (text is never treated as HTML)
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

// Show an image, or a gradient placeholder with the first letter
function mediaInto(box, image, label) {
  box.innerHTML = '';
  if (image) {
    const img = el('img'); img.src = image; img.alt = label; box.appendChild(img);
  } else {
    box.classList.add('ph');
    box.appendChild(el('span', '', (label || '?').charAt(0)));
  }
}

function renderPublic(d) {
  document.title = `${d.profile.name} — ${d.profile.title}`;
  document.getElementById('navName').textContent = d.profile.name;
  document.getElementById('footName').textContent = `© ${new Date().getFullYear()} ${d.profile.name}`;

  // The Edit button is hidden from visitors; only your browser shows it
  document.getElementById('editLink').hidden = !isOwner();

  // Hero
  document.getElementById('heroTitle').textContent = d.profile.title;
  document.getElementById('heroName').textContent = d.profile.name;
  document.getElementById('heroIntro').textContent = d.profile.intro;
  mediaInto(document.getElementById('heroVisual'), d.profile.image, d.profile.name);

  // About
  document.getElementById('aboutLead').textContent = d.about.lead;
  document.getElementById('aboutText').textContent = d.about.text;

  // Projects
  const grid = document.getElementById('projectGrid');
  grid.innerHTML = '';
  if (!d.projects.length) grid.appendChild(el('p', 'empty', 'No projects yet. Add one from the dashboard.'));
  d.projects.forEach(p => {
    const card = el('button', 'card');
    card.type = 'button';
    const media = el('div', 'card-media'); mediaInto(media, p.image, p.title);
    const info = el('div', 'card-info');
    info.append(el('span', 'tag', p.category), el('h3', '', p.title), el('p', '', p.description));
    card.append(media, info);
    card.addEventListener('click', () => openModal(p));
    grid.appendChild(card);
  });

  // Skills, grouped by the "group" name
  const wrap = document.getElementById('skillsWrap');
  wrap.innerHTML = '';
  const groups = [...new Set(d.skills.map(s => s.group))];
  groups.forEach(g => {
    const col = el('div', 'skill-col');
    col.appendChild(el('h3', '', g));
    d.skills.filter(s => s.group === g).forEach(s => {
      const row = el('div', 'skill');
      const bar = el('i'); bar.style.setProperty('--lvl', s.level + '%');
      const top = el('div', 'skill-top'); top.append(el('span', '', s.name), el('span', '', s.level + '%'));
      const track = el('div', 'bar'); track.appendChild(bar);
      row.append(top, track); col.appendChild(row);
    });
    wrap.appendChild(col);
  });

  // Contact: only show links that have a value
  const links = document.getElementById('contactLinks');
  links.innerHTML = '';
  const c = d.contact;
  const items = [
    ['Email', c.email && 'mailto:' + c.email, c.email],
    ['GitHub', c.github, c.github],
    ['Facebook', c.facebook, c.facebook],
    ['Instagram', c.instagram, c.instagram],
    ['Telegram', c.telegram, c.telegram],
    ['Other', c.other, c.other]
  ];
  items.filter(i => i[1]).forEach(([label, href, text]) => {
    const a = el('a', 'contact-link');
    a.href = href; a.target = '_blank'; a.rel = 'noopener';
    a.append(el('strong', '', label), el('span', '', text.replace(/^https?:\/\//, '')));
    links.appendChild(a);
  });
  if (!links.children.length) links.appendChild(el('p', 'empty', 'Add your links in the dashboard.'));
}

// Modal
function openModal(p) {
  mediaInto(document.getElementById('modalImg'), p.image, p.title);
  document.getElementById('modalCat').textContent = p.category;
  document.getElementById('modalTitle').textContent = p.title;
  document.getElementById('modalDesc').textContent = p.description;
  document.getElementById('modalDetails').textContent = p.details || '';
  document.getElementById('modal').showModal();
}

// Only run on the public page (admin.html loads this file too)
if (document.body.dataset.page === 'public') {
  Store.load().then(renderPublic);
  const modal = document.getElementById('modal');
  document.getElementById('modalClose').onclick = () => modal.close();
  modal.addEventListener('click', e => { if (e.target === modal) modal.close(); }); // click backdrop to close
}
