import User from "../models/User.js";
import { upsertStreamUser } from "../lib/stream.js";

export async function onboard(req, res) {
    try {
        const userId = req.user._id;
        const { languages, location, bio, birthDate } = req.body;

        if (!languages || !location || !bio || !birthDate) {
            return res.status(400).json({
                message: "All fields are required",
                missingFields: [
                    !languages && "languages",
                    !location && "location",
                    !bio && "bio",
                    !birthDate && "birthDate",
                ].filter(Boolean),
            });
        }

        const updatedUser = await User.findByIdAndUpdate(userId, {
            ...req.body,
            status: "onBoarded",
        }, { new: true });

        if (!updatedUser) return res.status(404).json({ message: "User not found" });
        try {
            await upsertStreamUser({
                id: updatedUser._id.toString(),
                name: updatedUser.fullName,
                image: updatedUser.profilePic || "",
            });
            console.log(`Stream user updated after onboarding for ${updatedUser.fullName}`);
        } catch (streamError) {
            console.log("Error updating Stream user during onboarding:", streamError.message);
        }

        res.status(200).json({ success: true, user: updatedUser });

    } catch (error) {
        console.error("Error in onboarding controller:", error);
        res.status(500).json({ message: "Internal Server Error" }
        );
    }
}

export async function onboardAsDoctor(req, res) {
    try {
        const userId = req.user._id;
        const { languages, location, bio, birthDate, licenseNumber, profession } = req.body;

        if (!languages || !location || !bio || !birthDate || !licenseNumber || !profession) {
            return res.status(400).json({
                message: "All fields are required",
                missingFields: [
                    !languages && "languages",
                    !location && "location",
                    !bio && "bio",
                    !birthDate && "birthDate",
                    !licenseNumber && "licenseNumber",
                    !profession && "profession",
                ].filter(Boolean),
            });
        }

        const updatedUser = await User.findByIdAndUpdate(userId, {
            ...req.body,
            status: "pending",
            role: "doctor",
        }, { new: true });

        if (!updatedUser) return res.status(404).json({ message: "User not found" });
        try {
            await upsertStreamUser({
                id: updatedUser._id.toString(),
                name: updatedUser.fullName,
                image: updatedUser.profilePic || "",
            });
            console.log(`Stream user updated after onboarding for ${updatedUser.fullName}`);
        } catch (streamError) {
            console.log("Error updating Stream user during onboarding:", streamError.message);
        }

        res.status(200).json({ success: true, user: updatedUser });

    } catch (error) {
        console.error("Error in onboarding controller:", error);
        res.status(500).json({ message: "Internal Server Error" }
        );
    }

}

export async function onboardAsPharmacist(req, res) {
    try {
        const userId = req.user._id;
        const { languages, location, bio, birthDate, licenseNumber, facilityName } = req.body;

        // Remove profession from required check since it will be locked
        if (!languages || !location || !bio || !birthDate || !licenseNumber || !facilityName) {
            return res.status(400).json({
                message: "All fields are required",
                missingFields: [
                    !languages && "languages",
                    !location && "location",
                    !bio && "bio",
                    !birthDate && "birthDate",
                    !licenseNumber && "licenseNumber",
                    !facilityName && "facilityName",
                ].filter(Boolean),
            });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                ...req.body,
                profession: "Pharmacist", // locked
                status: "pending",
                role: "pharmacist",
            },
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        try {
            await upsertStreamUser({
                id: updatedUser._id.toString(),
                name: updatedUser.fullName,
                image: updatedUser.profilePic || "",
            });
            console.log(`Stream user updated after onboarding for ${updatedUser.fullName}`);
        } catch (streamError) {
            console.log("Error updating Stream user during onboarding:", streamError.message);
        }

        res.status(200).json({ success: true, user: updatedUser });

    } catch (error) {
        console.error("Error in onboarding controller:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function onboardAsInstitute(req, res) {
    try {
        const userId = req.user._id;
        const { languages, location, bio, birthDate, facilityName } = req.body;

        if (!languages || !location || !bio || !birthDate || !facilityName) {
            return res.status(400).json({
                message: "All fields are required",
                missingFields: [
                    !languages && "languages",
                    !location && "location",
                    !bio && "bio",
                    !birthDate && "birthDate",
                    !facilityName && "facilityName",
                ].filter(Boolean),
            });
        }

        const updatedUser = await User.findByIdAndUpdate(userId, {
            ...req.body,
            status: "pending",
            role: "institute",
        }, { new: true });

        if (!updatedUser) return res.status(404).json({ message: "User not found" });
        try {
            await upsertStreamUser({
                id: updatedUser._id.toString(),
                name: updatedUser.fullName,
                image: updatedUser.profilePic || "",
            });
            console.log(`Stream user updated after onboarding for ${updatedUser.fullName}`);
        } catch (streamError) {
            console.log("Error updating Stream user during onboarding:", streamError.message);
        }

        res.status(200).json({ success: true, user: updatedUser });

    } catch (error) {
        console.error("Error in onboarding controller:", error);
        res.status(500).json({ message: "Internal Server Error" }
        );
    }

}

export async function onboardAsAdmin(req, res) {
    try {
        const userId = req.user._id;
        const { languages, location, bio, birthDate, adminCode } = req.body;

        if (!languages || !location || !bio || !birthDate || !adminCode) {
            return res.status(400).json({
                message: "All fields are required",
                missingFields: [
                    !languages && "languages",
                    !location && "location",
                    !bio && "bio",
                    !birthDate && "birthDate",
                    !adminCode && "adminCode",
                ].filter(Boolean),
            });
        }

        const updatedUser = await User.findByIdAndUpdate(userId, {
            ...req.body,
            status: "pending",
            role: "admin",
        }, { new: true });

        if (!updatedUser) return res.status(404).json({ message: "User not found" });
        try {
            await upsertStreamUser({
                id: updatedUser._id.toString(),
                name: updatedUser.fullName,
                image: updatedUser.profilePic || "",
            });
            console.log(`Stream user updated after onboarding for ${updatedUser.fullName}`);
        } catch (streamError) {
            console.log("Error updating Stream user during onboarding:", streamError.message);
        }

        res.status(200).json({ success: true, user: updatedUser });

    } catch (error) {
        console.error("Error in onboarding controller:", error);
        res.status(500).json({ message: "Internal Server Error" }
        );
    }

}

export async function changeRole(req, res) {
    const { role } = req.body;

    try {
        switch (role) {
            case "user":
                return onboard(req, res);
            case "doctor":
                return onboardAsDoctor(req, res);

            case "pharmacist":
                return onboardAsPharmacist(req, res);

            case "institute":
                return onboardAsInstitute(req, res);

            case "admin":
                return onboardAsAdmin(req, res);

            default:
                return res.status(400).json({ message: "Invalid role specified" });
        }
    } catch (error) {
        console.error("Error in changeRole controller:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}