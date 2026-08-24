export default async function Home() {
  const apiKey = process.env.TMDB_API_KEY;

  try {
    // 1. Fetch Trending Movies
    const response = await fetch(
      `https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}`
    );

    if (!response.ok) {
      return (
        <main className="p-10 text-white bg-gray-900 h-screen">
          API HTTP Error: {response.status}
        </main>
      );
    }

    const data = await response.json();
    const trendingMovies = data.results || [];

    // 2. Fetch Streaming Providers SEQUENTIALLY to prevent WSL network crashes
    const moviesWithProviders = [];

    for (const movie of trendingMovies) {
      try {
        const providerRes = await fetch(
          `https://api.themoviedb.org/3/movie/${movie.id}/watch/providers?api_key=${apiKey}`
        );
        const providerData = await providerRes.json();

        // 1. Get all India region data
        const regionData = providerData.results?.IN || {};

        // 2. Combine subscription (flatrate), rent, and buy options
        const allProviders = [
          ...(regionData.flatrate || []),
          ...(regionData.rent || []),
          ...(regionData.buy || [])
        ];

        // 3. Remove duplicates (e.g., if a platform offers both rent and buy)
        const uniqueProviders = Array.from(
          new Map(allProviders.map((p: any) => [p.provider_id, p])).values()
        );

        moviesWithProviders.push({
          ...movie,
          streamingPlatforms: uniqueProviders
        });
      } catch (err) {
        // Fallback if provider fetch fails for an individual movie
        moviesWithProviders.push({ ...movie, streamingPlatforms: [] });
      }
    }

    // 3. Render the UI
    return (
      <main className="min-h-screen p-10 bg-gray-900 text-white">
        <h1 className="text-4xl font-bold mb-8 text-blue-400">
          Trending Today & Where to Watch
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {moviesWithProviders.map((movie: any) => (
            <div
              key={movie.id}
              className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden flex flex-col"
            >
              <img
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                alt={movie.title}
                className="w-full h-auto object-cover"
              />

              <div className="p-5 flex-grow flex flex-col">
                <h2 className="text-xl font-semibold mb-2">{movie.title}</h2>
                <p className="text-sm text-gray-400 line-clamp-3 mb-4">
                  {movie.overview}
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
          ))}
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