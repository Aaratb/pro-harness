import fs from 'node:fs';
import path from 'node:path';

const blockStart = '# BEGIN PRO HARNESS MCP';
const blockEnd = '# END PRO HARNESS MCP';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function selectedProviders(catalog, names) {
  const selected = names?.length ? names : Object.entries(catalog.providers)
    .filter(([, provider]) => provider.enabled_by_default)
    .map(([name]) => name);
  return selected.map((name) => {
    const provider = catalog.providers[name];
    if (!provider) throw new Error(`unknown MCP provider: ${name}`);
    return [name, provider];
  });
}

function materializeProvider(name, provider, environment) {
  const missing = provider.required_env.filter((key) => !environment[key]);
  if (missing.length) throw new Error(`${name}: missing required environment variables: ${missing.join(', ')}`);
  const value = provider.transport === 'stdio'
    ? { command: provider.command, args: provider.args }
    : { type: 'http', url: provider.url };
  if (provider.required_env.length) {
    value.env = Object.fromEntries(provider.required_env.map((key) => [key, environment[key]]));
  }
  return value;
}

function readJsonConfig(file) {
  const document = fs.existsSync(file) ? readJson(file) : {};
  const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!isObject(document)) throw new Error(`${file}: configuration must be an object`);
  if (Object.hasOwn(document, 'mcpServers') && !isObject(document.mcpServers)) throw new Error(`${file}: mcpServers must be an object`);
  return document;
}

function mergeJsonConfig(file, entries) {
  const document = readJsonConfig(file);
  document.mcpServers ??= {};
  for (const [name, value] of entries) {
    if (Object.hasOwn(document.mcpServers, name) && JSON.stringify(document.mcpServers[name]) !== JSON.stringify(value)) {
      throw new Error(`${file}: refusing to overwrite existing MCP server ${name}`);
    }
    document.mcpServers[name] = value;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function assertJsonConfigCanMerge(file, entries) {
  if (!fs.existsSync(file)) return;
  const document = readJsonConfig(file);
  for (const [name, value] of entries) {
    if (Object.hasOwn(document.mcpServers ?? {}, name) && JSON.stringify(document.mcpServers[name]) !== JSON.stringify(value)) {
      throw new Error(`${file}: refusing to overwrite existing MCP server ${name}`);
    }
  }
}

function tomlValue(value) {
  return JSON.stringify(value);
}

function renderCodexBlock(entries) {
  const lines = [blockStart];
  for (const [name, provider] of entries) {
    lines.push('', `[mcp_servers.${JSON.stringify(name)}]`);
    if (provider.command) {
      lines.push(`command = ${tomlValue(provider.command)}`);
      lines.push(`args = [${provider.args.map(tomlValue).join(', ')}]`);
    } else {
      lines.push(`url = ${tomlValue(provider.url)}`);
    }
    if (provider.env) {
      lines.push('', `[mcp_servers.${JSON.stringify(name)}.env]`);
      for (const [key, value] of Object.entries(provider.env)) lines.push(`${key} = ${tomlValue(value)}`);
    }
  }
  lines.push('', blockEnd, '');
  return lines.join('\n');
}

function mergeCodexConfig(file, entries) {
  let text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const escapedStart = blockStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = blockEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  text = text.replace(new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}\\n?`, 'g'), '').trimEnd();
  for (const [name] of entries) {
    const section = `[mcp_servers.${JSON.stringify(name)}]`;
    if (text.includes(section)) throw new Error(`${file}: refusing to overwrite existing MCP server ${name}`);
  }
  const output = `${text}${text ? '\n\n' : ''}${renderCodexBlock(entries)}`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, output, { encoding: 'utf8', mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function assertCodexConfigCanMerge(file, entries) {
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  const escapedStart = blockStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = blockEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  text = text.replace(new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}\\n?`, 'g'), '');
  for (const [name] of entries) {
    if (text.includes(`[mcp_servers.${JSON.stringify(name)}]`)) {
      throw new Error(`${file}: refusing to overwrite existing MCP server ${name}`);
    }
  }
}

export function configureMcps({ harnessRoot, home, runtimes, providers, environment = process.env, dryRun = false }) {
  const catalog = readJson(path.join(harnessRoot, 'mcps', 'providers.json'));
  const selected = selectedProviders(catalog, providers)
    .map(([name, provider]) => [name, materializeProvider(name, provider, environment)]);
  const files = runtimes.map((runtime) => {
    if (runtime === 'claude') return path.join(home, '.claude.json');
    if (runtime === 'cursor') return path.join(home, '.cursor', 'mcp.json');
    if (runtime === 'codex') return path.join(home, '.codex', 'config.toml');
    throw new Error(`unsupported runtime: ${runtime}`);
  });
  for (let index = 0; index < runtimes.length; index += 1) {
    if (runtimes[index] === 'codex') assertCodexConfigCanMerge(files[index], selected);
    else assertJsonConfigCanMerge(files[index], selected);
  }
  if (dryRun) return { providers: selected.map(([name]) => name), files };

  for (let index = 0; index < runtimes.length; index += 1) {
    const runtime = runtimes[index];
    const file = files[index];
    if (runtime === 'claude') {
      mergeJsonConfig(file, selected);
    } else if (runtime === 'cursor') {
      mergeJsonConfig(file, selected);
    } else if (runtime === 'codex') {
      mergeCodexConfig(file, selected);
    }
  }
  return { providers: selected.map(([name]) => name), files };
}
