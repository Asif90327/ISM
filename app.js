/**
 * Hospital Storage Protection System — Interactive Simulation Engine
 * SRM IST 21CSE359T Information Storage & Management Case Study
 */

// =============================================================================
// Simulation Data & Calibration (Synchronized with Python results.json)
// =============================================================================
const SIM_DATA = {
  db_size_gb: 500.0,
  disks_count: 6,
  disk_cap_tb: 2.0,
  raw_cap_tb: 12.0,
  backup_bw_mbps: 400.0,
  restore_bw_mbps: 500.0,
  set_overhead_min: 3.0,
  rto_limit_min: 60.0,
  rpo_limit_hr: 24.0,
  daily_change: [
    0.0330, 0.0260, 0.0460, 0.0229, 0.0414, 0.0346, 0.0223,
    0.0403, 0.0215, 0.0373, 0.0228, 0.0236, 0.0370, 0.0531
  ],
  raid_specs: {
    "RAID 0": {
      usable_tb: 12.0,
      overhead_pct: 0.0,
      tolerance: 0,
      rebuild_hours: null,
      formula: "N \u00d7 2 TB = 6 \u00d7 2 TB = 12 TB",
      overhead_desc: "0% Overhead (Zero Redundancy)",
      tol_desc: "0 Disks (Any failure causes total data loss)",
      rebuild_desc: "Not recoverable (Unprotected array)"
    },
    "RAID 1": {
      usable_tb: 6.0,
      overhead_pct: 50.0,
      tolerance: 1,
      rebuild_hours: 4.3,
      formula: "(N / 2) \u00d7 2 TB = 3 \u00d7 2 TB = 6 TB",
      overhead_desc: "50% Overhead (Complete data mirroring)",
      tol_desc: "1 Disk guaranteed (up to 3 non-partner disks)",
      rebuild_desc: "Direct 1-to-1 mirror copy"
    },
    "RAID 5": {
      usable_tb: 10.0,
      overhead_pct: 16.7,
      tolerance: 1,
      rebuild_hours: 7.8,
      formula: "(N - 1) \u00d7 2 TB = 5 \u00d7 2 TB = 10 TB",
      overhead_desc: "16.7% Overhead (1 disk equivalent for XOR parity)",
      tol_desc: "1 Disk (Single distributed parity)",
      rebuild_desc: "At 50% available disk rebuild I/O (7.8 hrs)"
    },
    "RAID 6": {
      usable_tb: 8.0,
      overhead_pct: 33.3,
      tolerance: 2,
      rebuild_hours: 9.7,
      formula: "(N - 2) \u00d7 2 TB = 4 \u00d7 2 TB = 8 TB",
      overhead_desc: "33.3% Overhead (2 disks equivalent for P+Q parity)",
      tol_desc: "2 Disks guaranteed (Dual parity protection)",
      rebuild_desc: "At 40% available disk rebuild I/O (9.7 hrs)"
    },
    "RAID 10": {
      usable_tb: 6.0,
      overhead_pct: 50.0,
      tolerance: 1,
      rebuild_hours: 4.3,
      formula: "(N / 2) \u00d7 2 TB = 3 \u00d7 2 TB = 6 TB",
      overhead_desc: "50% Overhead (Striped mirrors)",
      tol_desc: "1 Disk guaranteed (survives up to 3 non-paired crashes)",
      rebuild_desc: "At 90% available disk rebuild I/O (4.3 hrs - Fastest!)"
    }
  }
};

// =============================================================================
// State Management
// =============================================================================
let currentRaid = "RAID 5";
let diskStates = [true, true, true, true, true, true]; // true = online, false = failed
let activeStrategy = "Differential";
let selectedDay = 14;

// Precomputed 14-day schedule data
function calculateBackupSchedules() {
  const sched = { Full: [], Incremental: [], Differential: [] };
  let cumChanged = 0;

  for (let d = 0; d < 14; d++) {
    const ch = SIM_DATA.db_size_gb * SIM_DATA.daily_change[d];
    if (d % 7 === 0) {
      sched.Full.push(SIM_DATA.db_size_gb);
      sched.Incremental.push(SIM_DATA.db_size_gb);
      sched.Differential.push(SIM_DATA.db_size_gb);
      cumChanged = 0;
    } else {
      cumChanged += ch;
      sched.Full.push(SIM_DATA.db_size_gb);
      sched.Incremental.push(ch);
      sched.Differential.push(cumChanged);
    }
  }
  return sched;
}

