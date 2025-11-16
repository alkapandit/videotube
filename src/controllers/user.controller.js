import { ApiError } from "../utils/apiError.util.js";
import { asyncHandler } from "../utils/asyncHandler.util.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.util.js";
import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/ApiResponse.util.js";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  if (!req?.body) {
    throw new ApiError(400, "Invalid request body");
  }
  const { fullname, email, username, password, phone } = req?.body;

  if (!fullname || !email || !username || !password || !phone) {
    throw new ApiError(400, "All fields are mandatory");
  }

  const isUserExisting = await User.findOne({ $or: [{ username }, { email }] });

  if (isUserExisting) {
    throw new ApiError(409, "User with email or username already exists");
  }

  let avatarLocalPath;
  if (
    req?.files?.avatar &&
    Array.isArray(req?.files?.avatar) &&
    req?.files?.avatar?.length > 0
  ) {
    avatarLocalPath = req?.files?.avatar[0]?.path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required!");
  }

  let coverImageLocalPath;
  if (
    req?.files &&
    Array.isArray(req?.files?.coverImage) &&
    req?.files?.coverImage?.length > 0
  ) {
    coverImageLocalPath = req?.files?.coverImage[0]?.path;
  }

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is required!");
  }

  console.log("avatarLocalPath", avatarLocalPath);
  console.log("coverImageLocalPath", coverImageLocalPath);

  const avatarImageUrl = await uploadOnCloudinary(avatarLocalPath);
  const coverImageUrl = await uploadOnCloudinary(coverImageLocalPath);

  console.log("avatarImageUrl", avatarImageUrl);
  console.log("coverImageUrl", coverImageUrl);

  const user = await User.create({
    fullname,
    email,
    password,
    phone,
    username: username?.toLowerCase(),
    avatar: avatarImageUrl?.url,
    coverImage: coverImageUrl?.url,
  });

  const createdUser = await User.findById(user?._id).select(
    "-password -refreshtoken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: false,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: false,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(400, "User ID is missing from request");
  }

  const user = await User.findById(userId).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User details fetched successfully"));
});

const getAllUser = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password -refreshToken");

  if (!users || users.length === 0) {
    throw new ApiError(404, "No users found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, users, "User details fetched successfully"));
});

const updateUser = asyncHandler(async (req, res) => {
  const userId = req.params.id; // User ID from URL
  const { fullname, username, phone, email } = req.body;
  console.log("req.body----", req.body);

  if (!fullname || !username || !phone || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        fullname,
        username,
        phone,
        email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "User updated successfully"));
});

const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.params.id; // get user id from URL

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  const deletedUser = await User.findByIdAndDelete(userId);

  if (!deletedUser) {
    throw new ApiError(404, "User not found or already deleted");
  }
  const options = {
    httpOnly: true,
    secure: false,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User account deleted successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const user = await User.findById(decodedToken?._id);

  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }

  if (incomingRefreshToken !== user?.refreshToken) {
    throw new ApiError(401, "Refresh token is expired or used");
  }

  const { accessToken, newRefreshToken } =
    await generateAccessAndRefereshTokens(user._id);

  return res
    .status(200)
    .cookie("accessToken", accessToken)
    .cookie("refreshToken", newRefreshToken)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        "Access token refreshed"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  getAllUser,
  updateUser,
  deleteUser,
  refreshAccessToken,
};
