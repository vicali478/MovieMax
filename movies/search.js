const searchResultsContainer = document.getElementById('searchResults');
let searchTimeout;

searchResultsContainer.innerHTML = '<span class="loading"><span class="loading-indicator"></span></span>';
async function searchMovies(query) {
    currentPage = 1;
    let page = 1;
    if (!query.trim()) {
        return;
    }

    try {
        // Show a loading indicator
        searchResultsContainer.innerHTML = '<span class="loading"><span class="loading-indicator"></span></span>';

        // Fetch results from the API
        const response = await fetch(`/api/movies/search/1?title=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Failed to fetch results.');

        const movies = await response.json();

        // Display results
        if (movies['movies'].length > 0) {
            searchResultsContainer.innerHTML = ``;
                movies['movies'].forEach(movieData => {
                    const movieCard = createMovieCard(movieData);
        
                    searchResultsContainer.appendChild(movieCard);
                });
        } else {
            searchResultsContainer.innerHTML = '<span class="loading">No results found.</span>';
        }

            // Add a scroll event listener
    searchResultsContainer.addEventListener('scroll', async() => {
        const containerScrollUp = searchResultsContainer.scrollTop; // Current vertical scroll position
        const containerHeight = searchResultsContainer.offsetHeight; // Visible height of the container
        const contentHeight = searchResultsContainer.scrollHeight; // Total height of scrollable content
  
        // Check if the user has scrolled to the end
        if (Math.ceil(containerScrollUp + containerHeight) >= contentHeight) {
            if (searchResultsContainer.contains(document.querySelector('.loading'))) {
                console.log('Loading element is inside the carousel');
              } else {
            const progressIndicator = document.createElement('span');
            progressIndicator.className = 'loading';
            const loading = document.createElement('span');
            loading.style.marginBottom = '150px'
            loading.className = 'loading-indicator';
            progressIndicator.appendChild(loading);
            searchResultsContainer.appendChild(progressIndicator);

            try {
                
                page += 1;
                const response0 = await fetch(`/api/movies/search/${page}?title=${encodeURIComponent(query)}`);
                if (!response0.ok) {
                  throw new Error('Failed to fetch movies');
                }
                // Parse and append movies
                const movies2 = await response0.json();
            
                movies["movies"].push(...movies2["movies"]);
                
                movies2["movies"].forEach(movieData => {
                    const movieCard2 = createMovieCard(movieData);
                    searchResultsContainer.appendChild(movieCard2);
                });
          
              } catch (error) {
                console.error('Error fetching movies:', error.message);
          
              } finally {
                searchResultsContainer.removeChild(progressIndicator);
                // Remove the progress indicator
              }}
        }
      });
    } catch (error) {
        searchResultsContainer.innerHTML = `<span class="loading">No results found.</span>`;
    }
}

function createMovieCard(movie) {

    const movieCard = document.createElement('div');
    movieCard.classList.add('movie-card');
    movieCard.addEventListener('click',()=>{
        sendJson(movie);
    })
    movieCard.innerHTML = `
            <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}">
<span class="movie-details">     
<p class="movie-title">${movie.title}</p>
<p class="movie-genre">${movie.genres}</p>
<p class="movie-year">${formatMySQLDate(movie.release_date)}</p>
</span>
    `;

    return movieCard;
}
function debounceSearch(event) {
    const query = event.target.value;
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchMovies(query), 300); // Delay the API call by 300ms
}

function clearSearch() {
    currentPage = 1;
    if(document.getElementById('searchInput').value !== ''){
    document.getElementById('searchInput').value = '';
    searchResultsContainer.innerHTML = '<span class="loading"><span class="loading-indicator"></span></span>';
    fetchAll();
    }
}
window.onload = () => {
    const input = document.getElementById('searchInput');
    setTimeout( async() => {
        input.focus();
        fetchAll();
    }, 500);
};
let currentPage = 1;

function sendJson(data) {
    // Save data to localStorage
    localStorage.setItem('movieClicked', JSON.stringify(data));
    // Redirect to the details page
    window.location.href = 'details.html';
    document.getElementById('searchInput').value = '';
    currentPage = 1;
}
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
async function fetchAll (){
    const response = await fetch(`/api/movies/search/1?title=${encodeURIComponent('')}`);
    if (!response.ok) throw new Error('Failed to fetch results.');

    const movies = await response.json();

    // Display results
    if (movies['movies'].length > 0) {
        searchResultsContainer.innerHTML = ``;
            movies['movies'].forEach(movieData => {
                const movieCard = createMovieCard(movieData);
    
                searchResultsContainer.appendChild(movieCard);
            });
    }
}


searchResultsContainer.addEventListener('scroll', async() => {
    const containerScrollUp = searchResultsContainer.scrollTop; // Current vertical scroll position
    const containerHeight = searchResultsContainer.offsetHeight; // Visible height of the container
    const contentHeight = searchResultsContainer.scrollHeight; // Total height of scrollable content

    // Check if the user has scrolled to the end
    if (Math.ceil(containerScrollUp + containerHeight) >= contentHeight) {
        if (searchResultsContainer.contains(document.querySelector('.loading'))) {
            console.log('Loading element is inside the carousel');
          } else {
        const progressIndicator = document.createElement('span');
        progressIndicator.className = 'loading';
        const loading = document.createElement('span');
        loading.style.marginBottom = '150px'
        loading.className = 'loading-indicator';
        progressIndicator.appendChild(loading);
        searchResultsContainer.appendChild(progressIndicator);

        try {
            
            currentPage += 1;
            const response0 = await fetch(`/api/movies/search/${currentPage}?title=${encodeURIComponent('')}`);
            if (!response0.ok) {
              throw new Error('Failed to fetch movies');
            }
            // Parse and append movies
            const movies2 = await response0.json();
                    
            movies2["movies"].forEach(movieData => {
                const movieCard2 = createMovieCard(movieData);
                searchResultsContainer.appendChild(movieCard2);
            });
      
          } catch (error) {
            console.error('Error fetching movies:', error.message);
      
          } finally {
            searchResultsContainer.removeChild(progressIndicator);
            // Remove the progress indicator
          }}
    }
  });
