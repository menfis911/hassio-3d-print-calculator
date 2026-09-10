const versionUrl = new URL("./VERSION", import.meta.url);

let version = "";

try {
  const response = await fetch(`${versionUrl.href}?t=${Date.now()}`, {
    cache: "no-store",
  });

  if (response.ok) {
    version = (await response.text()).trim();
  }
} catch (error) {
  console.warn("3D Calculator: VERSION fetch failed", error);
}

const cacheBuster = version || Date.now().toString();
const moduleUrl = new URL("./hassio-3d-print-calculator.js", import.meta.url);
moduleUrl.searchParams.set("v", cacheBuster);

console.info(`[3D Calculator] loading v${version || "unknown"}`);

// IMPORTANT: panel_custom waits for this module to finish loading and then
// expects the custom element to be registered. Therefore the calculator
// import must be awaited at module level, not started in the background.
await import(moduleUrl.href);
