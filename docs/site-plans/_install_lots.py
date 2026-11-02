from pathlib import Path

src = Path(r"D:\azfs\yardpilot\docs\site-plans\generated-lots.ts")
dst = Path(r"D:\azfs\yardpilot\apps\api\src\data\site-plan-lots.ts")
body = src.read_text(encoding="utf-8")
body = body.replace(
    "export const generatedLots = [",
    "/** Spaces from Darya parkingpaddock.com maps — `number` matches map unit id. */\n"
    "export const sitePlanLots = [",
)
dst.write_text(body + "\n", encoding="utf-8")
print("wrote", dst, "bytes", dst.stat().st_size)
