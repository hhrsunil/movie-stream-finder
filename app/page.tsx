export default async function Home() {
  const apiKey = process.env.TMDB_API_KEY;

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}`
    );
    
    if (!response.ok) {
       return <main className="p-10 text-white bg-gray-900 h-screen">API HTTP Error: {response.status}</main>;
    }

    const data = await response.json();
    const movies = data.results || [];

    return (
      <main className="min-h-screen p-10 bg-gray-900 text-white">
        <h1 className="text-4xl font-bold mb-8 text-blue-400">Trending Today</h1>
        
        {/* Changed to 4 columns on large screens to fit the posters better */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {movies.map((movie: any) => (
            <div key={movie.id} className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden flex flex-col">
              
              {/* --- NEW IMAGE SECTION --- */}
              <img 
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
                alt={movie.title}
                className="w-full h-auto object-cover"
              />
              
              {/* Text Section */}
              <div className="p-5 flex-grow">
                <h2 className="text-xl font-semibold mb-2">{movie.title}</h2>
                <p className="text-sm text-gray-400 line-clamp-3">{movie.overview}</p>
              </div>
              
            </div>
          ))}
        </div>
      </main>
    );
  } catch (error) {
    console.error("--> Fetch Exception:", error);
    return <main className="p-10 text-white bg-gray-900 h-screen">Network fetch crashed. Check your terminal logs!</main>;
  }
}