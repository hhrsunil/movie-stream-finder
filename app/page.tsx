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
        <main className="p-10 text-white bg-[#060d17] h-screen">
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
        
        const detailsRes = await fetch(
          `https://api.themoviedb.org/3/${mediaType}/${item.id}?api_key=${apiKey}&append_to_response=watch/providers,credits,external_ids`,
          { cache: "no-store" }
        );
        const detailsData = await detailsRes.json();
        
        const regionData = detailsData['watch/providers']?.results?.IN || {};
        const allProviders = [
          ...(regionData.flatrate || []),
          ...(regionData.rent || []),
          ...(regionData.buy || []),
        ];
        const uniqueProviders = Array.from(
          new Map(allProviders.map((p: any) => [p.provider_id, p])).values()
        );

        let director = "Unknown";
        if (mediaType === 'tv' && detailsData.created_by?.length > 0) {
           director = detailsData.created_by.map((c: any) => c.name).join(", ");
        } else if (detailsData.credits?.crew) {
           const directors = detailsData.credits.crew.filter((c: any) => c.job === "Director");
           if (directors.length > 0) {
             director = directors.map((d: any) => d.name).join(", ");
           }
        }
        
        let cast = [];
        if (detailsData.credits?.cast) {
           cast = detailsData.credits.cast.slice(0, 3).map((c: any) => c.name);
        }
        
        let imdbRating = "NR";
        const imdbId = detailsData.external_ids?.imdb_id;
        const omdbKey = process.env.OMDB_API_KEY; 
        
        if (imdbId && omdbKey) {
            try {
                const omdbRes = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${omdbKey}`);
                const omdbData = await omdbRes.json();
                if (omdbData.imdbRating && omdbData.imdbRating !== "N/A") {
                    imdbRating = omdbData.imdbRating;
                }
            } catch(e) {
                console.error("OMDb fetch failed");
            }
        }

        moviesWithProviders.push({
          ...item,
          media_type: mediaType,
          streamingPlatforms: uniqueProviders,
          director: director,
          cast: cast,
          imdbRating: imdbRating
        });
      } catch (err) {
        moviesWithProviders.push({ ...item, media_type: item.media_type || 'movie', streamingPlatforms: [] });
      }
    }

    return (
      <main className="min-h-screen bg-[#060d17] text-white overflow-hidden flex flex-col">
        
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

        <nav className="w-full bg-[#0b1722] border-b border-gray-800 p-4 shadow-lg flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="bg-[#fbc500] p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black" className="w-5 h-5">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              Find<span className="text-[#fbc500]">My</span>Stream
            </span>
          </a>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 flex-grow w-full">
          
          <div className="max-w-3xl mx-auto mb-10">
            <h1 
              className="text-4xl md:text-6xl font-extrabold mb-8 text-center flex justify-center select-none text-[#fbc500]"
              style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", cursive' }}
            >
              {"Find My Stream".split("").map((char, index) => {
                if (char === " ") {
                  return <span key={index} className="w-3 md:w-5"></span>;
                }
                const floatDelay = `${index * 0.15}s`;
                return (
                  <span 
                    key={index} 
                    className="inline-block animate-space-float drop-shadow-[0_5px_5px_rgba(251,197,0,0.3)]" 
                    style={{ animationDelay: floatDelay }}
                  >
                    <span className="inline-block transition-transform duration-200 hover:-translate-y-4 hover:scale-125 hover:rotate-12 hover:text-[#ffd640] cursor-pointer">
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
          </div>

          {searchQuery ? (
            <div className="mb-6 flex flex-col items-start border-b border-gray-800 pb-4">
              <h1 className="text-2xl font-bold mb-2">Search results for: {searchQuery}</h1>
              <div className="bg-[#1a242f] text-gray-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-700 flex items-center gap-2">
                {moviesWithProviders.length} titles <span className="text-gray-500">sorted by Popularity</span>
              </div>
            </div>
          ) : (
            moviesWithProviders.length > 0 && (
              <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-200 border-b border-gray-800 pb-2">
                🔥 Top Trending Worldwide
              </h2>
            )
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 mb-16">
            {moviesWithProviders.length > 0 ? (
              moviesWithProviders.map((movie: any) => (
                <MovieCard key={movie.id} movie={movie} />
              ))
            ) : (
              <div className="col-span-full text-center py-20 text-gray-500">
                No titles found. Try adjusting your search!
              </div>
            )}
          </div>
        </div>

        {/* --- SLEEK MINIMAL FOOTER --- */}
        <footer className="w-full bg-[#0b1722] border-t border-gray-800 py-8 mt-auto">
          <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center text-center">
            <p className="text-gray-400 text-sm md:text-base font-medium">
              © {new Date().getFullYear()} <span className="text-[#fbc500] font-bold">Sunil Lavhale</span>. All streaming rights reserved.
            </p>
          </div>
        </footer>

      </main>
    );
  } catch (error) {
    console.error("--> Fetch Exception:", error);
    return (
      <main className="p-10 text-white bg-[#060d17] h-screen">
        Network fetch crashed. Check your terminal logs!
      </main>
    );
  }
}