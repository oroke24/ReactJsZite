import { useState } from "react";
import ProductManager from "../components/ProductManager";

export default function Dashboard() {
  const [businessId, setBusinessId] = useState("7xrGzWCVB3t1Fh85XxT3");

  return (
    <div>
      <h1 className="text-2xl mb-4">Dashboard</h1>
      <ProductManager businessId={businessId} />
    </div>
  );
}
