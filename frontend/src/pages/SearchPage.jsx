const SearchPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState("");

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
        const errText = `${!doctorsRes.ok ? "Doctors" : ""} ${!institutesRes.ok ? "Institutes" : ""} fetch failed`;
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

  const filteredResults = results.filter((item) => {
    const search = query.toLowerCase();
    return (
      item.firstName?.toLowerCase().includes(search) ||
      item.lastName?.toLowerCase().includes(search) ||
      item.facilityName?.toLowerCase().includes(search) ||
      item.role?.toLowerCase().includes(search) ||
      item.location?.toLowerCase().includes(search)
    );
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-base-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-3xl font-bold">Find Users & Professionals</h1>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, role, or location"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input input-bordered w-full pl-10"
            />
          </div>
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
