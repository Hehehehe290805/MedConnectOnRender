import React, { useEffect, useState } from "react";
import PendingUser from "../components/PendingUser.jsx";
import PendingSuggestion from "../components/PendingSuggestion.jsx";
import PendingClaim from "../components/PendingClaim.jsx";

import ViewPendingUserPopup from "./ViewPendingUserPopup.jsx";
import ViewPendingSuggestionPopup from "./ViewPendingSuggestionPopup.jsx";
import ViewPendingClaimPopup from "./ViewPendingClaimPopup.jsx";
import axios from "axios";

const HomePageAdmin = () => {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [pendingSuggestions, setPendingSuggestions] = useState([]);
    const [pendingClaims, setPendingClaims] = useState([]);
    const [selectedPendingUser, setSelectedPendingUser] = useState(null);
    const [selectedPendingSuggestion, setSelectedPendingSuggestion] = useState(null);
    const [selectedPendingClaim, setSelectedPendingClaim] = useState(null);
    const [loading, setLoading] = useState({
        users: false,
        suggestions: false,
        claims: false
    });

    useEffect(() => {
        fetchPendingUsers();
        fetchPendingSuggestions();
        fetchPendingClaims();
    }, []);

    const fetchPendingUsers = async () => {
        try {
            setLoading(prev => ({ ...prev, users: true }));
            const API_URL = import.meta.env.VITE_API_URL || "";
            const res = await axios.get(`${API_URL}/api/admin/pending-users`, {
                withCredentials: true,
            });
            console.log("Fetched pending users:", res.data);
            setPendingUsers(res.data.users || []);
        } catch (err) {
            console.error("Error fetching pending users:", err);
        } finally {
            setLoading(prev => ({ ...prev, users: false }));
        }
    };

    const fetchPendingSuggestions = async () => {
        try {
            setLoading(prev => ({ ...prev, suggestions: true }));
            const API_URL = import.meta.env.VITE_API_URL || "";
            const res = await axios.get(`${API_URL}/api/admin/pending-suggestions`, {
                withCredentials: true,
            });
            console.log("Fetched pending suggestions:", res.data);
            if (res.data.success && Array.isArray(res.data.pendingSuggestions)) {
                setPendingSuggestions(res.data.pendingSuggestions);
            } else {
                setPendingSuggestions([]);
            }
        } catch (err) {
            console.error("Error fetching pending suggestions:", err);
        } finally {
            setLoading(prev => ({ ...prev, suggestions: false }));
        }
    };

    const fetchPendingClaims = async () => {
        try {
            setLoading(prev => ({ ...prev, claims: true }));
            const API_URL = import.meta.env.VITE_API_URL || "";
            const res = await axios.get(`${API_URL}/api/admin/pending-claims`, {
                withCredentials: true,
            });
            console.log("Fetched pending claims:", res.data);
            if (res.data.success && res.data.claims) {
                // Combine all claim types
                const allClaims = [
                    ...(res.data.claims.specialties || []),
                    ...(res.data.claims.subspecialties || []),
                    ...(res.data.claims.services || [])
                ];
                setPendingClaims(allClaims);
            } else {
                setPendingClaims([]);
            }
        } catch (err) {
            console.error("Error fetching pending claims:", err);
        } finally {
            setLoading(prev => ({ ...prev, claims: false }));
        }
    };

    // Approval handlers
    const handleUserApproved = (approvedUserId) => {
        setPendingUsers(prevUsers =>
            prevUsers.filter(user => user._id !== approvedUserId)
        );
    };

    const handleSuggestionApproved = (approvedSuggestionId) => {
        setPendingSuggestions(prevSuggestions =>
            prevSuggestions.filter(suggestion => suggestion._id !== approvedSuggestionId)
        );
    };

    const handleClaimApproved = (approvedClaimId) => {
        setPendingClaims(prevClaims =>
            prevClaims.filter(claim => claim._id !== approvedClaimId)
        );
    };

    // Modal handlers
    const openUserModal = (user) => setSelectedPendingUser(user);
    const closeUserModal = () => setSelectedPendingUser(null);

    const openSuggestionModal = (suggestion) => setSelectedPendingSuggestion(suggestion);
    const closeSuggestionModal = () => setSelectedPendingSuggestion(null);

    const openClaimModal = (claim) => setSelectedPendingClaim(claim);
    const closeClaimModal = () => setSelectedPendingClaim(null);

    return (
        <div className="p-8 flex flex-col space-y-8">
            {/* Section 1: Pending Users */}
            <section className="border rounded shadow-sm p-4 h-80 overflow-y-auto flex flex-col">
                <h2 className="text-xl font-bold mb-4">Pending Users</h2>
                {loading.users ? (
                    <p>Loading...</p>
                ) : pendingUsers.length === 0 ? (
                    <p>No pending users.</p>
                ) : (
                    <div className="flex flex-col space-y-2">
                        {pendingUsers.map((user) => (
                            <PendingUser
                                key={user._id}
                                user={user}
                                onViewDetails={openUserModal}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Section 2: Pending Suggestions */}
            <section className="border rounded shadow-sm p-4 h-80 overflow-y-auto flex flex-col">
                <h2 className="text-xl font-bold mb-4">Pending Suggestions</h2>
                {loading.suggestions ? (
                    <p>Loading...</p>
                ) : pendingSuggestions.length === 0 ? (
                    <p>No pending suggestions.</p>
                ) : (
                    <div className="flex flex-col space-y-2">
                        {pendingSuggestions.map((suggestion) => (
                            <PendingSuggestion
                                key={suggestion._id}
                                suggestion={suggestion}
                                onViewDetails={openSuggestionModal}
                                onSuggestionApproved={handleSuggestionApproved}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Section 3: Pending Claims */}
            <section className="border rounded shadow-sm p-4 h-80 overflow-y-auto flex flex-col">
                <h2 className="text-xl font-bold mb-4">Pending Claims</h2>
                {loading.claims ? (
                    <p>Loading...</p>
                ) : pendingClaims.length === 0 ? (
                    <p>No pending claims.</p>
                ) : (
                    <div className="flex flex-col space-y-2">
                        {pendingClaims.map((claim) => (
                            <PendingClaim
                                key={claim._id}
                                claim={claim}
                                onViewDetails={openClaimModal}
                                onClaimApproved={handleClaimApproved}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Section 4: Empty Section */}
            <section className="border rounded shadow-sm p-4 h-80 overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Section 4</h2>
            </section>

            {/* Modals */}
            {selectedPendingUser && (
                <ViewPendingUserPopup
                    user={selectedPendingUser}
                    onClose={closeUserModal}
                    onUserApproved={handleUserApproved}
                />
            )}

            {selectedPendingSuggestion && (
                <ViewPendingSuggestionPopup
                    suggestion={selectedPendingSuggestion}
                    onClose={closeSuggestionModal}
                    onSuggestionApproved={handleSuggestionApproved}
                />
            )}

            {selectedPendingClaim && (
                <ViewPendingClaimPopup
                    claim={selectedPendingClaim}
                    onClose={closeClaimModal}
                    onClaimApproved={handleClaimApproved}
                />
            )}
        </div>
    );
};

export default HomePageAdmin;