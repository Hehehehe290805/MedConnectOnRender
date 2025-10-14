import User from "../models/User.js";
import { upsertStreamUser } from "../lib/stream.js";

// User onboarding
async function onboardHelper(req, res, role, status = "pending", extraFields = {}) {
    const userId = req.user._id;
    const requiredFields = ["languages", "location", "bio", "birthDate"];

    const existingUser = await User.findById(userId).select("status");
    if (!existingUser) return res.status(404).json({ message: "User not found" });
    if (existingUser.status === "onBoarded" || existingUser.status === "pending") {
        return res.status(400).json({ message: "User is already onboarded or has a pending request" });
    }

    const missingFields = requiredFields.filter(f => !req.body[f]);
    if (missingFields.length) {
        return res.status(400).json({ message: "All fields are required", missingFields });
    }

    const updateData = { ...req.body, status, role, ...extraFields };
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    try {
        await upsertStreamUser({
            id: updatedUser._id.toString(),
            name: updatedUser.fullName,
            image: updatedUser.profilePic || "",
        });
    } catch (streamError) {
        console.log("Stream update error:", streamError.message);
    }

    res.status(200).json({ success: true, user: updatedUser });
}
export async function onboard(req, res) {
    return onboardHelper(req, res, "user", "onBoarded");
}
export async function onboardAsDoctor(req, res) {
    return onboardHelper(req, res, "doctor", "pending", { profession: req.body.profession });
}
export async function onboardAsPharmacist(req, res) {
    return onboardHelper(req, res, "pharmacist", "pending", { profession: "Pharmacist" });
}
export async function onboardAsInstitute(req, res) {
    return onboardHelper(req, res, "institute", "pending", { facilityName: req.body.facilityName });
}
export async function onboardAsAdmin(req, res) {
    return onboardHelper(req, res, "admin", "pending", { adminCode: req.body.adminCode });
}

// User role change
async function changeRoleHelper(req, res, role, status = "pending", extraFields = {}) {
    const userId = req.user._id;
    const requiredFields = ["languages", "location", "bio", "birthDate"];

    const existingUser = await User.findById(userId).select("status");
    if (!existingUser) return res.status(404).json({ message: "User not found" });

    // Only allow role change if user is already onboarded (not pending)
    if (existingUser.status == "pending") {
        return res.status(400).json({ message: "User has pending role change request" });
    }

    const missingFields = requiredFields.filter(f => !req.body[f]);
    if (missingFields.length) {
        return res.status(400).json({ message: "All fields are required", missingFields });
    }

    const updateData = { ...req.body, status, role, ...extraFields };
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    try {
        await upsertStreamUser({
            id: updatedUser._id.toString(),
            name: updatedUser.fullName,
            image: updatedUser.profilePic || "",
        });
    } catch (streamError) {
        console.log("Stream update error:", streamError.message);
    }

    res.status(200).json({ success: true, user: updatedUser });
}
export async function changeRole(req, res) {
    const { role } = req.body;

    try {
        const extraData = {};

        switch (role) {
            case "user":
                return changeRoleHelper(req, res, "user", "onBoarded", extraData);
            case "doctor":
                return changeRoleHelper(req, res, "doctor", "pending", { ...extraData, profession: req.body.profession });
            case "pharmacist":
                return changeRoleHelper(req, res, "pharmacist", "pending", { ...extraData, profession: "Pharmacist" });
            case "institute":
                return changeRoleHelper(req, res, "institute", "pending", { ...extraData, facilityName: req.body.facilityName });
            case "admin":
                return changeRoleHelper(req, res, "admin", "pending", { ...extraData, adminCode: req.body.adminCode });
            default:
                return res.status(400).json({ message: "Invalid role specified" });
        }
    } catch (error) {
        console.error("Error in changeRole controller:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}