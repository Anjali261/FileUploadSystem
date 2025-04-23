import React, { useEffect, useState } from "react";
import axios from "axios";

export default function DownloadComponent() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:4000/list-files");
      setFiles(res.data.files); 
    } catch (err) {
      console.error("Error fetching files:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileName) => {
    try {
      const res = await axios.get("http://localhost:4000/generate-download-url", {
        params: { fileName },
      });
      const downloadUrl = res.data.url;

      // Trigger download
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error getting download URL:", err);
      alert("Failed to get download URL.");
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Uploaded Files</h2>

      {loading && <p>Loading files...</p>}
      {!loading && files.length === 0 && <p>No files found.</p>}
      {!loading &&
  files.map((file, idx) => (
    <div key={idx} className="relative mb-4 p-4 border rounded overflow-hidden">
  

      {/* Foreground content */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="truncate w-2/3">{file.key}</span>
        <button
          onClick={() => handleDownload(file.key)}
          className="bg-green-600 text-white px-3 py-1 rounded text-sm"
        >
          Download
        </button>
      </div>
    </div>
  ))}

    </div>
  );
}
