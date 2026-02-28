// ============================================================
// ARCHIVO DE CONFIGURACIÓN — config.js
// ============================================================

const SUPABASE_URL      = 'https://sytvmdrdvgifrjgimmlo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5dHZtZHJkdmdpZnJqZ2ltbWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNDIzMjksImV4cCI6MjA4NzgxODMyOX0.wUR3rzi1D5hx0ky35HK9YnGfAFDBv9npw4GWdTESs6I';

// Inicializar cliente de Supabase (no tocar)
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
