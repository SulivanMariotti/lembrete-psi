import { readFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_EXTENSIONS = ["", ".js", ".mjs", "/index.js", "/index.mjs"];

function toDataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

async function findExistingFile(candidate) {
  for (const ext of DEFAULT_EXTENSIONS) {
    const full = `${candidate}${ext}`;
    try {
      await access(full);
      return full;
    } catch (_) {
      // continue
    }
  }
  return null;
}

async function resolveLocalSpecifier(specifier, fromFile, repoRoot) {
  let candidate = null;
  if (specifier.startsWith("@/")) {
    candidate = resolve(repoRoot, "src", specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    candidate = resolve(dirname(fromFile), specifier);
  } else {
    return null;
  }

  const existing = await findExistingFile(candidate);
  if (!existing) {
    throw new Error(`Não foi possível resolver o módulo local: ${specifier} a partir de ${fromFile}`);
  }
  return existing;
}

export async function importWithMocks({ entry, repoRoot, mocks = {} }) {
  const mockMap = new Map(Object.entries(mocks));
  const urlCache = new Map();

  async function buildModuleUrl(filePath) {
    const normalizedPath = resolve(filePath);
    if (urlCache.has(normalizedPath)) return urlCache.get(normalizedPath);

    const original = await readFile(normalizedPath, "utf8");
    const importMatches = [
      ...original.matchAll(/(?:from\s*["']([^"']+)["'])|(?:import\s*["']([^"']+)["'])/g),
    ];

    const replacements = new Map();

    for (const match of importMatches) {
      const specifier = match[1] || match[2];
      if (!specifier || replacements.has(specifier)) continue;

      if (mockMap.has(specifier)) {
        const mockKey = `mock:${specifier}`;
        if (!urlCache.has(mockKey)) {
          urlCache.set(mockKey, toDataUrl(mockMap.get(specifier)));
        }
        replacements.set(specifier, urlCache.get(mockKey));
        continue;
      }

      const localPath = await resolveLocalSpecifier(specifier, normalizedPath, repoRoot).catch(() => null);
      if (!localPath) {
        replacements.set(specifier, specifier);
        continue;
      }

      replacements.set(specifier, await buildModuleUrl(localPath));
    }

    let rewritten = original;
    for (const [specifier, target] of replacements.entries()) {
      const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      rewritten = rewritten
        .replace(new RegExp(`from\\s*["']${escaped}["']`, "g"), `from "${target}"`)
        .replace(new RegExp(`import\\s*["']${escaped}["']`, "g"), `import "${target}"`);
    }

    const moduleUrl = toDataUrl(rewritten);
    urlCache.set(normalizedPath, moduleUrl);
    return moduleUrl;
  }

  const entryUrl = await buildModuleUrl(resolve(repoRoot, entry));
  return import(entryUrl);
}
