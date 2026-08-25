"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar({
  initialQuery,
  fetchSuggestions,
}: {
  initialQuery: string;
  fetchSuggestions: (query: string) => Promise<any[]>;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 2 && query !== initialQuery) {
        const results = await fetchSuggestions(query);
        setSuggestions(results);
        setIsOpen(true);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, initialQuery, fetchSuggestions]);

  const handleSelect = (title: string) => {
    setQuery(title);
    setIsOpen(false);
    router.push(`/?q=${encodeURIComponent(title)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    router.push(`/?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="relative flex-grow">
      <form onSubmit={handleSubmit} className="flex gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for any movie, web series, or anime..."
          className="flex-grow p-4 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoComplete="off"
        />
        <button
          type="submit"
          className="bg-blue-600 px-4 md:px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
      </form>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
          {suggestions.map((item) => {
            const displayTitle = item.title || item.name;
            const releaseDate = item.release_date || item.first_air_date;
            
            return (
              <li
                key={item.id}
                onClick={() => handleSelect(displayTitle)}
                className="p-3 hover:bg-gray-700 cursor-pointer flex items-center gap-4 border-b border-gray-700 last:border-0 text-white transition-colors"
              >
                <img
                  src={
                    item.poster_path
                      ? `https://image.tmdb.org/t/p/w45${item.poster_path}`
                      : "https://placehold.co/45x68/1f2937/9ca3af?text=NA"
                  }
                  alt={displayTitle}
                  className="w-10 h-14 object-cover rounded shadow-sm"
                />
                <div>
                  <p className="font-bold text-sm">{displayTitle}</p>
                  <p className="text-xs text-blue-300 flex gap-2">
                    <span className="uppercase text-gray-400 font-bold">{item.media_type === 'tv' ? 'TV' : 'MOVIE'}</span>
                    {releaseDate ? releaseDate.substring(0, 4) : "Unknown Year"}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  );
}