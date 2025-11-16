import { asyncHandler } from "../utils/asyncHandler.util.js";
import { ApiError } from "../utils/ApiError.util.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.util.js";
import mongoose, { isValidObjectId } from "mongoose";

// Upload a new video
const uploadVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video file is required");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile) {
    throw new ApiError(400, "Video file upload failed");
  }

  if (!thumbnail) {
    throw new ApiError(400, "Thumbnail upload failed");
  }

  const video = await Video.create({
    title,
    description,
    duration: videoFile.duration,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    owner: req.user?._id,
  });

  const uploadedVideo = await Video.findById(video._id).populate(
    "owner",
    "username fullName avatar"
  );

  if (!uploadedVideo) {
    throw new ApiError(500, "Video upload failed, please try again");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, uploadedVideo, "Video uploaded successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only delete your own videos");
  }

  // Delete from cloudinary
  const videoPublicId = video.videoFile.split("/").pop().split(".")[0];
  const thumbnailPublicId = video.thumbnail.split("/").pop().split(".")[0];

  await deleteFromCloudinary(videoPublicId, "video");
  await deleteFromCloudinary(thumbnailPublicId, "image");

  await Video.findByIdAndDelete(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

// Edit video title and description (only by owner)
const editVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only edit your own videos");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title: title || video.title,
        description: description || video.description,
      },
    },
    { new: true }
  ).populate("owner", "username fullName avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

// Hide/Show video (only by owner)
const VideoVisibility = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only modify your own videos");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    { new: true }
  ).populate("owner", "username fullName avatar");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideo,
        `Video ${updatedVideo.isPublished ? "published" : "hidden"} successfully`
      )
    );
});

// Like/Unlike a video
const VideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (
    !video.isPublished &&
    video.owner.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(404, "Video not found");
  }

  const like = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });

  if (like) {
    await Like.findByIdAndDelete(like._id);
    return res
      .status(200)
      .json(
        new ApiResponse(200, { isLiked: false }, "Video unliked successfully")
      );
  } else {
    await Like.create({
      video: videoId,
      likedBy: req.user._id,
    });
    return res
      .status(200)
      .json(
        new ApiResponse(200, { isLiked: true }, "Video liked successfully")
      );
  }
});

// Get current user's all videos
const getCurrentUserVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $sort: {
        [sortBy]: sortType === "desc" ? -1 : 1,
      },
    },
    {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  const totalVideos = await Video.countDocuments({ owner: req.user._id });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        totalVideos,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalVideos / parseInt(limit)),
      },
      "User videos fetched successfully"
    )
  );
});

// Get all published videos with pagination
const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const pipeline = [];

  // Match published videos
  const matchStage = { isPublished: true };

  if (userId && isValidObjectId(userId)) {
    matchStage.owner = new mongoose.Types.ObjectId(userId);
  }

  if (query) {
    matchStage.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  pipeline.push({ $match: matchStage });

  // Lookup owner details
  pipeline.push({
    $lookup: {
      from: "users",
      localField: "owner",
      foreignField: "_id",
      as: "owner",
      pipeline: [
        {
          $project: {
            username: 1,
            fullName: 1,
            avatar: 1,
          },
        },
      ],
    },
  });

  pipeline.push({
    $addFields: {
      owner: { $first: "$owner" },
    },
  });

  // Sort
  pipeline.push({
    $sort: {
      [sortBy]: sortType === "desc" ? -1 : 1,
    },
  });

  // Pagination
  pipeline.push({ $skip: (parseInt(page) - 1) * parseInt(limit) });
  pipeline.push({ $limit: parseInt(limit) });

  const videos = await Video.aggregate(pipeline);

  const totalVideos = await Video.countDocuments(matchStage);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        totalVideos,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalVideos / parseInt(limit)),
      },
      "Videos fetched successfully"
    )
  );
});

// Get video by ID
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: { $first: "$owner" },
      },
    },
  ]);

  if (!video.length) {
    throw new ApiError(404, "Video not found");
  }

  const videoData = video[0];

  // Check if video is published or if user is the owner
  if (
    !videoData.isPublished &&
    videoData.owner._id.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(404, "Video not found");
  }

  // Increment views if video is published
  if (videoData.isPublished) {
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    videoData.views += 1;
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videoData, "Video fetched successfully"));
});

export {
  uploadVideo,
  deleteVideo,
  editVideo,
  VideoVisibility,
  VideoLike,
  getCurrentUserVideos,
  getAllVideos,
  getVideoById,
};
