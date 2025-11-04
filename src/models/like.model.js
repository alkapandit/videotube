import mongoose, { Schema } from "mongoose";

const likeShcema = new Schema({
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video",
    },
    comment: {
        type: Schema.Types.ObjectId,
        ref: "Comment",
    },
    tweet: {
        type: Schema.Types.ObjectId,
        ref: "Tweet",
    },
    likedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    }
}, {
    timestamps: true,
})

export const Like = mongoose.model("Like", likeShcema);