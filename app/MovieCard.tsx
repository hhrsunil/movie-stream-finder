"use client";

import { useState } from "react";

export default function MovieCard({ movie }: { movie: any }) {
  const [isFlipped, setIsFlipped] = useState(false);
  
  const displayTitle = movie.title || movie.name;
  const releaseDate = movie.release_date || movie.first_air_date;
  const isTV = movie.media_type === 'tv';
  
  // Format TMDB rating to 1 decimal place (e.g., 8.4)
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "NR";

  return (
    <div
      className="group h-[500px] md:h-[600px] w-full [perspective:1000px] cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <div
        className={`relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d] rounded-xl shadow-lg ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* --- FRONT FACE (JustWatch Style) --- */}
        <div className="absolute inset-0 h-full w-full bg-[#0b1722] rounded-xl border border-gray-800 overflow-hidden flex flex-col [backface-visibility:hidden]">
          
          <div className="relative w-full h-[50%] bg-gray-950 flex items-center justify-center">
            <div className="absolute top-2 right-2 bg-black/80 text-gray-300 text-[10px] md:text-xs font-bold px-2 py-1 rounded z-10 uppercase">
               {isTV ? 'TV' : 'Movie'}
            </div>
            <img
              src={
                movie.poster_path
                  ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                  : "https://placehold.co/500x750/0b1722/9ca3af?text=No+Poster"
              }
              alt={displayTitle}
              className="w-full h-full object-contain"
            />
          </div>

          <div className="p-4 flex-grow flex flex-col">
            <h2 className="text-lg md:text-xl font-bold mb-1 line-clamp-1 text-white">
              {displayTitle} <span className="text-gray-400 font-normal text-sm md:text-base">({releaseDate ? releaseDate.substring(0, 4) : "TBD"})</span>
            </h2>

            {/* Rating Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-[#f5c518] text-black text-xs font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1">
                <span className="text-[10px]">TMDB</span> {rating}
              </span>
            </div>

            {/* Streaming Section */}
            <div className="mt-auto">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Watch Now</p>
              
              {movie.streamingPlatforms.length > 0 ? (
                <div className="bg-[#1a242f] rounded-lg border border-gray-700 overflow-hidden">
                  <div className="bg-gray-200 text-center text-[10px] font-bold text-gray-800 py-1 uppercase tracking-widest">
                    Stream
                  </div>
                  <div className="p-3 flex flex-wrap gap-3">
                    {movie.streamingPlatforms.map((platform: any) => (
                      <div key={platform.provider_id} className="flex flex-col items-center gap-1">
                        <img
                          src={`https://image.tmdb.org/t/p/w45${platform.logo_path}`}
                          alt={platform.provider_name}
                          title={platform.provider_name}
                          className="w-8 h-8 md:w-10 md:h-10 rounded-lg shadow-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-[#1a242f] rounded-lg border border-gray-700 p-3 text-center">
                  <p className="text-xs md:text-sm text-gray-300 font-medium mb-3">
                    {displayTitle} is not available for streaming.
                  </p>
                  <p className="text-[10px] text-gray-500 mb-2">Let us notify you when you can watch it.</p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); // Prevents the card from flipping when clicking the button
                      alert(`🔔 We will notify you when "${displayTitle}" becomes available!`);
                    }}
                    className="w-full bg-[#fbc500] hover:bg-[#e0b000] text-black font-bold py-2 rounded text-sm flex justify-center items-center gap-2 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M12 2.25A6.75 6.75 0 0 0 5.25 9v.75a8.967 8.967 0 0 1-2.319 5.25.75.75 0 0 0 .54 1.25h17.058a.75.75 0 0 0 .54-1.25 8.967 8.967 0 0 1-2.319-5.25V9a6.75 6.75 0 0 0-6.75-6.75ZM9.75 19.5c0 1.084.816 2.25 2.25 2.25s2.25-1.166 2.25-2.25h-4.5Z" clipRule="evenodd" />
                    </svg>
                    Notify me
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- BACK FACE (FULL DESCRIPTION) --- */}
        <div className="absolute inset-0 h-full w-full bg-[#0b1722] rounded-xl border border-gray-700 p-4 md:p-6 flex flex-col [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4 text-[#fbc500] border-b border-gray-700 pb-2">
            {displayTitle}
          </h2>

          <div className="overflow-y-auto flex-grow pr-2">
            <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
              {movie.overview || "No description available for this title."}
            </p>
          </div>

          <div className="mt-2 md:mt-4 pt-2 md:pt-4 border-t border-gray-700">
            <p className="text-[10px] md:text-xs text-gray-500 text-center uppercase tracking-wider">
              &#8634; Tap or hover to flip back
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}