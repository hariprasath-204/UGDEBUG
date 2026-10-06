/**
 * upload_questions_to_supabase.js
 * 
 * Script to automatically seed all C++ debugging questions from
 * `questions/codathan_all_cpp_questions.json` into Supabase `questions` table.
 * 
 * Run with: node migrations/upload_questions_to_supabase.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ksikkbvxtnpwnisvckeg.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzaWtrYnZ4dG5wd25pc3Zja2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyODM1OTAsImV4cCI6MjEwNjg1OTU5MH0.32_0NMzFN_5_-J9qo7rvVuscpa2wU7zxubMIMQgepsw';

const questionsFilePath = path.join(__dirname, '../questions/codathan_all_cpp_questions.json');

async function uploadQuestions() {
  console.log('🚀 Starting Question Seeding to Supabase...');
  console.log(`📡 Supabase Endpoint: ${SUPABASE_URL}`);

  if (!fs.existsSync(questionsFilePath)) {
    console.error(`❌ Question file not found at: ${questionsFilePath}`);
    return;
  }

  const rawData = fs.readFileSync(questionsFilePath, 'utf8');
  const questions = JSON.parse(rawData);
  console.log(`📦 Loaded ${questions.length} questions from JSON file.`);

  let insertedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const cppVariant = q.variants?.cpp || q.variants?.c || {};

    const payload = {
      title: q.title || `Question ${i + 1}`,
      description: q.description || '',
      category: q.category || 'Easy',
      phase: q.phase || 'cpp',
      points: q.points || 100,
      expected_output: (q.expectedOutput || '').trim(),
      initial_code: cppVariant.initialCode || q.initialCode || '',
      correct_code: cppVariant.correctCode || q.correctCode || '',
      error_lines: String(cppVariant.errorLines || q.errorLines || ''),
      variants: q.variants || {}
    };

    try {
      const response = await axios.post(
        `${SUPABASE_URL}/rest/v1/questions`,
        payload,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          }
        }
      );

      if (response.status === 201 || response.status === 200) {
        insertedCount++;
        process.stdout.write(`\r✅ Uploaded question [${i + 1}/${questions.length}]: ${payload.title.slice(0, 35)}...`);
      }
    } catch (err) {
      errorCount++;
      console.error(`\n❌ Error inserting question "${payload.title}":`, err?.response?.data || err?.message);
    }
  }

  console.log(`\n\n🎉 Seeding Completed!`);
  console.log(`📊 Successfully inserted: ${insertedCount}`);
  console.log(`⚠️ Errors / Skipped: ${errorCount}`);
}

uploadQuestions();
