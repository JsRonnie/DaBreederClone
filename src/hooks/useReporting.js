import { useState } from "react";
import supabase from "../lib/supabaseClient";

/**
 * Hook for submitting reports for dog profiles, chat messages, and forum threads
 */
export const useReporting = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  /**
   * Submit a report
   * @param {Object} reportData
   * @param {string} reportData.report_type - 'dog_profile', 'chat_message', or 'forum_thread'
   * @param {string} reportData.target_id - ID of what's being reported
   * @param {string} reportData.category - Category of violation
   * @param {string} reportData.reason - Reason for report
   * @param {string} reportData.description - Detailed description
   * @param {string[]} reportData.evidence_urls - Array of image URLs
   * @param {string} reportData.reporter_id - ID of person reporting
   * @returns {Promise<Object>} - Report data or error
   */
  const submitReport = async (reportData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate required fields
      if (!reportData.report_type || !reportData.target_id || !reportData.category) {
        throw new Error("Missing required fields");
      }

      // Insert into reports table
      const { data: reportRecord, error: reportError } = await supabase
        .from("reports")
        .insert({
          reporter_id: reportData.reporter_id,
          report_type: reportData.report_type,
          target_id: reportData.target_id,
          reason: reportData.reason || reportData.category,
          category: reportData.category,
          description: reportData.description,
          evidence_urls: reportData.evidence_urls || [],
          priority: reportData.priority || "normal",
        })
        .select();

      if (reportError) throw reportError;

      const reportId = reportRecord[0].id;

      // Insert type-specific data
      if (reportData.report_type === "dog_profile") {
        const { error: dogError } = await supabase.from("dog_profile_reports").insert({
          report_id: reportId,
          dog_id: reportData.target_id,
          dog_owner_id: reportData.dog_owner_id,
          dog_name: reportData.dog_name,
          dog_breed: reportData.dog_breed,
        });

        if (dogError) throw dogError;
      } else if (reportData.report_type === "chat_message") {
        const { error: chatError } = await supabase.from("chat_message_reports").insert({
          report_id: reportId,
          message_id: reportData.target_id,
          sender_id: reportData.sender_id,
          receiver_id: reportData.receiver_id,
          message_content: reportData.message_content,
        });

        if (chatError) throw chatError;
      } else if (reportData.report_type === "forum_thread") {
        const { error: forumError } = await supabase.from("forum_thread_reports").insert({
          report_id: reportId,
          thread_id: reportData.target_id,
          thread_author_id: reportData.thread_author_id,
          thread_title: reportData.thread_title,
          thread_content: reportData.thread_content,
        });

        if (forumError) throw forumError;
      }

      setSuccess(true);
      return { success: true, report_id: reportId };
    } catch (err) {
      console.error("Error submitting report:", err);
      setError(err.message || "Failed to submit report");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get reports for current user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of reports
   */
  const getUserReports = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("reporter_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching user reports:", err);
      setError(err.message);
      return [];
    }
  };

  /**
   * Get report details with related data
   * @param {string} reportId - Report ID
   * @returns {Promise<Object>} - Report with related data
   */
  const getReportDetails = async (reportId) => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (error) throw error;

      // Get type-specific data
      let typeData = {};
      if (data.report_type === "dog_profile") {
        const { data: dogData } = await supabase
          .from("dog_profile_reports")
          .select("*")
          .eq("report_id", reportId)
          .single();
        typeData = dogData;
      } else if (data.report_type === "chat_message") {
        const { data: chatData } = await supabase
          .from("chat_message_reports")
          .select("*")
          .eq("report_id", reportId)
          .single();
        typeData = chatData;
      } else if (data.report_type === "forum_thread") {
        const { data: forumData } = await supabase
          .from("forum_thread_reports")
          .select("*")
          .eq("report_id", reportId)
          .single();
        typeData = forumData;
      }

      return { ...data, type_data: typeData };
    } catch (err) {
      console.error("Error fetching report details:", err);
      setError(err.message);
      return null;
    }
  };

  /**
   * Check if user has already reported this item
   * @param {string} userId - User ID
   * @param {string} targetId - ID of item being reported
   * @param {string} reportType - Type of report
   * @returns {Promise<boolean>} - True if already reported
   */
  const hasUserReportedItem = async (userId, targetId, reportType) => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("id")
        .eq("reporter_id", userId)
        .eq("target_id", targetId)
        .eq("report_type", reportType)
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    } catch (err) {
      console.error("Error checking report status:", err);
      return false;
    }
  };

  return {
    submitReport,
    getUserReports,
    getReportDetails,
    hasUserReportedItem,
    loading,
    error,
    success,
  };
};
