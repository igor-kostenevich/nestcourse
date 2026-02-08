import { config } from 'dotenv';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

config();

const QUERY = `SELECT * FROM products WHERE name = 'test'`;

async function run(): Promise<void> {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await client.connect();

  // BEFORE: примусово seq scan
  await client.query('SET enable_indexscan = off');
  await client.query('SET enable_bitmapscan = off');
  await client.query('SET enable_seqscan = on');
  const beforeResult = await client.query(`EXPLAIN ANALYZE ${QUERY}`);
  const beforePlan = beforeResult.rows.map((r) => r['QUERY PLAN']).join('\n');

  await client.end();

  // AFTER: нове підключення, звичайний план (index scan)
  const client2 = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await client2.connect();
  const afterResult = await client2.query(`EXPLAIN ANALYZE ${QUERY}`);
  const afterPlan = afterResult.rows.map((r) => r['QUERY PLAN']).join('\n');
  await client2.end();

  const beforeScanType = getScanType(beforePlan);
  const afterScanType = getScanType(afterPlan);
  const summary = buildSummary(beforeScanType, afterScanType);

  const md = `## BEFORE
\`\`\`
${beforePlan}
\`\`\`

## AFTER
\`\`\`
${afterPlan}
\`\`\`

## Summary
${summary}
`;

  const outPath = path.join(process.cwd(), 'performance.md');
  fs.writeFileSync(outPath, md, 'utf8');
  console.log('Written:', outPath);
}

function getScanType(planText: string): string {
  if (planText.includes('Bitmap Index Scan')) return 'Bitmap Index Scan';
  if (planText.includes('Index Scan')) return 'Index Scan';
  if (planText.includes('Seq Scan')) return 'Seq Scan';
  return 'Unknown';
}

function buildSummary(beforeType: string, afterType: string): string {
  const beforeDesc =
    'BEFORE: planner примусово використовує Seq Scan (enable_indexscan/bitmapscan вимкнено).';
  let afterDesc: string;
  if (afterType === 'Index Scan' || afterType === 'Bitmap Index Scan') {
    afterDesc = `AFTER: planner обирає ${afterType} (індекс використовується), що ефективніше при пошуку за name.`;
  } else if (afterType === 'Seq Scan') {
    afterDesc =
      'AFTER: planner також обирає Seq Scan (напр. через малу таблицю або відсутність індексу).';
  } else {
    afterDesc = `AFTER: тип скану — ${afterType}.`;
  }
  return `${beforeDesc} ${afterDesc}`;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
