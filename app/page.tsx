import SearchBar from "./SearchBar";
import MovieCard from "./MovieCard";

export const dynamic = "force-dynamic";

async function fetchMovieSuggestions(query: string) {
  "use server";
  if (!query) return [];
  const apiKey = process.env.TMDB_API_KEY;
  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(
      query
    )}&api_key=${apiKey}&include_adult=false`
  );
  const data = await res.json();
  return data.results ? data.results.slice(0, 5) : [];
}

export default async function Home(props: any) {
  const searchParams = await props?.searchParams;
  const searchQuery = searchParams?.q || "";
  const apiKey = process.env.TMDB_API_KEY;

  try {
    let endpoint = `https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}`;

    if (searchQuery) {
      endpoint = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(
        searchQuery
      )}&api_key=${apiKey}&include_adult=false`;
    }

    const response = await fetch(endpoint, { cache: "no-store" });

    if (!response.ok) {
      return (
        <main className="p-10 text-white bg-gray-900 h-screen">
          API HTTP Error: {response.status}
        </main>
      );
    }

    const data = await response.json();
    const fetchedMovies = data.results || [];

    const moviesWithProviders = [];

    for (const movie of fetchedMovies) {
      try {
        const providerRes = await fetch(
          `https://api.themoviedb.org/3/movie/${movie.id}/watch/providers?api_key=${apiKey}`,
          { cache: "no-store" }
        );
        const providerData = await providerRes.json();
        const regionData = providerData.results?.IN || {};

        const allProviders = [
          ...(regionData.flatrate || []),
          ...(regionData.rent || []),
          ...(regionData.buy || []),
        ];

        const uniqueProviders = Array.from(
          new Map(allProviders.map((p: any) => [p.provider_id, p])).values()
        );

        moviesWithProviders.push({
          ...movie,
          streamingPlatforms: uniqueProviders,
        });
      } catch (err) {
        moviesWithProviders.push({ ...movie, streamingPlatforms: [] });
      }
    }

    return (
      <main className="min-h-screen p-4 md:p-10 bg-gray-900 text-white">
        <div className="max-w-3xl mx-auto mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-blue-400">
            Movie Stream Finder
          </h1>

          <div className="flex gap-4">
            <SearchBar
              initialQuery={searchQuery}
              fetchSuggestions={fetchMovieSuggestions}
            />
          </div>

          {searchQuery && (
            <div className="text-center mt-4">
              <p className="text-gray-400">
                Showing results for "{searchQuery}"
              </p>
              <a
                href="/"
                className="text-blue-500 hover:underline text-sm mt-1 inline-block"
              >
                &larr; Clear search and return to Trending
              </a>
            </div>
          )}
        </div>

        {/* --- UPDATED GRID LOGIC HERE: grid-cols-2 for mobile! --- */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
          {moviesWithProviders.length > 0 ? (
            moviesWithProviders.map((movie: any) => (
              <MovieCard key={movie.id} movie={movie} />
            ))
          ) : (
            <div className="col-span-full text-center py-20 text-gray-500">
              No movies found. Try another search!
            </div>
          )}
        </div>
      </main>
    );
  } catch (error) {
    console.error("--> Fetch Exception:", error);
    return (
      <main className="p-10 text-white bg-gray-900 h-screen">
        Network fetch crashed. Check your terminal logs!
      </main>
    );
  }
}