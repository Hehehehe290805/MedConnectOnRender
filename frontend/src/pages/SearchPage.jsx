import { useEffect, useState } from "react";
import { SearchIcon, AlertCircleIcon } from "lucide-react";
import FriendCard from "../components/FriendCard.jsx";
import FilterSearch from "../components/FilterSearch.jsx";

const SearchPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({});

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const [doctorsRes, institutesRes] = await Promise.all([
        fetch("http://localhost:5001/api/users/doctors", {
          method: "GET",
          credentials: "include",
        }),
        fetch("http://localhost:5001/api/users/institutes", {
          method: "GET",
          credentials: "include",
        }),
      ]);

      if (!doctorsRes.ok || !institutesRes.ok) {
        const errText = `${!doctorsRes.ok ? "Doctors" : ""} ${
          !institutesRes.ok ? "Institutes" : ""
        } fetch failed`;
        throw new Error(`Failed to fetch one or more user groups (${errText})`);
      }

      const [doctorsData, institutesData] = await Promise.all([
        doctorsRes.json(),
        institutesRes.json(),
      ]);

      const doctors = doctorsData.data || [];
      const institutes = institutesData.data || [];

      setResults([...doctors, ...institutes]);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  // Apply all filters
  const filteredResults = results.filter((item) => {
    // Search query filter
    const search = query.toLowerCase();
    const matchesSearch =
      !query ||
      item.firstName?.toLowerCase().includes(search) ||
      item.lastName?.toLowerCase().includes(search) ||
      item.facilityName?.toLowerCase().includes(search) ||
      item.role?.toLowerCase().includes(search) ||
      item.location?.toLowerCase().includes(search) ||
      item.profession?.toLowerCase().includes(search);

    // Role filter
    const matchesRole =
      filters.roles?.length === 0 ||
      filters.roles?.some(
        (role) => item.role?.toLowerCase() === role.toLowerCase()
      );

    // Gender filter
    const matchesGender =
      filters.genders?.length === 0 ||
      filters.genders?.some(
        (gender) => item.sex?.toLowerCase() === gender.toLowerCase()
      );

    // Languages filter
    const matchesLanguages =
      filters.languages?.length === 0 ||
      filters.languages?.some((lang) => item.languages?.includes(lang));

    // Location filter
    const matchesLocation =
      filters.locations?.length === 0 ||
      filters.locations?.some((loc) =>
        item.location?.toLowerCase().includes(loc.toLowerCase())
      );

    // Profession filter
    const matchesProfession =
      !filters.profession ||
      item.profession?.toLowerCase().includes(filters.profession.toLowerCase());

    // Price filter (if you have pricing data)
    const matchesPrice =
      (!filters.minPrice || (item.pricing?.amount || 0) >= filters.minPrice) &&
      (!filters.maxPrice || (item.pricing?.amount || 0) <= filters.maxPrice);

    // Service filter (if needed - adjust based on your data structure)
    const matchesService =
      !filters.service ||
      item.services?.some((s) =>
        s.name?.toLowerCase().includes(filters.service.toLowerCase())
      );

    // Specialty filter (if needed - adjust based on your data structure)
    const matchesSpecialty =
      !filters.specialty ||
      item.specialties?.some((s) =>
        s.name?.toLowerCase().includes(filters.specialty.toLowerCase())
      );

    // Subspecialty filter (if needed - adjust based on your data structure)
    const matchesSubspecialty =
      !filters.subspecialty ||
      item.subspecialties?.some((s) =>
        s.name?.toLowerCase().includes(filters.subspecialty.toLowerCase())
      );

    return (
      matchesSearch &&
      matchesRole &&
      matchesGender &&
      matchesLanguages &&
      matchesLocation &&
      matchesProfession &&
      matchesPrice &&
      matchesService &&
      matchesSpecialty &&
      matchesSubspecialty
    );
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-base-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold">Find Users & Professionals</h1>

          {/* Search bar and Filter */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name, role, or location"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input input-bordered w-full pl-10"
              />
            </div>
            <FilterSearch onFilterChange={setFilters} />
          </div>

          {/* Results count */}
          {!loading && !error && (
            <p className="text-sm text-gray-600">
              Found {filteredResults.length} result
              {filteredResults.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center text-error mt-10">
            <AlertCircleIcon className="w-8 h-8" />
            <p className="mt-2 text-center">{error}</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <p className="text-center mt-10 text-gray-500">
            No matching users found.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResults.map((friend) => (
              <FriendCard key={friend._id} friend={friend} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
