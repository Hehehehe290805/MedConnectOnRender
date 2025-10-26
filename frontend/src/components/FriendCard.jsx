import { Link } from "react-router";

const FriendCard = ({ friend }) => {
  // Render based on user role
  const renderUserInfo = () => {
    switch (friend.role) {
      case "doctor":
        return (
          <>
            <div className="flex items-center gap-3 mb-3">
              <Link to={`/profile/${friend._id}`} className="btn btn-ghost btn-circle avatar">
                <div className="w-12 rounded-full">
                  {friend.profilePic ? (
                    <img src={friend.profilePic} alt={`${friend.firstName} ${friend.lastName}`} />
                  ) : (
                    <div className="bg-base-300 rounded-full w-12 h-12 flex items-center justify-center">
                      <span className="text-lg">👤</span>
                    </div>
                  )}
                </div>
              </Link>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">
                  {friend.firstName} {friend.lastName}
                </h3>
                <p className="text-sm text-gray-600 truncate">{friend.profession || friend.role}</p>
              </div>
            </div>

            {/* Languages */}
            {friend.languages && friend.languages.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium mb-1">Languages:</p>
                <div className="flex flex-wrap gap-1">
                  {friend.languages.map((language, index) => (
                    <span key={index} className="badge badge-primary badge-sm">
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            {friend.location && (
              <div className="mb-3">
                <p className="text-sm font-medium mb-1">Location:</p>
                <p className="text-sm">{friend.location}</p>
              </div>
            )}
          </>
        );

      case "institute":
        return (
          <>
            <div className="flex items-center gap-3 mb-3">
              <Link to={`/profile/${friend._id}`} className="btn btn-ghost btn-circle avatar">
                <div className="w-12 rounded-full">
                  {friend.profilePic ? (
                    <img src={friend.profilePic} alt={friend.facilityName} />
                  ) : (
                    <div className="bg-base-300 rounded-full w-12 h-12 flex items-center justify-center">
                      <span className="text-lg">🏥</span>
                    </div>
                  )}
                </div>
              </Link>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">{friend.facilityName}</h3>
                <p className="text-sm text-gray-600">Institute</p>
              </div>
            </div>

            {/* Languages */}
            {friend.languages && friend.languages.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium mb-1">Languages:</p>
                <div className="flex flex-wrap gap-1">
                  {friend.languages.map((language, index) => (
                    <span key={index} className="badge badge-primary badge-sm">
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            {friend.location && (
              <div className="mb-3">
                <p className="text-sm font-medium mb-1">Location:</p>
                <p className="text-sm">{friend.location}</p>
              </div>
            )}
          </>
        );

      default: // Regular users
        return (
          <>
            <div className="flex items-center gap-3 mb-3">
              <Link to={`/profile/${friend._id}`} className="btn btn-ghost btn-circle avatar">
                <div className="w-12 rounded-full">
                  {friend.profilePic ? (
                    <img src={friend.profilePic} alt={`${friend.firstName} ${friend.lastName}`} />
                  ) : (
                    <div className="bg-base-300 rounded-full w-12 h-12 flex items-center justify-center">
                      <span className="text-lg">👤</span>
                    </div>
                  )}
                </div>
              </Link>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">
                  {friend.firstName} {friend.lastName}
                </h3>
                <p className="text-sm text-gray-600">User</p>
              </div>
            </div>

            {/* Languages */}
            {friend.languages && friend.languages.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium mb-1">Languages:</p>
                <div className="flex flex-wrap gap-1">
                  {friend.languages.map((language, index) => (
                    <span key={index} className="badge badge-primary badge-sm">
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        );
    }
  };

  return (
    <div className="card bg-base-200 hover:shadow-md transition-shadow h-full">
      <div className="card-body p-4 flex flex-col">
        <div className="flex-grow">
          {renderUserInfo()}
        </div>

        <Link to={`/chat/${friend._id}`} className="btn btn-outline w-full mt-auto">
          Message
        </Link>
      </div>
    </div>
  );
};

export default FriendCard;
