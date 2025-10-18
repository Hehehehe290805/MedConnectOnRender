import User from "../models/User.js";
import { upsertStreamUser } from "../lib/stream.js";

// ✅ Define required fields per role
const roleFieldMap = {
    user: ["firstName", "lastName", "birthDate", "bio", "languages", "location"],
    doctor: [
        "firstName",
        "lastName",
        "birthDate",
        "bio",
        "languages",
        "location",
        "profession",
        "licenseNumber",
        "gcash.accountName",
        "gcash.accountNumber",
    ],
    pharmacist: [
        "firstName",
        "lastName",
        "birthDate",
        "bio",
        "languages",
        "location",
        "licenseNumber",
        "gcash.accountName",
        "gcash.accountNumber",
    ],
    institute: [
        "facilityName",
        "bio",
        "languages",
        "location",
        "gcash.accountName",
        "gcash.accountNumber",
    ],
    admin: ["firstName", "lastName", "birthDate", "bio", "languages", "location", "adminCode"],
};

// ✅ Helper to check nested required fields
function getMissingFields(role, body) {
    const required = roleFieldMap[role] || [];
    const missing = [];

    required.forEach((field) => {
        const parts = field.split(".");
        let value = body;
        for (const p of parts) {
            value = value?.[p];
        }
        if (!value) missing.push(field);
    });

    return missing;
}

// ✅ Common onboarding helper
async function onboardHelper(req, res, role, status = "pending", extraFields = {}) {
    const userId = req.user._id;
    const existingUser = await User.findById(userId).select("status");
    if (!existingUser) return res.status(404).json({ message: "User not found" });

    if (existingUser.status === "onBoarded" || existingUser.status === "pending") {
        return res.status(400).json({ message: "User is already onboarded or has a pending request" });
    }

    const missingFields = getMissingFields(role, req.body);
    if (missingFields.length > 0) {
        return res.status(400).json({ message: "All fields are required", missingFields });
    }

    const updateData = { ...req.body, status, role, ...extraFields };

    // 🩺 Auto set pharmacist profession
    if (role === "pharmacist") {
        updateData.profession = "Pharmacist";
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    try {
        await upsertStreamUser({
            id: updatedUser._id.toString(),
            name: updatedUser.firstName
                ? `${updatedUser.firstName} ${updatedUser.lastName || ""}`.trim()
                : updatedUser.facilityName || "Unknown",
            image: updatedUser.profilePic || "",
        });
    } catch (streamError) {
        console.log("Stream update error:", streamError.message);
    }

    return res.status(200).json({ success: true, user: updatedUser });
}

// 🧭 Public endpoints for onboarding
export async function onboard(req, res) {
    return onboardHelper(req, res, "user", "onBoarded");
}
export async function onboardAsDoctor(req, res) {
    return onboardHelper(req, res, "doctor", "pending", { profession: req.body.profession });
}
export async function onboardAsPharmacist(req, res) {
    return onboardHelper(req, res, "pharmacist", "pending");
}
export async function onboardAsInstitute(req, res) {
    return onboardHelper(req, res, "institute", "pending", { facilityName: req.body.facilityName });
}
export async function onboardAsAdmin(req, res) {
    return onboardHelper(req, res, "admin", "pending", { adminCode: req.body.adminCode });
}

// ✅ Helper for role change (e.g., user ➝ doctor)
async function changeRoleHelper(req, res, role, status = "pending", extraFields = {}) {
    const userId = req.user._id;
    const existingUser = await User.findById(userId).select("status");
    if (!existingUser) return res.status(404).json({ message: "User not found" });

    if (existingUser.status === "pending") {
        return res.status(400).json({ message: "User has a pending role change request" });
    }

    const missingFields = getMissingFields(role, req.body);
    if (missingFields.length > 0) {
        return res.status(400).json({ message: "All fields are required", missingFields });
    }

    const updateData = { ...req.body, status, role, ...extraFields };

    if (role === "pharmacist") {
        updateData.profession = "Pharmacist";
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    try {
        await upsertStreamUser({
            id: updatedUser._id.toString(),
            name: updatedUser.firstName
                ? `${updatedUser.firstName} ${updatedUser.lastName || ""}`.trim()
                : updatedUser.facilityName || "Unknown",
            image: updatedUser.profilePic || "",
        });
    } catch (streamError) {
        console.log("Stream update error:", streamError.message);
    }

    return res.status(200).json({ success: true, user: updatedUser });
}

// 🧭 Public endpoint for role changes
export async function changeRole(req, res) {
    const { role } = req.body;

    try {
        switch (role) {
            case "user":
                return changeRoleHelper(req, res, "user", "onBoarded");
            case "doctor":
                return changeRoleHelper(req, res, "doctor", "pending", { profession: req.body.profession });
            case "pharmacist":
                return changeRoleHelper(req, res, "pharmacist", "pending");
            case "institute":
                return changeRoleHelper(req, res, "institute", "pending", { facilityName: req.body.facilityName });
            case "admin":
                return changeRoleHelper(req, res, "admin", "pending", { adminCode: req.body.adminCode });
            default:
                return res.status(400).json({ message: "Invalid role specified" });
        }
    } catch (error) {
        console.error("Error in changeRole controller:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
