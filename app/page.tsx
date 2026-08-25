import SearchBar from "./SearchBar";
import MovieCard from "./MovieCard";

export const dynamic = "force-dynamic";

async function fetchSuggestions(query: string) {
  "use server";
  if (!query) return [];
  const apiKey = process.env.TMDB_API_KEY;
  const res = await fetch(
    `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(
      query
    )}&api_key=${apiKey}&include_adult=false`
  );
  const data = await res.json();
  // Filter out actors/directors, keep only movies and tv shows
  const moviesAndShows = data.results ? data.results.filter((i: any) => i.media_type !== 'person') : [];
  return moviesAndShows.slice(0, 5);
}

export default async function Home(props: any) {
  const searchParams = await props?.searchParams;
  const searchQuery = searchParams?.q || "";
  const apiKey = process.env.TMDB_API_KEY;

  try {
    let endpoint = `https://api.themoviedb.org/3/trending/all/day?api_key=${apiKey}`;

    if (searchQuery) {
      endpoint = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(
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
    const fetchedItems = (data.results || []).filter((item: any) => item.media_type !== 'person');

    const moviesWithProviders = [];

    for (const item of fetchedItems) {
      try {
        const mediaType = item.media_type || 'movie';
        
        const providerRes = await fetch(
          `https://api.themoviedb.org/3/${mediaType}/${item.id}/watch/providers?api_key=${apiKey}`,
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
          ...item,
          media_type: mediaType,
          streamingPlatforms: uniqueProviders,
        });
      } catch (err) {
        moviesWithProviders.push({ ...item, media_type: item.media_type || 'movie', streamingPlatforms: [] });
      }
    }

    return (
      <main className="min-h-screen p-4 md:p-10 bg-gray-900 text-white overflow-hidden">
        
        {/* --- CUSTOM CSS FOR CONTINUOUS LEVITATION --- */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spaceFloat {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-12px); }
            }
            .animate-space-float {
              animation: spaceFloat 3s ease-in-out infinite;
            }
          `
        }} />

        <div className="max-w-3xl mx-auto mb-10">
          
          {/* --- INDIVIDUAL LEVITATING LETTERS WITH COMIC FONT --- */}
          <h1 
            className="text-4xl md:text-6xl font-extrabold mb-8 text-center flex justify-center select-none text-blue-400"
            style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", cursive' }}
          >
            {"Find My Stream".split("").map((char, index) => {
              // Handle the spaces between words
              if (char === " ") {
                return <span key={index} className="w-3 md:w-5"></span>;
              }
              
              // Stagger the animation delay so they float organically like a wave
              const floatDelay = `${index * 0.15}s`;
              
              return (
                /* OUTER SPAN: Handles the continuous floating in space */
                <span 
                  key={index} 
                  className="inline-block animate-space-float drop-shadow-[0_5px_5px_rgba(59,130,246,0.3)]" 
                  style={{ animationDelay: floatDelay }}
                >
                  /* INNER SPAN: Handles the wild pop effect when hovered */
                  <span className="inline-block transition-transform duration-200 hover:-translate-y-4 hover:scale-125 hover:rotate-12 hover:text-blue-200 cursor-pointer">
                    {char}
                  </span>
                </span>
              );
            })}
          </h1>

          <div className="flex gap-4">
            <SearchBar
              initialQuery={searchQuery}
              fetchSuggestions={fetchSuggestions}
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

        {!searchQuery && moviesWithProviders.length > 0 && (
          <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-300 border-b border-gray-700 pb-2">
            🔥 Top 20 Trending Worldwide
          </h2>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
          {moviesWithProviders.length > 0 ? (
            moviesWithProviders.map((movie: any) => (
              <MovieCard key={movie.id} movie={movie} />
            ))
          ) : (
            <div className="col-span-full text-center py-20 text-gray-500">
              No titles found. Try another search!
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