import { Router } from "express"
import { upload } from "../middlewares/multer.middleware.js"
import { deleteUser, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser, updateUser } from "../controllers/user.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
    )

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT,  logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/current").get(verifyJWT, getCurrentUser)
router.route("/update").patch(verifyJWT, updateUser)
router.route("/delete").patch(verifyJWT, deleteUser)

export default router;