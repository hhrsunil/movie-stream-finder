"use client";

import { useState } from "react";

export default function MovieCard({ movie }: { movie: any }) {
  // This state tracks whether the card is currently flipped
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="group h-[550px] w-full [perspective:1000px] cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <div
        className={`relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d] rounded-xl shadow-lg ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
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
                  }: ${new Date(movie.release_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}`
                : "Release date unknown"}
            </p>

            {/* Streaming Platforms on Front */}
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

        {/* --- BACK FACE (FULL DESCRIPTION) --- */}
        <div className="absolute inset-0 h-full w-full bg-gray-900 rounded-xl border border-gray-600 p-6 flex flex-col [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <h2 className="text-2xl font-bold mb-4 text-blue-400 border-b border-gray-700 pb-2">
            {movie.title}
          </h2>

          {/* Scrollable description box */}
          <div className="overflow-y-auto flex-grow pr-2">
            <p className="text-sm text-gray-300 leading-relaxed">
              {movie.overview || "No description available for this title."}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center uppercase tracking-wider">
              &#8634; Tap or hover away to flip back
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}