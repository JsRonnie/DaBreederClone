import React, { useEffect } from "react";
import ContactUs from "../components/ContactUs";
import "./ContactPage.css"; // warm dog-lover theme

export default function ContactPage() {
  useEffect(() => {
    document.title = "Contact Us 🐾 | DaBreeder";
  }, []);

  return (
    <div className="bg-white">
      <ContactUs />
    </div>
  );
}