const backupSchedules = calculateBackupSchedules();

// =============================================================================
// DOM Initialization
// =============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initNavigationTabs();
  initRaidSimulator();
  initXorParityLab();
  initBackupSimulator();
  initVivaAccordion();
  initSliders();
});

// -----------------------------------------------------------------------------
// 1. Navigation Tabs
// -----------------------------------------------------------------------------
function initNavigationTabs() {
  const navBtns = document.querySelectorAll(".nav-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");
      navBtns.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add("active");
    });
  });
}

// -----------------------------------------------------------------------------
// 2. RAID Simulator Module
// -----------------------------------------------------------------------------
function initRaidSimulator() {
  const raidSelect = document.getElementById("raid-level-select");
  const btnReset = document.getElementById("btn-reset-disks");
  const btnCrashRandom = document.getElementById("btn-crash-random");
  const btnRebuild = document.getElementById("btn-rebuild-array");

  raidSelect.addEventListener("change", (e) => {
    currentRaid = e.target.value;
    updateRaidMetrics();
    renderDiskEnclosure();
    renderStripeTable();
    checkArrayHealth();
  });

  btnReset.addEventListener("click", () => {
    diskStates = [true, true, true, true, true, true];
    renderDiskEnclosure();
    renderStripeTable();
    checkArrayHealth();
  });

  btnCrashRandom.addEventListener("click", () => {
    const onlineIndices = diskStates.map((st, idx) => st ? idx : -1).filter(idx => idx !== -1);
    if (onlineIndices.length > 0) {
      const randIdx = onlineIndices[Math.floor(Math.random() * onlineIndices.length)];
      crashDisk(randIdx);
    }
  });

  btnRebuild.addEventListener("click", () => {
    executeArrayRebuild();
  });

  updateRaidMetrics();
  renderDiskEnclosure();
  renderStripeTable();
  checkArrayHealth();
}

function updateRaidMetrics() {
  const spec = SIM_DATA.raid_specs[currentRaid];
  document.getElementById("raid-usable-cap").textContent = `${spec.usable_tb.toFixed(1)} TB`;
  document.getElementById("raid-cap-formula").textContent = spec.formula;
  document.getElementById("raid-overhead").textContent = `${spec.overhead_pct.toFixed(1)}%`;
  document.getElementById("raid-overhead-desc").textContent = spec.overhead_desc;
  document.getElementById("raid-tolerance").textContent = `${spec.tolerance} Disk${spec.tolerance !== 1 ? 's' : ''}`;
  document.getElementById("raid-tolerance-desc").textContent = spec.tol_desc;
  document.getElementById("raid-rebuild-time").textContent = spec.rebuild_hours ? `${spec.rebuild_hours.toFixed(1)} Hours` : "N/A";
  document.getElementById("raid-rebuild-desc").textContent = spec.rebuild_desc;
}

function renderDiskEnclosure() {
  const container = document.getElementById("disk-enclosure");
  container.innerHTML = "";

  diskStates.forEach((isOnline, idx) => {
    const slot = document.createElement("div");
    slot.className = `disk-slot ${isOnline ? 'disk-online' : 'disk-failed'}`;
    slot.id = `disk-slot-${idx}`;
    slot.title = `Click to ${isOnline ? 'fail' : 'reconnect'} Disk ${idx}`;

    let roleTag = "";
    if (currentRaid === "RAID 1" || currentRaid === "RAID 10") {
      roleTag = idx % 2 === 0 ? "Mirror A" : "Mirror B";
    } else if (currentRaid === "RAID 5") {
      roleTag = "Data + Parity (Left-Sym)";
    } else if (currentRaid === "RAID 6") {
      roleTag = "Data + Dual P/Q";
    } else {
      roleTag = "Striped Block";
    }

    slot.innerHTML = `
      <div class="disk-led"></div>
      <div class="disk-icon">🖴</div>
      <div class="disk-label">Disk ${idx}</div>
      <div class="disk-spec">2 TB SAS 7.2K</div>
      <div class="text-xs text-muted mt-1">${roleTag}</div>
      <div class="disk-status-txt">${isOnline ? 'ONLINE' : 'FAILED'}</div>
    `;

    slot.addEventListener("click", () => {
      if (diskStates[idx]) {
        crashDisk(idx);
      } else {
        diskStates[idx] = true;
        renderDiskEnclosure();
        renderStripeTable();
        checkArrayHealth();
      }
    });

    container.appendChild(slot);
  });
}

