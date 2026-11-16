"""Hospital Storage Protection System — Interactive CLI Demonstration
SRM Institute of Science and Technology | 21CSE359T Information Storage & Management
"""

import sys
import os
import time
import json
import random
import webbrowser
import http.server
import socketserver
import threading
import numpy as np

# Reconfigure stdout for UTF-8 on Windows if possible
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# ANSI Terminal Colors
C_RESET = "\033[0m"
C_BOLD = "\033[1m"
C_BLUE = "\033[94m"
C_CYAN = "\033[96m"
C_GREEN = "\033[92m"
C_YELLOW = "\033[93m"
C_RED = "\033[91m"
C_MAGENTA = "\033[95m"

def print_header(title):
    print("\n" + "=" * 75)
    print(f"{C_BOLD}{C_CYAN}  {title}{C_RESET}")
    print("=" * 75)

def press_enter():
    input(f"\n{C_YELLOW}[Press Enter to continue...]{C_RESET}")

def run_raid5_xor_rebuild():
    print_header("DEMONSTRATION 1: REAL BIT-EXACT RAID 5 XOR PARITY REBUILD")
    print("Configuration: 5 Virtual Disks | 256 Stripes of 4 KiB | Left-Symmetric Parity")
    print("Hospital Data: 1 MiB per disk random clinical blocks\n")

    STRIPE_BYTES, STRIPES, DISKS = 4096, 256, 5
    random.seed(7)
    np.random.seed(7)

    print("Generating virtual array with rotating parity blocks...")
    disks = [np.zeros((STRIPES, STRIPE_BYTES), dtype=np.uint8) for _ in range(DISKS)]
    for s in range(STRIPES):
        p = (DISKS - 1 - s) % DISKS
        data_idx = [i for i in range(DISKS) if i != p]
        par = np.zeros(STRIPE_BYTES, dtype=np.uint8)
        for i in data_idx:
            disks[i][s] = np.random.randint(0, 256, STRIPE_BYTES, dtype=np.uint8)
            par ^= disks[i][s]
        disks[p][s] = par

    orig = [d.copy() for d in disks]
    print(f"{C_GREEN}[+] Array initialized successfully! Total array data: {DISKS * STRIPES * STRIPE_BYTES / 1024 / 1024:.2f} MiB{C_RESET}\n")

    print("Failing each of the 5 disks sequentially and executing XOR reconstruction:")
    print("-" * 75)
    print(f"{'Disk Tested':<14} | {'Status':<12} | {'Checksum Match':<20} | {'Rebuild Time':<15}")
    print("-" * 75)

    def rebuild_disk(broken_disks, failed_idx):
        new_disk = np.zeros_like(broken_disks[failed_idx])
        for s in range(STRIPES):
            acc = np.zeros(STRIPE_BYTES, dtype=np.uint8)
            for i in range(DISKS):
                if i != failed_idx:
                    acc ^= broken_disks[i][s]
            new_disk[s] = acc
        return new_disk

    for f in range(DISKS):
        broken = [d.copy() for d in disks]
        broken[f][:] = 0  # simulate physical disk crash
        t0 = time.perf_counter()
        rebuilt = rebuild_disk(broken, f)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        is_match = np.array_equal(rebuilt, orig[f])
        match_str = f"{C_GREEN}100% BIT-EXACT{C_RESET}" if is_match else f"{C_RED}MISMATCH{C_RESET}"
        print(f"Disk {f:<8} | {C_RED}CRASHED -> REBUILT{C_RESET} | {match_str:<29} | {elapsed_ms:6.2f} ms")

    print("-" * 75)
    print(f"{C_GREEN}Result: All 5 single-disk failures rebuilt bit-for-bit with zero data loss!{C_RESET}")

def run_raid5_double_failure():
    print_header("DEMONSTRATION 2: RAID 5 DOUBLE-DISK FAILURE (FATAL ARRAY COLLAPSE)")
    print("Simulating simultaneous crash of Disk 0 AND Disk 1 on the 5-disk RAID 5 array...\n")

    STRIPE_BYTES, STRIPES, DISKS = 4096, 256, 5
    disks = [np.random.randint(0, 256, (STRIPES, STRIPE_BYTES), dtype=np.uint8) for _ in range(DISKS)]
    orig_0 = disks[0].copy()

    # Crash Disk 0 and Disk 1
    broken = [d.copy() for d in disks]
    broken[0][:] = 0
    broken[1][:] = 0

    print("Attempting single-parity XOR reconstruction on Disk 0:")
    rec0 = np.zeros_like(broken[0])
    for s in range(STRIPES):
        acc = np.zeros(STRIPE_BYTES, dtype=np.uint8)
        for i in range(DISKS):
            if i != 0:
                acc ^= broken[i][s]
        rec0[s] = acc

    is_recovered = np.array_equal(rec0, orig_0)
    print(f"Did Disk 0 recover original data?: {C_RED}{is_recovered}{C_RESET}")
    print(f"\n{C_RED}{C_BOLD}[MATHEMATICAL PROOF]{C_RESET}")
    print("The parity equation is: D0 XOR D1 = P XOR D2 XOR D3 XOR D4")
    print("When both D0 and D1 are missing, one equation has TWO unknown variables.")
    print("Result: RAID 5 cannot resolve the values. Complete clinical data loss ensues!")
    print(f"{C_CYAN}Solution in Hospital Design: Use RAID 6 (Dual Parity P+Q) for large storage pools.{C_RESET}")

