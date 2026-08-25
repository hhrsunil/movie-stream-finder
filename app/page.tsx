import SearchBar from "./SearchBar";

export const dynamic = "force-dynamic";

// --- NEW SECURE SERVER ACTION FOR AUTOCOMPLETE ---
// This runs exclusively on the server, safely hiding your API key!
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
  // Return only the top 5 closest matches to keep the dropdown clean
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
      <main className="min-h-screen p-10 bg-gray-900 text-white">
        <div className="max-w-3xl mx-auto mb-10">
          <h1 className="text-4xl font-bold mb-6 text-center text-blue-400">
            Movie Stream Finder
          </h1>

          {/* --- WE REPLACED THE OLD HTML FORM WITH YOUR NEW COMPONENT --- */}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {moviesWithProviders.length > 0 ? (
            moviesWithProviders.map((movie: any) => (
              <div
                key={movie.id}
                className="group h-[550px] w-full [perspective:1000px]"
              >
                <div className="relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-xl shadow-lg">
                  
                  {/* --- FRONT FACE --- */}
                  <div className="absolute inset-0 h-full w-full bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col [backface-visibility:hidden]">
                    <img
                      src={
                        movie.poster_path
                          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                          : "https://placehold.co/500x750/1f2937/9ca3af?text=No+Poster"
                      }
                      alt={movie.title}
                      className="w-full h-[60%] object-cover"
                    />

                    <div className="p-5 flex-grow flex flex-col">
                      <h2 className="text-xl font-semibold mb-1 line-clamp-2">
                        {movie.title}
                      </h2>

                      <p className="text-xs font-bold text-blue-300 mb-3">
                        {movie.release_date
                          ? `${
                              new Date(movie.release_date) > new Date()
                                ? "Releasing"
                                : "Released"
                            }: ${new Date(movie.release_date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}`
                          : "Release date unknown"}
                      </p>

                      <div className="mt-auto pt-4 border-t border-gray-700">
                        <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                          Available on:
                        </h3>
                        {movie.streamingPlatforms.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {movie.streamingPlatforms.map((platform: any) => (
                              <img
                                key={platform.provider_id}
                                src={`https://image.tmdb.org/t/p/w45${platform.logo_path}`}
                                alt={platform.provider_name}
                                title={platform.provider_name}
                                className="w-7 h-7 rounded-lg shadow-sm"
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 italic">
                            Not streaming currently
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* --- BACK FACE --- */}
                  <div className="absolute inset-0 h-full w-full bg-gray-900 rounded-xl border border-gray-600 p-6 flex flex-col [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <h2 className="text-2xl font-bold mb-4 text-blue-400 border-b border-gray-700 pb-2">
                      {movie.title}
                    </h2>

                    <div className="overflow-y-auto flex-grow pr-2">
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {movie.overview ||
                          "No description available for this title."}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-xs text-gray-500 text-center uppercase tracking-wider">
                        &#8634; Hover away to flip back
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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