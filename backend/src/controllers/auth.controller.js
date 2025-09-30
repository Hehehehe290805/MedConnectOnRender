import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { upsertStreamUser } from "../lib/stream.js";

export async function signup(req, res) {
  const { email, password, firstName, lastName } = req.body;

  try {
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists, please use a different one" });
    }

    const idx = Math.floor(Math.random() * 100) + 1; // generate a num between 1-100
    const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;

    const newUser = await User.create({
      email,
      password,
      firstName,
      lastName,
      profilePic: randomAvatar,
    });

    try {
      await upsertStreamUser({
        id: newUser._id.toString(),
        name: `${newUser.firstName} ${newUser.lastName}`, // use first + last
        image: newUser.profilePic || "",
      });
      console.log(`Stream user created for ${newUser.firstName} ${newUser.lastName}`);
    } catch (error) {
      console.log("Error creating Stream user:", error);
    }

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true, // prevent XSS attacks,
      sameSite: "strict", // prevent CSRF attacks
      secure: process.env.NODE_ENV === "production",
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    console.log("Error in signup controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect) return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true, // prevent XSS attacks,
      sameSite: "strict", // prevent CSRF attacks
      secure: process.env.NODE_ENV === "production",
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export function logout(req, res) {
  res.clearCookie("jwt");
  res.status(200).json({ success: true, message: "Logout successful" });
}

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

    if(!updatedUser) return res.status(404).json({ message: "User not found" });
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

// move to admin routes and controllers later
export async function getPendingUsers(req, res) {
  try {
    // Find users with status "pending"
    const pendingUsers = await User.find({ status: "pending" }).select(
      "_id firstName lastName profession birthDate licenseNumber facilityName"
    );

    // Only include non-null fields
    const formattedUsers = pendingUsers.map(user => {
      const userObj = { _id: user._id, firstName: user.firstName, lastName: user.lastName };

      if (user.profession) userObj.profession = user.profession;
      if (user.birthDate) userObj.birthDate = user.birthDate.toISOString().split("T")[0];
      if (user.licenseNumber) userObj.licenseNumber = user.licenseNumber;
      if (user.facilityName) userObj.facilityName = user.facilityName;

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

export async function approveDoctorOrInstituteOrPharmacist(req, res) {
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

    // Update the status to onBoardedProfessional
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { status: "onBoardedProfessional" },
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

export async function approveAdmin(req, res) {
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

    // Update the status to onBoardedProfessional
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { status: "onBoardedAdmin" },
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
// end - ask cymon advice

export async function getDoctors(req, res) {
  try {
    const doctors = await User.find({
      status: "onBoardedProfessional",
      profession: { $ne: "Pharmacist" },
      licenseNumber: { $exists: true, $ne: "" }
    }).select("firstName lastName profession birthDate");

    const formatted = doctors.map(user => ({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      profession: user.profession,
      birthDate: user.birthDate ? user.birthDate.toISOString().split("T")[0] : null,
    }));

    res.status(200).json({ success: true, users: formatted });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getPharmacies(req, res) {
  try {
    const pharmacies = await User.find({
      status: "onBoardedProfessional",
      profession: "Pharmacist"
    }).select("firstName lastName profession birthDate facilityName");

    const formatted = pharmacies.map(user => ({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      profession: user.profession,
      birthDate: user.birthDate ? user.birthDate.toISOString().split("T")[0] : null,
      facilityName: user.facilityName,
    }));

    res.status(200).json({ success: true, users: formatted });
  } catch (error) {
    console.error("Error fetching pharmacies:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getInstitutes(req, res) {
  try {
    const institutes = await User.find({
      status: "onBoardedProfessional",
      facilityName: { $exists: true },
      licenseNumber: { $exists: false }
    }).select("firstName lastName profession birthDate facilityName");

    const formatted = institutes.map(user => ({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      profession: user.profession,
      birthDate: user.birthDate ? user.birthDate.toISOString().split("T")[0] : null,
      facilityName: user.facilityName,
    }));

    res.status(200).json({ success: true, users: formatted });
  } catch (error) {
    console.error("Error fetching institutes:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getAdmins(req, res) {
  try {
    const admins = await User.find({
      status: "onBoardedAdmin",
      adminCode: { $exists: true },
    }).select("firstName lastName birthDate");

    const formatted = admins.map(user => ({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      birthDate: user.birthDate ? user.birthDate.toISOString().split("T")[0] : null,
    }));

    res.status(200).json({ success: true, users: formatted });
  } catch (error) {
    console.error("Error fetching institutes:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

