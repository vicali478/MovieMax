let generalData = [
  "Trending",
  "Latest",
  "A_Z",
  "Year",
  "Genre"
];

let selectedTab = "Latest";

for (let value of generalData) {
  const tab = document.createElement('li');
  tab.classList.add('tab-item');
  tab.textContent = value.trim();

  tab.addEventListener('click', () => {
    selectedTab = value.trim();
    document.querySelector('.tab-item.active')?.classList.remove('active');
    tab.classList.add('active');

    switch (selectedTab) {
      case 'Trending':
        displayTrending();
        break;
      case 'Latest':
        toTitle();
        break;
      case 'Popular':
        toTitle();
        break;
      case 'A_Z':
        toTitle();
        break;
      case 'Year':
        filterByYear();
        break;
      case 'Genre':
        filterByGenre();
        break;
      default:
        console.log('Unknown Tab:', selectedTab);
    }
  });

  document.getElementById('tabs').appendChild(tab);
}


const tabs = document.querySelector('.tab-item').classList.add('active');

let pages = {
  'A_Z': 1,
  'Popular': 1,
  'Latest': 1
}


let totalPages = {
  'A_Z': 0,
  'Popular': 0,
  'Latest': 0
}

let titleMovies = {
  'A_Z': new Map(),
  'Popular': new Map(),
  'Latest': new Map()
}

