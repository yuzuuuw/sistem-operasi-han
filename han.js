/* ═══════════════════════════════════════════════════════════
   MEMORY MANAGEMENT & VIRTUAL MEMORY SIMULATOR
   script.js — Pure JS, no dependencies
═══════════════════════════════════════════════════════════ */

// ─── STATE ───────────────────────────────────────────────
const STATE = {
  // Simulator Alokasi (Section 3)
  ram: {
    total: 10,
    programs: [],        // [{id, name, size, color}]
  },

  // External Fragmentation (Section 4)
  ext: {
    total: 12,
    slots: [],           // [{type:'prog'|'hole'|'free', size, color, name}]
    progCounter: 0,
    colors: ['#3b82f6','#22c55e','#f59e0b','#06b6d4','#a78bfa','#f472b6']
  },

  // Virtual Memory (Section 5)
  vm: {
    ramSize: 4,          // frames
    diskSize: 8,         // pages
    ramFrames: [],       // [{pageId, size}]
    diskPages: [],       // [{pageId, size}]
    pageTable: [],       // [{vPage, status, location, addr}]
    pageFaults: 0,
    pageHits: 0,
    currentPage: 0,
    totalPages: 0,
    programSize: 0,
    running: false,
  },

  // Dashboard
  dashboard: {
    pageFault: 0,
    diskUsed: 0,
    extFragPercent: 0,
  }
};

// ─── COLORS POOL ─────────────────────────────────────────
const PROG_COLORS = ['#3b82f6','#22c55e','#f59e0b','#06b6d4','#a78bfa','#f472b6','#34d399','#fb923c'];
let colorIndex = 0;
function nextColor() {
  const c = PROG_COLORS[colorIndex % PROG_COLORS.length];
  colorIndex++;
  return c;
}

