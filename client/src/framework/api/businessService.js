// src/framework/api/businessService.js
import http from "../http";

export const businessService = {
  getAllBusinesses: async (page = 1, limit = 10) => {
    try {
      const response = await http.get(`/wb-accounts`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch businesses"
      );
    }
  },

  getSessionByWaId: async (phone_number, wa_id) => {
    try {
      const response = await http.get(`/${phone_number}/${wa_id}/session`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch businesses"
      );
    }
  },

  getAllTemplates: async (wba_id, page = 1, limit = 10) => {
    try {
      const response = await http.get(`/${wba_id}/templates`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch businesses"
      );
    }
  },

  getAllMessages: async (phone_number_id, page = 1, limit = 10) => {
    try {
      const response = await http.get(`/${phone_number_id}/messages`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch businesses"
      );
    }
  },

  getAllClients: async (phone_number_id, page = 1, limit = 10) => {
    try {
      const response = await http.get(`/${phone_number_id}/client`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch businesses"
      );
    }
  },

  getAllPhoneNumbers: async (wba_id, page = 1, limit = 10) => {
    try {
      const response = await http.get(`/${wba_id}/phone_numbers`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch businesses"
      );
    }
  },

  getAllProducts: async (catalog_id, page = 1, limit = 10) => {
    try {
      const response = await http.get(`/${catalog_id}/whatsapp_commerce_settings`, {
        params: { page, limit },
      });
      // Handle the response structure from your backend
      if (response.data && response.data.data) {
        return {
          data: response.data.data,
          paging: response.data.paging
        };
      }
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      console.error('Error response:', error.response);
      throw new Error(
        error.response?.data?.error || error.response?.data?.message || `Failed to fetch products: ${error.message}`
      );
    }
  },

  deleteBusiness: async (id) => {
    try {
      await http.delete(`/businesses/${id}`);
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to delete business"
      );
    }
  },

  updateBusinessStatus: async (id, status) => {
    try {
      const response = await http.patch(`/businesses/${id}`, {
        status,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to update status"
      );
    }
  },

  // Chat endpoints
  getChatMessages: async (phone_number_id, wa_id) => {
    try {
      const response = await http.get(`/${phone_number_id}/${wa_id}/messages`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch chat messages"
      );
    }
  },

  getChatInfo: async (phone_number_id, wa_id) => {
    try {
      const response = await http.get(`/${phone_number_id}/${wa_id}/info`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch chat info"
      );
    }
  },

  sendMessage: async (phone_number_id, wa_id, message, type = "text") => {
    try {
      const response = await http.post(
        `/${phone_number_id}/${wa_id}/send-message`,
        {
          message,
          type,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to send message"
      );
    }
  },

  deleteMessage: async (phone_number_id, wa_id, messageId) => {
    try {
      const response = await http.delete(
        `/${phone_number_id}/${wa_id}/messages/${messageId}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to delete message"
      );
    }
  },

  updateMessageStatus: async (phone_number_id, wa_id, messageId, status) => {
    try {
      const response = await http.patch(
        `/${phone_number_id}/${wa_id}/messages/${messageId}/status`,
        { status }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to update message status"
      );
    }
  },
};
