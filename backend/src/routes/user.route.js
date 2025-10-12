import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
    getRecommendedUsers, 
    getMyFriends, 
    sendFriendRequest, 
    acceptFriendRequest,
    getFriendRequests,
    getOutgoingFriendRequests,
    getUsers, getDoctors, getPharmacies, getInstitutes
} from "../controllers/user.controller.js";

const router = express.Router();

// apply auth middleware to all routes
router.use(protectRoute);

router.get("/", getRecommendedUsers);
router.get("/friends", getMyFriends); // 7th portion; TEN DAYS REMAINING

router.post("/friend-request/:id", sendFriendRequest);
router.put("/friend-request/:id/accept", acceptFriendRequest);

router.get("/friend-requests", getFriendRequests);
router.get("/outgoing-friend-requests", getOutgoingFriendRequests);

// Get users, doctors, institutes, or pharmacies
router.get("/users", protectRoute, getUsers);
router.get("/doctors", protectRoute, getDoctors);
router.get("/pharmacies", protectRoute, getPharmacies);
router.get("/institutes", protectRoute, getInstitutes);

export default router;