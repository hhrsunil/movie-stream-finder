"use client";

import { useState } from "react";

export default function MovieCard({ movie }: { movie: any }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      // Changed heights to be responsive (shorter on mobile, taller on desktop)
      className="group h-[420px] md:h-[550px] w-full [perspective:1000px] cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <div
        // REMOVED the group-hover CSS so mobile doesn't get confused. React handles the flip now!
        className={`relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d] rounded-xl shadow-lg ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* --- FRONT FACE --- */}
        <div className="absolute inset-0 h-full w-full bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col [backface-visibility:hidden]">
          
          {/* Added a dark background container and changed object-cover to object-contain */}
          <div className="w-full h-[55%] bg-gray-950 flex items-center justify-center border-b border-gray-700">
            <img
              src={
                movie.poster_path
                  ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                  : "https://placehold.co/500x750/1f2937/9ca3af?text=No+Poster"
              }
              alt={movie.title}
              className="w-full h-full object-contain"
            />
          </div>

          <div className="p-3 md:p-5 flex-grow flex flex-col">
            {/* Made text slightly smaller on mobile to fit the 2-column grid */}
            <h2 className="text-sm md:text-xl font-semibold mb-1 line-clamp-2">
              {movie.title}
            </h2>

            <p className="text-[10px] md:text-xs font-bold text-blue-300 mb-2">
              {movie.release_date
                ? `${
                    new Date(movie.release_date) > new Date()
                      ? "Releasing"
                      : "Released"
                  }: ${new Date(movie.release_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}`
                : "Release date unknown"}
            </p>

            {/* Streaming Platforms on Front */}
            <div className="mt-auto pt-2 border-t border-gray-700">
              <h3 className="text-[10px] md:text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                Available on:
              </h3>
              {movie.streamingPlatforms.length > 0 ? (
                <div className="flex flex-wrap gap-1 md:gap-2">
                  {movie.streamingPlatforms.map((platform: any) => (
                    <img
                      key={platform.provider_id}
                      src={`https://image.tmdb.org/t/p/w45${platform.logo_path}`}
                      alt={platform.provider_name}
                      title={platform.provider_name}
                      className="w-5 h-5 md:w-7 md:h-7 rounded-md md:rounded-lg shadow-sm"
                    />
                  ))}
                </div>
              ) : (
                <span className="text-[10px] md:text-xs text-gray-500 italic">
                  Not streaming currently
                </span>
              )}
            </div>
          </div>
        </div>

        {/* --- BACK FACE (FULL DESCRIPTION) --- */}
        <div className="absolute inset-0 h-full w-full bg-gray-900 rounded-xl border border-gray-600 p-4 md:p-6 flex flex-col [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4 text-blue-400 border-b border-gray-700 pb-2">
            {movie.title}
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