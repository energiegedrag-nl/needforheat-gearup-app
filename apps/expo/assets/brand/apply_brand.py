"""Apply ../../brand.json to the app: the colours in app.json (splash, adaptive icon, notifications) and,
unless --no-icons, the icon, adaptive icon, logo and splash (make_icons.py, needs Pillow). The app's
colours in light and dark mode need no step: src/lib/theme.ts reads brand.json directly.

    python apply_brand.py            # app.json and images
    python apply_brand.py --no-icons # app.json only, e.g. when you bring your own icon PNGs
    python apply_brand.py --check    # exit 1 if app.json does not match brand.json (changes nothing)

See BRANDING.md. The unit test src/lib/brand.test.tsx runs the same check in CI.
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
APP = HERE.parent.parent
BRAND = json.loads((APP / "brand.json").read_text(encoding="utf-8"))
APP_JSON = APP / "app.json"


def wanted() -> dict[str, str]:
    """app.json path (as dotted keys) -> colour."""
    backdrop = BRAND["brand"]["backdrop"].upper()
    return {
        "splash.backgroundColor": backdrop,
        "android.adaptiveIcon.backgroundColor": backdrop,
        "plugins.expo-notifications.color": BRAND["brand"]["primary"].upper(),
    }


def current(expo: dict) -> dict[str, str]:
    notifications = next(p for p in expo["plugins"] if isinstance(p, list) and p[0] == "expo-notifications")
    return {
        "splash.backgroundColor": expo["splash"]["backgroundColor"].upper(),
        "android.adaptiveIcon.backgroundColor": expo["android"]["adaptiveIcon"]["backgroundColor"].upper(),
        "plugins.expo-notifications.color": notifications[1]["color"].upper(),
    }


def update_app_json() -> bool:
    """Replace the colours in place, keeping the file's layout. True if something changed."""
    text = APP_JSON.read_text(encoding="utf-8")
    have = current(json.loads(text)["expo"])
    need = wanted()
    if have == need:
        return False
    for key, colour in need.items():
        old = have[key]
        if old == colour:
            continue
        # The colour keys sit in small objects; replace the value right after the key, case-insensitively.
        field = key.rsplit(".", 1)[1]
        text, n = re.subn(rf'("{field}"\s*:\s*")({re.escape(old)})(")', rf"\g<1>{colour}\g<3>", text, flags=re.I)
        if n == 0:
            sys.exit(f"apply_brand: could not find {key} = {old} in app.json")
    APP_JSON.write_text(text, encoding="utf-8")
    if current(json.loads(text)["expo"]) != need:
        sys.exit("apply_brand: app.json still differs from brand.json; edit it by hand")
    return True


def main() -> None:
    if "--check" in sys.argv:
        have = current(json.loads(APP_JSON.read_text(encoding="utf-8"))["expo"])
        diff = {k: (have[k], v) for k, v in wanted().items() if have[k] != v}
        if diff:
            for key, (old, new) in diff.items():
                print(f"app.json {key}: {old}, brand.json wants {new}")
            sys.exit(1)
        print("app.json matches brand.json")
        return
    print("app.json updated" if update_app_json() else "app.json already matches brand.json")
    if "--no-icons" not in sys.argv:
        import make_icons  # noqa: E402 (needs Pillow; only when making images)

        make_icons.main()
        print("icon, adaptive icon, logo and splash made")


if __name__ == "__main__":
    main()
