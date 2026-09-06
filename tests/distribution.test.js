'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const HARNESS_ROOT = path.resolve(__dirname, '..');

function temporaryHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-install-'));
}

test('optional Exa reuses HTTP configuration across runtimes without dropping co-selected providers', () => {
  const home = temporaryHome();
  try {
    const provider = JSON.parse(fs.readFileSync(path.join(HARNESS_ROOT, 'mcps/providers.json'))).providers.exa;
    assert.equal(provider.enabled_by_default, false);
    assert.deepEqual(provider.required_env, []);
    assert.deepEqual(new URL(provider.url).searchParams.get('tools').split(','), ['web_search_exa', 'web_fetch_exa', 'web_search_advanced_exa']);
    childProcess.execFileSync(process.execPath, [path.join(HARNESS_ROOT, 'scripts/configure-mcps.mjs'), '--home', home, '--providers', 'exa,playwright', '--runtimes', 'claude,codex,cursor']);
    for (const file of ['.claude.json', '.cursor/mcp.json']) {
      const servers = JSON.parse(fs.readFileSync(path.join(home, file))).mcpServers;
      assert.deepEqual(servers.exa, { type: 'http', url: provider.url });
      assert.ok(servers.playwright);
    }
    const codex = fs.readFileSync(path.join(home, '.codex/config.toml'), 'utf8');
    assert.ok(codex.includes('[mcp_servers."exa"]'));
    assert.ok(codex.includes(provider.url));
    assert.ok(codex.includes('[mcp_servers."playwright"]'));
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test('npm adapter shortcut generates and regenerates only the managed output', () => {
  const root = temporaryHome();
  const bundle = path.join(root, 'bundle');
  try {
    for (const entry of ['package.json', 'scripts', 'agents', 'skills', 'commands']) {
      fs.cpSync(path.join(HARNESS_ROOT, entry), path.join(bundle, entry), { recursive: true });
    }
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = childProcess.spawnSync('npm', ['run', 'adapters:generate'], { cwd: bundle, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /status=success agents=61 commands=9/);
    }
    assert.ok(fs.existsSync(path.join(bundle, 'adapters', 'generated', '.pro-harness-generated.json')));
    assert.equal(fs.existsSync(path.join(bundle, '.runtime-adapters')), false);
    assert.equal(fs.existsSync(path.join(bundle, 'skills', 'feature-pro', 'agents')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

for (const mode of ['copy', 'link']) {
  test(`custom ${mode} install binds every runtime entry to the chosen root`, () => {
    const home = temporaryHome();
    const target = path.join(home, 'custom harness');
    try {
      const result = childProcess.spawnSync(process.execPath, [
        path.join(HARNESS_ROOT, 'scripts', 'install.mjs'), '--home', home,
        '--target', target, '--mode', mode,
      ], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      const adapterRoot = mode === 'copy' ? path.join(target, 'adapters', 'generated') : path.join(home, '.pro-harness', 'runtime-adapters');
      const manifest = JSON.parse(fs.readFileSync(path.join(adapterRoot, 'manifest.json'), 'utf8'));
      assert.equal(manifest.canonical_root, target);
      childProcess.execFileSync(process.execPath, [path.join(HARNESS_ROOT, 'scripts', 'generate-runtime-adapters.mjs'), '--output-root', adapterRoot]);
      assert.equal(JSON.parse(fs.readFileSync(path.join(adapterRoot, 'manifest.json'), 'utf8')).canonical_root, target);
      for (const runtime of ['claude', 'codex', 'cursor']) {
        const runtimeRoot = path.join(home, `.${runtime}`);
        const agentFile = path.join(runtimeRoot, 'agents', runtime === 'codex' ? 'code-reviewer.toml' : 'code-reviewer.md');
        let agent = fs.readFileSync(agentFile, 'utf8');
        if (runtime === 'codex') agent = JSON.parse(agent.match(/^developer_instructions = (.+)$/m)[1]);
        assert.ok(agent.includes(target), runtime);
        for (const [name, profile] of [['customer-researcher', 'static-analysis-read-only'], ['customer-evidence-analyst', 'evidence-analysis-read-only']]) {
          const customerPath = path.join(runtimeRoot, 'agents', `${name}.${runtime === 'codex' ? 'toml' : 'md'}`);
          let customer = fs.readFileSync(customerPath, 'utf8');
          if (runtime === 'codex') customer = JSON.parse(customer.match(/^developer_instructions = (.+)$/m)[1]);
          assert.ok(customer.includes(target) && customer.includes(profile) && customer.includes('research_mode'), `${runtime}/${name}`);
          assert.ok(customer.includes('non-Git'), `${runtime}/${name}: selected-project boundary must survive generation`);
        }
        for (const name of ['feature-pro', 'architecture-pro', 'explainer-pro', 'review-pro', 'debug-pro', 'outcome-pro', 'customer-backward-pro', 'roadmap-pro', 'roadmap-backlog-structuring', 'roadmap-product-note', 'customer-research-framing', 'workspace-codemap-context', 'ralph-loop']) {
          const skill = fs.readFileSync(path.join(runtimeRoot, 'skills', name, 'SKILL.md'), 'utf8');
          assert.ok(skill.includes(path.join(target, 'skills', name, 'SKILL.md')), `${runtime}/${name}`);
          assert.match(skill, /including nested references and shell examples/);
          assert.match(skill, /Project-local artifact paths are unchanged/);
          assert.match(skill, /do not redirect them into the harness installation unless the harness itself is the explicitly selected project/);
          assert.match(skill, /Generated adapters are not canonical source/);
        }
        const commandPath = runtime === 'codex'
          ? path.join(runtimeRoot, 'skills', 'workspace-codemap-pro', 'SKILL.md')
          : path.join(runtimeRoot, 'commands', 'workspace-codemap-pro.md');
        assert.ok(fs.readFileSync(commandPath, 'utf8').includes(path.join(target, 'commands', 'workspace-codemap-pro.md')));
        const roadmapPath = runtime === 'codex' ? path.join(runtimeRoot, 'skills/roadmap-pro/SKILL.md') : path.join(runtimeRoot, 'commands/roadmap-pro.md');
        const roadmapEntry = fs.readFileSync(roadmapPath, 'utf8');
        assert.ok(roadmapEntry.includes(path.join(target, runtime === 'codex' ? 'skills/roadmap-pro/SKILL.md' : 'commands/roadmap-pro.md')));
        for (const name of ['roadmap-curator', 'roadmap-analyst']) {
          const entry = fs.readFileSync(path.join(runtimeRoot, 'agents', `${name}.${runtime === 'codex' ? 'toml' : 'md'}`), 'utf8');
          assert.ok(entry.includes('roadmap_mode') && entry.includes(target), `${runtime}/${name}`);
        }
      }
      assert.equal(fs.existsSync(path.join(home, '.agents')), false);
      if (mode === 'copy') {
        assert.equal(fs.readFileSync(path.join(target, 'commands', 'feature-pro.md'), 'utf8'), fs.readFileSync(path.join(HARNESS_ROOT, 'commands', 'feature-pro.md'), 'utf8'));
      }
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });
}

test('default link updates accept the portable root alias', () => {
  const home = temporaryHome();
  try {
    const args = [path.join(HARNESS_ROOT, 'scripts', 'install.mjs'), '--home', home, '--mode', 'link'];
    childProcess.execFileSync(process.execPath, args);
    const manifestFile = path.join(home, '.pro-harness', 'runtime-adapters', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    manifest.canonical_root = '~/.agents';
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    const updated = childProcess.spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(updated.status, 0, updated.stderr);
    assert.equal(JSON.parse(fs.readFileSync(manifestFile, 'utf8')).canonical_root, path.join(home, '.agents'));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('a second link target cannot retarget an unselected runtime', () => {
  const home = temporaryHome();
  try {
    const installer = path.join(HARNESS_ROOT, 'scripts', 'install.mjs');
    const firstTarget = path.join(home, 'first harness');
    const secondTarget = path.join(home, 'second harness');
    childProcess.execFileSync(process.execPath, [installer, '--home', home, '--mode', 'link', '--target', firstTarget, '--runtimes', 'claude']);
    const wrapper = path.join(home, '.claude', 'commands', 'feature-pro.md');
    const before = fs.readFileSync(wrapper, 'utf8');
    const second = childProcess.spawnSync(process.execPath, [installer, '--home', home, '--mode', 'link', '--target', secondTarget, '--runtimes', 'codex'], { encoding: 'utf8' });
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /already bound to/);
    assert.equal(fs.readFileSync(wrapper, 'utf8'), before);
    assert.equal(fs.existsSync(secondTarget), false);
    assert.equal(fs.existsSync(path.join(home, '.codex')), false);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

for (const mode of ['copy', 'link']) {
  test(`command rename upgrades ${mode} installs without deleting unmanaged entries`, () => {
    const home = temporaryHome();
    const target = path.join(home, 'custom harness');
    try {
      const args = [path.join(HARNESS_ROOT, 'scripts', 'install.mjs'), '--home', home, '--target', target, '--mode', mode];
      childProcess.execFileSync(process.execPath, args);
      const adapterRoot = mode === 'copy' ? path.join(target, 'adapters', 'generated') : path.join(home, '.pro-harness', 'runtime-adapters');
      const manifestFile = path.join(adapterRoot, 'manifest.json');
      const oldManifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
      oldManifest.commands = oldManifest.commands.map((name) => name === 'workspace-codemap-pro' ? 'workspace-codemap' : name);
      fs.writeFileSync(manifestFile, JSON.stringify(oldManifest));
      for (const runtime of ['claude', 'codex']) {
        const suffix = runtime === 'codex' ? ['skills', 'workspace-codemap'] : ['commands', 'workspace-codemap.md'];
        fs.symlinkSync(path.join(adapterRoot, runtime, ...suffix), path.join(home, `.${runtime}`, ...suffix));
      }
      const unmanaged = path.join(home, '.cursor', 'commands', 'workspace-codemap.md');
      const personalFile = path.join(home, 'personal-command.md');
      fs.writeFileSync(personalFile, 'personal command - preserve');
      if (mode === 'link') fs.symlinkSync(personalFile, unmanaged);
      else fs.copyFileSync(personalFile, unmanaged);
      childProcess.execFileSync(process.execPath, [...args, '--dry-run']);
      assert.ok(fs.lstatSync(path.join(home, '.claude', 'commands', 'workspace-codemap.md')).isSymbolicLink());
      const partial = childProcess.spawnSync(process.execPath, [...args, '--runtimes', 'claude'], { encoding: 'utf8' });
      assert.notEqual(partial.status, 0);
      assert.match(partial.stderr, /rename also requires updating codex/);
      assert.deepEqual(JSON.parse(fs.readFileSync(manifestFile, 'utf8')), oldManifest);
      const result = childProcess.execFileSync(process.execPath, args, { encoding: 'utf8' });
      assert.match(result, /retired_links=/);
      assert.throws(() => fs.lstatSync(path.join(home, '.claude', 'commands', 'workspace-codemap.md')), { code: 'ENOENT' });
      assert.throws(() => fs.lstatSync(path.join(home, '.codex', 'skills', 'workspace-codemap')), { code: 'ENOENT' });
      assert.equal(fs.readFileSync(unmanaged, 'utf8'), 'personal command - preserve');
      assert.equal(fs.lstatSync(unmanaged).isSymbolicLink(), mode === 'link');
      assert.ok(fs.existsSync(path.join(home, '.claude', 'commands', 'workspace-codemap-pro.md')));
      assert.ok(fs.existsSync(path.join(home, '.codex', 'skills', 'workspace-codemap-pro', 'SKILL.md')));
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });
}

test('Claude user MCP configuration preserves unrelated settings and is idempotent', () => {
  const home = temporaryHome();
  const file = path.join(home, '.claude.json');
  const original = { theme: 'dark', projects: { '/example/repo': { allowedTools: [] } }, mcpServers: { personal: { command: 'personal-server' } } };
  try {
    fs.writeFileSync(file, JSON.stringify(original));
    const args = [path.join(HARNESS_ROOT, 'scripts', 'configure-mcps.mjs'), '--home', home, '--runtimes', 'claude', '--providers', 'playwright'];
    childProcess.execFileSync(process.execPath, [path.join(HARNESS_ROOT, 'scripts', 'install.mjs'), '--home', home, '--runtimes', 'claude', '--mcp-providers', 'playwright', '--dry-run']);
    assert.equal(fs.readFileSync(file, 'utf8'), JSON.stringify(original));
    childProcess.execFileSync(process.execPath, args);
    const configured = fs.readFileSync(file, 'utf8');
    const actual = JSON.parse(configured);
    assert.ok(actual.mcpServers.playwright);
    delete actual.mcpServers.playwright;
    assert.deepEqual(actual, original);
    childProcess.execFileSync(process.execPath, args);
    assert.equal(fs.readFileSync(file, 'utf8'), configured);
    assert.equal(fs.statSync(file).mode & 0o077, 0);
    assert.equal(fs.existsSync(path.join(home, '.claude', 'mcp.json')), false);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('Claude config conflicts and invalid objects fail before any runtime is changed', () => {
  const home = temporaryHome();
  const file = path.join(home, '.claude.json');
  try {
    for (const original of [{ mcpServers: { playwright: { command: 'personal-server' } } }, [], null, { mcpServers: [] }]) {
      const before = JSON.stringify(original);
      fs.writeFileSync(file, before);
      const result = childProcess.spawnSync(process.execPath, [
        path.join(HARNESS_ROOT, 'scripts', 'configure-mcps.mjs'), '--home', home,
        '--runtimes', 'claude,codex,cursor', '--providers', 'playwright',
      ], { encoding: 'utf8' });
      assert.notEqual(result.status, 0, before);
      assert.equal(fs.readFileSync(file, 'utf8'), before);
      assert.equal(fs.existsSync(path.join(home, '.cursor', 'mcp.json')), false);
      assert.equal(fs.existsSync(path.join(home, '.codex', 'config.toml')), false);
    }
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('runtime adapter generator emits native definitions without polluting canonical skills', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-adapters-'));
  try {
    const result = childProcess.execFileSync(process.execPath, [
      path.join(HARNESS_ROOT, 'scripts', 'generate-runtime-adapters.mjs'),
      '--output-root', output,
    ], { encoding: 'utf8' });
    assert.match(result, /status=success agents=61 commands=9/);
    assert.match(fs.readFileSync(path.join(output, 'claude', 'agents', 'code-reviewer.md'), 'utf8'), /^name: code-reviewer$/m);
    assert.match(fs.readFileSync(path.join(output, 'cursor', 'commands', 'feature-pro.md'), 'utf8'), /~\/.agents\/commands\/feature-pro\.md/);
    assert.match(fs.readFileSync(path.join(output, 'cursor', 'commands', 'architecture-pro.md'), 'utf8'), /~\/.agents\/commands\/architecture-pro\.md/);
    assert.match(fs.readFileSync(path.join(output, 'cursor', 'commands', 'explainer-pro.md'), 'utf8'), /~\/.agents\/commands\/explainer-pro\.md/);
    assert.match(fs.readFileSync(path.join(output, 'cursor', 'commands', 'review-pro.md'), 'utf8'), /~\/.agents\/commands\/review-pro\.md/);
    assert.match(fs.readFileSync(path.join(output, 'cursor', 'commands', 'debug-pro.md'), 'utf8'), /~\/.agents\/commands\/debug-pro\.md/);
    assert.ok(fs.existsSync(path.join(output, 'codex', 'skills', 'debug-pro', 'agents', 'openai.yaml')));
    assert.match(fs.readFileSync(path.join(output, 'codex', 'agents', 'code-reviewer.toml'), 'utf8'), /^developer_instructions = /m);
    assert.ok(fs.existsSync(path.join(output, 'codex', 'skills', 'workspace-codemap-pro', 'SKILL.md')));
    for (const runtime of ['claude', 'cursor']) {
      assert.ok(fs.existsSync(path.join(output, runtime, 'commands', 'workspace-codemap-pro.md')));
      assert.equal(fs.existsSync(path.join(output, runtime, 'commands', 'workspace-codemap.md')), false);
    }
    assert.equal(fs.existsSync(path.join(output, 'codex', 'skills', 'workspace-codemap')), false);
    assert.ok(fs.existsSync(path.join(output, 'codex', 'skills', 'feature-pro', 'agents', 'openai.yaml')));
    assert.equal(fs.existsSync(path.join(HARNESS_ROOT, 'skills', 'feature-pro', 'agents', 'openai.yaml')), false);
  } finally {
    fs.rmSync(output, { recursive: true, force: true });
  }
});

test('runtime adapter generator refuses to clear unmanaged output', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-unmanaged-'));
  try {
    const sentinel = path.join(output, 'keep-me.txt');
    fs.writeFileSync(sentinel, 'preserve');
    const result = childProcess.spawnSync(process.execPath, [
      path.join(HARNESS_ROOT, 'scripts', 'generate-runtime-adapters.mjs'),
      '--output-root', output,
    ], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /refusing to clear unmanaged adapter output directory/);
    assert.equal(fs.readFileSync(sentinel, 'utf8'), 'preserve');
  } finally {
    fs.rmSync(output, { recursive: true, force: true });
  }
});

test('shared workflow mechanics remain runtime and installation neutral', () => {
  for (const name of ['repository-artifacts.mjs', 'command-validation.mjs']) {
    const file = path.join(HARNESS_ROOT, 'scripts', 'lib', name);
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /~\/\.agents|\.claude(?:\/|\\)|\.codex(?:\/|\\)|\.cursor(?:\/|\\)|CLAUDE_PLUGIN_ROOT|PLUGIN_ROOT/);
  }
});

test('installer creates a canonical hub and non-destructive per-runtime links', () => {
  const home = temporaryHome();
  const target = path.join(home, '.agents');
  try {
    const dryRun = childProcess.execFileSync(process.execPath, [
      path.join(HARNESS_ROOT, 'scripts', 'install.mjs'), '--home', home, '--target', target, '--dry-run'
    ], { encoding: 'utf8' });
    assert.match(dryRun, /status=success/);
    assert.equal(fs.existsSync(target), false);

    const installed = childProcess.execFileSync(process.execPath, [
      path.join(HARNESS_ROOT, 'scripts', 'install.mjs'), '--home', home, '--target', target,
      '--runtimes', 'claude,codex,cursor', '--mcp-providers', 'playwright,mermaid'
    ], { encoding: 'utf8' });
    assert.match(installed, /61 agents and 9 commands/);
    assert.ok(fs.existsSync(path.join(target, '.pro-harness-install.json')));
    assert.ok(fs.lstatSync(path.join(home, '.claude', 'commands', 'feature-pro.md')).isSymbolicLink());
    assert.ok(fs.lstatSync(path.join(home, '.claude', 'commands', 'architecture-pro.md')).isSymbolicLink());
    assert.ok(fs.lstatSync(path.join(home, '.claude', 'commands', 'explainer-pro.md')).isSymbolicLink());
    assert.ok(fs.lstatSync(path.join(home, '.claude', 'commands', 'review-pro.md')).isSymbolicLink());
    assert.ok(fs.lstatSync(path.join(home, '.claude', 'commands', 'debug-pro.md')).isSymbolicLink());
    assert.ok(fs.lstatSync(path.join(home, '.cursor', 'agents', 'code-reviewer.md')).isSymbolicLink());
    assert.ok(fs.lstatSync(path.join(home, '.codex', 'skills', 'workspace-codemap-pro')).isSymbolicLink());
    assert.ok(fs.lstatSync(path.join(home, '.codex', 'agents', 'code-reviewer.toml')).isSymbolicLink());
    assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(path.join(home, '.claude.json'), 'utf8')).mcpServers), ['playwright', 'mermaid']);
    assert.match(fs.readFileSync(path.join(home, '.codex', 'config.toml'), 'utf8'), /# BEGIN PRO HARNESS MCP/);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('link-mode installer keeps generated runtime files outside the source checkout', () => {
  const home = temporaryHome();
  const target = path.join(home, '.agents');
  const generatedBefore = fs.existsSync(path.join(HARNESS_ROOT, 'adapters', 'generated'));
  try {
    const installed = childProcess.execFileSync(process.execPath, [
      path.join(HARNESS_ROOT, 'scripts', 'install.mjs'), '--home', home, '--target', target,
      '--mode', 'link', '--runtimes', 'claude,codex,cursor'
    ], { encoding: 'utf8' });
    assert.match(installed, /status=success/);
    assert.ok(fs.lstatSync(target).isSymbolicLink());
    assert.equal(fs.realpathSync(target), HARNESS_ROOT);
    assert.ok(fs.existsSync(path.join(home, '.pro-harness', 'runtime-adapters', 'manifest.json')));
    assert.equal(fs.existsSync(path.join(HARNESS_ROOT, 'adapters', 'generated')), generatedBefore);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('MCP configuration requires credentials, redacts output, and writes private files', () => {
  const home = temporaryHome();
  const secret = 'test-firecrawl-secret-value';
  try {
    const missing = childProcess.spawnSync(process.execPath, [
      path.join(HARNESS_ROOT, 'scripts', 'configure-mcps.mjs'), '--home', home, '--providers', 'firecrawl'
    ], { encoding: 'utf8', env: { ...process.env, FIRECRAWL_API_KEY: '' } });
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /missing required environment variables: FIRECRAWL_API_KEY/);
    assert.equal(fs.existsSync(path.join(home, '.claude.json')), false);

    const configured = childProcess.execFileSync(process.execPath, [
      path.join(HARNESS_ROOT, 'scripts', 'configure-mcps.mjs'), '--home', home,
      '--runtimes', 'claude,codex,cursor', '--providers', 'firecrawl'
    ], { encoding: 'utf8', env: { ...process.env, FIRECRAWL_API_KEY: secret } });
    assert.doesNotMatch(configured, new RegExp(secret));
    for (const file of [path.join(home, '.claude.json'), path.join(home, '.cursor', 'mcp.json'), path.join(home, '.codex', 'config.toml')]) {
      assert.equal(fs.statSync(file).mode & 0o077, 0, file);
      assert.match(fs.readFileSync(file, 'utf8'), new RegExp(secret));
    }
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('MCP preflight prevents partial writes when any runtime has a provider conflict', () => {
  const home = temporaryHome();
  try {
    fs.mkdirSync(path.join(home, '.cursor'), { recursive: true });
    fs.writeFileSync(path.join(home, '.cursor', 'mcp.json'), JSON.stringify({ mcpServers: { playwright: { command: 'different' } } }));
    const result = childProcess.spawnSync(process.execPath, [
      path.join(HARNESS_ROOT, 'scripts', 'configure-mcps.mjs'), '--home', home,
      '--runtimes', 'claude,codex,cursor', '--providers', 'playwright'
    ], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /refusing to overwrite existing MCP server playwright/);
    assert.equal(fs.existsSync(path.join(home, '.claude.json')), false);
    assert.equal(fs.existsSync(path.join(home, '.codex', 'config.toml')), false);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('distribution tree contains no machine metadata or migration-only workspace paths', () => {
  const files = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else files.push(file);
    }
  };
  walk(HARNESS_ROOT);
  assert.equal(files.some((file) => path.basename(file) === '.DS_Store'), false);
  const text = files.filter((file) => file !== __filename).map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(text, /Updated-Personal-Harness|Personal-Setup-Harness|Workspace Personal|\/Users\/aarat/);
});
