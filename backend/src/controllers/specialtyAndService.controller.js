import Doctor_Specialty from "../models/Doctor_Specialty.js";
import Institute_Service from "../models/Institute_Service.js";
import Service from "../models/Service.js";
import Specialty from "../models/Specialty.js";
import Subspecialty from "../models/Subspecialty.js";

// View Specialties
async function fetchHelper(req, res, type, filter = {}) {
    try {
        let Model;
        switch (type) {
            case "specialty": Model = Specialty; break;
            case "subspecialty": Model = Subspecialty; break;
            case "service": Model = Service; break;
            default: return res.status(400).json({ message: "Invalid type" });
        }

        const items = await Model.find(filter).sort({ name: 1 });
        return res.status(200).json({ items });
    } catch (error) {
        console.error("Error fetching items:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
export async function getSpecialties(req, res) {
    return fetchHelper(req, res, "specialty", { status: "verified" });
}
export async function getSubspecialtiesBySpecialty(req, res) {
    const { specialtyId } = req.params;
    if (!specialtyId) return res.status(400).json({ message: "Specialty ID is required" });
    return fetchHelper(req, res, "subspecialty", { rootSpecialty: specialtyId, status: "verified" });
}
export async function getServices(req, res) {
    return fetchHelper(req, res, "service");
}

// Suggest Specialties
async function suggestHelper(req, res, type) {
    try {
        const userId = req.user._id;
        const { name, rootSpecialtyId } = req.body;

        // Required fields
        if (!name || (type === "subspecialty" && !rootSpecialtyId)) {
            const missing = ["name"];
            if (type === "subspecialty") missing.push("rootSpecialtyId");
            return res.status(400).json({ message: "Missing required fields", missingFields: missing });
        }

        let Model;
        let extra = {};
        switch (type) {
            case "specialty": Model = Specialty; break;
            case "subspecialty":
                Model = Subspecialty;
                extra.rootSpecialty = rootSpecialtyId;
                break;
            case "service": Model = Service; break;
            default: return res.status(400).json({ message: "Invalid type" });
        }

        // Check for duplicates (case-insensitive)
        const exists = await Model.findOne({
            name: { $regex: `^${name}$`, $options: "i" },
            ...(type === "subspecialty" ? { rootSpecialty: rootSpecialtyId } : {})
        });
        if (exists) return res.status(400).json({ message: `${type} already exists or is pending approval` });

        const newItem = new Model({ name, status: "pending", suggestedBy: userId, ...extra });
        await newItem.save();

        return res.status(201).json({
            message: `${type.charAt(0).toUpperCase() + type.slice(1)} suggested successfully, pending admin approval`,
            item: newItem
        });

    } catch (error) {
        console.error("Error suggesting item:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
export async function suggestSpecialty(req, res) { return suggestHelper(req, res, "specialty"); }
export async function suggestSubspecialty(req, res) { return suggestHelper(req, res, "subspecialty"); }
export async function suggestService(req, res) { return suggestHelper(req, res, "service"); }

// Claim Specialty or Subspecialty
async function claimHelper(req, res, type) {
    try {
        const userId = req.user._id; // from auth middleware
        const { targetId } = req.body; // ID of the specialty / subspecialty / service

        if (!targetId) {
            return res.status(400).json({ message: "Target ID is required" });
        }

        let LinkModel;
        let TargetModel;
        const linkData = { status: "pending", approvedBy: null };

        // 🔸 Decide what type of claim we're making
        switch (type) {
            case "specialty":
                TargetModel = Specialty;
                LinkModel = Doctor_Specialty;
                linkData.doctorId = userId;
                linkData.specialtyId = targetId;
                break;

            case "subspecialty":
                TargetModel = Subspecialty;
                LinkModel = Doctor_Specialty;
                linkData.doctorId = userId;
                linkData.subspecialtyId = targetId;
                break;

            case "service":
                TargetModel = Service;
                LinkModel = Institute_Service;
                linkData.instituteId = userId;
                linkData.serviceID = targetId;
                break;

            default:
                return res.status(400).json({ message: "Invalid type" });
        }

        // 🔸 Make sure the target exists
        const targetExists = await TargetModel.findById(targetId);
        if (!targetExists) {
            return res.status(404).json({ message: `${type} not found` });
        }

        // 🔸 Prevent duplicate claim
        const existingLink = await LinkModel.findOne(
            type === "service"
                ? { instituteId: userId, serviceID: targetId }
                : type === "specialty"
                    ? { doctorId: userId, specialtyId: targetId }
                    : { doctorId: userId, subspecialtyId: targetId }
        );

        if (existingLink) {
            return res.status(400).json({ message: `You already claimed this ${type}` });
        }

        // 🔸 Create new pending claim
        const newClaim = await LinkModel.create(linkData);

        res.status(201).json({
            success: true,
            message: `Successfully claimed ${type}`,
            item: newClaim,
        });

    } catch (error) {
        console.error(`Error claiming ${type}:`, error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
export async function claimSpecialty(req, res) {
    return claimHelper(req, res, "specialty");
}
export async function claimSubspecialty(req, res) {
    return claimHelper(req, res, "subspecialty");
}
export async function claimService(req, res) {
    return claimHelper(req, res, "service");
}