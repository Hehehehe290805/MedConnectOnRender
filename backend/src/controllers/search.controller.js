import User from "../models/User.js";
import Doctor_Specialty from "../models/Doctor_Specialty.js";
import mongoose from "mongoose";

export async function searchDoctors(req, res) {
    try {
        const { type, query } = req.body; // "type" can be name, specialty, subspecialty

        if (!type || !query) {
            return res.status(400).json({ message: "Missing search type or query" });
        }

        let subspecialtyDoctorIds = [];
        let specialtyDoctorIds = [];
        let nameDoctorIds = [];

        // 1️⃣ Search by subspecialty
        if (type === "subspecialty" && mongoose.Types.ObjectId.isValid(query)) {
            const subDocs = await Doctor_Specialty.find({
                subspecialtyId: query,
                status: "verified",
            });

            subspecialtyDoctorIds = subDocs.map(d => d.doctorId.toString());
        }

        // 2️⃣ Search by specialty
        if (type === "specialty" && mongoose.Types.ObjectId.isValid(query)) {
            const specDocs = await Doctor_Specialty.find({
                specialtyId: query,
                status: "verified",
                doctorId: { $nin: subspecialtyDoctorIds },
            });

            specialtyDoctorIds = specDocs.map(d => d.doctorId.toString());
        }

        // 3️⃣ Search by name (partial, case-insensitive)
        if (type === "name") {
            const regex = new RegExp(query.trim(), "i");
            const nameDocs = await User.find({
                role: "doctor",
                $or: [{ firstName: regex }, { lastName: regex }]
            }).select("_id");

            nameDoctorIds = nameDocs.map(d => d._id.toString());
        }

        // 4️⃣ Merge all doctor IDs in order: subspecialty → specialty → name
        const allDoctorIds = [...subspecialtyDoctorIds, ...specialtyDoctorIds, ...nameDoctorIds];

        // 5️⃣ Fetch doctor details
        const doctors = await User.find({ _id: { $in: allDoctorIds } })
            .select("firstName lastName profilePic profession")
            .lean();

        // 6️⃣ Attach specialties/subspecialties
        const doctorSpecialties = await Doctor_Specialty.find({
            doctorId: { $in: allDoctorIds },
            status: "verified",
        })
            .populate("specialtyId", "name")
            .populate("subspecialtyId", "name")
            .lean();

        const doctorsWithSpecialties = doctors.map(doctor => {
            const specs = doctorSpecialties.filter(ds => ds.doctorId.toString() === doctor._id.toString());

            return {
                ...doctor,
                specialties: specs.map(s => s.specialtyId?.name).filter(Boolean),
                subspecialties: specs.map(s => s.subspecialtyId?.name).filter(Boolean),
            };
        });

        // 7️⃣ Order doctors according to allDoctorIds
        const doctorsOrdered = allDoctorIds.map(id =>
            doctorsWithSpecialties.find(d => d._id.toString() === id)
        );

        res.status(200).json({
            success: true,
            doctors: doctorsOrdered
        });

    } catch (error) {
        console.error("Error searching doctors:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function getDoctorDetails(req, res) {
    try {
        const { doctorId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(doctorId)) {
            return res.status(400).json({ message: "Invalid doctor ID" });
        }
        const doctor = await User.findById(doctorId)
            .populate("specialties", "name")
            .populate("subspecialties", "name")
            .select("-password");

        if (!doctor) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            success: true,
            doctor
        });

    } catch (error) {
        console.error("Error fetching doctor details:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}