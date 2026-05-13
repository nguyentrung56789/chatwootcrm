// /api/getConfig.js
export default function handler(req, res) {
  // ===== CORS cơ bản =====
  res.setHeader('Access-Control-Allow-Origin', '*'); // có thể siết domain khi deploy
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();


  // // ===== (Tuỳ chọn) Đọc từ ENV khi deploy =====
  const env = {
  url: process.env.SUPABASE_URL || '',
  anon: process.env.SUPABASE_ANON_KEY || '',
  role: process.env.SUPABASE_ROLE ||'',
  webhookUrl: process.env.WEBHOOK_URL || '',
  mapUrl: process.env.APPS_URL || '',
  mapSheet: process.env.SHEET_ID || '',
  mapSecret: process.env.SHARED_SECRET || '',
  mapCsv: process.env.CSV_URL || ''
  };

  if (!env.url || !env.anon) {
    return res.status(500).json({ error: 'Thiếu Supabase config' });
  }


  return res.status(200).json({
    url: env.url,
    anon: env.anon,
    role: env.role,
    webhookUrl: env.webhookUrl,
    
      apps_url: env.mapUrl,
      sheet_id: env.mapSheet,
      shared_secret: env.mapSecret,
      csv_url: env.mapCsv,
   
  });
}