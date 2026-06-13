import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import {
  ArrowLeft,
  Star,
  Clock,
  Calendar,
  Play,
  Users,
  User,
  X,
} from "lucide-react";

import { movieDetailHStyles } from "../assets/dummyStyles";
import api, { getApiBaseUrl } from "../utils/api";

import MOVIES_MAIN from "../assets/dummymdata";
import MOVIES_FEATURED from "../assets/dummymoviedata";

// NORMALIZE FEATURED MOVIES
const MOVIES_FEATURED_NORMALISED = MOVIES_FEATURED.map((m) => ({
  ...m,
  image: m.img,
}));

// MERGE ALL DUMMY MOVIES
const ALL_DUMMY_MOVIES = [
  ...MOVIES_MAIN,
  ...MOVIES_FEATURED_NORMALISED,
];

// ROWS
const ROWS = [
  { id: "A", type: "standard", count: 8 },
  { id: "B", type: "standard", count: 8 },
  { id: "C", type: "standard", count: 8 },
  { id: "D", type: "recliner", count: 8 },
  { id: "E", type: "recliner", count: 8 },
];

const TOTAL_SEATS = ROWS.reduce((s, r) => s + r.count, 0);

// YOUTUBE HELPERS
function extractYouTubeId(urlOrId) {
  if (!urlOrId) return null;

  if (/^[A-Za-z0-9_-]{6,}$/.test(urlOrId)) {
    return urlOrId;
  }

  const re =
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|.*[?&]v=)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i;

  const m = urlOrId.match(re);

  return m ? m[1] : null;
}

