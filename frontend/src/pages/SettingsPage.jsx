import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useAuthUser from "../hooks/useAuthUser.js";
import { Trash2Icon, AlertTriangleIcon, XIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import toast from "react-hot-toast";

const SettingsPage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showEmail, setShowEmail] = useState(false);

  // Function to mask email
  const maskEmail = (email) => {
    if (!email) return "Not provided";
    const [username, domain] = email.split("@");
    const maskedUsername = username.charAt(0) + "*".repeat(username.length - 1);
    return `${maskedUsername}@${domain}`;
  };

  // Delete account mutation
  const { mutate: deleteAccount, isPending } = useMutation({
    mutationFn: async () => {
      const response = await fetch("http://localhost:5001/api/auth/delete-me", {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete account");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Account deleted successfully");
      queryClient.clear(); // Clear all cached data
      
      // Force a full page reload to the login page
      setTimeout(() => {
        window.location.href = "/login"; // Hard redirect + reload
      }, 1000); // Small delay to show the success toast
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete account");
    },
  });

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
    setConfirmText("");
  };

  const handleConfirmDelete = () => {
    if (confirmText === "DELETE") {
      deleteAccount();
      setShowDeleteModal(false);
    } else {
      toast.error('Please type "DELETE" to confirm');
    }
  };

  return (
    <div className="min-h-screen bg-base-100 p-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-base-content opacity-70 mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Account Information Card */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Account Information</h2>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm opacity-70">Email</p>
                  <button
                    onClick={() => setShowEmail(!showEmail)}
                    className="btn btn-ghost btn-xs gap-1"
                  >
                    {showEmail ? (
                      <>
                        <EyeOffIcon className="w-4 h-4" />
                        Hide
                      </>
                    ) : (
                      <>
                        <EyeIcon className="w-4 h-4" />
                        Show
                      </>
                    )}
                  </button>
                </div>
                <p className="font-semibold">
                  {showEmail ? authUser?.email || "Not provided" : maskEmail(authUser?.email)}
                </p>
              </div>
              <div>
                <p className="text-sm opacity-70">Role</p>
                <p className="font-semibold capitalize">{authUser?.role || "User"}</p>
              </div>
              <div>
                <p className="text-sm opacity-70">Status</p>
                <p className="font-semibold capitalize">{authUser?.status || "Not onboarded"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone Card */}
        <div className="card bg-base-200 shadow-xl border-2 border-error">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-2 text-error">
              <AlertTriangleIcon className="w-6 h-6" />
              Danger Zone
            </h2>
            <p className="text-sm opacity-70 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            
            <button
              onClick={handleDeleteClick}
              className="btn btn-error gap-2"
              disabled={isPending}
            >
              <Trash2Icon className="w-5 h-5" />
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              disabled={isPending}
            >
              <XIcon className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-xl mb-4 text-error">
              Delete Account Permanently?
            </h3>

            <div className="alert alert-error mb-4">
              <AlertTriangleIcon className="w-5 h-5" />
              <span className="text-sm">
                This action cannot be undone. All your data will be permanently deleted.
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm mb-2">
                  Type <strong>DELETE</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Type DELETE"
                  autoFocus
                  disabled={isPending}
                />
              </div>

              <div className="modal-action">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn btn-ghost"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="btn btn-error"
                  disabled={isPending || confirmText !== "DELETE"}
                >
                  {isPending ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2Icon className="w-4 h-4" />
                      Delete Permanently
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => !isPending && setShowDeleteModal(false)}></div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
