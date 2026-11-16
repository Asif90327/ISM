# SRM Institute of Science and Technology
## 21CSE359T – Information Storage and Management
### Case Study Project Demonstration & Viva Presentation Guide

**Project Title:** Design and Simulation of a RAID-Based Backup and Recovery System for a Hospital Information System  
**Department:** Department of Computing Technologies, School of Computing  
**Academic Year:** 2026–2027  

---

## 1. Executive Summary of the Demonstration

This demonstration implements a comprehensive, two-layer storage protection solution for a hypothetical **300-bed hospital** running a 24x7 Hospital Information System (HIS) with a **500 GB core Electronic Medical Record (EMR) database**:

- **Layer 1 (Intelligent Primary Storage Array - RAID):** High-availability hardware fault-tolerance to keep clinical workflows running uninterrupted through physical disk crashes.
- **Layer 2 (Multi-Tiered Backup & Recovery):** Independent data protection to survive logical data corruption, operator error, ransomware outbreaks, and complete data centre loss within a **1-hour Recovery Time Objective (RTO)** and a **24-hour Recovery Point Objective (RPO)**.

---

## 2. Quick Start: How to Run the Demonstration

You have two interactive ways to run this demonstration:

### Method A: Interactive Web Dashboard (Recommended for Presentations & Viva)
1. **Double-click:** `start_demo.bat`  
   *(or run `python run_demo.py` in your terminal)*
2. Your default web browser will open automatically at:
   ```
   http://localhost:8080/index.html
   ```
3. The dashboard is fully interactive: you can crash disks, simulate bitwise XOR parity rebuilds, scrubber across the 14-day backup calendar, trigger a ransomware disaster drill, and view high-resolution charts.

### Method B: Interactive Terminal CLI Suite
Run the terminal suite directly in PowerShell or Command Prompt:
```powershell
python demo_cli.py
```
This provides an interactive menu:
- `Option 1`: Live bit-exact RAID 5 XOR parity rebuild (256 stripes × 4 KiB).
- `Option 2`: RAID 5 double-failure unrecoverable demonstration.
- `Option 3`: RAID levels comparison on six 2 TB disks (12 TB raw).
- `Option 4`: 14-day backup cycle comparison (Full, Incremental, Differential).
- `Option 5`: Day-14 disaster recovery drill and 1-hour RTO verification.
- `Option 6`: Automated end-to-end run of all modules.
- `Option 7`: Re-generate all Chapter 5 publication figures (`fig_*.png`).
- `Option 8`: Launch the Web GUI dashboard.

---

## 3. Walkthrough of the Demonstration Modules

### Module 1: Interactive RAID Simulator
- **Disk Chassis (6 Enterprise 2 TB SAS Bays):** Visualizes healthy drives (Green), failed drives (Red), and rebuilding drives (Blue).
- **Interactive Failure:** Click any disk to trigger physical degradation.
- **RAID Level Selector:**
  - **RAID 0:** 12.0 TB usable (0% overhead), 0 fault tolerance.
  - **RAID 1:** 6.0 TB usable (50% overhead), tolerates 1 drive failure.
  - **RAID 5:** 10.0 TB usable (16.7% overhead), single parity.
  - **RAID 6:** 8.0 TB usable (33.3% overhead), dual parity (P+Q), tolerates 2 drive failures!
  - **RAID 10:** 6.0 TB usable (50% overhead), fastest rebuild time (4.3 hrs) and 0 write penalty.
- **Stripe & Parity Visualizer:** Displays block layout across stripes with left-symmetric rotating parity ($P_s = (N - 1 - s) \pmod N$) to eliminate dedicated parity bottlenecks.
- **Rebuild Exposure Window:** Interactive slider showing how background hospital clinical transactions (production load) prolong rebuild times (e.g., at 50% load, 2 TB rebuild requires **7.8 hours** in RAID 5 and **9.7 hours** in RAID 6).

---

### Module 2: Bitwise XOR Parity Engine (Mathematical Proof)
Demonstrates the exact bitwise operations implemented in **Algorithm 1 & 2** of the case study:

1. **Parity Generation:**
   $$\text{Parity } (P) = D_0 \oplus D_1 \oplus D_2 \oplus D_3$$
2. **Failure Injection & Rebuild:**
   When Disk $f$ is erased ($D_f = 0$):
   $$D_f = \bigoplus_{i \neq f} D_i$$
   The engine computes the XOR of all surviving disks and verifies a **100% bit-exact hash match** with the original clinical record.
3. **Double Failure Mathematical Proof:**
   $$\text{Missing Disks } D_0 \text{ and } D_1 \implies D_0 \oplus D_1 = \text{Accumulated Parity}$$
   A single equation with **two unknown variables** cannot be uniquely resolved. Single parity RAID 5 suffers catastrophic data loss.

---

### Module 3: 14-Day Backup Cycle Simulator
Models a 500 GB hospital database mutating between **2.1% and 5.3%** each day over a two-week period with weekly full backups on **Day 1** and **Day 8**:

| Metric | Daily Full | Full + Incremental | Full + Differential (Recommended) |
| :--- | :---: | :---: | :---: |
| **Total Storage Used (14 Days)** | 7,000.0 GB | 1,194.2 GB | **1,649.0 GB** |
| **Storage Savings vs Full** | Baseline | 83% Savings | **76% Savings** |
| **Average Daily Backup Window** | 21.3 min | 3.6 min | **5.0 min** |
| **Backup Sets to Restore (Day 14)** | 1 Set | 7 Sets | **2 Sets** |
| **Day-14 Restore Time** | 20.1 min | 41.4 min | **26.4 min** |
| **Meets 1-Hour RTO Target?** | Yes | Yes (Marginal) | **Yes (33.6 min safety cushion)** |

