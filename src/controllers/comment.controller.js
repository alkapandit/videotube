import { asyncHandler } from "../utils/asyncHandler.util.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/apiError.util.js";
import { ApiResponse } from "../utils/apiResponse.util.js";

const getComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const isExisted = await Comment.find(videoId);

    if (!isExisted) {
        throw new ApiError(404, "Video not found!");
    }

    return res.status(200).json(new ApiResponse(200, isExisted, 'Comments fetched successfully'))
})