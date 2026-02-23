"use client";

/**
 * Admin Donations Management Page
 * 
 * This page allows admins with 'manage_donations' permission to:
 * - View all donation campaigns
 * - Create new donation campaigns
 * - Edit existing campaigns
 * - View point donations and GCash donations
 * - Verify/approve GCash donations
 * 
 * Access: Super Admin, SA Admin, Finance Admin
 */

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Target,
  Calendar,
  TrendingUp,
  Eye,
  DollarSign,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DonationCampaign } from "@/types";

export default function AdminDonationsPage() {
  const { data: session } = useSession();
  
  // State for campaigns list
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "ended">("all");
  
  // State for modal
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<DonationCampaign | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    goal_amount: 1000,
    image_url: "",
    ends_at: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // State for viewing donations
  const [viewingCampaign, setViewingCampaign] = useState<DonationCampaign | null>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);

  /**
   * Fetch campaigns from API
   */
  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all campaigns including inactive ones for admin
      const response = await fetch("/api/admin/donations");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch campaigns");
      }
      
      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  /**
   * Filter campaigns based on search and filters
   */
  const filteredCampaigns = campaigns.filter((campaign) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !campaign.title.toLowerCase().includes(query) &&
        !campaign.description?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    
    // Status filter
    const now = new Date();
    const hasEnded = campaign.ends_at && new Date(campaign.ends_at) < now;
    
    if (filterActive === "active" && (hasEnded || !campaign.is_active)) {
      return false;
    }
    if (filterActive === "ended" && !hasEnded) {
      return false;
    }
    
    return true;
  });

  /**
   * Open modal for creating new campaign
   */
  const handleCreate = () => {
    setEditingCampaign(null);
    setFormData({
      title: "",
      description: "",
      goal_amount: 1000,
      image_url: "",
      ends_at: "",
      is_active: true,
    });
    setShowModal(true);
  };

  /**
   * Open modal for editing existing campaign
   */
  const handleEdit = (campaign: DonationCampaign) => {
    setEditingCampaign(campaign);
    setFormData({
      title: campaign.title,
      description: campaign.description || "",
      goal_amount: campaign.goal_amount || 1000,
      image_url: campaign.image_url || "",
      ends_at: campaign.ends_at ? campaign.ends_at.split("T")[0] : "",
      is_active: campaign.is_active,
    });
    setShowModal(true);
  };

  /**
   * Save campaign (create or update)
   */
  const handleSave = async () => {
    try {
      setSaving(true);
      
      const url = editingCampaign 
        ? `/api/admin/donations/${editingCampaign.id}`
        : "/api/admin/donations";
      const method = editingCampaign ? "PUT" : "POST";
      
      const payload = {
        title: formData.title,
        description: formData.description || null,
        goal_amount: formData.goal_amount,
        image_url: formData.image_url || null,
        ends_at: formData.ends_at || null,
        is_active: formData.is_active,
      };
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to save campaign");
      }
      
      // Refresh list
      await fetchCampaigns();
      setShowModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Delete campaign
   */
  const handleDelete = async (campaign: DonationCampaign) => {
    if (!confirm(`Are you sure you want to delete "${campaign.title}"? This will also delete all associated donations.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/donations/${campaign.id}`, {
        method: "DELETE",
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete campaign");
      }
      
      // Refresh list
      await fetchCampaigns();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete campaign");
    }
  };

  /**
   * View donations for a campaign
   */
  const handleViewDonations = async (campaign: DonationCampaign) => {
    setViewingCampaign(campaign);
    setLoadingDonations(true);
    
    try {
      const response = await fetch(`/api/admin/donations/${campaign.id}/donations`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch donations");
      }
      
      setDonations(data.donations || []);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to fetch donations");
    } finally {
      setLoadingDonations(false);
    }
  };

  /**
   * Calculate progress percentage
   */
  const getProgress = (campaign: DonationCampaign) => {
    if (!campaign.goal_amount) return 0;
    return Math.min(100, (campaign.current_amount / campaign.goal_amount) * 100);
  };

  /**
   * Format date for display
   */
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "No end date";
    return new Date(dateStr).toLocaleDateString();
  };

  /**
   * Get status badge for campaign
   */
  const getStatusBadge = (campaign: DonationCampaign) => {
    const now = new Date();
    const hasEnded = campaign.ends_at && new Date(campaign.ends_at) < now;
    const goalReached = campaign.goal_amount && campaign.current_amount >= campaign.goal_amount;
    
    if (!campaign.is_active) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">Inactive</span>;
    }
    if (hasEnded) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Ended</span>;
    }
    if (goalReached) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">Goal Reached</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">Active</span>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
            <Heart className="w-7 h-7 text-pink-500" />
            Donation Campaigns
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage donation campaigns and view contributions
          </p>
        </div>
        
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Campaign
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value as "all" | "active" | "ended")}
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Campaigns</option>
          <option value="active">Active</option>
          <option value="ended">Ended</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        </div>
      )}

      {/* Campaigns Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign) => (
            <motion.div
              key={campaign.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`
                bg-white dark:bg-gray-800 rounded-xl border p-4
                ${campaign.is_active 
                  ? "border-gray-200 dark:border-gray-700" 
                  : "border-gray-200 dark:border-gray-700 opacity-60"
                }
              `}
            >
              {/* Image */}
              {campaign.image_url && (
                <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 overflow-hidden">
                  <img
                    src={campaign.image_url}
                    alt={campaign.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {/* Content */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{campaign.title}</h3>
                  {getStatusBadge(campaign)}
                </div>
                
                {campaign.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {campaign.description}
                  </p>
                )}
                
                {/* Progress Bar */}
                {campaign.goal_amount && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {campaign.current_amount.toLocaleString()} / {campaign.goal_amount.toLocaleString()} pts
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-red-500 rounded-full transition-all"
                        style={{ width: `${getProgress(campaign)}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Meta Info */}
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(campaign.ends_at)}</span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDonations(campaign)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(campaign)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(campaign)}
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
          
          {filteredCampaigns.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No campaigns found
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !saving && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingCampaign ? "Edit Campaign" : "Create Campaign"}
                </h2>
                <button
                  onClick={() => !saving && setShowModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  disabled={saving}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Title *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Campaign title"
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Campaign description"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    rows={3}
                  />
                </div>
                
                {/* Goal Amount */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Goal Amount (points)</label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.goal_amount}
                    onChange={(e) => setFormData({ ...formData, goal_amount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                {/* Image URL */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Image URL</label>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                
                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">End Date</label>
                  <Input
                    type="date"
                    value={formData.ends_at}
                    onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                  />
                </div>
                
                {/* Active Toggle */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Active (visible to users)
                  </label>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.title}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {editingCampaign ? "Save Changes" : "Create Campaign"}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Donations Modal */}
      <AnimatePresence>
        {viewingCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setViewingCampaign(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{viewingCampaign.title}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Donations received
                  </p>
                </div>
                <button
                  onClick={() => setViewingCampaign(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
                    <Coins className="w-5 h-5" />
                    <span className="text-sm">Point Donations</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    {((viewingCampaign as any).point_donations_total || 0).toLocaleString()} pts
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <DollarSign className="w-5 h-5" />
                    <span className="text-sm">GCash Donations</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    ₱{(viewingCampaign as any).gcash_total?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
              
              {/* Donations List */}
              {loadingDonations ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                </div>
              ) : donations.length > 0 ? (
                <div className="space-y-2">
                  {donations.map((donation: any) => (
                    <div
                      key={donation.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{donation.user?.name || donation.donor_name || "Anonymous"}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(donation.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${donation.type === 'gcash' ? 'text-green-600' : 'text-pink-600'}`}>
                          {donation.type === 'gcash' ? `₱${donation.amount}` : `${donation.point_amount} pts`}
                        </p>
                        <p className="text-xs text-gray-500">{donation.type === 'gcash' ? 'GCash' : 'Points'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No donations yet
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