---

### Module 4: Disaster Recovery Drill (Ransomware / Corruption Strike)
- Simulates complete EMR volume corruption on **Day 14 at 23:59**.
- **Restore Mechanics:**
  - **Incremental Restore:** Must mount Day 8 Full + Day 9 + Day 10 + Day 11 + Day 12 + Day 13 + Day 14 (7 separate media mounts @ 3 min each = 21.0 min mounting overhead!). Total recovery time: **41.4 minutes**.
  - **Differential Restore:** Only requires Day 8 Full + Day 14 Differential (2 sets = 6.0 min mounting overhead!). Total recovery time: **26.4 minutes**.
- **Why Differential is Superior for Hospitals:** It restores **36% faster** than incremental, operates well inside the 60-minute RTO, and eliminates the catastrophic risk where one corrupt incremental slice invalidates the rest of the chain.

---

### Module 5: Hospital Architecture & Workload Tiering
Matches **Figure 3.1** and **Table 3.1** of the report:

1. **Tier 1 (EMR / HIS Database - 500 GB):**  
   - **Protection:** RAID 10 (Striped Mirrors) + Hot Spares.  
   - **Rationale:** Highest transaction write IOPS, zero parity small-write penalty, and fastest rebuild under load (4.3h).  
   - **SLA:** RTO = 1 hour, RPO = 24 hours.
2. **Tier 2 (PACS Radiology Archive):**  
   - **Protection:** RAID 6 (Dual Parity P+Q).  
   - **Rationale:** Massive sequential image volumes requiring protection against double drive failure during prolonged rebuilds.  
   - **SLA:** RTO = 4 hours, RPO = 24 hours.
3. **Tier 3 (Administrative & Billing):**  
   - **Protection:** RAID 6.  
   - **SLA:** RTO = 24 hours, RPO = 24 hours.
4. **Disaster Recovery Tier:** Fast local disk staging pool for instant LAN restores + Air-gapped offsite cloud repository to protect against campus fire, flood, or site-wide ransomware.

---

## 4. Key Viva Questions & Model Answers

### Q1. Why does RAID 5 suffer from the "Small-Write Penalty"?
**Answer:** In RAID 5, parity is calculated across all stripe blocks. When an application writes a small block $D_{\text{new}}$ that does not constitute a full stripe, writing directly would require reading all other data blocks. Instead, controllers use the differential formula:
$$P_{\text{new}} = P_{\text{old}} \oplus D_{\text{old}} \oplus D_{\text{new}}$$
This requires **2 disk reads** ($D_{\text{old}}$ and $P_{\text{old}}$) and **2 disk writes** ($D_{\text{new}}$ and $P_{\text{new}}$), generating **4 total I/O operations for every single write**. In high-frequency online transaction processing (OLTP) like an EMR database, this penalty causes severe latency.

### Q2. Why is RAID 10 rebuild time faster than RAID 5?
**Answer:** In RAID 10, rebuilding a failed drive is a direct sequential 1-to-1 bit copy from its surviving mirror disk. The controller does not need to read from all array drives or compute parity in memory. In our model, RAID 10 rebuilds in **4.3 hours** at 90% available bandwidth, compared to **7.8 hours** for RAID 5 (limited to 50% bandwidth due to parity computation and bus contention).

### Q3. What is an Unrecoverable Read Error (URE) and how does it affect large drives?
**Answer:** Modern enterprise HDDs have an URE rate around 1 in $10^{14}$ bits read (~12.5 TB). Rebuilding a single failed 2 TB drive in a 5-disk RAID 5 array requires reading 8 TB of continuous data across surviving drives. The statistical risk of encountering an unreadable sector is very high. In RAID 5, encountering an URE during a rebuild halts reconstruction and results in catastrophic array failure. RAID 6 mitigates this with dual parity ($P+Q$), surviving an URE or second drive crash.

### Q4. Can RAID replace Backups?
**Answer:** **No.** RAID provides high availability against physical hardware disk failures only. If a user accidentally deletes patient records, if a corrupted transaction is committed, or if ransomware encrypts the database, RAID faithfully mirrors and parities that corrupted data to all disks immediately. Backup provides independent, point-in-time recovery points to restore uncorrupted data.

### Q5. How does India's DPDP Act, 2023 apply to this system?
**Answer:** Under Section 8 of the Digital Personal Data Protection (DPDP) Act 2023, healthcare providers are Data Fiduciaries processing sensitive personal health data. They must take "reasonable security safeguards" to prevent personal data breaches or permanent loss. Implementing dual-layer protection (RAID 10/6 + offsite backups + verified RTO drills) ensures regulatory compliance and avoids severe statutory penalties.

---

## 5. Artifacts and Source Code in this Workspace

- `index.html`: Interactive single-page web application dashboard.
- `style.css`: Responsive CSS theme featuring SRM branding, disk chassis graphics, and RTO gauges.
- `app.js`: Client-side simulation engine, bitwise XOR calculator, and backup timeline scrubber.
- `sim.py`: Course report simulation script that outputs `results.json` and all Chapter 5 publication figures (`fig_raid.png`, `fig_backup_size.png`, `fig_backup_compare.png`, `fig_rebuild.png`).
- `demo_cli.py`: Interactive CLI terminal suite with colored menus and live mathematical proofs.
- `run_demo.py`: Python web server and browser launcher.
- `start_demo.bat`: 1-click batch launcher for Windows.
- `results.json`: Benchmark dataset generated by the simulation.
