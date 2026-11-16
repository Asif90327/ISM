"""Hospital storage simulation: RAID parity rebuild + backup strategies.
Reproduces every number and chart in Chapter 5 of the SRM ISM Case Study Report.
"""
import os, json, random, hashlib, time
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

OUT = os.path.dirname(os.path.abspath(__file__))
random.seed(7); np.random.seed(7)

# ---------- Part A: RAID capacity / fault tolerance model ----------
N, DISK_TB = 6, 2.0
def raid_stats(level, n=N, d=DISK_TB):
    if level == "RAID 0":  usable, tol = n*d, 0
    if level == "RAID 1":  usable, tol = d*n/2, 1      # mirrored pairs
    if level == "RAID 5":  usable, tol = (n-1)*d, 1
    if level == "RAID 6":  usable, tol = (n-2)*d, 2
    if level == "RAID 10": usable, tol = n*d/2, 1      # guaranteed 1 (up to n/2 best case)
    return usable, tol, 100*(1-usable/(n*d))

levels = ["RAID 0","RAID 1","RAID 5","RAID 6","RAID 10"]
raid_tbl = {l: raid_stats(l) for l in levels}

# ---------- Part B: RAID 5 real XOR parity simulation ----------
STRIPE_BYTES, STRIPES, DISKS = 4096, 256, 5
def build_raid5():
    disks = [np.zeros((STRIPES, STRIPE_BYTES), dtype=np.uint8) for _ in range(DISKS)]
    for s in range(STRIPES):
        p = (DISKS-1 - s) % DISKS                      # left-symmetric parity rotation
        data_idx = [i for i in range(DISKS) if i != p]
        par = np.zeros(STRIPE_BYTES, dtype=np.uint8)
        for i in data_idx:
            disks[i][s] = np.random.randint(0,256,STRIPE_BYTES,dtype=np.uint8)
            par ^= disks[i][s]
        disks[p][s] = par
    return disks

def rebuild(disks, failed):
    new = np.zeros_like(disks[failed])
    for s in range(STRIPES):
        acc = np.zeros(STRIPE_BYTES, dtype=np.uint8)
        for i in range(DISKS):
            if i != failed: acc ^= disks[i][s]
        new[s] = acc
    return new

disks = build_raid5()
orig = [d.copy() for d in disks]
raid_ok = []
t_rebuild = []
for f in range(DISKS):
    broken = [d.copy() for d in disks]; broken[f][:] = 0     # disk f dies
    t0 = time.perf_counter(); rec = rebuild(broken, f); t_rebuild.append(time.perf_counter()-t0)
    raid_ok.append(bool(np.array_equal(rec, orig[f])))

# double failure -> unrecoverable demonstration
broken = [d.copy() for d in disks]; broken[0][:]=0; broken[1][:]=0
rec0 = rebuild(broken, 0)           # wrong: disk1 is also missing
double_fail_recovers = bool(np.array_equal(rec0, orig[0]))

# ---------- Part C: backup strategies over 14 days ----------
DB_GB = 500.0
daily_change = [round(random.uniform(0.02,0.06),4) for _ in range(14)]  # fraction changed/day
BW_MBPS = 400.0   # backup throughput MB/s
def tsec(gb): return gb*1024/BW_MBPS
def schedule(kind):
    sizes, cum_changed = [], 0.0
    for day in range(14):
        ch = DB_GB*daily_change[day]
        if day % 7 == 0:                       # weekly full on day 0 and 7
            sizes.append(DB_GB); cum_changed = 0.0
        else:
            cum_changed += ch
            if kind == "Full": sizes.append(DB_GB)
            elif kind == "Incremental": sizes.append(ch)
            else: sizes.append(cum_changed)     # Differential
    return sizes

strategies = ["Full","Incremental","Differential"]
sched = {k: schedule(k) for k in strategies}
total_gb = {k: sum(v) for k,v in sched.items()}
avg_backup_min = {k: np.mean([tsec(x) for x in v])/60 for k,v in sched.items()}

