#!/usr/bin/env node
import { recoverTrace, RECOVERABLE_WORKFLOWS } from './lib/workflow-trace-storage.mjs';

const usage = `recover-workflow-trace.mjs --artifact-root <path> --workflow <${RECOVERABLE_WORKFLOWS.join('|')}> --run-id <id> --checkpoint <relative-report.md> --approval <redacted-user-approval-record>`;
try {
  const args=process.argv.slice(2), values=new Map();
  const allowed=new Set(['--artifact-root','--workflow','--run-id','--checkpoint','--approval']);
  if (args.length===1 && args[0]==='--help') {
    console.log(JSON.stringify({usage,scope:'Preserve invalid ordering history; create one linked continuation. Requires explicit approval and a reconciled checkpoint. Never changes state or passes product gates.'},null,2));
  } else {
    for (let i=0;i<args.length;i+=2) {
      if (!allowed.has(args[i]) || values.has(args[i]) || !args[i+1] || args[i+1].startsWith('--')) throw new Error('invalid, duplicate or incomplete flag');
      values.set(args[i],args[i+1]);
    }
    if (values.size!==allowed.size) throw new Error(usage);
    const bundle=recoverTrace(values.get('--artifact-root'),{workflow:values.get('--workflow'),runId:values.get('--run-id'),checkpoint:values.get('--checkpoint'),approval:values.get('--approval')});
    console.log(JSON.stringify({status:'success',trace_status:'recovered-with-gaps',summary:'Trace-only continuation created; original history remains degraded.',history:bundle.history,artifacts:[bundle.activeName,'trace-recovery.json'],next_actions:['Validate the continuation, reconcile state from actual evidence, and resume only authorized work. Product gates remain unchanged.']},null,2));
  }
} catch (error) {
  console.log(JSON.stringify({status:'error',summary:error.message,artifacts:[],next_actions:['Preserve all history and any partial output; do not retry by deleting or replacing it.']},null,2));
  process.exitCode=1;
}
