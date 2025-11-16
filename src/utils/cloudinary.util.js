import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

cloudinary.config({
  cloud_name: "dn6hl0v8u",
  api_key: "931329334417425",
  api_secret: "8hEaj7ivB5SHXWDEkeYV507pq2U",
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    console.log(
      "process.env.CLOUDINARY_CLOUD_NAME",
      process.env.CLOUDINARY_CLOUD_NAME
    );
    console.log(
      "process.env.CLOUDINARY_API_KEY",
      process.env.CLOUDINARY_API_KEY
    );
    console.log(
      "process.env.CLOUDINARY_API_SECRET",
      process.env.CLOUDINARY_API_SECRET
    );

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log("response", response);

    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    console.log("cloudinary error", error);
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    if (!publicId) return null;

    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    console.log("Delete response from cloudinary:", response);
    return response;
  } catch (error) {
    console.log("Cloudinary delete error:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
