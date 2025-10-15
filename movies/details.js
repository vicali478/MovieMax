// Format MySQL date to readable format
function formatMySQLDate(mysqlDate) {
  if (!mysqlDate) return null;
  const date = new Date(mysqlDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Get director(s) from crew array
function getDirector(crew) {
  if (!Array.isArray(crew)) return null;
  const directors = crew.filter(member => member.job === 'Director');
  if (directors.length === 0) return 'Unknown';
  return directors.map(d => d.name).join(', ');
}

// Variables to hold trailer info for download
let videoUrl = '';
let name = '';

// Function to trigger download
function downloadTrailer() {
  if (!videoUrl || !name) return alert("No trailer available for download.");
  const link = document.createElement('a');
  link.href = videoUrl;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Navigate to trailer page
function loadVideo(link) {
  window.location.href = `trailer.html?videoId=${link}&name=${encodeURIComponent(name)}`;
}

// Fetch movie data by ID
async function fetchData(id) {
  try {
    const response = await fetch(`/api/movies/id/${id}`);
    if (!response.ok) throw new Error('Failed to fetch movie details');
    const data = await response.json();

    // Poster and backdrop
    document.getElementById('movie-poster').src = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
    const imagePath = data.backdrop_path ?? data.poster_path;
    document.getElementById('videoPlaceholder').style.backgroundImage = 
      imagePath 
        ? `url('https://image.tmdb.org/t/p/w500${imagePath}')` 
        : `url('path/to/default/image.jpg')`;

    // Movie Info
    document.getElementById('movie-title').textContent = data.title;
    document.getElementById('movie-title2').textContent = data.title;
    document.getElementById('director').innerHTML = `<strong>Director:</strong> ${getDirector(data.crews)}`;
    document.getElementById('release-date').innerHTML = `<strong>Release Date:</strong> ${formatMySQLDate(data.release_date)}`;
    document.getElementById('genres').innerHTML = `<strong>Genres:</strong> ${data.genres}`;
    document.getElementById('imdb-rating').innerHTML = `<strong>IMDb Rating:</strong> ${data.imdbRating} <i>&#9733;</i> | ${data.numRatings} Votes`;
    document.getElementById('description').textContent = data.overview;

    // Trailers
    const trailersContainer = document.getElementById('trailers');
    const trailersContainer1 = document.getElementById('trailers1');
    trailersContainer.innerHTML = '';
    trailersContainer1.innerHTML = '';

    if (Array.isArray(data.trailers) && data.trailers.length > 0) {
      videoUrl = `https://www.youtube.com/watch?v=${data.trailers[0].key}`;
      name = data.trailers[0].name;
      data.trailers.forEach(trailer => {
        const trailerCard = document.createElement('div');
        trailerCard.className = 'trailer-card';
        trailerCard.innerHTML = `
                  <div 
                  style="background-image: url('https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg');"
                  class="trailer-thumbnail" role="button" aria-label="Click to play trailer" onclick="loadVideo('${trailer.key}')">
            <svg id="play-button" class="play-button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="72"
              height="72" fill="currentColor">
              <path d="M16 12v40l36-20z" />
            </svg>
          </div>
          <p>${trailer.site}-${trailer.name}</p>
        `;
        trailersContainer.appendChild(trailerCard);
        trailersContainer1.appendChild(trailerCard.cloneNode(true));
      });
    }

    // Cast
    const castContainer = document.getElementById('cast');
    castContainer.innerHTML = '';
    if (Array.isArray(data.casts)) {
      data.casts.forEach(actor => {
        const castCard = document.createElement('div');
        castCard.className = 'cast-card';
        const profileImage = actor.profilePath
          ? `https://image.tmdb.org/t/p/w500${actor.profilePath}`
          : 'https://t3.ftcdn.net/jpg/06/33/54/78/360_F_633547842_AugYzexTpMJ9z1YcpTKUBoqBF0CUCk10.jpg';
        castCard.innerHTML = `
          <img src="${profileImage}" alt="${actor.name}">
          <p>${actor.name}</p>
          <p>Character: ${actor.character}</p>
        `;
        castCard.addEventListener("click", () => {
          window.location.href = `cast.html?name=${encodeURIComponent(actor.name)}`;
        });
        castContainer.appendChild(castCard);
      });
    }

    const crewContainer = document.getElementById('crew');
    crewContainer.innerHTML = '';
    if (Array.isArray(data.crews)) {
      data.crews.forEach(actor => {
        const castCard = document.createElement('div');
        castCard.className = 'cast-card';
        const profileImage = actor.profilePath
          ? `https://image.tmdb.org/t/p/w500${actor.profilePath}`
          : 'https://t3.ftcdn.net/jpg/06/33/54/78/360_F_633547842_AugYzexTpMJ9z1YcpTKUBoqBF0CUCk10.jpg';
        castCard.innerHTML = `
          <img src="${profileImage}" alt="${actor.name}">
          <p>${actor.name}</p>
          <p> ${actor.job}</p>
        `;
        castCard.addEventListener("click", () => {
          window.location.href = `cast.html?name=${encodeURIComponent(actor.name)}`;
        });
        crewContainer.appendChild(castCard);
      });
    }

    // Video placeholder click to play trailer
    const trailerKey = data.trailers?.[0]?.key;
    if (trailerKey) {
      document.getElementById('videoPlaceholder')?.addEventListener('click', () => {
        document.getElementById('iframe').src = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`;
        document.getElementById('iframe').style.display = 'block';
        document.getElementById('videoPlaceholder').style.display = 'none';
      });
    }

  } catch (error) {
    console.error('❌ Error loading movie details:', error);
  }
}

// Load movie from local storage on page load
const movieClicked = JSON.parse(localStorage.getItem('movieClicked'));
if (movieClicked) {
  const movieData = movieClicked;

  // Initial poster and basic info
  document.getElementById('movie-poster').src = `https://image.tmdb.org/t/p/w500${movieData.poster_path}`;
  const imagePath = movieData.backdrop_path ?? movieData.poster_path;
  document.getElementById('videoPlaceholder').style.backgroundImage =
    imagePath 
      ? `url('https://image.tmdb.org/t/p/w500${imagePath}')` 
      : `url('path/to/default/image.jpg')`;
  document.getElementById('movie-title').textContent = movieData.title;
  document.getElementById('movie-title2').textContent = movieData.title;
  document.getElementById('director').innerHTML = `<strong>Director:</strong> ...`;
  document.getElementById('release-date').innerHTML = `<strong>Release Date:</strong> ${formatMySQLDate(movieData.release_date)}`;
  document.getElementById('genres').innerHTML = `<strong>Genres:</strong> ...`;
  document.getElementById('imdb-rating').innerHTML = `<strong>IMDb Rating:</strong> ... <i>&#9733;</i> | ... Votes`;
  document.getElementById('description').textContent = movieData.overview ?? '';

  // Fetch full details
  fetchData(movieData.id);
}
