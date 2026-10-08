// @ts-nocheck
// Improved error handling - parse actual backend errors instead of generic "connection error"
export const safeJsonParse = async (response) => {
  try {
    const data = await response.json();
    return data;
  } catch (parseError) {
    // If JSON parsing fails, check if it's an HTML error page or network issue
    try {
      const text = await response.text();
      // Do NOT log raw response text — may contain sensitive user data (App Store 5.1.1)

      // Return a more helpful error message based on the content
      if (text.includes("<html>") || text.includes("<!DOCTYPE")) {
        throw new Error("Server error occurred. Please try again later.");
      } else if (text.includes("Failed to fetch")) {
        throw new Error(
          "Network error. Please check your connection and try again.",
        );
      } else if (text.trim() === "") {
        throw new Error("Empty response from server. Please try again.");
      } else {
        throw new Error(
          "Invalid response format from server. Please try again.",
        );
      }
    } catch (textError) {
      // If we can't even read the response text
      throw new Error(
        "Connection failed. Please check your network and try again.",
      );
    }
  }
};
