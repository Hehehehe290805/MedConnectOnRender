import Doctor_Specialty from "../models/Doctor_Specialty.js";
import Institute_Service from "../models/Institute_Service.js";
import Service from "../models/Service.js";
import Specialty from "../models/Specialty.js";
import Subspecialty from "../models/Subspecialty.js";
import User from "../models/User.js";

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

export async function getServicesByProvider(req, res) {
    try {
        const { targetId, targetType } = req.body;

        if (!targetId || !targetType) {
            return res.status(400).json({
                success: false,
                message: "targetId and targetType are required"
            });
        }

        // Validate targetType
        const validTypes = ["doctor", "institute"];
        if (!validTypes.includes(targetType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid targetType. Must be 'doctor' or 'institute'"
            });
        }

        let Model;
        let filter = { status: "verified" };
        let populateFields = [];
        let format = (c) => c;

        switch (targetType) {
            case "doctor":
                Model = Doctor_Specialty;
                filter.doctorId = targetId;
                populateFields = [
                    { path: "specialtyId", select: "name" },
                    { path: "subspecialtyId", select: "name" }
                ];
                format = (c) => ({
                    claimId: c._id,
                    type: c.subspecialtyId ? "subspecialty" : "specialty",
                    name: c.subspecialtyId ? c.subspecialtyId.name : c.specialtyId.name
                });
                break;

            case "institute":
                Model = Institute_Service;
                filter.instituteId = targetId;
                populateFields = [
                    { path: "serviceId", select: "name" }
                ];
                format = (c) => ({
                    claimId: c._id,
                    type: "service",
                    name: c.serviceId?.name,
                    durationMinutes: c.durationMinutes
                });
                break;
        }

        let query = Model.find(filter);
        populateFields.forEach(f => query.populate(f));
        const results = await query.sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            items: results.map(format)
        });

    } catch (error) {
        console.error("Error fetching services:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

// Suggest Specialties
export async function suggest(req, res) {
    try {
        const userId = req.user._id;
        const { name, type, rootSpecialtyId } = req.body;

        // Required fields validation
        if (!name || !type) {
            const missing = [];
            if (!name) missing.push("name");
            if (!type) missing.push("type");
            return res.status(400).json({
                message: "Missing required fields",
                missingFields: missing
            });
        }

        // Validate type
        const validTypes = ["specialty", "subspecialty", "service"];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                message: "Invalid type",
                validTypes: validTypes
            });
        }

        // Additional validation for subspecialty
        if (type === "subspecialty" && !rootSpecialtyId) {
            return res.status(400).json({
                message: "Missing required fields",
                missingFields: ["rootSpecialtyId"]
            });
        }

        let Model;
        let extra = {};

        switch (type) {
            case "specialty":
                Model = Specialty;
                break;

            case "subspecialty":
                Model = Subspecialty;
                // Check if rootSpecialty exists and is verified
                const rootSpecialty = await Specialty.findById(rootSpecialtyId);
                if (!rootSpecialty) {
                    return res.status(404).json({ message: "Root specialty not found" });
                }
                if (rootSpecialty.status !== "verified") {
                    return res.status(400).json({ message: "Cannot add subspecialty to a pending or unverified root specialty" });
                }
                extra.rootSpecialty = rootSpecialtyId;
                break;

            case "service":
                Model = Service;
                break;
        }

        // Check for duplicates (case-insensitive)
        const exists = await Model.findOne({
            name: { $regex: `^${name}$`, $options: "i" },
            ...(type === "subspecialty" ? { rootSpecialty: rootSpecialtyId } : {})
        });

        if (exists) {
            return res.status(400).json({
                message: `${type} already exists or is pending approval`
            });
        }

        const newItem = new Model({
            name,
            status: "pending",
            suggestedBy: userId,
            ...extra
        });

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

// Claim Specialty or Subspecialty
export async function claim(req, res) {
    try {
        const userId = req.user._id;
        const { targetId, type, durationMinutes } = req.body;

        // Required fields validation
        if (!targetId || !type) {
            const missing = [];
            if (!targetId) missing.push("targetId");
            if (!type) missing.push("type");
            return res.status(400).json({
                message: "Missing required fields",
                missingFields: missing
            });
        }

        // Validate type
        const validTypes = ["specialty", "subspecialty", "service"];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                message: "Invalid type",
                validTypes: validTypes
            });
        }

        // Check user role and status
        const user = await User.findById(userId).select("role status");
        if (!user) return res.status(404).json({ message: "User not found" });

        let requiredRole, requiredStatus;
        switch (type) {
            case "specialty":
            case "subspecialty":
                requiredRole = "doctor";
                requiredStatus = "onBoarded";
                break;
            case "service":
                requiredRole = "institute";
                requiredStatus = "onBoarded";
                break;
        }

        if (user.role !== requiredRole) {
            return res.status(403).json({ message: `Only ${requiredRole}s can claim ${type}s` });
        }
        if (user.status !== requiredStatus) {
            return res.status(403).json({ message: `Your account must be ${requiredStatus} to claim ${type}s` });
        }

        let LinkModel;
        let TargetModel;
        const linkData = {
            status: "pending",
            approvedBy: null,
            claimType: type, // 🆕 ADD THIS FIELD to track claim type
        };

        // Add durationMinutes for service claims
        if (type === "service") {
            if (!durationMinutes) {
                return res.status(400).json({ message: "durationMinutes is required for service claims" });
            }
            linkData.durationMinutes = durationMinutes;
        }

        // Determine models and set appropriate fields
        switch (type) {
            case "specialty":
                TargetModel = Specialty;
                LinkModel = Doctor_Specialty;
                linkData.doctorId = userId;
                linkData.specialtyId = targetId;
                linkData.subspecialtyId = null;
                break;

            case "subspecialty":
                TargetModel = Subspecialty;
                LinkModel = Doctor_Specialty;
                linkData.doctorId = userId;
                linkData.specialtyId = null;
                linkData.subspecialtyId = targetId;
                break;

            case "service":
                TargetModel = Service;
                LinkModel = Institute_Service;
                linkData.instituteId = userId;
                linkData.serviceId = targetId;
                break;
        }

        // Make sure the target exists AND is verified
        const targetExists = await TargetModel.findById(targetId);
        if (!targetExists) {
            return res.status(404).json({ message: `${type} not found` });
        }
        if (targetExists.status !== "verified") {
            return res.status(400).json({ message: `Cannot claim ${type} that is not verified` });
        }

        // Prevent duplicate claim
        let existingLink;
        if (type === "service") {
            existingLink = await LinkModel.findOne({
                instituteId: userId,
                serviceId: targetId
            });
        } else {
            const query = { doctorId: userId };
            if (type === "specialty") {
                query.specialtyId = targetId;
            } else {
                query.subspecialtyId = targetId;
            }
            existingLink = await LinkModel.findOne(query);
        }

        if (existingLink) {
            return res.status(400).json({ message: `You already claimed this ${type}` });
        }

        // Create new pending claim
        const newClaim = await LinkModel.create(linkData);

        res.status(201).json({
            success: true,
            message: `Successfully claimed ${type}. Waiting for admin approval.`,
            item: newClaim,
        });

    } catch (error) {
        console.error(`Error claiming item:`, error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function autoClaimAppointmentService(req, res) {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId).select("role status approvedBy");
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.role !== "doctor") return res.status(403).json({ message: "Only doctors can auto-claim appointment service" });
        if (user.status !== "onBoarded") return res.status(403).json({ message: "Your account must be onBoarded to claim services" });

        let appointmentService = await Service.findOne({ name: "Appointment" });
        if (!appointmentService) {
            appointmentService = await Service.create({
                name: "Appointment",
                description: "Medical consultation appointment",
                status: "verified",
                category: "consultation",
                durationMinutes: 30
            });
        }

        const existingClaim = await Institute_Service.findOne({
            doctorId: userId,
            serviceId: appointmentService._id
        });

        if (existingClaim) {
            return res.status(200).json({
                success: true,
                message: "Appointment service already claimed",
                claim: existingClaim,
                service: appointmentService
            });
        }

        console.log("Creating auto-claim for doctor:", userId, "service:", appointmentService._id);

        const autoClaim = await Institute_Service.create({
            doctorId: userId,
            serviceId: appointmentService._id,
            status: "verified",
            approvedBy: user.approvedBy || null,
            claimType: "service",
            durationMinutes: 30
        });

        console.log("Created:", autoClaim);

        res.status(201).json({
            success: true,
            message: "Appointment service automatically claimed and verified",
            claim: autoClaim,
            service: appointmentService
        });

    } catch (error) {
        console.error("Error auto-claiming appointment service:", error.message, error);
        res.status(500).json({ message: error.message });
    }
}
