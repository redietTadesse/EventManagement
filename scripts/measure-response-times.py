"""Read-only local performance check. Run against an already running backend.
Example: python scripts/measure-response-times.py --username coordinator
The password is prompted, never saved. No bookings or emails are created.
"""
import argparse, getpass, json, math, os, time, urllib.request
parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://localhost:8080')
parser.add_argument('--username', required=True)
parser.add_argument('--samples', type=int, default=30)
args = parser.parse_args()
if not 20 <= args.samples <= 100:
    parser.error('Use between 20 and 100 requests per endpoint.')
payload = json.dumps({'username': args.username, 'password': os.environ.get('AICC_BENCHMARK_PASSWORD') or getpass.getpass()}).encode()
with urllib.request.urlopen(urllib.request.Request(args.url + '/api/auth/login', data=payload,
        headers={'Content-Type': 'application/json'}), timeout=5) as response:
    token = json.load(response)['accessToken']
results = []
for path in ['/api/v1/users/me', '/api/v1/events']:
    timings, errors = [], 0
    for _ in range(args.samples + 1):
        start = time.perf_counter()
        try:
            with urllib.request.urlopen(urllib.request.Request(args.url + path,
                    headers={'Authorization': 'Bearer ' + token}), timeout=5) as response:
                response.read()
            timings.append((time.perf_counter() - start) * 1000)
        except Exception:
            errors += 1
    timings = sorted(timings[1:])  # Exclude one warm-up request.
    p95 = timings[math.ceil(len(timings) * .95) - 1] if timings else None
    results.append({'endpoint': path, 'samples': len(timings), 'errors': errors,
                    'p95_ms': round(p95, 2) if p95 is not None else None,
                    'target_ms': 1000, 'passed': errors == 0 and p95 is not None and p95 <= 1000})
print(json.dumps({'scope': 'Sequential local requests; not a concurrent load test', 'results': results}, indent=2))
raise SystemExit(0 if all(result['passed'] for result in results) else 1)
