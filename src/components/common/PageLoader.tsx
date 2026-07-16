"use client";

import { useState, useEffect } from "react";
import LogoLoader from "./LogoLoader";

export default function PageLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className={`page-loader-overlay ${loaded ? "loaded" : ""}`}>
        <LogoLoader />
      </div>
      {children}
    </>
  );
}
