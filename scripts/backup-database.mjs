/**
 * Database Backup Script
 * Exports all Supabase table data to JSON files for backup purposes.
 *
 * Usage: node scripts/backup-database.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Supabase connection using service role key (bypasses RLS)
const SUPABASE_URL = 'https://amcmfwzegcppattgcmxu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  console.error('Run with: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/backup-database.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// All tables in the database
const TABLES = [
  'audit_logs',
  'carbon_footprint_results',
  'donation_campaigns',
  'gcash_donations',
  'plant_stats',
  'pledge_albums',
  'pledge_messages',
  'pledge_proofs',
  'point_transactions',
  'promo_code_uses',
  'promo_codes',
  'redemptions',
  'rewards',
  'streaks',
  'user_eco_paths',
  'users',
  'wallet_payouts',
  'wallet_transactions',
];

async function backupTable(tableName) {
  console.log(`  Backing up: ${tableName}...`);

  // Fetch all rows (paginate if needed)
  let allRows = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error(`    ERROR on ${tableName}: ${error.message}`);
      return { table: tableName, rows: 0, error: error.message };
    }

    if (!data || data.length === 0) break;

    allRows = allRows.concat(data);

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  console.log(`    → ${allRows.length} rows`);
  return { table: tableName, rows: allRows.length, data: allRows };
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = join(__dirname, '..', 'backups', `backup-${timestamp}`);

  // Create backup directory
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  console.log(`\n=== LAUDATO SI DATABASE BACKUP ===`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Backup directory: ${backupDir}\n`);

  const results = [];

  for (const table of TABLES) {
    const result = await backupTable(table);
    results.push(result);

    // Write individual table backup
    const filePath = join(backupDir, `${table}.json`);
    writeFileSync(filePath, JSON.stringify(result.data || [], null, 2));
  }

  // Write summary
  const summary = {
    timestamp: new Date().toISOString(),
    supabase_url: SUPABASE_URL,
    tables: results.map(r => ({ table: r.table, rows: r.rows, error: r.error || null })),
    total_rows: results.reduce((sum, r) => sum + r.rows, 0),
  };

  writeFileSync(join(backupDir, '_summary.json'), JSON.stringify(summary, null, 2));

  console.log(`\n=== BACKUP COMPLETE ===`);
  console.log(`Total tables: ${results.length}`);
  console.log(`Total rows: ${summary.total_rows}`);
  console.log(`Backup saved to: ${backupDir}`);

  // Print table summary
  console.log(`\nTable Summary:`);
  for (const r of results) {
    const status = r.error ? `ERROR: ${r.error}` : `${r.rows} rows`;
    console.log(`  ${r.table.padEnd(25)} ${status}`);
  }
}

main().catch(console.error);
