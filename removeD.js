const { Series } = require('./models'); // adjust path

async function deleteDuplicateMovies() {
  console.log("🔍 Checking for duplicate movies...");

  const duplicates = await Series.findAll({
    attributes: ['f_id'],
    group: ['f_id'],
    having: Series.sequelize.literal('COUNT(*) > 1'),
  });

  console.log(`Found ${duplicates.length} f_id groups with duplicates.`);

  for (const dup of duplicates) {
    const f_id = dup.f_id;

    // Fetch all movies with that f_id, sorted by id
    const movies = await Series.findAll({
      where: { f_id },
      order: [['id', 'ASC']],
    });

    // Keep the first (lowest id), delete the rest
    const toDelete = movies.slice(1); // skip first
    for (const m of toDelete) {
      await m.destroy();
    }

    console.log(`🗑️ Deleted ${toDelete.length} duplicates for f_id ${f_id}`);
  }

  console.log("✅ Done removing duplicates!");
}

deleteDuplicateMovies().catch(console.error);
