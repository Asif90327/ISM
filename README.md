# Design & Simulation of a RAID-Based Backup and Recovery System for a Hospital Information System (HIS)

**Course:** 21CSE359T – Information Storage and Management  
**Institution:** Department of Computing Technologies, School of Computing, SRM Institute of Science and Technology, Kattankulathur  
**Scenario:** 300-Bed Hospital with 500 GB Electronic Medical Record (EMR) Database  
**Service Level Agreements (SLAs):**
- **Recovery Time Objective (RTO):** $\le 1.0\text{ Hour}$
- **Recovery Point Objective (RPO):** $\le 24.0\text{ Hours}$

---

## 📌 Project Overview

Hospital Information Systems (HIS) manage critical patient data including Electronic Medical Records (EMR), Picture Archiving and Communication Systems (PACS), lab results, and medication schedules. A storage failure risks patient safety and regulatory non-compliance (e.g., India's Digital Personal Data Protection Act, 2023).

This project implements and evaluates a **two-layer storage protection architecture**:
1. **Layer 1 (Intelligent Primary Storage Array - RAID):** High-availability hardware fault-tolerance to keep clinical workflows running uninterrupted through physical disk crashes.
2. **Layer 2 (Multi-Tiered Backup & Recovery):** Point-in-time independent protection to survive logical data corruption, operator error, ransomware outbreaks, and complete data centre loss within a 1-hour RTO.

---

## 🚀 Interactive Demonstrations

This repository includes two demonstration environments:

### 1. Interactive Web Dashboard (`index.html`)
An enterprise storage console interface running in any browser:
- **6-Bay Interactive Storage Array Chassis:** Live disk LEDs (Online, Degraded, Rebuilding, Failed), switchable RAID levels (0, 1, 5, 6, 10), and left-symmetric rotating parity distribution.
- **Bitwise XOR Parity Engine:** Real-time mathematical lab demonstrating parity generation ($P = D_0 \oplus D_1 \oplus D_2 \oplus D_3$), single-drive failure injection, XOR bit-for-bit reconstruction ($D_{\text{lost}} = \bigoplus_{i \neq \text{lost}} D_i$), and double-drive failure collapse proof.
- **14-Day Backup Cycle Scrubber:** Daily change tracking ($2.1\%$ to $5.3\%$) across Full, Incremental, and Differential backup policies.
- **Emergency Disaster Recovery Drill:** Day-14 database crash simulation, backup set mount sequence, and RTO SLA comparison gauge.
- **Viva & Examination Assistant:** Built-in interactive Q&A for course examination preparation.

### 2. Interactive Terminal CLI Suite (`demo_cli.py`)
A terminal-based simulation menu with mathematical proofs and step-by-step verification.

---

## 🛠️ How to Run

### Quick Start (Web Dashboard)
- **Windows (1-Click):** Double-click `start_demo.bat`
- **Via Python:**
  ```bash
  python run_demo.py
  ```
  *Opens automatically at `http://localhost:8080/index.html`.*

### Terminal CLI Demonstration
```bash
python demo_cli.py
```

### Reproduce Figures & Simulation Data
```bash
python sim.py
```
*Generates `results.json` and all publication PNG charts.*

---

## 📊 Key Experimental Findings

### 1. RAID Level Comparison (Six 2 TB Enterprise Disks = 12 TB Raw)

| RAID Level | Usable Capacity | Capacity Overhead | Guaranteed Disk Failures Tolerated | Rebuild Time under Production Load | Recommended Hospital Role |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **RAID 0** | 12.0 TB | 0.0% | 0 Disks | Unrecoverable | Unsuitable (Zero redundancy) |
| **RAID 1** | 6.0 TB | 50.0% | 1 Disk (up to 3) | Not modelled | High overhead |
| **RAID 5** | 10.0 TB | 16.7% | 1 Disk | 7.8 Hours | Vulnerable to 2nd crash during 7.8h rebuild |
| **RAID 6** | 8.0 TB | 33.3% | **2 Disks** | 9.7 Hours | **Tier 2 PACS Images & Tier 3 Admin** |
| **RAID 10** | 6.0 TB | 50.0% | **1 Guaranteed** | **4.3 Hours (Fastest)** | **Tier 1 EMR DB (No write penalty)** |

### 2. 14-Day Backup Strategy Comparison (500 GB EMR Database)

| Strategy | Total 14-Day Storage | Savings vs Full | Sets Required for Day-14 Restore | Day-14 Restore Duration | Compliance with 1-Hr RTO SLA |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Daily Full** | 7,000.0 GB | Baseline | 1 Set | 20.1 min | Passes SLA, but storage footprint is excessive |
| **Full + Incremental** | 1,194.2 GB | **83% Savings** | 7 Sets | 41.4 min | Passes SLA, but leaves only an 18.6 min margin |
| **Full + Differential** | **1,649.0 GB** | **76% Savings** | **2 Sets** | **26.4 min** | **Optimal: 33.6 min safety cushion + only 2 sets** |

```
                       RECOVERY TIME OBJECTIVE (RTO) COMPARISON
0 min                                   30 min                     60 min (RTO SLA)
|-----------------------------------------|---------------------------|
[======== Daily Full: 20.1 min ========]
[=========== Full + Differential: 26.4 min (RECOMMENDED) ===========]
[============================= Full + Incremental: 41.4 min =============================]
```

---

## 🏥 Recommended Hospital Architecture

- **Tier 1 (EMR / HIS Database - 500 GB):** RAID 10 for high transaction write throughput, zero parity small-write penalty, and fastest rebuild (4.3h).
- **Tier 2 (PACS Radiology Archive):** RAID 6 with dual parity ($P+Q$) to survive double drive failures during long rebuild windows.
- **Tier 3 (Admin & Billing):** RAID 6 for high capacity efficiency.
- **Backup & Recovery Policy:** Weekly Full (Days 1 & 8) + Daily Differential to local disk pool for fast restores (26.4 min) + Offsite/cloud copy for disaster recovery and ransomware air-gapping.

---

## 📁 Repository Structure

```
├── index.html              # Interactive Web Dashboard
├── style.css               # Styling, responsive layout & chassis graphics
├── app.js                  # Simulation logic, bitwise XOR engine & disaster drill
├── demo_cli.py             # Interactive Terminal CLI demonstration
├── sim.py                  # Core simulation script (generates results & figures)
├── run_demo.py             # Python HTTP server & browser launcher
├── start_demo.bat          # Windows 1-click batch launcher
├── DEMO_GUIDE.md           # Presentation script & Viva examination guide
├── results.json            # Benchmark data output from sim.py
├── fig_raid.png            # Figure 5.1: Usable capacity & fault tolerance
├── fig_rebuild.png         # Figure 5.2: Modelled rebuild time under load
├── fig_backup_size.png     # Figure 5.3: Daily backup size over 14 days
└── fig_backup_compare.png  # Figure 5.4: Storage vs Day-14 restore time
```

---

## 📜 Academic Attribution
- **Institution:** SRM Institute of Science and Technology, Kattankulathur
- **Department:** Department of Computing Technologies
- **Course:** 21CSE359T – Information Storage and Management (ISM)
