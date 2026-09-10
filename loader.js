const versionUrl = new URL("./VERSION", import.meta.url);

let version = "";
try {
  const response = await fetch(`${versionUrl.href}?t=${Date.now()}`, { cache: "no-store" });
  if (response.ok) version = (await response.text()).trim();
} catch (error) {
  console.warn("3D Calculator: VERSION fetch failed", error);
}

const cacheBuster = version || Date.now().toString();
const moduleUrl = new URL("./hassio-3d-print-calculator.js", import.meta.url);
moduleUrl.searchParams.set("v", cacheBuster);

console.info(`[3D Calculator] loading v${version || "unknown"}`);
await import(moduleUrl.href);

const enhancementUrl = new URL("./calculator-enhancements.js", import.meta.url);
enhancementUrl.searchParams.set("v", cacheBuster);
await import(enhancementUrl.href);

console.info("[3D Calculator] cache-busting loader + 1.6.0 UI enhancements active");
