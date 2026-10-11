#!/usr/bin/env python3
"""Deploy only runtime source (no credentials/state/dependencies). Fake-worker tests run first."""
import argparse
import hashlib
import json
from pathlib import Path
import shlex
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = ['src', 'tests', 'package.json', 'install.sh', 'workerctl', 'README.md']


def remote(host, code, timeout=240):
    result = subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', host,
                             'python3 -B -c ' + shlex.quote(code)], capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError(f'{host}: {result.stderr}\n{result.stdout}')
    return json.loads(result.stdout)


def deploy(host, stage_only):
    stage = remote(host, '''from pathlib import Path
import tempfile,json
root=Path.home()/'.cache/omp-worker-deploy'
root.mkdir(parents=True,exist_ok=True,mode=0o700)
print(json.dumps(tempfile.mkdtemp(prefix='release-',dir=root)))
''')
    subprocess.run(['rsync', '-az', '--', *[str(ROOT/p) for p in PAYLOAD], host+':'+stage+'/'], check=True)
    expected = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'src').glob('*.ts')}
    code = '''from pathlib import Path
import os,subprocess,json,hashlib,platform
stage=Path(STAGE)
h=Path.home()
env={**os.environ,'PATH':str(h/'.bun/bin')+':'+str(h/'.local/bin')+':'+os.environ['PATH']}
import shutil
bun=shutil.which('bun',path=env['PATH'])
assert bun,'Bun is not installed; no global upgrade is performed'
version=subprocess.run([bun,'--version'],capture_output=True,text=True,check=True).stdout.strip()
probe=subprocess.run([bun,'-e','if(typeof Bun.YAML?.parse!=="function" || typeof Promise.withResolvers!=="function")process.exit(1)'],env=env,capture_output=True,text=True)
assert probe.returncode==0,'Required runtime APIs missing'
cli=h/'.local/bin/workerctl-beta'
if cli.exists() and not STAGE_ONLY:
    status=subprocess.run([str(cli),'list'],env=env,capture_output=True,text=True,timeout=20)
    assert status.returncode==0,'Cannot establish current worker ownership'
    workers=json.loads(status.stdout)['result']
    assert not any(w.get('supervisorAlive') or w.get('workerAlive') or w.get('error') for w in workers),'Active/unknown workers prevent replacement; no processes stopped'
tests=subprocess.run([bun,'test','tests'],cwd=stage,env=env,capture_output=True,text=True,timeout=180)
assert tests.returncode==0,tests.stdout+'\\n'+tests.stderr
summary=[line for line in (tests.stdout+tests.stderr).splitlines() if line.strip().endswith((' pass',' fail')) or line.startswith('Ran ')]
out={'os':platform.system(),'arch':platform.machine(),'bun':version,'staging':str(stage),'tests':summary}
if not STAGE_ONLY:
    installed=subprocess.run(['bash','install.sh'],cwd=stage,env=env,capture_output=True,text=True)
    assert installed.returncode==0,installed.stdout+installed.stderr
    check=subprocess.run([str(cli),'--help'],env=env,capture_output=True,text=True)
    assert check.returncode==0,check.stderr
    dest=h/'.local/share/omp-worker-runtime-beta'
    hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (dest/'src').glob('*.ts')}
    assert hashes==EXPECTED,'Installed runtime differs from source'
    assert (dest/'src/progress.ts').is_file(),'Climier integration missing'
    out.update(installed=True,sourceFiles=len(hashes),cli=str(cli),help=check.stdout.splitlines()[0])
else: out['installed']=False
print(json.dumps(out))
'''.replace('STAGE_ONLY', repr(stage_only)).replace('STAGE', repr(stage)).replace('EXPECTED', repr(expected))
    result = remote(host, code)
    print(json.dumps({'host': host, **result}, indent=2), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--hosts', nargs='+', default=['gdev', 'mac'])
    parser.add_argument('--stage-only', action='store_true')
    args = parser.parse_args()
    try:
        for host in args.hosts:
            if not host.replace('-', '').replace('_', '').isalnum():
                raise ValueError('Use a simple configured SSH host alias')
            deploy(host, args.stage_only)
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
