import fs from 'node:fs';
import path from 'node:path';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function cleanDirectory(directory, harnessRoot) {
  const generatedInsideHarness = path.join(harnessRoot, 'adapters', 'generated');
  if (directory === harnessRoot || harnessRoot.startsWith(`${directory}${path.sep}`)) {
    throw new Error('refusing to use the harness root or one of its ancestors as adapter output');
  }
  if (directory.startsWith(`${harnessRoot}${path.sep}`) && directory !== generatedInsideHarness && !directory.startsWith(`${generatedInsideHarness}${path.sep}`)) {
    throw new Error('adapter output inside the harness is restricted to adapters/generated');
  }
  if (fs.existsSync(directory)) {
    const entries = fs.readdirSync(directory);
    if (entries.length > 0 && !fs.existsSync(path.join(directory, '.pro-harness-generated.json'))) {
      throw new Error(`refusing to clear unmanaged adapter output directory ${directory}`);
    }
  }
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
}

function frontmatterValue(value) {
  return JSON.stringify(value);
}

function rootBinding(canonicalRoot) {
  return [
    `Canonical harness root (\`HARNESS_ROOT\`): \`${canonicalRoot}\`.`,
    'Use this root for every harness-owned file, including nested references and shell examples; interpret canonical `~/.agents` prefixes as this root, not another installation.',
    '`HARNESS_ROOT` is not automatically exported: set it to this root when a shell example needs it, expand a leading tilde before use, and quote filesystem paths.',
    `Resolve named canonical skills under \`${canonicalRoot}/skills/<name>/SKILL.md\` and pass the same root to delegated agents.`,
    'Project-local artifact paths are unchanged; do not redirect them into the harness installation unless the harness itself is the explicitly selected project. Generated adapters are not canonical source.',
    ''
  ].join('\n');
}

function agentBody(agent, profile, canonicalRoot) {
  return [
    `# ${agent.name}`,
    '',
    agent.description,
    '',
    rootBinding(canonicalRoot),
    `Capability profile: \`${agent.capability_profile}\` (${profile.repository_access}; external access: ${profile.external_access}).`,
    `Required inputs: ${agent.required_inputs.map((input) => `\`${input}\``).join(', ')}.`,
    agent.skills.length ? `Load these canonical skills when applicable: ${agent.skills.map((skill) => `\`${skill}\``).join(', ')}.` : 'No skill is loaded implicitly.',
    '',
    '## Instructions',
    '',
    ...agent.instructions.map((instruction) => `- ${instruction}`),
    '',
    '## Artifact boundary',
    '',
    '- Use the caller-supplied `artifact_root`; do not invent another output directory.',
    `- Repository writes are \`${agent.artifact_policy.repository_writes}\`; path escape is forbidden.`,
    '- Stop when required inputs or allowed capabilities are unavailable; report the blocker without widening scope.',
    ''
  ].join('\n');
}

function claudeTools(profile, capabilityAdapters) {
  const tools = new Set();
  for (const capability of profile.capabilities) {
    for (const adapter of capabilityAdapters[capability]?.claude ?? []) {
      const tool = adapter.split(':')[0];
      if (['Read', 'Grep', 'Glob', 'Bash', 'Write', 'Edit'].includes(tool)) tools.add(tool);
    }
  }
  return [...tools];
}

function writeMarkdownAgent(file, agent, profile, runtime, capabilityAdapters, canonicalRoot) {
  const frontmatter = [
    '---',
    `name: ${agent.name}`,
    `description: ${frontmatterValue(agent.description)}`
  ];
  if (runtime === 'claude') {
    const tools = claudeTools(profile, capabilityAdapters);
    if (tools.length) frontmatter.push(`tools: ${tools.join(', ')}`);
  }
  frontmatter.push('---', '');
  fs.writeFileSync(file, `${frontmatter.join('\n')}${agentBody(agent, profile, canonicalRoot)}`, 'utf8');
}

function writeCodexAgent(file, agent, profile, canonicalRoot) {
  fs.writeFileSync(file, [
    `name = ${JSON.stringify(agent.name)}`,
    `description = ${JSON.stringify(agent.description)}`,
    `developer_instructions = ${JSON.stringify(agentBody(agent, profile, canonicalRoot))}`,
    ''
  ].join('\n'), 'utf8');
}

