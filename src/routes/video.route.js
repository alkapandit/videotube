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
router.route("/:videoId").get(verifyJWT, getVideoById);

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
router.route("/:videoId").delete(verifyJWT, deleteVideo);
router.route("/:videoId").patch(verifyJWT, editVideo);
router.route("/publish/:videoId").patch(verifyJWT, VideoVisibility);
router.route("/like/:videoId").post(verifyJWT, VideoLike);

export default router;
