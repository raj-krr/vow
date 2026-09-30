import React, { useState, useEffect, useRef } from "react";
import { createWorkspace } from "../../api/workspaceApi";
import { useDispatch } from "react-redux";
import { setWorkspaceContext } from "../userslice";
import Toast from "../common/Toast";

const CreateWorkspaceModal = ({ isOpen, onClose, onWorkspaceCreated }) => {
  const [workspaceName, setWorkspaceName] = useState("");
  const [emails, setEmails] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, type: "info", message: "" });
  const dispatch = useDispatch();

  const modalRef = useRef(null);

  // Scroll to center when modal opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const modalRect = modalRef.current.getBoundingClientRect();
      const scrollTop =
        window.scrollY +
        modalRect.top -
        (window.innerHeight - modalRect.height) / 2;
      window.scrollTo({
        top: Math.max(scrollTop, 0),
        behavior: "smooth",
      });
    }
  }, [isOpen]);

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) {
      setToast({ show: true, type: "error", message: "Please enter a workspace name" });
      return;
    }

    const inviteEmails = emails
      .split(/[\n,;\s]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    const invalid = inviteEmails.filter((e) => !isEmail(e));

    if (invalid.length) {
      setToast({
        show: true,
        type: "error",
        message: `Invalid email(s): ${invalid.slice(0, 3).join(", ")}${invalid.length > 3 ? "…" : ""}`,
      });
      return;
    }

    try {
      setLoading(true);
      const response = await createWorkspace({ workspaceName, inviteEmails });
      const { workspace } = response.data;
      const wsId = workspace._id || workspace.id;
      const wsInviteCode = workspace.inviteCode;
      const managerId = workspace.manager || workspace.managerId || workspace.ownerId || null;
      localStorage.setItem("workspaceId", wsId);
      localStorage.setItem("inviteCode", wsInviteCode);
      const wsToken = response.data?.workspaceToken;
      if (wsToken) {
        localStorage.setItem(`workspaceToken_${wsId}`, wsToken);
      }
      dispatch(setWorkspaceContext({ workspaceId: wsId, workspaceToken: wsToken || null, workspaceName, workspaceManagerId: managerId }));
      setToast({ show: true, type: "success", message: `Workspace created. Invites: ${inviteEmails.length}. Code: ${wsInviteCode}` });

      // Notify parent component to refresh workspace list
      if (typeof onWorkspaceCreated === "function") {
        onWorkspaceCreated({ workspace });
      }

      setTimeout(() => handleClose(), 1500);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Workspace creation failed.";
      setToast({ show: true, type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setWorkspaceName("");
    setEmails("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0  backdrop-blur-sm z-50 flex justify-center items-center p-4 overflow-y-auto">
        {/* Modal */}
        <div
          ref={modalRef}
          className="relative w-full max-w-[772px] sm:w-[90%] md:w-[80%] lg:w-[772px] mx-auto my-8 rounded-2xl overflow-hidden"
          style={{
            background: "#EFE7F6",
            boxShadow:
              "0 0 8px 0 rgba(17,17,26,0.10), 0 1px 0 0 rgba(17,17,26,0.05), 0 -23px 25px 0 rgba(191,162,225,0.17) inset, 0 -36px 30px 0 rgba(204,180,227,0.15) inset, 0 -79px 40px 0 rgba(204,180,227,0.10) inset, 0 2px 1px 0 rgba(204,180,227,0.06), 0 4px 2px 0 rgba(204,180,227,0.09), 0 8px 4px 0 rgba(204,180,227,0.09), 0 16px 8px 0 rgba(204,180,227,0.09), 0 32px 16px 0 rgba(204,180,227,0.09)",
          }}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            aria-label="Close"
            className="absolute top-3 right-4 text-black font-bold text-3xl hover:scale-110 transition"
          >
            ×
          </button>

          <div className="p-6 sm:p-8">
            <h2 className="text-[24px] sm:text-[30px] md:text-[36px] font-bold text-center mb-6 sm:mb-8 text-black">
              Create a New Workspace
            </h2>

            {/* Workspace Name */}
            <div className="mb-6">
              <label className="block text-[18px] sm:text-[22px] font-medium mb-2 text-black">
                Workspace Name
              </label>
              <input
                type="text"
                value={workspaceName}
                maxLength={20}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. Design Studio, Growth Team, Marketing Hub"
                className="border border-[#BFA2E1] rounded-lg px-4 py-3 w-full focus:outline-none focus:border-[#5E9BFF] focus:ring-2 focus:ring-[#5E9BFF]/20 text-[#585858] bg-[#EFE7F6] text-base"
              />
              <p className="text-sm text-gray-500 mt-1">
                {workspaceName.length}/20 characters
              </p>
            </div>

            {/* Invite Members */}
            <div className="mb-6">
              <label className="block text-[18px] sm:text-[22px] font-medium mb-2 text-black">
                Invite Members (optional)
              </label>
              <textarea
                value={emails}
                onChange={(e) => {
                  setEmails(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 192)}px`;
                }}
                placeholder="Enter email addresses separated by commas, spaces or new lines"
                className="border border-[#BFA2E1] rounded-lg px-4 py-3 w-full resize-none overflow-auto hide-scrollbar focus:outline-none focus:border-[#5E9BFF] focus:ring-2 focus:ring-[#5E9BFF]/20 text-[#585858] bg-[#EFE7F6]"
                style={{
                  minHeight: "80px",
                  maxHeight: "192px",
                }}
              />
              <p className="mt-2 text-xs text-[#707070]">
                Invites will be sent immediately when the workspace is created.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-8">
              <button
                onClick={handleClose}
                className="rounded-lg border border-[#CCB4E3] text-[#450B7B] font-medium w-full sm:w-[200px] h-11 bg-white text-[18px] hover:bg-[#f6f1fa] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={loading}
                className="rounded-lg bg-[#5E9BFF] text-white font-medium text-[18px] w-full sm:w-[200px] h-11 disabled:opacity-70 hover:bg-[#4c85e5] transition"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Toast show={toast.show} type={toast.type} message={toast.message} />
    </>
  );
};

export default CreateWorkspaceModal;
