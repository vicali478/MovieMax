const { Movie } = require('./models'); // adjust path

async function deleteDuplicateMovies() {
  console.log("🔍 Checking for duplicate movies...");

  const duplicates = await Movie.findAll({
    attributes: ['f_id'],
    group: ['f_id'],
    having: Movie.sequelize.literal('COUNT(*) > 1'),
  });

  console.log(`Found ${duplicates.length} f_id groups with duplicates.`);

  for (const dup of duplicates) {
    const f_id = dup.f_id;

    // Fetch all movies with that f_id, sorted by id
    const movies = await Movie.findAll({
      where: { f_id },
      order: [['id', 'ASC']], // ensures lowest ID comes first
    });

    // Find the first movie with a non-null downloadUrl
    let indexToSkip = movies.findIndex(movie => movie.downloadUrl !== null);

    // If all have null downloadUrl, skip the very first one
    if (indexToSkip === -1) {
      indexToSkip = 0;
    }

    // Keep everything except the one to skip
    const toDelete = movies.filter((_, index) => index !== indexToSkip);

    // Delete the rest
    for (const m of toDelete) {
      await m.destroy();
    }


    console.log(`🗑️ Deleted ${toDelete.length} duplicates for f_id ${f_id}`);
  }

  console.log("✅ Done removing duplicates!");
}

deleteDuplicateMovies().catch(console.error);
