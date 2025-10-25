import { axiosInstance } from "./axios.js";

export const signup = async (signupData) => {
  const response = await axiosInstance.post("/auth/signup", signupData);
  return response.data;
};

export const login = async (loginData) => {
  const response = await axiosInstance.post("/auth/login", loginData);
  return response.data;
};
export const logout = async () => {
  const response = await axiosInstance.post("/auth/logout");
  return response.data;
};

// export const getAuthUser = async () => {
//   const res = await axiosInstance.get("/auth/me");
//   return res.data;
// };

export const getAuthUser = async () => {
  try {
    const res = await axiosInstance.get("/auth/me");
    return res.data;
  } catch (error) {
    return null;
  }
};


// USER ONBOARDING
export const completeOnboarding = async (userData) => {
  switch (userData.role) {
    case ("user"):
      const response = await axiosInstance.post("/onboarding/onboarding", userData);
      return response.data;
  }
};

export async function getUserFriends() {
  const response = await axiosInstance.get("/users/friends");
  return response.data;
}

export async function getRecommendedUsers() {
  const response = await axiosInstance.get("/users");
  return response.data;
}

export async function getOutgoingFriendReqs() {
  const response = await axiosInstance.get("/users/outgoing-friend-requests");
  return response.data;
}

export async function sendFriendRequest(userId) {
  const response = await axiosInstance.post(`/users/friend-request/${userId}`);
  return response.data;
}

export async function getFriendRequests() {
  const response = await axiosInstance.get("/users/friend-requests");
  return response.data;
}

export async function acceptFriendRequest(requestId) {
  const response = await axiosInstance.put(`/users/friend-request/${requestId}/accept`);
  return response.data;
}

export async function getStreamToken() {
  const response = await axiosInstance.get("/chat/token");
  return response.data;
}

export const uploadGCashQR = async (formData) => {
  try {

    const response = await fetch('http://localhost:5001/api/gcash-setup/gcash/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });


    // Get the response as text first to see what we're getting
    const responseText = await response.text();

    if (!response.ok) {
      // If it's HTML, the route doesn't exist
      if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
        throw new Error('API route not found. Check backend route configuration.');
      }

      // Try to parse as JSON for structured errors
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || `Upload failed: ${response.status}`);
      } catch (e) {
        throw new Error(`Server error: ${response.status} - ${responseText}`);
      }
    }

    // Parse successful JSON response
    try {
      return JSON.parse(responseText);
    } catch (e) {
      throw new Error('Server returned invalid JSON response');
    }

  } catch (error) {
    console.error('GCash upload error:', error);
    throw error;
  }
};