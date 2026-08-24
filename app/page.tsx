export const dynamic = "force-dynamic";

export default async function Home(props: any) {
  // Read the URL search parameters securely on the server
  const searchParams = await props?.searchParams;
  const searchQuery = searchParams?.q || "";
  const apiKey = process.env.TMDB_API_KEY;

  try {
    // 1. Determine which API endpoint to hit based on if the user is searching
    let endpoint = `https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}`;
    
    if (searchQuery) {
      // If there is a search term, hit the search endpoint instead
      endpoint = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(searchQuery)}&api_key=${apiKey}&include_adult=false`;
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

    // 2. Fetch Streaming Providers SEQUENTIALLY to prevent network crashes
    const moviesWithProviders = [];

    for (const movie of fetchedMovies) {
      try {
        const providerRes = await fetch(
          `https://api.themoviedb.org/3/movie/${movie.id}/watch/providers?api_key=${apiKey}`,
          { cache: "no-store" }
        );
        const providerData = await providerRes.json();

        // Get all India region data
        const regionData = providerData.results?.IN || {};

        // Combine subscription (flatrate), rent, and buy options
        const allProviders = [
          ...(regionData.flatrate || []),
          ...(regionData.rent || []),
          ...(regionData.buy || [])
        ];

        // Remove duplicates
        const uniqueProviders = Array.from(
          new Map(allProviders.map((p: any) => [p.provider_id, p])).values()
        );

        moviesWithProviders.push({
          ...movie,
          streamingPlatforms: uniqueProviders
        });
      } catch (err) {
        moviesWithProviders.push({ ...movie, streamingPlatforms: [] });
      }
    }

    // 3. Render the UI
    return (
      <main className="min-h-screen p-10 bg-gray-900 text-white">
        
        {/* --- NEW SEARCH BAR SECTION --- */}
        <div className="max-w-3xl mx-auto mb-10">
          <h1 className="text-4xl font-bold mb-6 text-center text-blue-400">
            Movie Stream Finder
          </h1>
          
          <form action="/" method="GET" className="flex gap-4">
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search for any movie in the world..."
              className="flex-grow p-4 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Show a "Clear Search" button if the user is currently searching */}
          {searchQuery && (
            <div className="text-center mt-4">
              <p className="text-gray-400">Showing results for "{searchQuery}"</p>
              <a href="/" className="text-blue-500 hover:underline text-sm mt-1 inline-block">
                &larr; Clear search and return to Trending
              </a>
            </div>
          )}
        </div>

        {/* --- MOVIE GRID SECTION --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {moviesWithProviders.length > 0 ? (
            moviesWithProviders.map((movie: any) => (
              <div
                key={movie.id}
                className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden flex flex-col"
              >
                {/* Fallback image just in case a movie doesn't have a poster */}
                <img
                  src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : "https://via.placeholder.com/500x750?text=No+Poster"}
                  alt={movie.title}
                  className="w-full h-auto object-cover aspect-[2/3]"
                />

                <div className="p-5 flex-grow flex flex-col">
                  <h2 className="text-xl font-semibold mb-2">{movie.title}</h2>
                  <p className="text-sm text-gray-400 line-clamp-3 mb-4">
                    {movie.overview || "No description available."}
                  </p>

                  {/* Streaming Platforms Section */}
                  <div className="mt-auto pt-4 border-t border-gray-700">
                    <h3 className="text-sm font-bold text-gray-300 mb-2">
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
                            className="w-8 h-8 rounded-lg shadow-sm"
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 italic">
                        Not currently available to stream, rent, or buy
                      </span>
                    )}
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