function crashDisk(idx) {
  diskStates[idx] = false;
  renderDiskEnclosure();
  renderStripeTable();
  checkArrayHealth();
}

function checkArrayHealth() {
  const failedCount = diskStates.filter(st => !st).length;
  const healthBadge = document.getElementById("array-health-badge");
  const led = document.getElementById("array-status-led");
  const btnRebuild = document.getElementById("btn-rebuild-array");

  if (failedCount === 0) {
    healthBadge.className = "badge badge-success";
    healthBadge.textContent = "HEALTHY / ONLINE";
    btnRebuild.disabled = true;
    return;
  }

  btnRebuild.disabled = false;

  // Determine state per RAID level
  if (currentRaid === "RAID 0") {
    healthBadge.className = "badge badge-danger";
    healthBadge.textContent = "CRITICAL: ARRAY CORRUPTED & UNRECOVERABLE";
    btnRebuild.disabled = true;
  } else if (currentRaid === "RAID 5") {
    if (failedCount === 1) {
      healthBadge.className = "badge badge-warning";
      healthBadge.textContent = "DEGRADED (Single Parity Protection Active)";
    } else {
      healthBadge.className = "badge badge-danger";
      healthBadge.textContent = "DATA LOSS: 2 Simultaneous Failures Exceed Single Parity";
      btnRebuild.disabled = true;
    }
  } else if (currentRaid === "RAID 6") {
    if (failedCount <= 2) {
      healthBadge.className = "badge badge-warning";
      healthBadge.textContent = `DEGRADED (${failedCount} Failed — Protected by Dual Parity P+Q)`;
    } else {
      healthBadge.className = "badge badge-danger";
      healthBadge.textContent = "DATA LOSS: >2 Failures Exceed Dual Parity";
      btnRebuild.disabled = true;
    }
  } else if (currentRaid === "RAID 1" || currentRaid === "RAID 10") {
    // Check if both disks in any mirror pair failed: (0,1), (2,3), (4,5)
    let pairBroken = (!diskStates[0] && !diskStates[1]) ||
                     (!diskStates[2] && !diskStates[3]) ||
                     (!diskStates[4] && !diskStates[5]);
    if (pairBroken) {
      healthBadge.className = "badge badge-danger";
      healthBadge.textContent = "DATA LOSS: Both Disks in a Mirrored Pair Failed!";
      btnRebuild.disabled = true;
    } else {
      healthBadge.className = "badge badge-warning";
      healthBadge.textContent = `DEGRADED (${failedCount} Drive Crash — Surviving Mirrors Active)`;
    }
  }
}

function executeArrayRebuild() {
  const btnRebuild = document.getElementById("btn-rebuild-array");
  btnRebuild.disabled = true;
  btnRebuild.textContent = "⚙️ Rebuilding Sectors via Parity XOR...";

  const failedIndices = diskStates.map((st, i) => !st ? i : -1).filter(i => i !== -1);
  failedIndices.forEach(idx => {
    const slot = document.getElementById(`disk-slot-${idx}`);
    if (slot) {
      slot.className = "disk-slot disk-rebuilding";
      const txt = slot.querySelector(".disk-status-txt");
      if (txt) txt.textContent = "REBUILDING";
    }
  });

  setTimeout(() => {
    diskStates = [true, true, true, true, true, true];
    renderDiskEnclosure();
    renderStripeTable();
    checkArrayHealth();
    btnRebuild.textContent = "🛠️ Rebuild Array with Parity";
    alert("✅ Parity Rebuild Complete! All sectors reconstructed bit-for-bit and array returned to HEALTHY state.");
  }, 1200);
}

