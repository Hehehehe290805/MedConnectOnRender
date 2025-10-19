import Doctor_Specialty from "../models/Doctor_Specialty.js";
import Institute_Service from "../models/Institute_Service.js";
import Specialty from "../models/Specialty.js";
import Subspecialty from "../models/Subspecialty.js";
import Service from "../models/Service.js";
import User from "../models/User.js";

// User Management
export async function getPendingUsers(req, res) {
  try {
    const pendingUsers = await User.find({ status: "pending" }).select(
      "_id firstName lastName profession birthDate licenseNumber facilityName adminCode role"
    );

    // Format users with role-specific information
    const formattedUsers = pendingUsers.map(user => {
      const userObj = {
        _id: user._id,
        role: user.role, // Include the requested role
        firstName: user.firstName,
        lastName: user.lastName
      };

      // Add role-specific fields
      switch (user.role) {
        case "doctor":
          if (user.profession) userObj.profession = user.profession;
          if (user.birthDate) userObj.birthDate = user.birthDate.toISOString().split("T")[0];
          if (user.licenseNumber) userObj.licenseNumber = user.licenseNumber;
          break;

        case "pharmacist":
          if (user.birthDate) userObj.birthDate = user.birthDate.toISOString().split("T")[0];
          if (user.licenseNumber) userObj.licenseNumber = user.licenseNumber;
          userObj.profession = "Pharmacist"; // Always show for pharmacists
          break;

        case "institute":
          if (user.facilityName) userObj.facilityName = user.facilityName;
          break;

        case "admin":
          if (user.adminCode) userObj.adminCode = user.adminCode;
          if (user.birthDate) userObj.birthDate = user.birthDate.toISOString().split("T")[0];
          break;
      }

      return userObj;
    });

    res.status(200).json({
      success: true,
      users: formattedUsers,
    });

  } catch (error) {
    console.error("Error fetching pending users:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
export async function getAdmins(req, res) {
  try {
    const admins = await User.find({
      status: "onBoarded",
      role: "admin",
    }).select("firstName lastName birthDate");

    const formatted = admins.map(user => ({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      birthDate: user.birthDate ? user.birthDate.toISOString().split("T")[0] : null,
    }));

    res.status(200).json({ success: true, users: formatted });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
export async function approveRole(req, res) {
  try {
    const { userId } = req.body; // the ObjectId of the user to approve

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Find the user first
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user is pending
    if (user.status !== "pending") {
      return res.status(400).json({
        message: `User is not pending approval (current status: ${user.status})`
      });
    }

    // Update the status to onBoarded
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { status: "onBoarded", approvedBy: req.user._id },
      { new: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: `${updatedUser.firstName} ${updatedUser.lastName} has been approved`,
      user: updatedUser,
    });

  } catch (error) {
    console.error("Error approving user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Specialty and Service Management
export async function getPendingSuggestions(req, res) {
  try {
    // Fetch pending specialties
    const pendingSpecialties = await Specialty.find({ status: "pending" }).select("_id name suggestedBy");
    const formattedSpecialties = pendingSpecialties.map(item => ({
      _id: item._id,
      name: item.name,
      type: "specialty",
      suggestedBy: item.suggestedBy
    }));

    // Fetch pending subspecialties
    const pendingSubspecialties = await Subspecialty.find({ status: "pending" }).select("_id name rootSpecialty suggestedBy");
    const formattedSubspecialties = pendingSubspecialties.map(item => ({
      _id: item._id,
      name: item.name,
      rootSpecialty: item.rootSpecialty,
      type: "subspecialty",
      suggestedBy: item.suggestedBy
    }));

    // Fetch pending services
    const pendingServices = await Service.find({ status: "pending" }).select("_id name suggestedBy");
    const formattedServices = pendingServices.map(item => ({
      _id: item._id,
      name: item.name,
      type: "service",
      suggestedBy: item.suggestedBy
    }));

    // Combine all
    const allPending = [
      ...formattedSpecialties,
      ...formattedSubspecialties,
      ...formattedServices
    ];

    res.status(200).json({ success: true, pendingSuggestions: allPending });
  } catch (error) {
    console.error("Error fetching pending suggestions:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
async function approveHelper(req, res, type) {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: "ID is required" });

    let Model;
    switch (type) {
      case "specialty": Model = Specialty; break;
      case "subspecialty": Model = Subspecialty; break;
      case "service": Model = Service; break;
      default: return res.status(400).json({ message: "Invalid type" });
    }

    const item = await Model.findById(id);
    if (!item) return res.status(404).json({ message: `${type} not found` });
    if (item.status === "verified") return res.status(400).json({ message: `${type} already verified` });

    // Add admin approval information with temporary ID
    item.status = "verified";
    item.approvedBy = req.user._id; 
    await item.save();

    return res.status(200).json({
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} approved successfully`,
      item
    });
  } catch (error) {
    console.error("Error approving item:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
export async function approveSpecialty(req, res) { return approveHelper(req, res, "specialty"); }
export async function approveSubspecialty(req, res) { return approveHelper(req, res, "subspecialty"); }
export async function approveService(req, res) { return approveHelper(req, res, "service"); }

export async function getPendingClaims(req, res) {
  try {
    // Specialty claims (no subspecialtyID)
    const specialtyClaims = await Doctor_Specialty.find({
      status: "pending",
      specialtyId: { $exists: true }
    })
      .populate("doctorId", "firstName lastName email")
      .populate("specialtyId", "name"); // NO durationMinutes for specialty

    // Subspecialty claims (has subspecialtyId)
    const subspecialtyClaims = await Doctor_Specialty.find({
      status: "pending",
      subspecialtyId: { $exists: true },
    })
      .populate("doctorId", "firstName lastName email")
      .populate("subspecialtyId", "name"); // NO durationMinutes for subspecialty

    // Service claims (institutes) - ONLY service has durationMinutes
    const serviceClaims = await Institute_Service.find({ status: "pending" })
      .populate("instituteId", "facilityName email")
      .populate("serviceId", "name durationMinutes"); // durationMinutes ONLY here

    res.status(200).json({
      success: true,
      claims: {
        specialties: specialtyClaims,
        subspecialties: subspecialtyClaims,
        services: serviceClaims,
      },
    });
  } catch (error) {
    console.error("Error fetching claims:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
function getClaimModel(type) {
  switch (type) {
    case "specialty":
    case "subspecialty":
      return Doctor_Specialty;
    case "service":
      return Institute_Service;
    default:
      return null;
  }
}

export async function approveClaim(req, res) {
  try {
    const { claimId, type } = req.body;
    const adminId = req.user._id;

    if (!claimId || !type) {
      return res.status(400).json({ message: "claimId and type are required" });
    }

    const Model = getClaimModel(type);
    if (!Model) {
      return res.status(400).json({ message: "Invalid claim type" });
    }

    const claim = await Model.findById(claimId);
    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    claim.status = "verified";
    claim.approvedBy = adminId;
    await claim.save();

    res.status(200).json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} claim approved successfully`,
      claim,
    });
  } catch (error) {
    console.error("Error approving claim:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

