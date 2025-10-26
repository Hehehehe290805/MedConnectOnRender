import React, { useState } from "react";
import axios from "axios";

const PendingSuggestion = ({ suggestion, onSuggestionApproved, onViewDetails }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleApprove = async () => {
        try {
            setLoading(true);
            setError(null);

            const API_URL = import.meta.env.VITE_API_URL || "";
            const res = await axios.patch(
                `${API_URL}/api/admin/approve`,
                { id: suggestion._id },
                { withCredentials: true }
            );

            if (res.data.message) {
                if (onSuggestionApproved) {
                    onSuggestionApproved(suggestion._id);
                }
            }
        } catch (err) {
            console.error("Error approving suggestion:", err);
            setError(err.response?.data?.message || "Failed to approve suggestion");
        } finally {
            setLoading(false);
        }
    };

    const getSuggestionType = () => {
        switch (suggestion.type) {
            case "specialty":
                return "Medical Specialty";
            case "subspecialty":
                return "Subspecialty";
            case "service":
                return "Service";
            default:
                return suggestion.type;
        }
    };

    return (
        <div className="card bg-base-200 shadow-sm mb-3">
            <div className="card-body p-4">
                <div className="flex justify-between items-start">
                    <div className="flex-1 cursor-pointer" onClick={() => onViewDetails(suggestion)}>
                        <h3 className="font-semibold text-lg">{suggestion.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <span className="badge badge-primary">{getSuggestionType()}</span>
                            {suggestion.type === "subspecialty" && suggestion.rootSpecialty && (
                                <span className="badge badge-outline">
                                    Under: {suggestion.rootSpecialty.name || suggestion.rootSpecialty}
                                </span>
                            )}
                        </div>
                        {suggestion.suggestedBy && (
                            <p className="text-sm opacity-70 mt-1">
                                Suggested by: {suggestion.suggestedBy.firstName} {suggestion.suggestedBy.lastName}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                        <button
                            className="btn btn-info btn-sm"
                            onClick={() => onViewDetails(suggestion)}
                        >
                            View
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="alert alert-error mt-2">
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingSuggestion;