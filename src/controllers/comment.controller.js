import { asyncHandler } from "../utils/asyncHandler.util.js";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/apiError.util.js";

const getComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

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

  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
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
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  const totalComments = await Comment.countDocuments({ video: videoId });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comments,
        totalComments,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalComments / parseInt(limit)),
      },
      "Comments fetched successfully"
    )
  );
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  if (!content?.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

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

  const comment = await Comment.create({
    content: content.trim(),
    video: videoId,
    owner: req.user._id,
  });

  const createdComment = await Comment.findById(comment._id).populate(
    "owner",
    "username fullName avatar"
  );

  return res
    .status(201)
    .json(new ApiResponse(201, createdComment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!content?.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only update your own comments");
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content: content.trim(),
      },
    },
    { new: true }
  ).populate("owner", "username fullName avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only delete your own comments");
  }

  await Comment.findByIdAndDelete(commentId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

const likeComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return res
      .status(200)
      .json(
        new ApiResponse(200, { isLiked: false }, "Comment unliked successfully")
      );
  } else {
    await Like.create({
      comment: commentId,
      likedBy: req.user._id,
    });
    return res
      .status(200)
      .json(
        new ApiResponse(200, { isLiked: true }, "Comment liked successfully")
      );
  }
});

export { addComment, getComments, updateComment, deleteComment, likeComment };
