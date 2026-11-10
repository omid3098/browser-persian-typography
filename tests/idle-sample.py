"""Shared CPU gate accounting, plus per-process attribution for every window."""
import json
import sys
import time
import psutil

sys.dont_write_bytecode = True
sys.path.insert(0, r'C:\Users\Omid\.agents\tools')
from cpu_budget import ProcessTree, POLL_SECONDS, WINDOW_SECONDS, LIMITATION

root = psutil.Process(int(sys.argv[1]))
tree = ProcessTree(root)
print(json.dumps({'limitation': LIMITATION}), flush=True)
for window in range(1, 12):
    baseline = tree.poll()
    started_wall = time.time()
    started = time.monotonic()
    names = {}
    highest = baseline
    while True:
        for key, process in list(tree.active.items()):
            try:
                command = process.cmdline()
                names[key] = ','.join(arg for arg in command if arg.startswith(('--type=', '--utility-sub-type=', '--service-sandbox-type='))) or 'browser'
            except psutil.Error:
                pass
        remaining = WINDOW_SECONDS - (time.monotonic() - started)
        if remaining <= 0:
            break
        time.sleep(min(POLL_SECONDS, remaining))
        highest = tree.poll()
        for key, cpu in highest.items():
            baseline.setdefault(key, 0 if key[1] >= started_wall else cpu)
    elapsed = time.monotonic() - started
    processes = [{'pid': key[0], 'type': names.get(key, 'exited'),
                  'cpuSeconds': cpu - baseline[key],
                  'percent': 100 * (cpu - baseline[key]) / elapsed}
                 for key, cpu in highest.items()]
    print(json.dumps({'window': window, 'elapsed': elapsed,
                      'percent': sum(p['percent'] for p in processes),
                      'processes': processes}), flush=True)
