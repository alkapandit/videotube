import { Router } from "express";
import {
  uploadVideo,
  deleteVideo,
  editVideo,
  VideoVisibility,
  VideoLike,
  getCurrentUserVideos,
  getAllVideos,
  getVideoById,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Public routes
router.route("/").get(getAllVideos);

// Protected routes
router.route("/upload").post(
  verifyJWT,
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  uploadVideo
);

router.route("/my-uploads").get(verifyJWT, getCurrentUserVideos);
// Accept multipart/form-data for edit (no files expected) so req.body fields are parsed
router.route("/:videoId").patch(verifyJWT, upload.none(), editVideo);
router.route("/:videoId").get(verifyJWT, getVideoById);
router.route("/:videoId").delete(verifyJWT, deleteVideo);
router.route("/publish/:videoId").patch(verifyJWT, VideoVisibility);
router.route("/like/:videoId").post(verifyJWT, VideoLike);

export default router;
