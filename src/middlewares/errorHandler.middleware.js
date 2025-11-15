import { constant } from "../constants/response.constant.js";

export const errorHandler = (err, req, res, next) => {
  console.log("Error ❌: ", err.message);

  if (!err || typeof err !== "object") {
    err = new Error("Unknown error");
  }

  // Determine status code
  const statusCode = err.statusCode || res.statusCode || 500;

  // Initialize response properly (not null)
  const response = {
    success: false,
    status:
      err.status || (statusCode >= 400 && statusCode < 500 ? "failed" : "error"),
    message: err.message || "Internal Server Error",
  };

  // Add stack only in development mode
  // if (process.env.NODE_ENV === "development") {
  //   response.stack = err.stack;
  // }

  switch (statusCode) {
    case constant?.FORBIDDEN:
      response.message = err.message || "Forbidden!";
      break;
    case constant?.NOT_FOUND:
      response.message = err.message || "Not Found!";
      break;
    case constant?.UNAUTHORIZED:
      response.message = err.message || "Unauthorized!";
      break;
    case constant?.VALIDATION_ERROR:
      response.message = err.message || "Validation Failed!";
      break;
    case constant?.SERVER_ERROR:
      response.message = err.message || "Server Error!";
      break;
    default:
      break;
  }
  res.status(statusCode).json(response);
};