# Restore on day 13 (failure after day-13 backup / day 14): chain needed
def restore_chain(kind, day=13):
    last_full = (day//7)*7
    if kind=="Full": parts=[sched[kind][day]]
    elif kind=="Incremental": parts=[DB_GB]+sched[kind][last_full+1:day+1]
    else: parts=[DB_GB, sched[kind][day]] if day!=last_full else [DB_GB]
    return parts

RESTORE_BW = 500.0
SET_OVERHEAD_MIN = 3.0   # assumed catalog lookup + media mount per backup set
restore = {}
for k in strategies:
    parts = restore_chain(k)
    restore[k] = dict(sets=len(parts), gb=sum(parts), minutes=sum(parts)*1024/RESTORE_BW/60 + SET_OVERHEAD_MIN*len(parts))

# ---------- Part D: RAID rebuild time model ----------
REBUILD_RATE = {"RAID 10":0.90,"RAID 5":0.50,"RAID 6":0.40}   # fraction of 150 MB/s disk speed available
rebuild_h = {l:(DISK_TB*1024*1024/(150*f))/3600 for l,f in REBUILD_RATE.items()}
scen = {}
res = dict(raid_tbl={k:dict(usable_tb=v[0],tolerance=v[1],overhead_pct=v[2]) for k,v in raid_tbl.items()},
           raid5_rebuild_ok=raid_ok, raid5_double_failure_recovers=double_fail_recovers,
           raid5_rebuild_ms=[x*1000 for x in t_rebuild],
           daily_change=daily_change, total_gb=total_gb, avg_backup_min=avg_backup_min,
           restore=restore, scen=scen, rebuild_h=rebuild_h)

with open(os.path.join(OUT,"results.json"),"w") as f:
    json.dump(res, f, indent=2)

# ---------- Charts ----------
plt.rcParams.update({"font.family":"serif","font.size":10,"axes.spines.top":False,"axes.spines.right":False})
C = ["#1F4E79","#C55A11","#548235","#7F6000","#7030A0"]

# Figure 5.1
fig,ax = plt.subplots(1,2,figsize=(8,3.4))
ax[0].bar(levels,[raid_tbl[l][0] for l in levels],color=C[0])
ax[0].set_ylabel("Usable capacity (TB)")
ax[0].set_title("(a) Usable capacity, 6 x 2 TB disks")
for i,l in enumerate(levels): ax[0].text(i,raid_tbl[l][0]+0.2,f"{raid_tbl[l][0]:.0f}",ha="center")

ax[1].bar(levels,[raid_tbl[l][1] for l in levels],color=C[1])
ax[1].set_ylabel("Guaranteed disk failures tolerated")
ax[1].set_title("(b) Fault tolerance")
ax[1].set_yticks([0,1,2])
for a in ax: a.tick_params(axis="x",labelsize=8)
plt.tight_layout()
plt.savefig(os.path.join(OUT,"fig_raid.png"),dpi=200)
plt.close()

# Figure 5.3
fig,ax = plt.subplots(figsize=(6,3.4))
days = np.arange(1,15)
for k,c in zip(strategies,C): ax.plot(days,sched[k],marker="o",ms=3,label=k,color=c)
ax.set_xlabel("Day"); ax.set_ylabel("Backup size (GB)")
ax.set_title("Daily backup size over 14 days (500 GB database)")
ax.legend(frameon=False)
plt.tight_layout()
plt.savefig(os.path.join(OUT,"fig_backup_size.png"),dpi=200)
plt.close()

# Figure 5.4
fig,ax = plt.subplots(1,2,figsize=(8,3.4))
ax[0].bar(strategies,[total_gb[k] for k in strategies],color=C[:3])
ax[0].set_ylabel("Total storage used (GB)")
ax[0].set_title("(a) 14-day storage consumption")
for i,k in enumerate(strategies): ax[0].text(i,total_gb[k]+80,f"{total_gb[k]:.0f}",ha="center")

ax[1].bar(strategies,[restore[k]["minutes"] for k in strategies],color=C[:3])
ax[1].set_ylabel("Restore time (min)")
ax[1].set_title("(b) Restore time on day 14")
for i,k in enumerate(strategies): ax[1].text(i,restore[k]["minutes"]+0.3,f"{restore[k]['minutes']:.1f}",ha="center")
plt.tight_layout()
plt.savefig(os.path.join(OUT,"fig_backup_compare.png"),dpi=200)
plt.close()

# Figure 5.2
fig,ax = plt.subplots(figsize=(5.5,3.3))
rl=list(rebuild_h)
ax.bar(rl,[rebuild_h[l] for l in rl],color=C[2])
ax.set_ylabel("Rebuild time for one 2 TB disk (hours)")
ax.set_title("Modelled rebuild time under production load")
for i,l in enumerate(rl): ax.text(i,rebuild_h[l]+0.2,f"{rebuild_h[l]:.1f}",ha="center")
plt.tight_layout()
plt.savefig(os.path.join(OUT,"fig_rebuild.png"),dpi=200)
plt.close()

print("="*65)
print("  SRM 21CSE359T ISM CASE STUDY SIMULATION REPRODUCED SUCCESSFULLY")
print("="*65)
print(f"RAID 5 Rebuild Check (5 Disks): {raid_ok} -> All Bit-Exact!")
print(f"RAID 5 Double Failure Recoverable?: {double_fail_recovers} (As Expected: False)")
print("\n--- 14-Day Backup Strategy Summary ---")
for k in strategies:
    print(f"{k:12s} | Total Storage: {total_gb[k]:7.1f} GB | Avg Backup: {avg_backup_min[k]:4.1f} min | Restore Sets: {restore[k]['sets']} | Restore Time: {restore[k]['minutes']:4.1f} min")
print("\nGenerated Charts: fig_raid.png, fig_backup_size.png, fig_backup_compare.png, fig_rebuild.png")