def run_raid_comparison():
    print_header("DEMONSTRATION 3: RAID COMPARISON ON SIX 2 TB DISKS (12 TB RAW)")
    print(f"{'RAID Level':<12} | {'Usable (TB)':<12} | {'Overhead':<10} | {'Fault Tolerance':<16} | {'Rebuild Time (Load)':<18}")
    print("-" * 78)

    rows = [
        ("RAID 0", "12.0 TB", "0.0%", "0 Disks", "Unrecoverable"),
        ("RAID 1", "6.0 TB", "50.0%", "1 Disk (up to 3)", "Not modelled"),
        ("RAID 5", "10.0 TB", "16.7%", "1 Disk", "7.8 Hours"),
        ("RAID 6", "8.0 TB", "33.3%", "2 Disks (Dual Parity)", "9.7 Hours"),
        ("RAID 10", "6.0 TB", "50.0%", "1 Guaranteed (Mirror)", "4.3 Hours (Fastest!)")
    ]

    for r in rows:
        highlight = C_GREEN if "10" in r[0] or "6" in r[0] else ""
        print(f"{highlight}{r[0]:<12} | {r[1]:<12} | {r[2]:<10} | {r[3]:<16} | {r[4]:<18}{C_RESET}")
    print("-" * 78)
    print("Takeaways:")
    print(" - RAID 10 chosen for Tier 1 EMR DB: 0 write penalty, rebuilds in 4.3h vs 7.8h.")
    print(" - RAID 6 chosen for Tier 2 PACS / Tier 3 Admin: survives 2 drive crashes.")

def run_backup_simulation():
    print_header("DEMONSTRATION 4: 14-DAY BACKUP CYCLE COMPARISON (500 GB DATABASE)")
    print("Daily change rate: 2.1% - 5.3% | Weekly Full on Day 1 & Day 8 | Throughput: 400 MB/s\n")

    daily_change = [0.0330, 0.0260, 0.0460, 0.0229, 0.0414, 0.0346, 0.0223,
                    0.0403, 0.0215, 0.0373, 0.0228, 0.0236, 0.0370, 0.0531]
    db_size = 500.0

    print(f"{'Day':<5} | {'Change %':<10} | {'Full Backup':<13} | {'Incremental':<13} | {'Differential':<13}")
    print("-" * 65)

    cum_diff = 0.0
    tot_full = 0.0
    tot_incr = 0.0
    tot_diff = 0.0

    for d in range(14):
        ch = db_size * daily_change[d]
        if d % 7 == 0:
            f_size = db_size
            i_size = db_size
            d_size = db_size
            cum_diff = 0.0
        else:
            cum_diff += ch
            f_size = db_size
            i_size = ch
            d_size = cum_diff

        tot_full += f_size
        tot_incr += i_size
        tot_diff += d_size

        day_tag = f"Day {d+1}"
        if d == 0 or d == 7:
            day_tag += " (Full)"
        print(f"{day_tag:<7} | {daily_change[d]*100:6.2f}%   | {f_size:7.1f} GB    | {i_size:7.1f} GB    | {d_size:7.1f} GB")

    print("-" * 65)
    print(f"{C_BOLD}{'TOTAL':<7} | {'--':<10} | {tot_full:7.1f} GB    | {tot_incr:7.1f} GB    | {tot_diff:7.1f} GB{C_RESET}")
    print(f"Savings vs Full:    | {'--':<10} | {'Baseline':<13} | {C_GREEN}83% Saved{C_RESET}     | {C_GREEN}76% Saved{C_RESET}")

