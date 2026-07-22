// api/ping.js
// Fonction serverless Vercel : pingue Supabase pour maintenir le projet actif
export default async function handler(req, res) {
  try {
    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/rest/v1/annees_scolaires?select=id&limit=1`,
      {
        headers: {
          apikey: process.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
        },
      }
    )
    const status = response.status
    res.status(200).json({ ok: true, supabase_status: status, timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}
