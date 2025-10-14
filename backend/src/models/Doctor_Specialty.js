import mongoose from "mongoose";

const Doctor_SpecialtySchema = new mongoose.Schema(
    {
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        specialtyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Specialty",
        },
        subspecialtyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subspecialty",
        },
        status: {
            type: String,
            enum: ["pending", "verified"],
            default: "pending",
        },
        approvedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
        },
    },
    { timestamps: true }
);

const Doctor_Specialty = mongoose.model("Doctor_Specialty", Doctor_SpecialtySchema);

export default Doctor_Specialty;
