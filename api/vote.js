const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { id, choice, name, sprite } = req.body || {};
  if (!id || !['smash', 'pass'].includes(choice)) {
    return res.status(400).json({ error: 'Invalid vote' });
  }

  const { data, error } = await supabase.rpc('record_vote', {
    p_id: String(id),
    p_choice: choice,
    p_name: name || '',
    p_sprite: sprite || '',
  });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true, votes: { smash: data.smash, pass: data.pass } });
};
