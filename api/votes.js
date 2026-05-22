const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();

  const { data, error } = await supabase.from('votes').select('*');
  if (error) return res.status(500).json({ error: error.message });

  const votes = {};
  for (const row of data) {
    votes[row.pokemon_id] = {
      smash: row.smash,
      pass: row.pass,
      name: row.name,
      sprite: row.sprite,
    };
  }
  res.json(votes);
};
