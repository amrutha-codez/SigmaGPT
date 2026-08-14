import express from "express";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();


// Get current user
router.get("/me", authMiddleware, async (req, res) => {
    try {

        const user = await User.findById(req.user.id).select("-password");

        res.json(user);

    } catch (err) {

        res.status(500).json({
            message: "Server Error"
        });

    }
});


// Update profile
router.put("/profile", authMiddleware, async (req, res) => {

    try {

        const { name, profileImage } = req.body;

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        user.name = name || user.name;
        user.profileImage = profileImage || user.profileImage;

        await user.save();

        res.json({
            message: "Profile updated successfully",
            user
        });

    } catch (err) {

        res.status(500).json({
            message: "Server Error"
        });

    }

});

export default router;