function readCommandMetadata(file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error(`${file}: missing command frontmatter`);
  const metadata = {};
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    if (separator < 1) continue;
    metadata[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  if (!metadata.name || !metadata.description) throw new Error(`${file}: command name and description are required`);
  return metadata;
}

function writeCommandWrapper(file, metadata, canonicalRoot) {
  fs.writeFileSync(file, [
    '---',
    `description: ${frontmatterValue(metadata.description)}`,
    ...(metadata['argument-hint'] ? [`argument-hint: ${frontmatterValue(metadata['argument-hint'])}`] : []),
    '---',
    '',
    rootBinding(canonicalRoot),
    `Read \`${canonicalRoot}/commands/${metadata.name}.md\` completely and execute it as the canonical command contract.`,
    'Preserve the user request and arguments exactly. Do not reconstruct the workflow from memory.',
    ''
  ].join('\n'), 'utf8');
}

function titleCase(name) {
  return name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function shortDescription(description) {
  const sentence = description.split(/[.!?]/)[0].trim();
  return sentence.length <= 64 ? sentence : `${sentence.slice(0, 61).trimEnd()}...`;
}

function writeCodexSkillMetadata(directory, name, description) {
  const metadataDirectory = path.join(directory, 'agents');
  fs.mkdirSync(metadataDirectory, { recursive: true });
  fs.writeFileSync(path.join(metadataDirectory, 'openai.yaml'), [
    'interface:',
    `  display_name: ${JSON.stringify(titleCase(name))}`,
    `  short_description: ${JSON.stringify(shortDescription(description))}`,
    `  default_prompt: ${JSON.stringify(`Use $${name} for this request.`)}`,
    ''
  ].join('\n'), 'utf8');
}

function writeSkillAdapters(harnessRoot, outputRoot, commands, runtime, canonicalRoot) {
  const sourceSkills = path.join(harnessRoot, 'skills');
  const destination = path.join(outputRoot, runtime, 'skills');
  fs.mkdirSync(destination, { recursive: true });
  const installed = new Set();
  for (const entry of fs.readdirSync(sourceSkills, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const canonicalSkill = path.join(sourceSkills, entry.name, 'SKILL.md');
    if (!entry.isDirectory() || !fs.existsSync(canonicalSkill)) continue;
    const target = path.join(destination, entry.name);
    fs.mkdirSync(target, { recursive: true });
    const metadata = readCommandMetadata(canonicalSkill);
    fs.writeFileSync(path.join(target, 'SKILL.md'), [
      '---',
      `name: ${metadata.name}`,
      `description: ${frontmatterValue(metadata.description)}`,
      '---',
      '',
      rootBinding(canonicalRoot),
      `Read \`${canonicalRoot}/skills/${entry.name}/SKILL.md\` completely and execute it as the canonical skill contract.`,
      `Resolve every relative reference against \`${canonicalRoot}/skills/${entry.name}/\`.`,
      'Preserve the user request and arguments exactly. Do not reconstruct the skill from memory.',
      ''
    ].join('\n'), 'utf8');
    if (runtime === 'codex') writeCodexSkillMetadata(target, metadata.name, metadata.description);
    installed.add(entry.name);
  }
  if (runtime !== 'codex') return;
  for (const command of commands) {
    if (installed.has(command.name)) continue;
    const target = path.join(destination, command.name);
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'SKILL.md'), [
      '---',
      `name: ${command.name}`,
      `description: ${frontmatterValue(`${command.description} Use when the user invokes /${command.name} or names $${command.name}.`)}`,
      '---',
      '',
      rootBinding(canonicalRoot),
      `Read \`${canonicalRoot}/commands/${command.name}.md\` completely and execute it as the canonical command contract.`,
      'Preserve the user request and arguments exactly.',
      ''
    ].join('\n'), 'utf8');
    writeCodexSkillMetadata(target, command.name, command.description);
  }
}

export function generateRuntimeAdapters({ harnessRoot, outputRoot, canonicalRoot }) {
  const root = path.resolve(harnessRoot);
  const output = path.resolve(outputRoot);
  const previousManifest = path.join(output, 'manifest.json');
  if (canonicalRoot === undefined && fs.existsSync(path.join(output, '.pro-harness-generated.json')) && fs.existsSync(previousManifest)) {
    canonicalRoot = readJson(previousManifest).canonical_root;
  }
  canonicalRoot ??= '~/.agents';
  if (typeof canonicalRoot !== 'string' || (canonicalRoot !== '~/.agents' && !path.isAbsolute(canonicalRoot)) || /[\r\n`]/.test(canonicalRoot)) {
    throw new Error('canonical harness root must be an absolute single-line path or ~/.agents');
  }
  cleanDirectory(output, root);

  const profiles = readJson(path.join(root, 'agents', 'capability-profiles.json')).profiles;
  const capabilityAdapters = readJson(path.join(root, 'agents', 'adapters', 'capabilities.json')).capabilities;
  const definitionDirectory = path.join(root, 'agents', 'definitions');
  const agents = fs.readdirSync(definitionDirectory).filter((name) => name.endsWith('.json')).sort()
    .map((name) => readJson(path.join(definitionDirectory, name)));
  const commandDirectory = path.join(root, 'commands');
  const commands = fs.readdirSync(commandDirectory).filter((name) => name.endsWith('.md')).sort()
    .map((name) => readCommandMetadata(path.join(commandDirectory, name)));

  for (const runtime of ['claude', 'cursor', 'codex']) {
    fs.mkdirSync(path.join(output, runtime, 'agents'), { recursive: true });
  }
  for (const agent of agents) {
    const profile = profiles[agent.capability_profile];
    if (!profile) throw new Error(`${agent.name}: unknown capability profile ${agent.capability_profile}`);
    writeMarkdownAgent(path.join(output, 'claude', 'agents', `${agent.name}.md`), agent, profile, 'claude', capabilityAdapters, canonicalRoot);
    writeMarkdownAgent(path.join(output, 'cursor', 'agents', `${agent.name}.md`), agent, profile, 'cursor', capabilityAdapters, canonicalRoot);
    writeCodexAgent(path.join(output, 'codex', 'agents', `${agent.name}.toml`), agent, profile, canonicalRoot);
  }

  for (const runtime of ['claude', 'cursor']) {
    const directory = path.join(output, runtime, 'commands');
    fs.mkdirSync(directory, { recursive: true });
    for (const command of commands) writeCommandWrapper(path.join(directory, `${command.name}.md`), command, canonicalRoot);
  }
  for (const runtime of ['claude', 'codex', 'cursor']) writeSkillAdapters(root, output, commands, runtime, canonicalRoot);

  const manifest = {
    schema_version: 1,
    canonical_root: canonicalRoot,
    generated_at: new Date().toISOString(),
    runtimes: ['claude', 'codex', 'cursor'],
    agents: agents.map((agent) => agent.name),
    commands: commands.map((command) => command.name),
    codex_invocations: commands.map((command) => `$${command.name}`)
  };
  fs.writeFileSync(path.join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(output, '.pro-harness-generated.json'), `${JSON.stringify({ schema_version: 1 }, null, 2)}\n`, 'utf8');
  return manifest;
}