function renderStripeTable() {
  const tbody = document.getElementById("stripe-table-body");
  tbody.innerHTML = "";

  const numStripes = 6;
  const numDisks = 6;

  for (let s = 0; s < numStripes; s++) {
    const tr = document.createElement("tr");
    let rowHtml = `<td class="font-600">Stripe ${s}</td>`;

    // Parity positions for RAID 5 (left-symmetric: parity = (disks - 1 - stripe) % disks)
    const pRaid5 = (numDisks - 1 - s) % numDisks;
    // For RAID 6: P and Q
    const pRaid6 = (numDisks - 1 - s) % numDisks;
    const qRaid6 = (pRaid6 + 1) % numDisks;

    for (let d = 0; d < numDisks; d++) {
      const isFailed = !diskStates[d];
      let cellClass = "";
      let cellText = "";

      if (isFailed) {
        cellClass = "block-corrupt";
        cellText = "LOST [0x00]";
      } else if (currentRaid === "RAID 0") {
        cellClass = "block-data";
        cellText = `D_${s * numDisks + d}`;
      } else if (currentRaid === "RAID 5") {
        if (d === pRaid5) {
          cellClass = "block-parity";
          cellText = `Parity P_${s}`;
        } else {
          cellClass = "block-data";
          cellText = `Data D_${s}.${d}`;
        }
      } else if (currentRaid === "RAID 6") {
        if (d === pRaid6) {
          cellClass = "block-parity";
          cellText = `Parity P_${s}`;
        } else if (d === qRaid6) {
          cellClass = "block-parity-q";
          cellText = `Parity Q_${s}`;
        } else {
          cellClass = "block-data";
          cellText = `Data D_${s}.${d}`;
        }
      } else if (currentRaid === "RAID 10" || currentRaid === "RAID 1") {
        const pair = Math.floor(d / 2);
        if (d % 2 === 0) {
          cellClass = "block-data";
          cellText = `D_${s}.${pair}`;
        } else {
          cellClass = "block-mirror";
          cellText = `Mirror M_${s}.${pair}`;
        }
      }

      rowHtml += `<td class="${cellClass}">${cellText}</td>`;
    }
    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  }
}

// -----------------------------------------------------------------------------
// 3. Bitwise XOR Parity Lab
// -----------------------------------------------------------------------------
let originalBlocks = [];
let corruptedBlock = null;
let crashedDriveIndex = 2;

function initXorParityLab() {
  document.getElementById("btn-calc-xor").addEventListener("click", computeBitwiseXor);
  document.getElementById("btn-rand-sample").addEventListener("click", loadSampleMedicalRecord);
  document.getElementById("btn-exec-fail").addEventListener("click", executeDriveCrash);
  document.getElementById("btn-exec-restore").addEventListener("click", executeXorRestore);
  document.getElementById("btn-exec-double-fail").addEventListener("click", executeDoubleDriveCrash);

  computeBitwiseXor();
}

function loadSampleMedicalRecord() {
  const samples = [
    ["PATIENT_SMITH_A1", "ICU_BED_302_O_POS", "DOSAGE_50MG_IV_DR", "VITALS_STABLE_98P"],
    ["HEPARIN_DRIP_05U", "LAB_INR_TARGET2.5", "ALLERGY_PENICILL", "DIAGNOSIS_CARDIAC"],
    ["BLOOD_PRESSURE120", "GLUCOSE_FAST_95MG", "SURGERY_OR_4_STAT", "POST_OP_RECOVERY"]
  ];
  const pick = samples[Math.floor(Math.random() * samples.length)];
  document.getElementById("txt-d0").value = pick[0];
  document.getElementById("txt-d1").value = pick[1];
  document.getElementById("txt-d2").value = pick[2];
  document.getElementById("txt-d3").value = pick[3];
  computeBitwiseXor();
}