let trendingData = [];
let genreData = [];
let yearData = [];
document.addEventListener("DOMContentLoaded", async (e) => {
  e.preventDefault
  displayTrending();
})
async function fetchMovies() {
  try {

    response2 = await fetch(`/api/movies/category/${selectedTab.toString().toLowerCase()}/${pages[selectedTab]}`);
    if (!response2.ok) {
      throw new Error('Failed to fetch movies');
    }
    const allMovies = await response2.json();
    totalPages[selectedTab] = allMovies['totalPages'];
    window.scrollTo({
      top: 0,
      behavior: 'smooth' // Smooth scrolling animation
    });
    return {
      movies: allMovies['movies'],
      page: allMovies['page']
    };
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

function updatePage(movies) {
  filterByName(movies);
  renderPagination();
}

const categoryList = document.getElementById('section-container');

function filterByName(movies) {

  document.getElementById('carouselSection').style.display = 'none';

  const moviesGrid = document.createElement('div');
  moviesGrid.classList.add('movies-grid');

  movies.forEach(movieData => {
    const movieCard = createItem(movieData);

    moviesGrid.appendChild(movieCard);
  });

  categoryList.innerHTML = "";
  categoryList.appendChild(moviesGrid);
  categoryList.style.display = 'block';
  toggleLoading(false);
}

async function filterByGenre() {
  toggleLoading(true);
  if (genreData.length == 0) {
    genreData = await fetchCategories();
  }
  carouselSection.innerHTML = "";
  for (let genre in genreData) {
    carouselSection.appendChild(createCarousel(genreData[genre], 'genre'));
    toggleLoading(false);
    window.removeEventListener('resize', renderPagination);
    pagination.innerHTML = "";
  };
}

async function filterByYear() {
  toggleLoading(true);
  if (yearData.length == 0) {
    yearData = await fetchByYear();
  }
  carouselSection.innerHTML = "";
  for (let year in yearData) {
    //const thisYear = yearData.find(d => d.year === y)
    carouselSection.appendChild(createCarousel(yearData[year], 'year'));
    toggleLoading(false);
    window.removeEventListener('resize', renderPagination);
    pagination.innerHTML = "";
  };
}
const fetching = false;

function createMovieCard(movie) {
  const movieCard = document.createElement('div');
  movieCard.classList.add('movie-card');
  movieCard.addEventListener('click', () => {
    sendJson(movie);
  })
  movieCard.innerHTML = `
        <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}">
        <h3>${movie.title}</h3>
`;

  return movieCard;
}

async function toTitle() {
  toggleLoading(true);

  if (!titleMovies[selectedTab].has(pages[selectedTab])) {
    const data = await fetchMovies();
    titleMovies[selectedTab].set(data.page, data.movies);
  }


  let pageMovies = titleMovies[selectedTab].get(pages[selectedTab]) || [];

  updatePage(pageMovies);

  window.addEventListener('resize', renderPagination);
}


function toggleLoading(show) {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (show) {
    loadingOverlay.classList.add('active');
  } else {
    loadingOverlay.classList.remove('active');
  }
}
const pagination = document.getElementById('pagination');
// Function to render pagination buttons
function renderPagination() {
  pagination.innerHTML = ''; // Clear existing pagination

  const isMobile = window.innerWidth <= 768;

  // Previous button
  const prevButton = document.createElement('button');
  prevButton.textContent = 'Prev';
  prevButton.disabled = pages[selectedTab] === 1;
  prevButton.onclick = () => {
    pages[selectedTab] = pages[selectedTab] === 1 ? totalPages[selectedTab] : pages[selectedTab] - 1;
    toTitle();
  };
  pagination.appendChild(prevButton);

  // Dynamic page numbers
  if (isMobile) {
    const maxPagesToShow = 5;
    let startPage = Math.max(1, pages[selectedTab] - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages[selectedTab], startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement('button');
      pageButton.textContent = i;
      pageButton.className = i === pages[selectedTab] ? 'active' : '';
      pageButton.onclick = () => {
        pages[selectedTab] = i;
        toTitle();
      };
      pagination.appendChild(pageButton);
    }
  } else {
    const maxPagesToShow = 10;
    let startPage = Math.max(1, pages[selectedTab] - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages[selectedTab], startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement('button');
      pageButton.textContent = i;
      pageButton.className = i === pages[selectedTab] ? 'active' : '';
      pageButton.onclick = () => {
        pages[selectedTab] = i;
        toTitle();
      };
      pagination.appendChild(pageButton);
    }
  }

  // Last Page button (if on last page, show first page instead)
  const lastPageButton = document.createElement('button');
  lastPageButton.textContent = pages[selectedTab] === totalPages[selectedTab] ? 1 : totalPages[selectedTab];
  lastPageButton.onclick = () => {
    pages[selectedTab] = pages[selectedTab] === totalPages[selectedTab] ? 1 : totalPages[selectedTab];
    toTitle();
  };
  pagination.appendChild(lastPageButton);

  // Next button
  const nextButton = document.createElement('button');
  nextButton.textContent = 'Next';
  nextButton.disabled = pages[selectedTab] === totalPages[selectedTab];
  nextButton.onclick = () => {
    pages[selectedTab] = pages[selectedTab] === totalPages[selectedTab] ? 1 : pages[selectedTab] + 1;
    toTitle();
  };
  pagination.appendChild(nextButton);
}


const carouselSection = document.getElementById('carouselSection');

const createItem = (movie) => {
  const item = document.createElement('div');
  item.className = 'item';

  item.addEventListener('click', () => {
    sendJson(movie);
  })
  item.innerHTML = `
        <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}">
        <h3>${movie.title}</h3>
`;
  return item;
};

const createLoader = () => {
  const progressIndicator = document.createElement('span');
  progressIndicator.className = 'loading';
  const loading = document.createElement('span');
  loading.className = 'loading-indicator';
  progressIndicator.appendChild(loading);
  return progressIndicator;
};

const createCarousel = (data, type) => {
  carouselSection.style.display = 'flex';
  document.getElementById('section-container').style.display = 'none';
  const carousel = document.createElement('div');
  carousel.className = 'carousel';

  const title = document.createElement('h3');
  title.textContent = `${data[type]}`;
  carousel.appendChild(title);

  const itemsContainer = document.createElement('div');
  itemsContainer.className = 'carousel-items';
  itemsContainer.dataset.page = '1';
  if (data.movies.length > 15) {
    const pg = ((data.movies.length - 15) / 30) + 1;
    itemsContainer.dataset.page = `${pg}`;
  }
  itemsContainer.dataset.loading = 'false';

  // Add initial 10 items

  for (let movie in data.movies) {
    itemsContainer.appendChild(createItem(data.movies[movie]));
  }

  // Add loader at the end
  const loader = createLoader();

  // Add scroll event
  itemsContainer.addEventListener('scroll', async () => {
    if (itemsContainer.dataset.loading === 'true') return;

    const { scrollLeft, scrollWidth, clientWidth } = itemsContainer;
    if (scrollLeft + clientWidth >= scrollWidth) {

      itemsContainer.appendChild(loader);
      itemsContainer.dataset.loading = 'true';
      const currentPage = parseInt(itemsContainer.dataset.page);

      if (type == 'genre') {
        const response = await fetch(`/api/movies/genre/${currentPage + 1}?genre=${data.genre}`);

        if (!response.ok) {
          throw new Error('Failed to fetch movies');
        }
        // Parse and append movies
        const movies = await response.json();
        console.log(movies);
        const genreItem = genreData.find((datas) => datas.genre === data.genre);
        if (genreItem) {
          genreItem.movies.push(...movies["movies"]);
        }

        movies["movies"].forEach(movieData => {

          itemsContainer.insertBefore(createItem(movieData), loader);
        });
      } else {
        const response = await fetch(`/api/movies/${type}/${data[type]}/${currentPage + 1}`);

        if (!response.ok) {
          throw new Error('Failed to fetch movies');
        }
        // Parse and append movies
        const movies = await response.json();
        const yearItem = yearData.find((datas) => datas.type === data[type]);
        if (yearItem) {
          yearItem.movies.push(...movies["movies"]);
        }

        movies["movies"].forEach(movieData => {

          itemsContainer.insertBefore(createItem(movieData), loader);
        });
      }



      itemsContainer.dataset.page = (currentPage + 1).toString();
      itemsContainer.dataset.loading = 'false';
      itemsContainer.removeChild(loader);
    }
  });

  carousel.appendChild(itemsContainer);
  return carousel;
};

async function fetchByYear() {
  try {
    const response = await fetch('/api/movies/grouped-by-year');
    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

async function fetchCategories() {
  try {
    const response = await fetch('/api/movies/grouped-by-genre');
    if (!response.ok) {
      throw new Error('Failed to fetch genres');
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

// Function to trigger on scroll up
function onScrollUp() {

  document.getElementById('tabs').style.display = 'flex';
}

// Function to trigger on scroll down
function onScrollDown() {
  document.getElementById('tabs').style.display = 'none';
}


// Example: Automatically hide the loading indicator after 5 seconds
toggleLoading(true); // Show the loading indicator on page load

function sendJson(data) {
  // Save data to localStorage
  localStorage.setItem('movieClicked', JSON.stringify(data));
  // Redirect to the details page
  window.location.href = 'details.html';
}
function goToSearch() {
  window.location.href = 'search.html';
}

async function fetchTrending() {
  try {
    const response = await fetch('/api/movies/trending');
    if (!response.ok) {
      throw new Error('Failed to fetch genres');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}
const createTrendItem = (movie) => {
  const movieItem = document.createElement('div');
  movieItem.className = 'movie-list-item';

  const movieImg = document.createElement('img');
  movieImg.className = 'movie-list-item-img';
  movieImg.src = `https://image.tmdb.org/t/p/w500${movie.backdrop_path ?? movie.poster_path}`;

  const movieTitle = document.createElement('span');
  movieTitle.className = 'movie-list-item-title';
  movieTitle.textContent = movie.title;

  const movieDesc = document.createElement('p');
  movieDesc.className = 'movie-list-item-desc';
  movieDesc.textContent = movie.overview;

  const movieButton = document.createElement('button');
  movieButton.className = 'movie-list-item-button';
  movieButton.textContent = 'VIEW';
  movieButton.addEventListener('click', () => {
    sendJson(movie);
    // Your custom functionality here
  });
  movieItem.addEventListener('click', () => {
    sendJson(movie);
    // Your custom functionality here
  });
  movieItem.appendChild(movieImg);
  movieItem.appendChild(movieTitle);
  movieItem.appendChild(movieDesc);
  movieItem.appendChild(movieButton);
  return movieItem;

};
async function displayTrending() {

  if (trendingData.length == 0) {
    trendingData = await fetchTrending();
  }

  const container = document.createElement('div');
  container.className = 'container';

  trendingData.forEach(item => {
    switch (item.type) {
      case 'featured':
        const featured = document.createElement('div');
        featured.className = 'featured-content';
        featured.style.background = `linear-gradient(
      to top,
      rgba(0, 0, 0, 1) 0%,   /* dark at very bottom */
      rgba(0, 0, 0, 0.92) 30%,  /* keep dark up to 50% height */
      rgba(0, 0, 0, 0) 100%    /* fully transparent at the top */
    ), url('https://image.tmdb.org/t/p/w500${item.data.backdrop_path ?? item.data.poster_path ?? ''}')`;
        featured.style.backgroundRepeat = 'no-repeat';       // Prevents repeating of the background image
        featured.style.backgroundSize = 'content';              // Ensures the image covers the entire element without repeating
        featured.style.backgroundPosition = 'center';         // Centers the background image

        const featuredTitle = document.createElement('h4');
        featuredTitle.className = 'featured-title';
        featuredTitle.textContent = item.data.title;

        const featuredDesc = document.createElement('p');
        featuredDesc.className = 'featured-desc';
        featuredDesc.textContent = item.data.overview;

        const featuredButton = document.createElement('button');
        featuredButton.className = 'featured-button';
        featuredButton.textContent = item.buttonText;

        featuredButton.addEventListener('click', () => {
          sendJson(item.data)
          // window.location.href =  `trailer.html?videoId=${item.data.videos.results[0].key}`;
          // Your custom functionality here
        });
        featured.appendChild(featuredTitle);
        featured.appendChild(featuredDesc);
        // if(item.data.videos.results && item.data.videos.results.length>0){    
        //   featuredButton.addEventListener('click', () => {
        //     window.location.href =  `trailer.html?videoId=${item.data.videos.results[0].key}&name=${item.data.title}`;
        //     // Your custom functionality here
        //   });
        featured.appendChild(featuredButton);

        // }
        container.appendChild(featured);
        break;

      case 'movieList':
        const movieListContainer = document.createElement('div');
        movieListContainer.className = 'movie-list-container';

        const movieListTitle = document.createElement('h1');
        movieListTitle.className = 'movie-list-title';
        movieListTitle.textContent = item.title;

        const movieListWrapper = document.createElement('div');
        movieListWrapper.className = 'movie-list-wrapper';

        const movieList = document.createElement('div');
        movieList.className = 'movie-list';
        movieList.dataset.page = 1;
        if (item.movies.length > 15) {
          const pg = ((item.movies.length - 15) / 30) + 1;
          movieList.dataset.page = `${pg}`;
        }

        item.movies.forEach(movie => {
          movieList.appendChild(createTrendItem(movie));
        });


        const loader = createLoader();
        movieList.addEventListener('scroll', async () => {
          if (movieList.dataset.loading === 'true') return;

          const { scrollLeft, scrollWidth, clientWidth } = movieList;
          if (scrollLeft + clientWidth >= scrollWidth) {

            movieList.appendChild(loader);
            movieList.dataset.loading = 'true';
            const currentPage = parseInt(movieList.dataset.page);

            const response = await fetch(`/api/movies/${item.category}/${currentPage + 1}`);

            if (!response.ok) {
              throw new Error('Failed to fetch movies');
            }
            // Parse and append movies
            const movies = await response.json();
            const trendingItem = trendingData.find((datas) => datas.category === item.category);
            if (trendingItem) {
              trendingItem.movies.push(...movies["movies"]);
            }

            movies["movies"].forEach(movieData => {

              movieList.insertBefore(createTrendItem(movieData), loader);
            });



            movieList.dataset.page = (currentPage + 1).toString();
            movieList.dataset.loading = 'false';
            movieList.removeChild(loader);
          }
        });

        movieListWrapper.appendChild(movieList);
        movieListContainer.appendChild(movieListTitle);
        movieListContainer.appendChild(movieListWrapper);
        container.appendChild(movieListContainer);
        break;
    }
  });

  document.getElementById('carouselSection').style.display = 'none';

  pagination.innerHTML = "";
  categoryList.innerHTML = "";
  categoryList.appendChild(container);
  toggleLoading(false);
}