// ─── UTILS ───────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  const colors = { info: '#3b82f6', success: '#22c55e', error: '#ef4444', warning: '#f59e0b' };
  toast.textContent = msg;
  toast.style.borderColor = colors[type] || colors.info;
  toast.style.color = colors[type] || colors.info;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function addLog(msg, type = 'info') {
  const log = document.getElementById('activityLog');
  const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${timestamp}] ${msg}`;
  log.appendChild(entry);
  // Keep max 50 entries
  while (log.children.length > 50) log.removeChild(log.firstChild);
}

function animateCounter(el, from, to, suffix = '', duration = 600) {
  const start = performance.now();
  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
    const val = Math.round(from + (to - from) * ease);
    el.textContent = val + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function updateDashboard() {
  const used = STATE.ram.programs.reduce((s, p) => s + p.size, 0);
  const pct  = Math.round((used / STATE.ram.total) * 100);

  document.getElementById('dashRamUsed').textContent = used + ' MB';
  document.getElementById('dashRamBar').style.width   = pct + '%';
  document.getElementById('dashPrograms').textContent = STATE.ram.programs.length;
  document.getElementById('dashFrag').textContent      = STATE.dashboard.extFragPercent + '%';
  document.getElementById('dashPageFault').textContent = STATE.dashboard.pageFault;
  document.getElementById('dashDisk').textContent      = STATE.dashboard.diskUsed + ' MB';
}

// ─── NAVBAR ───────────────────────────────────────────────
(function initNavbar() {

  const links = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section');

  // Active nav saat scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {

      if (entry.isIntersecting) {

        links.forEach(link => {
          link.classList.remove('active');
        });

        const activeLink = document.querySelector(
          `.nav-link[href="#${entry.target.id}"]`
        );

        if (activeLink) {
          activeLink.classList.add('active');
        }
      }

    });
  }, {
    threshold: 0.4
  });

  sections.forEach(section => {
    observer.observe(section);
  });

  // HAMBURGER MENU
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.querySelector('.nav-links');

  if (hamburger && navLinks) {

    hamburger.addEventListener('click', () => {

      // buka/tutup menu
      navLinks.classList.toggle('active');

    });

    // auto close setelah klik menu
    navLinks.querySelectorAll('a').forEach(link => {

      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });

    });

  }

})();

/* ═══════════════════════════════════════════════════════════
   SECTION 3 — SIMULATOR ALOKASI
═══════════════════════════════════════════════════════════ */

/**
 * Renders the RAM bar and program list from STATE.ram
 */
function renderRam() {
  const bar     = document.getElementById('ramBar');
  const progList= document.getElementById('progList');
  const used    = STATE.ram.programs.reduce((s, p) => s + p.size, 0);
  const free    = STATE.ram.total - used;
  const pct     = Math.round((used / STATE.ram.total) * 100);

  document.getElementById('simUsed').textContent    = used + ' MB';
  document.getElementById('simFree').textContent    = free + ' MB';
  document.getElementById('simPercent').textContent = pct + '%';

  // Build bar HTML
  let barHTML = '';
  STATE.ram.programs.forEach(p => {
    const w = (p.size / STATE.ram.total * 100).toFixed(1);
    const darkColor = p.color + '33';
    barHTML += `
      <div class="ram-block" style="width:${w}%;background:${darkColor};border-right:2px solid ${p.color};color:${p.color}"
           onclick="removeProgram('${p.id}')" title="Klik untuk hapus ${p.name}">
        ${p.name}<br><span style="font-size:0.6rem;opacity:0.8">${p.size}MB</span>
      </div>`;
  });
  if (free > 0) {
    const w = (free / STATE.ram.total * 100).toFixed(1);
    barHTML += `<div class="ram-free-block" style="width:${w}%">FREE ${free}MB</div>`;
  }
  bar.innerHTML = barHTML;

  // Build program list
  if (STATE.ram.programs.length === 0) {
    progList.innerHTML = '<div style="font-size:0.72rem;color:#4d6890;text-align:center;padding:0.5rem">Belum ada program</div>';
  } else {
    progList.innerHTML = STATE.ram.programs.map(p => `
      <div class="prog-item">
        <span class="prog-item-dot" style="background:${p.color}"></span>
        <span class="prog-item-name">${p.name}</span>
        <span class="prog-item-size">${p.size} MB</span>
        <button class="prog-remove" onclick="removeProgram('${p.id}')" title="Hapus">✕</button>
      </div>`).join('');
  }

  updateDashboard();
}

/**
 * Add a program to RAM simulator
 */
function addProgram(name, size, color) {
  const used = STATE.ram.programs.reduce((s, p) => s + p.size, 0);

  if (used + size > STATE.ram.total) {
    const alert = document.getElementById('memFullAlert');
    alert.classList.add('show');
    setTimeout(() => alert.classList.remove('show'), 3000);
    showToast(`Memory penuh! Tidak cukup ruang untuk ${name} (${size}MB)`, 'error');
    addLog(`❌ Gagal load ${name} (${size}MB) — Memory full`, 'error');
    return;
  }

  const id = 'prog_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  STATE.ram.programs.push({ id, name, size, color: color || nextColor() });
  renderRam();
  showToast(`✅ ${name} (${size}MB) berhasil dimuat ke RAM`, 'success');
  addLog(`📥 ${name} (${size}MB) dimuat ke RAM`, 'success');
}

/**
 * Add custom program
 */
function addCustomProgram() {
  const nameEl = document.getElementById('customName');
  const sizeEl = document.getElementById('customSize');
  const name   = nameEl.value.trim() || 'Custom';
  const size   = parseInt(sizeEl.value);

  if (!size || size < 1 || size > 10) {
    showToast('Masukkan ukuran program antara 1–10 MB', 'warning');
    return;
  }

  addProgram(name, size);
  nameEl.value = '';
  sizeEl.value = '';
}

/**
 * Remove a program by ID
 */
function removeProgram(id) {
  const idx = STATE.ram.programs.findIndex(p => p.id === id);
  if (idx === -1) return;
  const prog = STATE.ram.programs[idx];
  STATE.ram.programs.splice(idx, 1);
  renderRam();
  showToast(`🗑 ${prog.name} dihapus dari RAM`, 'info');
  addLog(`🗑 ${prog.name} dihapus dari RAM`, 'warning');
}

/**
 * Reset all memory
 */
function resetMemory() {
  STATE.ram.programs = [];
  colorIndex = 0;
  renderRam();
  document.getElementById('memFullAlert').classList.remove('show');
  showToast('⟳ Memory direset', 'info');
  addLog('⟳ RAM Simulator direset', 'info');
}

// Initialize RAM on load
renderRam();

/* ═══════════════════════════════════════════════════════════
   SECTION 4 — FRAGMENTASI
═══════════════════════════════════════════════════════════ */

// ── Tab switching ────────────────────────────────────────
function switchFragTab(tab, btn) {
  document.querySelectorAll('.frag-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.frag-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('frag' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
}

// ── Internal Fragmentation ──────────────────────────────
function updateInternalFrag(value) {
  const size  = parseInt(value);
  const total = 4;
  const waste = total - size;
  const usedPct  = (size / total * 100).toFixed(0);
  const wastePct = (waste / total * 100).toFixed(0);

  document.getElementById('internalSizeLabel').textContent = size + ' MB';
  document.getElementById('internalUsed').textContent      = size + ' MB';
  document.getElementById('internalWaste').textContent     = `${waste} MB (${wastePct}%)`;
  document.getElementById('internalUsedBar').style.width   = usedPct + '%';
  document.getElementById('internalUsedBar').textContent   = `Program (${size}MB)`;
  document.getElementById('internalWasteBar').style.width  = wastePct + '%';

  const expl = document.getElementById('internalExplanation');
  if (waste === 0) {
    expl.innerHTML = `Program ${size}MB pas dengan partisi 4MB. <strong>Tidak ada internal fragmentasi!</strong>`;
  } else {
    expl.innerHTML = `Program ${size}MB dialokasikan ke partisi 4MB. Tersisa <strong>${waste}MB (${wastePct}%)</strong> yang tidak bisa digunakan program lain → <strong>Internal Fragmentation</strong>.`;
  }
}
// Initialize
updateInternalFrag(3);

// ── External Fragmentation ──────────────────────────────
const EXT_COLORS = ['#3b82f6','#22c55e','#f59e0b','#06b6d4','#a78bfa','#f472b6'];
let extColorIdx = 0;
function extNextColor() {
  const c = EXT_COLORS[extColorIdx % EXT_COLORS.length];
  extColorIdx++;
  return c;
}

function renderExtRam() {
  const bar = document.getElementById('extRamBar');
  if (!STATE.ext.slots.length) {
    bar.innerHTML = `<div class="ext-block ext-free" style="width:100%;flex:1">FREE 12MB</div>`;
    calculateExtFrag();
    return;
  }

  bar.innerHTML = STATE.ext.slots.map((slot, i) => {
    const w = (slot.size / STATE.ext.total * 100).toFixed(2);
    if (slot.type === 'prog') {
      const dark = slot.color + '33';
      return `<div class="ext-block" style="width:${w}%;background:${dark};border-right:2px solid ${slot.color};color:${slot.color}"
               title="${slot.name} (${slot.size}MB)">${slot.name}<br><span style="font-size:0.6rem;opacity:0.7">${slot.size}MB</span></div>`;
    } else if (slot.type === 'hole') {
      return `<div class="ext-block ext-hole" style="width:${w}%">
                <span>⬜</span>
                <span>${slot.size}MB<br>HOLE</span>
              </div>`;
    } else {
      return `<div class="ext-block ext-free" style="width:${w}%;flex:none">FREE<br>${slot.size}MB</div>`;
    }
  }).join('');

  calculateExtFrag();
}

function calculateExtFrag() {
  const holes = STATE.ext.slots.filter(s => s.type === 'hole');
  const totalHole = holes.reduce((s, h) => s + h.size, 0);
  const pct = Math.round((totalHole / STATE.ext.total) * 100);
  STATE.dashboard.extFragPercent = pct;
  updateDashboard();
}

function extUsed() {
  return STATE.ext.slots.reduce((s, sl) => sl.type === 'prog' ? s + sl.size : s, 0);
}

function extFreeTotal() {
  return STATE.ext.slots.reduce((s, sl) => sl.type !== 'prog' ? s + sl.size : s, 0);
}

function extFreeContiguous() {
  let frees = STATE.ext.slots.filter(s => s.type === 'free' || s.type === 'hole');
  return Math.max(0, ...frees.map(f => f.size), 0);
}

function setExtMessage(msg, type) {
  const el = document.getElementById('extMessage');
  el.className = `ext-message ${type}`;
  el.textContent = msg;
}

function extAddProgram() {
  const sizes = [2, 3, 2, 3];
  const size = sizes[STATE.ext.progCounter % sizes.length];
  const name = 'P' + (STATE.ext.progCounter + 1);
  const color = extNextColor();

  const freeSlotsTotal = extFreeTotal();
  if (size > freeSlotsTotal) {
    setExtMessage(`❌ Tidak cukup ruang untuk ${name} (${size}MB). Total free: ${freeSlotsTotal}MB`, 'error');
    return;
  }

  // Find contiguous free space to place the program
  let placed = false;
  for (let i = 0; i < STATE.ext.slots.length; i++) {
    const slot = STATE.ext.slots[i];
    if ((slot.type === 'free' || slot.type === 'hole') && slot.size >= size) {
      const remainder = slot.size - size;
      if (remainder > 0) {
        STATE.ext.slots.splice(i, 1,
          { type: 'prog', size, color, name },
          { type: 'hole', size: remainder }
        );
      } else {
        STATE.ext.slots[i] = { type: 'prog', size, color, name };
      }
      placed = true;
      break;
    }
  }

  if (!placed) {
    // Add to end if free
    const totalUsed = extUsed();
    if (totalUsed + size <= STATE.ext.total) {
      STATE.ext.slots.push({ type: 'prog', size, color, name });
      placed = true;
    }
  }

  if (!placed) {
    setExtMessage(`❌ Tidak ada blok bebas yang cukup untuk ${name} (${size}MB) — External Fragmentation!`, 'error');
    addLog(`❌ External fragmentation: ${name} gagal dimuat`, 'error');
    return;
  }

  STATE.ext.progCounter++;
  renderExtRam();
  setExtMessage(`✅ ${name} (${size}MB) berhasil dimuat`, 'success');
  addLog(`📥 ${name} (${size}MB) dimuat ke External Mem`, 'success');
}

function extRemoveMiddle() {
  const progs = STATE.ext.slots.map((s, i) => ({ ...s, idx: i })).filter(s => s.type === 'prog');
  if (progs.length < 2) {
    setExtMessage('⚠ Perlu minimal 2 program untuk menghapus yang di tengah.', 'info');
    return;
  }
  const midIdx = Math.floor(progs.length / 2);
  const target = progs[midIdx];
  STATE.ext.slots[target.idx] = { type: 'hole', size: target.size };
  renderExtRam();
  setExtMessage(`🗑 ${target.name} dihapus → lubang memori terbentuk! (External Fragmentation)`, 'error');
  addLog(`🕳 ${target.name} dihapus — lubang ${target.size}MB terbentuk`, 'warning');
}

function extAddLarge() {
  const size = 5;
  const contiguous = extFreeContiguous();
  const totalFree  = extFreeTotal();

  if (totalFree >= size && contiguous < size) {
    setExtMessage(`⚠ Memory not contiguous! Total free: ${totalFree}MB, tapi blok terbesar: ${contiguous}MB < 5MB yang dibutuhkan → External Fragmentation!`, 'error');
    addLog(`❌ Program besar 5MB gagal — Memory available but not contiguous!`, 'error');
    return;
  }
  if (totalFree < size) {
    setExtMessage(`❌ Tidak cukup ruang. Total free: ${totalFree}MB`, 'error');
    return;
  }

  const color = '#f472b6';
  for (let i = 0; i < STATE.ext.slots.length; i++) {
    const slot = STATE.ext.slots[i];
    if ((slot.type === 'free' || slot.type === 'hole') && slot.size >= size) {
      const remainder = slot.size - size;
      if (remainder > 0) {
        STATE.ext.slots.splice(i, 1, { type: 'prog', size, color, name: 'LARGE' }, { type: 'hole', size: remainder });
      } else {
        STATE.ext.slots[i] = { type: 'prog', size, color, name: 'LARGE' };
      }
      break;
    }
  }

  STATE.ext.progCounter++;
  renderExtRam();
  setExtMessage(`✅ Program besar (5MB) berhasil dimuat setelah compaction`, 'success');
  addLog('📥 Program besar 5MB dimuat', 'success');
}

function compactMemory() {
  const progs = STATE.ext.slots.filter(s => s.type === 'prog');
  const holes = STATE.ext.slots.filter(s => s.type === 'hole');
  if (holes.length === 0) {
    setExtMessage('✅ Tidak ada fragmentasi. Memory sudah rapi.', 'success');
    return;
  }
  const totalHole = holes.reduce((s, h) => s + h.size, 0);
  const newSlots = [...progs];
  if (totalHole > 0) newSlots.push({ type: 'free', size: totalHole });
  STATE.ext.slots = newSlots;
  renderExtRam();
  showToast('⚡ Fragmentation Fixed! Memory compacted.', 'success');
  setExtMessage(`✅ Compaction selesai! ${totalHole}MB ruang bebas digabungkan. Sekarang coba tambah program besar.`, 'success');
  addLog('⚡ Memory compacted — fragmentasi hilang', 'success');
}

function extReset() {
  STATE.ext.slots = [];
  STATE.ext.progCounter = 0;
  extColorIdx = 0;
  renderExtRam();
  setExtMessage('', '');
  addLog('⟳ External fragmentation simulator direset', 'info');
}

// Initialize external fragmentation with some slots
(function initExtRam() {
  STATE.ext.slots = [
    { type: 'prog', size: 3, color: '#3b82f6', name: 'P1' },
    { type: 'prog', size: 2, color: '#22c55e', name: 'P2' },
    { type: 'prog', size: 3, color: '#f59e0b', name: 'P3' },
    { type: 'free', size: 4 },
  ];
  STATE.ext.progCounter = 3;
  extColorIdx = 3;
  renderExtRam();
})();

/* ═══════════════════════════════════════════════════════════
   SECTION 5 — VIRTUAL MEMORY & PAGING
═══════════════════════════════════════════════════════════ */

function vmReset() {
  const vm = STATE.vm;
  vm.ramFrames   = [];
  vm.diskPages   = [];
  vm.pageTable   = [];
  vm.pageFaults  = 0;
  vm.pageHits    = 0;
  vm.currentPage = 0;
  vm.totalPages  = 0;
  vm.running     = false;

  renderVmFrames();
  renderPageTable();
  document.getElementById('vmPageFault').textContent = '0';
  document.getElementById('vmPageHit').textContent   = '0';
  document.getElementById('vmRamUsage').textContent  = '0 / 4 MB';
  document.getElementById('vmDiskUsage').textContent = '0 MB';
  document.getElementById('vmRamLabel').textContent  = '0 / 4 frames';
  document.getElementById('vmDiskLabel').textContent = '0 / 8 pages';
  document.getElementById('vmAccessBtn').style.display = 'none';
  document.getElementById('swapUp').classList.remove('active');
  document.getElementById('swapDown').classList.remove('active');
  document.querySelector('.swap-label').classList.remove('active');

  STATE.dashboard.pageFault = 0;
  STATE.dashboard.diskUsed  = 0;
  updateDashboard();
  addLog('⟳ Virtual Memory simulator direset', 'info');
}

/**
 * Run a program in the VM simulator
 */
function vmRunProgram() {
  vmReset();
  const vm = STATE.vm;
  const progSize = parseInt(document.getElementById('vmProgramSize').value);
  const PAGE_SIZE = 1; // 1 MB per page
  vm.totalPages  = Math.ceil(progSize / PAGE_SIZE);
  vm.programSize = progSize;
  vm.running     = true;

  // Build page table: pages numbered 0..N-1
  vm.pageTable = Array.from({ length: vm.totalPages }, (_, i) => ({
    vPage: i,
    status: 'NOT_LOADED',
    location: '—',
    addr: '—'
  }));

  // Decide which pages go to RAM (up to 4), rest go to DISK
  const ramCapacity = Math.min(vm.totalPages, vm.ramSize);

  for (let i = 0; i < vm.totalPages; i++) {
    if (i < ramCapacity) {
      vm.ramFrames.push({ pageId: i, size: 1 });
      vm.pageTable[i] = { vPage: i, status: 'IN_RAM', location: 'RAM', addr: `Frame ${i}` };
    } else {
      vm.diskPages.push({ pageId: i, size: 1 });
      vm.pageTable[i] = { vPage: i, status: 'IN_DISK', location: 'DISK', addr: `Disk[${i - ramCapacity}]` };
    }
  }

  vm.currentPage = 0;
  renderVmFrames();
  renderPageTable();
  updateVmStats();

  if (vm.totalPages > vm.ramSize) {
    document.getElementById('vmAccessBtn').style.display = 'flex';
    addLog(`▶ Program ${progSize}MB dijalankan — ${ramCapacity} pages di RAM, ${vm.totalPages - ramCapacity} pages di Disk`, 'info');
  } else {
    addLog(`▶ Program ${progSize}MB dijalankan — semua ${vm.totalPages} pages fit di RAM`, 'success');
  }
  showToast(`Program ${progSize}MB dimuat`, 'success');
}

/**
 * Simulate accessing the next page (potentially causing page fault)
 */
function vmAccessPage() {
  const vm = STATE.vm;
  if (!vm.running || vm.totalPages === 0) return;

  // Cycle through pages
  const pageId = vm.currentPage % vm.totalPages;
  vm.currentPage++;

  const page = vm.pageTable[pageId];
  const swapLabel = document.querySelector('.swap-label');
  const swapUp    = document.getElementById('swapUp');
  const swapDown  = document.getElementById('swapDown');

  if (page.status === 'IN_RAM') {
    // Page Hit
    vm.pageHits++;
    document.getElementById('vmPageHit').textContent = vm.pageHits;
    showToast(`✅ Page ${pageId} — HIT! Sudah ada di RAM`, 'success');
    addLog(`✅ Page ${pageId} — HIT (sudah di RAM, frame ${page.addr})`, 'success');

    // Highlight in page table
    highlightPageTableRow(pageId);
  } else {
    // Page Fault!
    vm.pageFaults++;
    STATE.dashboard.pageFault = vm.pageFaults;
    document.getElementById('vmPageFault').textContent = vm.pageFaults;
    showToast(`⚡ Page Fault! Page ${pageId} tidak di RAM → swap dari disk`, 'error');
    addLog(`⚡ PAGE FAULT! Page ${pageId} perlu di-swap dari Disk ke RAM`, 'error');

    // Find a victim page in RAM to swap out (FIFO: oldest first)
    const victimIdx = 0;
    const victim    = vm.ramFrames[victimIdx];

    // Animate swap
    swapLabel.classList.add('active');
    swapDown.classList.add('active');
    swapUp.classList.add('active');
    setTimeout(() => {
      swapDown.classList.remove('active');
      swapUp.classList.remove('active');
      swapLabel.classList.remove('active');
    }, 1200);

    // Move victim from RAM to DISK
    if (victim) {
      const victimPage = vm.pageTable[victim.pageId];
      victimPage.status   = 'IN_DISK';
      victimPage.location = 'DISK';
      victimPage.addr     = `Disk[swap]`;

      // Put victim on disk
      const diskIdx = vm.diskPages.findIndex(d => d.pageId === pageId);
      if (diskIdx !== -1) {
        vm.diskPages[diskIdx] = { pageId: victim.pageId, size: 1 };
      } else {
        vm.diskPages.push({ pageId: victim.pageId, size: 1 });
      }

      // Move requested page to RAM
      vm.ramFrames[victimIdx] = { pageId: pageId, size: 1 };
      page.status   = 'IN_RAM';
      page.location = 'RAM';
      page.addr     = `Frame ${victimIdx}`;

      addLog(`↔ Page ${victim.pageId} ditukar ke Disk, Page ${pageId} dibawa ke RAM`, 'warning');
    }

    renderVmFrames();
    renderPageTable();
    updateVmStats();
    highlightPageTableRow(pageId, true);
  }
}

function renderVmFrames() {
  const vm = STATE.vm;
  const ramEl  = document.getElementById('vmRamFrames');
  const diskEl = document.getElementById('vmDiskFrames');

  // RAM Frames (4 slots)
  let ramHTML = '';
  for (let i = 0; i < vm.ramSize; i++) {
    const frame = vm.ramFrames[i];
    if (frame) {
      ramHTML += `<div class="vm-frame used">
        <span>Page ${frame.pageId}</span>
        <span class="frame-page-num">${frame.size}MB</span>
      </div>`;
    } else {
      ramHTML += `<div class="vm-frame empty">—</div>`;
    }
  }
  ramEl.innerHTML = ramHTML;

  // Disk Frames (8 slots)
  let diskHTML = '';
  for (let i = 0; i < vm.diskSize; i++) {
    const page = vm.diskPages[i];
    if (page) {
      diskHTML += `<div class="vm-frame disk-frame used">
        <span>Page ${page.pageId}</span>
        <span class="frame-page-num">${page.size}MB</span>
      </div>`;
    } else {
      diskHTML += `<div class="vm-frame empty disk-frame">—</div>`;
    }
  }
  diskEl.innerHTML = diskHTML;
}

function renderPageTable() {
  const tbody = document.getElementById('pageTableBody');
  const vm    = STATE.vm;

  if (!vm.pageTable.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;opacity:0.4">Jalankan program untuk melihat page table</td></tr>';
    return;
  }

  tbody.innerHTML = vm.pageTable.map(p => {
    const rowClass = p.status === 'IN_RAM' ? 'in-ram' : p.status === 'IN_DISK' ? 'in-disk' : '';
    const badge = p.status === 'IN_RAM'
      ? `<span class="status-badge status-ram">IN RAM</span>`
      : p.status === 'IN_DISK'
      ? `<span class="status-badge status-disk">IN DISK</span>`
      : `<span class="status-badge" style="background:rgba(75,85,99,0.3);color:#9ca3af">NOT LOADED</span>`;

    return `<tr class="${rowClass}">
      <td>VP ${p.vPage}</td>
      <td>${badge}</td>
      <td>${p.location}</td>
      <td>${p.addr}</td>
    </tr>`;
  }).join('');
}

function highlightPageTableRow(pageId, isFault = false) {
  const rows = document.querySelectorAll('#pageTableBody tr');
  rows.forEach(r => r.classList.remove('highlight'));
  if (rows[pageId]) {
    rows[pageId].classList.add('highlight');
    if (isFault) {
      const badge = rows[pageId].querySelector('.status-badge');
      if (badge) { badge.className = 'status-badge status-fault'; badge.textContent = 'PAGE FAULT'; }
    }
    setTimeout(() => rows[pageId]?.classList.remove('highlight'), 2000);
  }
}

function updateVmStats() {
  const vm = STATE.vm;
  const ramUsed  = vm.ramFrames.length;
  const diskUsed = vm.diskPages.length;

  document.getElementById('vmRamUsage').textContent  = `${ramUsed} / ${vm.ramSize} MB`;
  document.getElementById('vmDiskUsage').textContent = `${diskUsed} MB`;
  document.getElementById('vmRamLabel').textContent  = `${ramUsed} / ${vm.ramSize} frames`;
  document.getElementById('vmDiskLabel').textContent = `${diskUsed} / ${vm.diskSize} pages`;

  STATE.dashboard.diskUsed = diskUsed;
  updateDashboard();
}

/* ═══════════════════════════════════════════════════════════
   INTERSECTION OBSERVER — Animate on scroll
═══════════════════════════════════════════════════════════ */
(function initScrollAnimations() {
  const style = document.createElement('style');
  style.textContent = `
    .anim-target {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .anim-target.visible {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  const targets = document.querySelectorAll('.materi-card, .dash-card, .vm-concept, .materi-card, .pipe-node, .partition-block');
  targets.forEach((el, i) => {
    el.classList.add('anim-target');
    el.style.transitionDelay = (i % 4 * 0.08) + 's';
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.15 });

  targets.forEach(el => observer.observe(el));
})();