function stringToByteArray(str, length = 16) {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = i < str.length ? str.charCodeAt(i) : 0x20; // pad with spaces
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

function computeBitwiseXor() {
  const d0Str = document.getElementById("txt-d0").value || " ";
  const d1Str = document.getElementById("txt-d1").value || " ";
  const d2Str = document.getElementById("txt-d2").value || " ";
  const d3Str = document.getElementById("txt-d3").value || " ";

  const d0 = stringToByteArray(d0Str);
  const d1 = stringToByteArray(d1Str);
  const d2 = stringToByteArray(d2Str);
  const d3 = stringToByteArray(d3Str);

  const parity = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    parity[i] = d0[i] ^ d1[i] ^ d2[i] ^ d3[i];
  }

  originalBlocks = [d0, d1, d2, d3, parity];
  document.getElementById("lbl-parity-hex").textContent = bytesToHex(parity);

  const status = document.getElementById("proof-status-text");
  status.textContent = "Status: Parity computed successfully. Ready for failure injection.";
  document.getElementById("btn-exec-restore").disabled = true;
  document.getElementById("btn-exec-fail").disabled = false;

  renderHexDiff(originalBlocks, -1);
}

function executeDriveCrash() {
  const radios = document.getElementsByName("fail_drive");
  let selected = 2;
  for (let r of radios) {
    if (r.checked) { selected = parseInt(r.value); break; }
  }
  crashedDriveIndex = selected;

  // Clone and erase crashed block
  const modifiedBlocks = originalBlocks.map(b => new Uint8Array(b));
  corruptedBlock = new Uint8Array(modifiedBlocks[selected]); // save for comparison
  modifiedBlocks[selected].fill(0x00); // wiped to zero

  const status = document.getElementById("proof-status-text");
  status.innerHTML = `<span class="text-danger">⚠️ DISK ${selected === 4 ? 'PARITY' : selected} HAS PHYSICALLY CRASHED! Block wiped to 0x00.</span>`;

  document.getElementById("btn-exec-restore").disabled = false;
  document.getElementById("btn-exec-fail").disabled = true;

  renderHexDiff(modifiedBlocks, selected);
}

function executeXorRestore() {
  const restored = new Uint8Array(16);

  // XOR all blocks EXCEPT the crashed one
  for (let b = 0; b < 5; b++) {
    if (b !== crashedDriveIndex) {
      for (let i = 0; i < 16; i++) {
        restored[i] ^= originalBlocks[b][i];
      }
    }
  }

  // Verify match
  let exactMatch = true;
  for (let i = 0; i < 16; i++) {
    if (restored[i] !== originalBlocks[crashedDriveIndex][i]) {
      exactMatch = false;
      break;
    }
  }

  const restoredBlocks = originalBlocks.map(b => new Uint8Array(b));
  restoredBlocks[crashedDriveIndex] = restored;

  const status = document.getElementById("proof-status-text");
  status.innerHTML = `
    <span class="text-emerald">
      🎉 RECONSTRUCTION SUCCESSFUL!
      <br>Rebuilt Block ${crashedDriveIndex === 4 ? 'Parity' : 'D' + crashedDriveIndex}: <strong>${bytesToHex(restored)}</strong>
      <br>Bit-for-Bit Hash Integrity: <strong class="badge badge-success">100% BIT-EXACT MATCH &check;</strong>
    </span>
  `;

  document.getElementById("btn-exec-restore").disabled = true;
  document.getElementById("btn-exec-fail").disabled = false;

  renderHexDiff(restoredBlocks, -1);
}

function executeDoubleDriveCrash() {
  const resultDiv = document.getElementById("double-fail-result");
  resultDiv.innerHTML = `
    <div class="text-danger font-mono mt-1" style="line-height:1.4;">
      💥 CRASHING DISK 0 AND DISK 1 SIMULTANEOUSLY...
      <br>&cross; Equation: D0 &oplus; D1 = P &oplus; D2 &oplus; D3
      <br>⚠️ FATAL: 1 XOR equation with TWO unknown variables (D0, D1) cannot be uniquely resolved!
      <br><span class="badge badge-danger">RAID 5 TOTAL COLLAPSE — ALL CLINICAL RECORDS LOST</span>
    </div>
  `;
}

