import React from "react";
import Modal from "./Modal";

export default function TermsModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} widthClass="max-w-4xl">
      <div className="relative">
        {/* Close button */}
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex items-center justify-center rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-6"
          >
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Terms and Policy</h2>

          <div className="prose prose-slate max-w-none text-sm">
            <section className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">1. Terms of Service</h3>
              <p className="text-slate-700 mb-3">
                Welcome to DaBreeder. By accessing and using our platform, you agree to comply with
                and be bound by the following terms and conditions.
              </p>
              <ul className="list-disc pl-5 text-slate-700 space-y-2">
                <li>You must be at least 18 years old to use this service</li>
                <li>You are responsible for maintaining the confidentiality of your account</li>
                <li>You agree to provide accurate and complete information about your dogs</li>
                <li>You will not use the platform for any illegal or unauthorized purpose</li>
              </ul>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                2. User Responsibilities
              </h3>
              <p className="text-slate-700 mb-3">As a user of DaBreeder, you agree to:</p>
              <ul className="list-disc pl-5 text-slate-700 space-y-2">
                <li>Ensure all information about your dogs is accurate and up-to-date</li>
                <li>Maintain proper health and vaccination records for your dogs</li>
                <li>Engage in responsible breeding practices</li>
                <li>Treat other users with respect and professionalism</li>
                <li>Comply with all local, state, and federal laws regarding dog breeding</li>
              </ul>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">3. Privacy Policy</h3>
              <p className="text-slate-700 mb-3">We are committed to protecting your privacy:</p>
              <ul className="list-disc pl-5 text-slate-700 space-y-2">
                <li>
                  <strong>Data Collection:</strong> We collect information you provide including
                  name, email, and dog profiles
                </li>
                <li>
                  <strong>Data Usage:</strong> Your information is used to facilitate matches and
                  enable communication between breeders
                </li>
                <li>
                  <strong>Data Sharing:</strong> We do not sell your personal information to third
                  parties
                </li>
                <li>
                  <strong>Data Security:</strong> We use industry-standard security measures to
                  protect your information
                </li>
                <li>
                  <strong>Cookies:</strong> We use cookies to enhance your experience and maintain
                  your session
                </li>
              </ul>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">4. Content and Conduct</h3>
              <p className="text-slate-700 mb-3">Users are prohibited from:</p>
              <ul className="list-disc pl-5 text-slate-700 space-y-2">
                <li>Posting false or misleading information about dogs</li>
                <li>Harassing, threatening, or abusing other users</li>
                <li>Using the platform for any commercial purpose without authorization</li>
                <li>
                  Attempting to gain unauthorized access to the platform or other users' accounts
                </li>
                <li>Uploading viruses or malicious code</li>
              </ul>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">5. Breeding Standards</h3>
              <p className="text-slate-700 mb-3">
                DaBreeder promotes responsible breeding practices:
              </p>
              <ul className="list-disc pl-5 text-slate-700 space-y-2">
                <li>Dogs should be of appropriate breeding age (typically 2-7 years)</li>
                <li>Health screenings and genetic testing are strongly encouraged</li>
                <li>Users should prioritize the health and welfare of dogs over profit</li>
                <li>Breeding should comply with breed standards and ethical guidelines</li>
              </ul>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                6. Limitation of Liability
              </h3>
              <p className="text-slate-700 mb-3">
                DaBreeder is a platform to connect breeders. We are not responsible for:
              </p>
              <ul className="list-disc pl-5 text-slate-700 space-y-2">
                <li>The accuracy of information provided by users</li>
                <li>The outcome of breeding arrangements made through the platform</li>
                <li>Any disputes between users</li>
                <li>Health issues or complications arising from breeding</li>
                <li>Financial transactions between users</li>
              </ul>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">7. Account Termination</h3>
              <p className="text-slate-700 mb-3">
                We reserve the right to suspend or terminate accounts that:
              </p>
              <ul className="list-disc pl-5 text-slate-700 space-y-2">
                <li>Violate these terms and conditions</li>
                <li>Engage in fraudulent or unethical behavior</li>
                <li>Repeatedly receive complaints from other users</li>
                <li>Remain inactive for extended periods</li>
              </ul>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">8. Changes to Terms</h3>
              <p className="text-slate-700">
                We may update these terms from time to time. Continued use of the platform after
                changes constitutes acceptance of the new terms. We will notify users of significant
                changes via email or platform notification.
              </p>
            </section>

            <section className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">9. Contact Information</h3>
              <p className="text-slate-700">
                If you have any questions about these terms or our privacy policy, please contact us
                through the platform's contact form or email us directly.
              </p>
            </section>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">Last updated: November 17, 2025</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
