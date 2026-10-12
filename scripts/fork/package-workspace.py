"""Package the already validated renderer/runtime as the personal macOS app.
Usage: python3 package-workspace.py INPUT_APP OUTPUT_APP ICON
Does not modify the input application or user data.
"""
import pathlib, plistlib, shutil, subprocess, sys
source, target, icon = map(pathlib.Path, sys.argv[1:])
if target.exists():
    raise SystemExit('Output already exists; choose a new output path')
subprocess.run(['ditto', str(source), str(target)], check=True)
plist = target / 'Contents/Info.plist'
info = plistlib.loads(plist.read_bytes())
info.update(CFBundleName='Hermes Workspace', CFBundleDisplayName='Hermes Workspace', CFBundleIdentifier='com.wegvon.hermes.workspace', CFBundleIconFile='workspace.icns')
info.pop('ElectronAsarIntegrity', None)
plist.write_bytes(plistlib.dumps(info))
shutil.copy2(icon, target / 'Contents/Resources/workspace.icns')
main = target / 'Contents/Resources/app/dist/electron-main.mjs'
text = main.read_text()
replacements = {
    'async function checkUpdates(opts = {}) {': 'async function checkUpdates(opts = {}) {\n  return { supported: false, message: "Hermes Workspace: updates are maintained through wegvon/hermes-agent, boss/session-windows.", fetchedAt: Date.now() };',
    'async function applyUpdates() {': 'async function applyUpdates() {\n  throw new Error("Hermes Workspace uses fork builds. Official application updates are disabled.");',
}
for old, new in replacements.items():
    if text.count(old) != 1:
        raise SystemExit('Runtime changed: review updater integration before packaging')
    text = text.replace(old, new)
main.write_text(text)
subprocess.run(['node', '--check', str(main)], check=True)
subprocess.run(['codesign', '--force', '--deep', '--sign', '-', str(target)], check=True)
subprocess.run(['codesign', '--verify', '--deep', '--strict', str(target)], check=True)
print(target)