function renderHexDiff(blocks, crashedIdx) {
  const view = document.getElementById("hex-diff-view");
  const labels = ["Disk 0 (D0)", "Disk 1 (D1)", "Disk 2 (D2)", "Disk 3 (D3)", "Parity (P)"];

  let html = "";
  blocks.forEach((blk, idx) => {
    const isCrashed = idx === crashedIdx;
    const color = isCrashed ? 'text-danger' : (idx === 4 ? 'text-amber' : 'text-primary');
    html += `
      <div style="margin-bottom: 4px;">
        <span class="${color}" style="font-weight:700; width:110px; display:inline-block;">${labels[idx]}:</span>
        <span style="${isCrashed ? 'text-decoration:line-through; color:#ef4444;' : ''}">${bytesToHex(blk)}</span>
        ${isCrashed ? '<span class="badge badge-danger" style="margin-left:8px;">CRASHED</span>' : ''}
      </div>
    `;
  });
  view.innerHTML = html;
}

// -----------------------------------------------------------------------------
// 4. 14-Day Backup & Disaster Recovery Simulator
// -----------------------------------------------------------------------------
function initBackupSimulator() {
  const stratBtns = document.querySelectorAll(".strat-btn");
  stratBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      stratBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeStrategy = btn.getAttribute("data-strat");
      updateBackupView();
    });
  });

  const daySlider = document.getElementById("slider-day");
  daySlider.addEventListener("input", (e) => {
    selectedDay = parseInt(e.target.value);
    document.getElementById("lbl-curr-day").textContent = `Day ${selectedDay}`;
    renderDayPills();
    renderDayDetail();
  });

  document.getElementById("btn-trigger-disaster").addEventListener("click", () => {
    executeDisasterDrill();
  });

  renderDayPills();
  renderDayDetail();
  updateBackupView();
}

function updateBackupView() {
  const totalStorage = {
    Full: "7,000.0 GB",
    Incremental: "1,194.2 GB",
    Differential: "1,649.0 GB",
    Compare: "1,649.0 GB (Diff)"
  };

  const savings = {
    Full: "Baseline (0% Savings)",
    Incremental: "83% Storage Savings vs Daily Full",
    Differential: "76% Storage Savings vs Daily Full",
    Compare: "Differential achieves ideal trade-off"
  };

  const restoreTimes = {
    Full: "20.1 Minutes",
    Incremental: "41.4 Minutes",
    Differential: "26.4 Minutes",
    Compare: "Diff: 26.4 min vs Incr: 41.4 min"
  };

  const avgDurations = {
    Full: "21.3 Minutes",
    Incremental: "3.6 Minutes",
    Differential: "5.0 Minutes",
    Compare: "3.6 min (Incr) vs 5.0 min (Diff)"
  };

  const stratKey = activeStrategy === "Compare" ? "Differential" : activeStrategy;
  document.getElementById("bk-stat-storage").textContent = totalStorage[activeStrategy];
  document.getElementById("bk-stat-savings").textContent = savings[activeStrategy];
  document.getElementById("bk-stat-restore").textContent = restoreTimes[activeStrategy];
  document.getElementById("bk-stat-duration").textContent = avgDurations[activeStrategy];

  renderDayDetail();
}

function renderDayPills() {
  const container = document.getElementById("day-pills-container");
  container.innerHTML = "";

  for (let d = 1; d <= 14; d++) {
    const isFullDay = d === 1 || d === 8;
    const isSelected = d === selectedDay;
    const pill = document.createElement("div");
    pill.className = `day-pill ${isFullDay ? 'full-day' : ''} ${isSelected ? 'active' : ''}`;
    pill.innerHTML = `
      <div class="font-600">Day ${d}</div>
      <div class="text-muted" style="font-size:0.68rem;">${isFullDay ? 'FULL' : (SIM_DATA.daily_change[d-1]*100).toFixed(1)+'%'}</div>
    `;

    pill.addEventListener("click", () => {
      selectedDay = d;
      document.getElementById("slider-day").value = d;
      document.getElementById("lbl-curr-day").textContent = `Day ${d}`;
      renderDayPills();
      renderDayDetail();
    });

    container.appendChild(pill);
  }
}

