import React, { useEffect } from "react";
import AboutUs from "../components/AboutUs";
import "./AboutPage.css"; // warm dog-lover theme

export default function AboutPage() {
  useEffect(() => {
    document.title = "About Us 🐾 | DaBreeder";
  }, []);

  return (
    <div className="bg-white">
      <AboutUs />
    </div>
  );
}
