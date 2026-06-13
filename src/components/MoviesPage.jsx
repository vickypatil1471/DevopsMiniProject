import { useEffect, useState } from "react";
import api, { getApiBaseUrl } from "../utils/api";
import { moviesPageStyles } from "../assets/dummyStyles";
import { Link } from "react-router-dom";

import dummyMovies from "../assets/dummymdata";

let frontendMoviesCache = null;

const MoviesPage = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const [movies, setMovies] = useState(frontendMoviesCache || []);
  const [loading, setLoading] = useState(!frontendMoviesCache);

  useEffect(() => {
    const fetchAndMergeMovies = async () => {
      try {
        if (!frontendMoviesCache) {
          setLoading(true);
        }

        // Fetch backend movies
        const { data } = await api.get("/movies");

        // Convert backend movies into frontend format
        const formattedLiveMovies = data.map((m) => ({
          id: m._id,
          title: m.title,

          // Convert category safely to lowercase
          category:
            m.category && m.category[0]
              ? m.category[0].toLowerCase()
              : "action",

          price: m.seatPrices?.standard || 250,

          image: `${getApiBaseUrl()}/${m.posterUrl}`,

          description: m.description,

          time:
            (m.showtimes || []).map((s) => s.time) || [
              "2:30 PM",
              "7:00 PM",
            ],
        }));

        // Merge backend + dummy movies
        frontendMoviesCache = [
          ...formattedLiveMovies,
          ...dummyMovies,
        ];

        setMovies(frontendMoviesCache);
      } catch (err) {
        console.error("Failed to load movies:", err);

        // fallback to dummy movies only
        setMovies(dummyMovies);
      } finally {
        setLoading(false);
      }
    };

    fetchAndMergeMovies();
  }, []);

  // Filter movies
  const filteredMovies =
    activeCategory === "all"
      ? movies
      : movies.filter(
          (movie) =>
            movie.category?.toLowerCase() ===
            activeCategory.toLowerCase()
        );

  const COLLAPSE_COUNT = 12;

  useEffect(() => {
    setShowAll(false);
  }, [activeCategory]);

  const visibleMovies = showAll
    ? filteredMovies
    : filteredMovies.slice(0, COLLAPSE_COUNT);

  const categories = [
    { id: "all", name: "All Movies" },
    { id: "action", name: "Action" },
    { id: "horror", name: "Horror" },
    { id: "comedy", name: "Comedy" },
    { id: "adventure", name: "Adventure" },
  ];

  if (loading) {
    return (
      <div className="text-white text-center mt-20 text-xl">
        Loading movies...
      </div>
    );
  }

  return (
    <div className={moviesPageStyles.container}>
      {/* CATEGORY BUTTONS */}
      <section className={moviesPageStyles.categoriesSection}>
        <div className={moviesPageStyles.categoriesContainer}>
          <div className={moviesPageStyles.categoriesFlex}>
            {categories.map((category) => (
              <button
                key={category.id}
                className={`${moviesPageStyles.categoryButton.base} ${
                  activeCategory === category.id
                    ? moviesPageStyles.categoryButton.active
                    : moviesPageStyles.categoryButton.inactive
                }`}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* MOVIES GRID */}
      <section className={moviesPageStyles.moviesSection}>
        <div className={moviesPageStyles.moviesContainer}>
          <div className={moviesPageStyles.moviesGrid}>
            {visibleMovies.map((movie) => (
              <Link
                key={movie.id}
                to={`/movie/${movie.id}`}
                className={moviesPageStyles.movieCard}
              >
                <div className={moviesPageStyles.movieImageContainer}>
                  <img
                    src={movie.image || movie.img}
                    alt={movie.title}
                    className={moviesPageStyles.movieImage}
                  />
                </div>

                <div className={moviesPageStyles.movieInfo}>
                  <h3 className={moviesPageStyles.movieTitle}>
                    {movie.title}
                  </h3>

                  <div className={moviesPageStyles.movieCategory}>
                    <span
                      className={moviesPageStyles.movieCategoryText}
                    >
                      {movie.category}
                    </span>
                  </div>
                </div>
              </Link>
            ))}

            {/* EMPTY STATE */}
            {filteredMovies.length === 0 && (
              <div className={moviesPageStyles.emptyState}>
                No movies found in this category
              </div>
            )}
          </div>

          {/* SHOW MORE BUTTON */}
          {filteredMovies.length > COLLAPSE_COUNT && (
            <div className={moviesPageStyles.showMoreContainer}>
              <button
                onClick={() => setShowAll((prev) => !prev)}
                className={moviesPageStyles.showMoreButton}
              >
                {showAll
                  ? "Show Less"
                  : `Show More ${
                      filteredMovies.length - COLLAPSE_COUNT
                    } more`}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default MoviesPage;