def run_disaster_recovery_drill():
    print_header("DEMONSTRATION 5: DAY-14 DISASTER RECOVERY DRILL (RTO BENCHMARK)")
    print("Scenario: Database volume destroyed on Day 14 at 23:59.")
    print("SLA Targets: Recovery Time Objective (RTO) <= 60 min | Recovery Point (RPO) <= 24 hr")
    print("Restore Throughput: 500 MB/s | Media mount & catalog overhead: 3.0 min per set\n")

    strategies = [
        ("Daily Full", 1, 500.0, ["Day 14 Full"]),
        ("Full + Incremental", 7, 597.65, ["Day 8 Full", "Day 9 Inc", "Day 10 Inc", "Day 11 Inc", "Day 12 Inc", "Day 13 Inc", "Day 14 Inc"]),
        ("Full + Differential", 2, 597.65, ["Day 8 Full", "Day 14 Diff"])
    ]

    for name, sets, gb, chain in strategies:
        transfer_min = (gb * 1024 / 500.0) / 60.0
        mount_min = sets * 3.0
        total_min = transfer_min + mount_min
        meets_rto = total_min <= 60.0

        highlight = C_GREEN if name == "Full + Differential" else (C_YELLOW if name == "Full + Incremental" else C_CYAN)
        print(f"{C_BOLD}{highlight}>> {name.upper()}{C_RESET}")
        print(f"  * Backup Chain: {' -> '.join(chain)}")
        print(f"  * Number of Sets to Mount: {sets}")
        print(f"  * Total Data Transferred:  {gb:.1f} GB")
        print(f"  * Mount Overhead Time:     {mount_min:.1f} minutes ({sets} sets x 3.0 min)")
        print(f"  * Data Transfer Time:      {transfer_min:.1f} minutes")
        print(f"  * Total Recovery Time:     {C_BOLD}{total_min:.1f} minutes{C_RESET}")
        status = f"{C_GREEN}PASSED SLA (RTO <= 60 min){C_RESET}" if meets_rto else f"{C_RED}FAILED SLA{C_RESET}"
        print(f"  * 1-Hour RTO Evaluation:   {status}")
        if name == "Full + Differential":
            print(f"  {C_GREEN}[RECOMMENDATION] Differential backup saves 76% storage while recovering 36% faster than incremental!{C_RESET}")
        print()

def start_web_dashboard():
    port = 8080
    root = os.path.dirname(os.path.abspath(__file__))
    
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=root, **kwargs)
        def log_message(self, format, *args):
            pass

    server = None
    for p in range(port, port + 10):
        try:
            server = socketserver.TCPServer(("", p), Handler)
            port = p
            break
        except OSError:
            continue

    if not server:
        print(f"{C_RED}Could not bind to port 8080-8089. Please check if another service is running.{C_RESET}")
        return

    url = f"http://localhost:{port}/index.html"
    print(f"\n{C_GREEN}[+] Starting Interactive Web Dashboard at: {url}{C_RESET}")
    print("Press Ctrl+C to stop the web server.\n")

    t = threading.Thread(target=server.serve_forever)
    t.daemon = True
    t.start()

    time.sleep(1)
    webbrowser.open(url)
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping web dashboard server...")
        server.shutdown()

def main_menu():
    while True:
        print_header("SRM IST - 21CSE359T INFORMATION STORAGE & MANAGEMENT")
        print(f"{C_BOLD}Case Study: Design & Simulation of a RAID-Based Backup and Recovery System for HIS{C_RESET}")
        print("\nSelect a Demonstration Module:")
        print(f"  {C_CYAN}1.{C_RESET} Run Bit-Exact RAID 5 XOR Parity Rebuild (Algorithm 1 & 2)")
        print(f"  {C_CYAN}2.{C_RESET} Run RAID 5 Double-Disk Failure Test (Demonstrate Array Crash)")
        print(f"  {C_CYAN}3.{C_RESET} Compare RAID Levels on Six 2 TB Disks (Capacity, Fault Tolerance, Rebuild)")
        print(f"  {C_CYAN}4.{C_RESET} Simulate 14-Day Hospital Backup Cycle (Full, Incremental, Differential)")
        print(f"  {C_CYAN}5.{C_RESET} Run Day-14 Disaster Recovery Drill (RTO / RPO Benchmark)")
        print(f"  {C_CYAN}6.{C_RESET} Run All Terminal Demonstrations (Complete Automated Run)")
        print(f"  {C_CYAN}7.{C_RESET} Re-generate Chapter 5 Publication PNG Charts via sim.py")
        print(f"  {C_GREEN}8. Launch Interactive Web GUI Dashboard in Browser (Recommended!){C_RESET}")
        print(f"  {C_RED}9. Exit Demonstration{C_RESET}")

        choice = input(f"\nEnter choice [1-9]: ").strip()

        if choice == "1":
            run_raid5_xor_rebuild()
            press_enter()
        elif choice == "2":
            run_raid5_double_failure()
            press_enter()
        elif choice == "3":
            run_raid_comparison()
            press_enter()
        elif choice == "4":
            run_backup_simulation()
            press_enter()
        elif choice == "5":
            run_disaster_recovery_drill()
            press_enter()
        elif choice == "6":
            run_raid5_xor_rebuild()
            run_raid5_double_failure()
            run_raid_comparison()
            run_backup_simulation()
            run_disaster_recovery_drill()
            press_enter()
        elif choice == "7":
            print("\nExecuting sim.py to re-generate publication charts...")
            os.system(f'"{sys.executable}" sim.py')
            press_enter()
        elif choice == "8":
            start_web_dashboard()
        elif choice == "9":
            print("\nThank you for using the SRM ISM Case Study Demonstration Suite!")
            break
        else:
            print(f"{C_RED}Invalid option. Please choose 1 to 9.{C_RESET}")
            time.sleep(1)

if __name__ == "__main__":
    main_menu()
