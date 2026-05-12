export const ApiResponseStatus = {
  SUCCESS: "success",
  FAILURE: "failure",
  UNAUTHORIZED: "unauthorized",
  CONFLICT: "conflict",
  NOT_FOUND: "not_found",
  BAD_REQUEST: "bad_request",
};
export const ApiResponseStatusToCodesMap = {
  [ApiResponseStatus.SUCCESS]: 200,
  [ApiResponseStatus.FAILURE]: 500,
  [ApiResponseStatus.UNAUTHORIZED]: 403,
  [ApiResponseStatus.CONFLICT]: 409,
  [ApiResponseStatus.NOT_FOUND]: 404,
  [ApiResponseStatus.BAD_REQUEST]: 400,
};
