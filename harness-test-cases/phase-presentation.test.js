'use strict';

// Instruction regression coverage; this does not guarantee model rendering.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const rule = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
const workflows = {
  'feature-pro': 21, 'architecture-pro': 13, 'review-pro': 10,
  'debug-pro': 13, 'explainer-pro': 8, 'outcome-pro': 4,
  'customer-backward-pro': 8, 'roadmap-pro': 7,
  'workspace-learning-pro': 8,
};
const publicCommands = [...Object.keys(workflows), 'workspace-codemap-pro'].sort();

function invocationRoadmap(command) {
  assert.equal(command.match(/^## (.+)$/m)?.[1], 'Invocation roadmap',
    'The invocation roadmap must be the first instruction section');
  return command.split('## Invocation roadmap\n')[1].split(/^## /m)[0];
}

function phaseMapRows(command) {
  const rows = [];
  for (const line of command.split('\n')) {
    const cells = line.trim().startsWith('|') ? line.split('|').slice(1, -1).map(cell => cell.trim()) : [];
    const tablePhase = cells[0]?.match(/^(\d+)(?:\s+(.+))?$/);
    if (tablePhase) {
      rows.push({ number: Number(tablePhase[1]), name: tablePhase[2] || cells[1], purpose: cells.at(-1) });
      continue;
    }
    const listPhase = line.trim().match(/^(\d+)\.\s+(.+?)(?:\s+—\s+|\s+\.{2,}\s+)(.+)$/);
    if (listPhase) rows.push({ number: Number(listPhase[1]), name: listPhase[2], purpose: listPhase[3] });
  }
  return rows;
}

test('Every public command has invocation coverage, including newly added commands', () => {
  const discovered = fs.readdirSync(path.join(root, 'commands'))
    .filter(file => file.endsWith('.md')).map(file => file.slice(0, -3)).sort();
  assert.deepEqual(discovered, publicCommands,
    'Register new public commands here so invocation and phase contracts cannot silently escape coverage');
});

for (const name of publicCommands) {
  test(`${name} opens with the complete roadmap before execution or selection`, () => {
    const command = read(`commands/${name}.md`);
    const opening = invocationRoadmap(command);
    assert.match(opening, /first user-facing output/i);
    assert.match(opening, /(?:full|complete) (?:phase )?(?:roadmap|outline)/i);
    assert.match(opening, /(?:pause|wait)/i);
    assert.match(opening, /`next`/);
    assert.match(opening, /(?:before|until)[\s\S]*(?:choice|selection|chooses)/i);
    assert.match(opening, /no repository inspection/i);
    assert.match(opening, /artifact[\s\S]*state[\s\S]*trace writes/i);
    assert.match(opening, /agent(?:s| dispatch)/i);
    assert.match(opening, /(?:explicit|already)[\s\S]*(?:choice|selection)/i);
    assert.match(opening, /resume/i);
    assert.match(opening, /start\/continue/i);
    assert.match(opening, /task description alone is not/i);
    assert.match(opening, /status[^\n]*without starting work/i);
    assert.match(opening, /(?:same|existing) run/i);
    assert.match(opening, /(?:do not|without|no)[\s\S]*(?:re-prompt|repeat|again)/i);
    assert.match(opening, /(?:prerequisites|approvals)/i);
    assert.doesNotMatch(command, /(?:full roadmap on request only|full roadmap only (?:on request|for)|not routinely at startup|no roadmap-only approval turn|roadmap is not an approval gate)/i);
    if (name in workflows) {
      assert.match(opening, /phase number/i);
      assert.match(opening, /canonical name/i);
      assert.match(opening, /one-line purpose/i);
      assert.match(opening, /phase <N>/);
      assert.match(opening, /capability/i);
    }
  });
}

for (const [name, total] of Object.entries(workflows)) {
  test(`${name} skill defers to the canonical opening before loading the workflow`, () => {
    const skill = read(`skills/${name}/SKILL.md`);
    const commandRead = skill.match(new RegExp('\\bread\\s+`(?:~\\/\\.agents\\/|\\$HARNESS_ROOT\\/)?commands\\/' + name + '\\.md`\\s+completely', 'i'));
    assert.ok(commandRead, 'The skill must read its own canonical command completely');
    const openingIndex = skill.indexOf('opening roadmap');
    const choiceIndex = skill.indexOf('entry choice');
    assert.ok(openingIndex > commandRead.index && choiceIndex > openingIndex,
      'Canonical command loading must precede the opening roadmap and entry choice');
    assert.match(skill.slice(openingIndex), /opening roadmap[\s\S]{0,80}entry choice[\s\S]{0,80}(?:before|first|Only then)/,
      'The skill must defer execution until the command-owned entry choice');
    const routingIndex = skill.indexOf(`commands/${name}/routing.md`);
    if (routingIndex !== -1) {
      assert.ok(routingIndex > choiceIndex, 'Phase routing must follow the opening choice instruction');
    }
    assert.doesNotMatch(skill, /(?:full roadmap on request only|full roadmap only (?:on request|for)|not routinely at startup|no roadmap-only approval turn|roadmap is not an approval gate|do not require a roadmap-only response|begin (?:already-)?authorized (?:local |read-only )?inspection in the same (?:turn|response))/i);
  });

  test(`${name} supplies canonical phase numbers, names and purposes in its inline map`, () => {
    const command = read(`commands/${name}.md`);
    const contract = JSON.parse(read(`commands/${name}/contract.json`));
    const rows = phaseMapRows(command);
    assert.deepEqual(rows.map(({ number, name }) => ({ number, name })),
      contract.phases.map(({ number, name }) => ({ number, name })),
      'The inline map must contain every canonical phase in order, without renaming or invented phases');
    for (const phase of contract.phases) {
      const row = rows.find(candidate => candidate.number === phase.number && candidate.name === phase.name);
      assert.ok(row, `Missing canonical phase ${phase.number}: ${phase.name}`);
      assert.match(row.purpose, /[A-Za-z]/, `Phase ${phase.number} needs a readable purpose`);
      assert.doesNotMatch(row.purpose, /^`[^`]+\.md`$/, `Phase ${phase.number} needs a purpose, not only a reference`);
    }
    assert.equal(contract.phase_count, total);
  });

  test(`${name} keeps exact phase-entry banners after the invocation roadmap`, () => {
    const command = read(`commands/${name}.md`);
    const contract = JSON.parse(read(`commands/${name}/contract.json`));
    assert.equal(contract.phase_count, total);
    assert.ok(command.includes('```text\n' + rule + `\nPhase <N>/${total}: <Name>\n` + rule + '\n```'));
    assert.match(command, /(?:Start the first user-facing message|Start each phase-entry message)/);
    assert.match(command, /before phase-specific tools or artifact\/state work/);
    assert.match(command, /resume.*compaction/);
    assert.match(command, /preview does not count as phase entry/);
    assert.match(command, /routine updates.*worker returns.*loop iterations/);
    assert.match(command, /no.*pauses or gates/i);
  });
}

test('Feature knows canonical phase names before loading phase-specific work', () => {
  const command = read('commands/feature-pro.md');
  const contract = JSON.parse(read('commands/feature-pro/contract.json'));
  for (const phase of contract.phases) {
    assert.ok(command.includes(`| ${phase.number} | ${phase.name} | \`feature-pro/${phase.file}\` |`));
  }
  assert.match(command, /After context loss, reread this command/);
  assert.match(read('skills/feature-pro/SKILL.md'), /phase-entry banners/);
});

test('Ralph hands presentation back without introducing banners per worker attempt', () => {
  const loop = read('skills/ralph-loop/SKILL.md');
  assert.match(loop, /caller's phase presentation/);
  assert.match(loop, /never invent phases for an unphased caller/);
  assert.match(loop, /same uninterrupted phase.*no new banner/);
  assert.match(loop, /resume.*compaction/);
  assert.match(loop, /next phase.*banner/);
  const build = read('commands/feature-pro/phases/09-build.md');
  assert.match(build, /task\/budget announcement does not replace the phase banner/);
  assert.match(read('commands/feature-pro/governance.md'), /preview is not phase entry/);
});

test('Outcome and Review do not override entry presentation or selected phase', () => {
  assert.doesNotMatch(read('commands/outcome-pro.md'), /Announce `Phase N\/4 — Name`/);
  const review = read('commands/review-pro.md');
  assert.doesNotMatch(review, /Show the Phase 1 banner/);
  assert.match(review, /selected phase.*Phase 1 only for a new review/);
});

test('Workspace Codemap keeps the unphased banner without inventing a phase total', () => {
  const command = read('commands/workspace-codemap-pro.md');
  assert.ok(command.includes('```text\n' + rule + '\nWorkspace Codemap Pro: Build / Refresh Code Maps\n' + rule + '\n```'));
  assert.match(command, /no numbered phase contract; do not invent phases or a total/);
  assert.match(command, /(?:Start the first user-facing message|Start the first execution message)/);
  assert.doesNotMatch(command, /Phase <N>\//);
});
