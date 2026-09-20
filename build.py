import os
import shutil
import subprocess
import sys
import json
import time
from datetime import datetime
import urllib.request
import tarfile

RESET = "\x1b[0m"
DIM = "\x1b[2m"

BADGES = {
    "INFO": "\x1b[44;30;1m INFO \x1b[0m",
    "WARN": "\x1b[43;30;1m WARN \x1b[0m",
    "ERROR": "\x1b[41;97;1m ERROR \x1b[0m",
    "SUCCESS": "\x1b[42;30;1m SUCCESS \x1b[0m",
}

def format_time():
    now = datetime.now()
    return f"{now.hour:02d}:{now.minute:02d}:{now.second:02d}"

def format_message(level, meta, message=None):
    t = format_time()
    lvl_key = level.upper()
    badge = BADGES.get(lvl_key, f"[{lvl_key}]")

    if isinstance(meta, str):
        return f"{DIM}[{t}]{RESET} {badge} {meta}"

    extra = f" {DIM}{json.dumps(meta)}{RESET}" if meta and len(meta) > 0 else ""
    msg = f"{message}" if message else ""
    return f"{DIM}[{t}]{RESET} {badge} {msg}{extra}".rstrip()

def log_info(meta, message=None):
    print(format_message("INFO", meta, message))

def log_warn(meta, message=None):
    print(format_message("WARN", meta, message), file=sys.stderr)

def log_error(meta, message=None):
    print(format_message("ERROR", meta, message), file=sys.stderr)

def log_success(meta, message=None):
    print(format_message("SUCCESS", meta, message))

def run_command(cmd, check=True):
    if isinstance(cmd, list):
        res = subprocess.run(cmd)
    else:
        res = subprocess.run(cmd, shell=True)
    if check and res.returncode != 0:
        sys.exit(res.returncode)
    return res.returncode

def ensure_docker():
    if shutil.which("docker") is None:
        log_error("Docker is not installed or not found in PATH.")
        sys.exit(1)
    code = subprocess.run(["docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode
    if code != 0:
        log_error("Docker daemon is not running.")
        sys.exit(1)

def ensure_native_addon(dist_dir):
    os.makedirs(dist_dir, exist_ok=True)
    target_node = os.path.join(dist_dir, "gpuix-native.win32-x64-msvc.node")
    if os.path.exists(target_node) and os.path.getsize(target_node) > 1024 * 1024:
        return

    npm_pkg_node = os.path.join("node_modules", "@gpuix", "native-win32-x64-msvc", "gpuix-native.win32-x64-msvc.node")
    if os.path.exists(npm_pkg_node):
        shutil.copyfile(npm_pkg_node, target_node)
        log_info("Copied gpuix-native.win32-x64-msvc.node from node_modules.")
        return

    version = "0.7.0"
    tarball_url = f"https://registry.npmjs.org/@gpuix/native-win32-x64-msvc/-/native-win32-x64-msvc-{version}.tgz"
    log_info(f"Downloading Windows native addon from {tarball_url}...")
    tmp_tar = os.path.join(dist_dir, "addon.tgz")
    urllib.request.urlretrieve(tarball_url, tmp_tar)

    with tarfile.open(tmp_tar, "r:gz") as tar:
        for member in tar.getmembers():
            if member.name.endswith(".node"):
                member.name = os.path.basename(member.name)
                tar.extract(member, path=dist_dir)
                break

    if os.path.exists(tmp_tar):
        os.remove(tmp_tar)
    log_info("Windows native addon prepared successfully.")

def read_api_url():
    if "API_URL" in os.environ and os.environ["API_URL"].strip():
        return os.environ["API_URL"].strip()
    if os.path.exists(".env"):
        with open(".env", "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("API_URL="):
                    val = line.split("=", 1)[1].strip()
                    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                        val = val[1:-1]
                    return val
    return "http://localhost:3000"

def inject_runtime_napi(bundle_path):
    napi_script_path = os.path.join("scripts", "runtime-napi.ts")
    if not os.path.exists(napi_script_path) or not os.path.exists(bundle_path):
        return
    with open(napi_script_path, "r", encoding="utf-8") as f:
        preamble = f.read()
    with open(bundle_path, "r", encoding="utf-8") as f:
        code = f.read()
    with open(bundle_path, "w", encoding="utf-8") as f:
        f.write(preamble + "\n" + code)

def main():
    ensure_docker()
    root_dir = os.path.abspath(os.path.dirname(__file__))
    dist_dir = os.path.join(root_dir, "dist")
    build_dir = os.path.join(dist_dir, "build")
    os.makedirs(dist_dir, exist_ok=True)
    os.makedirs(build_dir, exist_ok=True)

    ensure_native_addon(dist_dir)

    api_url = read_api_url().rstrip("/")
    log_info(f"Using target API_URL: {api_url}")

    is_release = os.environ.get("RELEASE", "0") in ("1", "true", "TRUE")
    deno_extra_flags = "--no-terminal" if is_release else ""
    log_info(f"Build target mode: {'RELEASE (no-terminal)' if is_release else 'DEV (console enabled)'}")

    log_info("Generating version...")
    run_command(["bun", "run", "scripts/generate-version.ts"])

    log_info("Bundling JS via Bun with injected API_URL...")
    define_arg = f'process.env.API_URL={json.dumps(api_url)}'
    run_command([
        "bun", "build", "index.tsx",
        "--outdir", "dist/build",
        "--target", "node",
        "--define", define_arg,
        "--external", "@gpuix/native-darwin-arm64",
        "--external", "@gpuix/native-darwin-universal"
    ])

    index_bundle = os.path.join(build_dir, "index.js")
    inject_runtime_napi(index_bundle)

    cache_bust = str(int(time.time()))
    image_name = "bungpuix-raf-builder"
    log_info("Building Docker image...")
    run_command([
        "docker", "build",
        "--build-arg", f"CACHE_BUST={cache_bust}",
        "--build-arg", f"DENO_FLAGS={deno_extra_flags}",
        "-t", image_name,
        "-f", "Dockerfile",
        "."
    ])

    log_info("Compiling Windows binary inside container...")
    run_command(["docker", "run", "--rm", "-v", f"{dist_dir}:/dist", image_name])

    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)

    log_success("Build complete: dist/raf-launcher.exe + dist/gpuix-native.win32-x64-msvc.node")

if __name__ == "__main__":
    main()
