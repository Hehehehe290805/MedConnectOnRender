import User from "../models/User.js";

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
      { status: "onBoarded" },
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
    console.error("Error fetching institutes:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}