/* ═══════════════════════════════════════════════════════════
   HERO ANIMATION — Randomize block order
═══════════════════════════════════════════════════════════ */
(function heroAnimation() {
  const blocks = document.getElementById('heroRamBlocks');
  if (!blocks) return;

  setInterval(() => {
    const children = Array.from(blocks.children);
    // Randomly activate/pulse one block
    const rand = Math.floor(Math.random() * children.length);
    children.forEach((c, i) => {
      if (i === rand) {
        c.style.filter = 'brightness(1.5)';
        setTimeout(() => { c.style.filter = ''; }, 400);
      }
    });
  }, 1800);
})();

/* ═══════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
═══════════════════════════════════════════════════════════ */
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'r' || e.key === 'R') resetMemory();
  if (e.key === 'a' || e.key === 'A') addProgram('QuickApp', 2, nextColor());
  if (e.key === 'v' || e.key === 'V') vmAccessPage();
});

/* ═══════════════════════════════════════════════════════════
   INIT LOG
═══════════════════════════════════════════════════════════ */
addLog('🚀 Memory Management Simulator dimulai', 'success');
addLog('📘 Gunakan simulator di setiap section', 'info');
addLog('⌨ Shortcut: [R] Reset RAM, [A] Add app, [V] VM access', 'info');
updateDashboard();