const getEmbedUrl = (id) =>
  id
    ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`
    : null;

// FALLBACK AVATAR
const FallbackAvatar = ({ className = "w-12 h-12" }) => (
  <div
    className={`${className} bg-gray-700 rounded-full flex items-center justify-center text-sm text-gray-300`}
  >
    ?
  </div>
);

export default function MovieDetailsPage() {
  const { id } = useParams();

  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);

  const [loading, setLoading] = useState(true);

  const [showTrailer, setShowTrailer] = useState(false);

  const [selectedTrailerId, setSelectedTrailerId] = useState(null);

  const [selectedMovie, setSelectedMovie] = useState(null);

  const [selectedDay, setSelectedDay] = useState(0);

  const [selectedTime, setSelectedTime] = useState(null);

  // FETCH MOVIE
  useEffect(() => {
    const fetchMovie = async () => {
      try {
        // TRY BACKEND FIRST
        const res = await api.get(`/movies/${id}`);

        setMovie(res.data);
      } catch (err) {
        console.log("Backend movie not found. Trying dummy movie...");

        // TRY DUMMY MOVIES
        const dummyMovie = ALL_DUMMY_MOVIES.find(
          (m) => String(m.id) === String(id)
        );

        if (dummyMovie) {
          setMovie(dummyMovie);
        } else {
          setMovie(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id]);

  // SHOWTIMES
  const showtimeDays = useMemo(() => {
    if (!movie) return [];

    // DUMMY MOVIE SUPPORT
    if (movie.slots) {
      const grouped = {};

      movie.slots.forEach((slot) => {
        const dateObj = new Date(slot.time);

        const dateKey = dateObj.toISOString().split("T")[0];

        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }

        grouped[dateKey].push({
          time: dateObj.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),

          datetime: slot.time,

          audi: slot.audi,

          bookedCount: 0,
        });
      });

      return Object.keys(grouped).map((dateKey) => {
        const dateObj = new Date(dateKey);

        return {
          date: dateKey,

          shortDay: dateObj.toLocaleDateString("en-US", {
            weekday: "short",
          }),

          dateStr: dateObj.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),

          showtimes: grouped[dateKey],
        };
      });
    }

    // BACKEND MOVIE SUPPORT
    if (movie.showtimes) {
      const slotsByDate = {};

      movie.showtimes.forEach((slot) => {
        if (!slotsByDate[slot.date]) {
          slotsByDate[slot.date] = [];
        }

        slotsByDate[slot.date].push(slot);
      });

      return Object.keys(slotsByDate)
        .sort()
        .map((key) => {
          const [yy, mm, dd] = key.split("-").map(Number);

          const asDate = new Date(Date.UTC(yy, mm - 1, dd));

          const shortDay = new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            timeZone: "UTC",
          }).format(asDate);

          const dateStr = new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          }).format(asDate);

          const showtimes = slotsByDate[key].map((slot) => {
            const synDate = new Date(
              `${slot.date} ${slot.time} ${slot.ampm}`
            );

            return {
              time: `${slot.time} ${slot.ampm}`,

              datetime: !isNaN(synDate.getTime())
                ? synDate.toISOString()
                : slot.date,

              audi: movie.auditorium || "Audi 1",

              bookedCount: slot.bookedSeats?.length || 0,
            };
          });

          return {
            date: key,
            shortDay,
            dateStr,
            showtimes,
          };
        });
    }

    return [];
  }, [movie]);

  // TRAILER
  const openTrailer = (movieObj) => {
    const ytId = extractYouTubeId(
      movieObj?.trailerUrl ||
        movieObj?.trailer ||
        movieObj?.latestTrailer?.videoId ||
        ""
    );

    if (!ytId) {
      toast.info("Trailer not available for this movie.");
      return;
    }

    setSelectedMovie(movieObj);

    setSelectedTrailerId(ytId);

    setShowTrailer(true);
  };

  const closeTrailer = () => {
    setShowTrailer(false);

    setSelectedTrailerId(null);

    setSelectedMovie(null);
  };

  // SELECT TIME
  const handleTimeSelect = (datetime) => {
    setSelectedTime((prev) => (prev === datetime ? null : datetime));
  };

  // BOOK NOW
  const handleBookNow = () => {
    if (!selectedTime) {
      toast.error("Please select a showtime first.");

      return;
    }

    const movieRouteId = movie?.id || movie?._id;

    navigate(
      `/seat/${movieRouteId}/${encodeURIComponent(selectedTime)}`
    );
  };

  // LOADING
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading movie details...
      </div>
    );
  }

  // NOT FOUND
  if (!movie) {
    return (
      <div className={movieDetailHStyles.notFoundContainer}>
        <div className={movieDetailHStyles.notFoundContent}>
          <p className={movieDetailHStyles.notFoundTitle}>
            Movie not found.
          </p>

          <Link
            to="/movies"
            className={movieDetailHStyles.notFoundLink}
          >
            ← Back to Movies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={movieDetailHStyles.pageContainer}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        theme="dark"
      />

      <style>{movieDetailHStyles.customCSS}</style>

      {/* TRAILER MODAL */}
      {showTrailer && selectedTrailerId && (
        <div className={movieDetailHStyles.trailerModal}>
          <div
            className={movieDetailHStyles.trailerContainer}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeTrailer}
              className={movieDetailHStyles.closeButton}
            >
              <X size={36} />
            </button>

            <div className={movieDetailHStyles.trailerIframe}>
              <iframe
                key={selectedTrailerId}
                width="100%"
                height="100%"
                src={getEmbedUrl(selectedTrailerId)}
                title="Trailer"
                frameBorder="0"
                allow="autoplay; encrypted-media"
                allowFullScreen
                className={movieDetailHStyles.iframe}
              />
            </div>
          </div>
        </div>
      )}

      <div className={movieDetailHStyles.mainContainer}>
        {/* HEADER */}
        <div className={movieDetailHStyles.headerContainer}>
          <Link
            to="/movies"
            className={movieDetailHStyles.backButton}
          >
            <ArrowLeft size={18} />

            <span className={movieDetailHStyles.backButtonText}>
              Back
            </span>
          </Link>
        </div>

        {/* TITLE */}
        <div className={movieDetailHStyles.titleContainer}>
          <h1 className={movieDetailHStyles.movieTitle}>
            {movie.title}
          </h1>

          <div className={movieDetailHStyles.movieInfoContainer}>
            <span className={movieDetailHStyles.rating}>
              <Star className={movieDetailHStyles.ratingIcon} />

              {movie.rating}/10
            </span>

            <span className={movieDetailHStyles.duration}>
              <Clock className={movieDetailHStyles.durationIcon} />

              {movie.duration}
            </span>

            <span className={movieDetailHStyles.genre}>
              {movie.genre}
            </span>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className={movieDetailHStyles.mainGrid}>
          {/* POSTER */}
          <div className={movieDetailHStyles.posterContainer}>
            <div className={movieDetailHStyles.posterCard}>
              <div
                className={
                  movieDetailHStyles.posterImageContainer
                }
              >
                <img
                  src={
                    movie.image ||
                    movie.img ||
                    (movie.posterUrl
                      ? `${getApiBaseUrl()}/${movie.posterUrl}`
                      : "https://via.placeholder.com/320x480?text=No+Image")
                  }
                  alt={movie.title}
                  className={movieDetailHStyles.posterImage}
                />
              </div>

              <button
                onClick={() => openTrailer(movie)}
                className={movieDetailHStyles.trailerButton}
              >
                <Play size={18} />

                <span>Watch Trailer</span>
              </button>
            </div>
          </div>

          {/* SHOWTIMES */}
          <div className={movieDetailHStyles.showtimesContainer}>
            <div className={movieDetailHStyles.showtimesCard}>
              <h3 className={movieDetailHStyles.showtimesTitle}>
                <Calendar
                  className={
                    movieDetailHStyles.showtimesTitleIcon
                  }
                />

                <span>Showtimes</span>
              </h3>

              {/* DAY SELECTOR */}
              <div className={movieDetailHStyles.daySelection}>
                {showtimeDays.map((day, index) => (
                  <button
                    key={day.date}
                    onClick={() => {
                      setSelectedDay(index);

                      setSelectedTime(null);
                    }}
                    className={`${movieDetailHStyles.dayButton} ${
                      selectedDay === index
                        ? movieDetailHStyles.dayButtonSelected
                        : movieDetailHStyles.dayButtonDefault
                    }`}
                  >
                    <div className={movieDetailHStyles.dayName}>
                      {day.shortDay}
                    </div>

                    <div className={movieDetailHStyles.dayDate}>
                      {day.dateStr}
                    </div>
                  </button>
                ))}
              </div>

              {/* SHOWTIME BUTTONS */}
              <div className={movieDetailHStyles.showtimesGrid}>
                {showtimeDays[selectedDay]?.showtimes?.map(
                  (showtime, index) => (
                    <button
                      key={index}
                      onClick={() =>
                        handleTimeSelect(showtime.datetime)
                      }
                      className={`${movieDetailHStyles.showtimeButton} ${
                        selectedTime === showtime.datetime
                          ? movieDetailHStyles.showtimeButtonSelected
                          : movieDetailHStyles.showtimeButtonDefault
                      }`}
                    >
                      {showtime.time}
                    </button>
                  )
                )}
              </div>

              {/* BOOK BUTTON */}
              {selectedTime && (
                <div
                  className={
                    movieDetailHStyles.bookNowContainer
                  }
                >
                  <button
                    onClick={handleBookNow}
                    className={
                      movieDetailHStyles.bookNowButton
                    }
                  >
                    Proceed to Seat Selection
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STORY */}
        <div className={movieDetailHStyles.storyCard}>
          <h2 className={movieDetailHStyles.storyTitle}>
            Story
          </h2>

          <p className={movieDetailHStyles.storyText}>
            {movie.description ||
              movie.story ||
              movie.synopsis ||
              "No story available."}
          </p>
        </div>
      </div>
    </div>
  );
}