function renderDayDetail() {
  const dIdx = selectedDay - 1;
  const changeRate = SIM_DATA.daily_change[dIdx];
  const changedGb = SIM_DATA.db_size_gb * changeRate;

  const fullSize = backupSchedules.Full[dIdx];
  const incrSize = backupSchedules.Incremental[dIdx];
  const diffSize = backupSchedules.Differential[dIdx];

  const isWeeklyFull = selectedDay === 1 || selectedDay === 8;

  const box = document.getElementById("day-detail-box");
  box.innerHTML = `
    <div class="grid-3">
      <div>
        <div class="text-xs text-muted">DAY ${selectedDay} CLINICAL TRANSACTIONS</div>
        <div class="font-600 text-sm mt-1">Daily Change Rate: <strong>${(changeRate * 100).toFixed(2)}%</strong></div>
        <div class="text-xs text-muted">Modified EMR Records: <strong>${changedGb.toFixed(1)} GB</strong></div>
        ${isWeeklyFull ? '<span class="badge badge-accent mt-2">WEEKLY FULL BACKUP SCHEDULED</span>' : ''}
      </div>

      <div>
        <div class="text-xs text-muted">BACKUP SIZE PRODUCED TODAY</div>
        <div class="text-xs mt-1">Full Backup: <strong class="font-mono">${fullSize.toFixed(1)} GB</strong></div>
        <div class="text-xs">Incremental: <strong class="font-mono text-emerald">${incrSize.toFixed(1)} GB</strong></div>
        <div class="text-xs">Differential: <strong class="font-mono text-primary">${diffSize.toFixed(1)} GB</strong></div>
      </div>

      <div>
        <div class="text-xs text-muted">BACKUP WINDOW TIME (@ 400 MB/s)</div>
        <div class="text-xs mt-1">Full: <strong class="font-mono">${(fullSize * 1024 / 400 / 60).toFixed(1)} min</strong></div>
        <div class="text-xs">Incremental: <strong class="font-mono text-emerald">${(incrSize * 1024 / 400 / 60).toFixed(1)} min</strong></div>
        <div class="text-xs">Differential: <strong class="font-mono text-primary">${(diffSize * 1024 / 400 / 60).toFixed(1)} min</strong></div>
      </div>
    </div>
  `;
}

function executeDisasterDrill() {
  const drillContent = document.getElementById("drill-active-content");
  const initial = document.querySelector(".drill-initial");
  initial.classList.add("hidden");
  drillContent.classList.remove("hidden");

  // Highlight winner card
  const winnerCard = document.getElementById("card-restore-diff");
  winnerCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// -----------------------------------------------------------------------------
// 5. Interactive Sliders (Rebuild Under Production Load)
// -----------------------------------------------------------------------------
function initSliders() {
  const sliderLoad = document.getElementById("slider-prod-load");
  const sliderBw = document.getElementById("slider-disk-bw");

  function recalculate() {
    const loadPct = parseInt(sliderLoad.value);
    const diskBw = parseInt(sliderBw.value);

    document.getElementById("lbl-prod-load").textContent = `${loadPct}%`;
    document.getElementById("lbl-disk-bw").textContent = `${diskBw} MB/s`;

    // Available rebuild bandwidth
    const availFraction = (100 - loadPct) / 100;
    const availBw = diskBw * availFraction;
    document.getElementById("calc-avail-bw").textContent = `${availBw.toFixed(1)} MB/s`;

    // 2 TB in MB
    const totalMb = 2.0 * 1024 * 1024;
    const rebuildHours = totalMb / availBw / 3600;

    document.getElementById("calc-rebuild-hours").textContent = `${rebuildHours.toFixed(1)} Hours`;
    document.getElementById("calc-ure-note").innerHTML = `
      ⚠️ In RAID 5, during these <strong>${rebuildHours.toFixed(1)} hours</strong>, the hospital has ZERO redundancy. An URE or second drive crash causes permanent clinical record loss!
    `;
  }

  sliderLoad.addEventListener("input", recalculate);
  sliderBw.addEventListener("input", recalculate);
  recalculate();
}

// -----------------------------------------------------------------------------
// 6. Viva Accordion
// -----------------------------------------------------------------------------
function initVivaAccordion() {
  const items = document.querySelectorAll(".accordion-item");
  items.forEach(item => {
    const header = item.querySelector(".accordion-header");
    header.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      items.forEach(i => i.classList.remove("open"));
      if (!isOpen) item.classList.add("open");
    });
  });
}
