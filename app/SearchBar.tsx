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

  // Watch the user's keystrokes and fetch suggestions if they type more than 2 letters
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
    }, 300); // 300ms delay so we don't spam the API on every single keystroke

    return () => clearTimeout(timer);
  }, [query, initialQuery, fetchSuggestions]);

  // When the user clicks a dropdown suggestion
  const handleSelect = (title: string) => {
    setQuery(title);
    setIsOpen(false);
    router.push(`/?q=${encodeURIComponent(title)}`);
  };

  // When the user hits Enter or clicks the big Search button
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
          placeholder="Search for any movie in the world..."
          className="flex-grow p-4 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoComplete="off"
        />
        <button
          type="submit"
          className="bg-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
      </form>

      {/* --- AUTOCOMPLETE DROPDOWN UI --- */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
          {suggestions.map((movie) => (
            <li
              key={movie.id}
              onClick={() => handleSelect(movie.title)}
              className="p-3 hover:bg-gray-700 cursor-pointer flex items-center gap-4 border-b border-gray-700 last:border-0 text-white transition-colors"
            >
              <img
                src={
                  movie.poster_path
                    ? `https://image.tmdb.org/t/p/w45${movie.poster_path}`
                    : "https://placehold.co/45x68/1f2937/9ca3af?text=NA"
                }
                alt={movie.title}
                className="w-10 h-14 object-cover rounded shadow-sm"
              />
              <div>
                <p className="font-bold text-sm">{movie.title}</p>
                <p className="text-xs text-blue-300">
                  {movie.release_date ? movie.release_date.substring(0, 4) : "Unknown Year"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}