

import React, { useState, useRef } from "react";
import axios from "axios";

const FileUploader = () => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [interrupted, setInterrupted] = useState(false);
  const uploadStateRef = useRef({}); 

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setUploadedCount(0);
    setProgress(0);
    setInterrupted(false);
    uploadStateRef.current = {};
  };

  const uploadFile = async (file, index) => {
    if (file.size < 10_000_000) {
      const res = await axios.post("http://localhost:4000/generate-single-presigned-url", {
        fileName: file.name,
      });

      await axios.put(res.data.url, file, {
        headers: { "Content-Type": file.type },
        onUploadProgress: (event) => {
          const percent = Math.round((event.loaded * 100) / event.total);
          setProgress(Math.round(((index + percent / 100) / files.length) * 100));
        },
      });
    } else {
      const startRes = await axios.post("http://localhost:4000/start-multipart-upload", {
        fileName: file.name,
        contentType: file.type,
      });

      const { uploadId, key } = startRes.data;
      const partSize = 10 * 1024 * 1024;
      const numParts = Math.ceil(file.size / partSize);
      const urlsRes = await axios.post("http://localhost:4000/generate-presigned-url", {
        key,
        uploadId,
        parts: numParts,
      });

      const presignedUrls = urlsRes.data.urls;
      const uploadedParts = uploadStateRef.current[file.name]?.uploadedParts || [];

      for (let partNumber = uploadedParts.length; partNumber < numParts; partNumber++) {
        const start = partNumber * partSize;
        const end = Math.min(start + partSize, file.size);
        const blob = file.slice(start, end);

        const retryUpload = async (retry = 0) => {
          try {
            const uploadPartRes = await axios.put(presignedUrls[partNumber], blob, {
              headers: { "Content-Type": file.type },
              onUploadProgress: (event) => {
                const percent = Math.round((event.loaded * 100) / event.total);
                const overall = ((index + (partNumber + percent / 100) / numParts) / files.length) * 100;
                setProgress(Math.round(overall));
              },
            });

            const etag = uploadPartRes.headers.etag;
            uploadedParts.push({ ETag: etag, PartNumber: partNumber + 1 });
          } catch (err) {
            if (!navigator.onLine) {
              console.error("❌ Network disconnected.");
              uploadStateRef.current[file.name] = {
                file,
                key,
                uploadId,
                uploadedParts,
              };
              setInterrupted(true);
              throw new Error("Upload interrupted due to network failure");
            }

            if (retry < 3) {
              await retryUpload(retry + 1);
            } else {
              throw err;
            }
          }
        };

        await retryUpload();
      }

      await axios.post("http://localhost:4000/complete-multipart-upload", {
        key,
        uploadId,
        parts: uploadedParts,
      });

      if (uploadStateRef.current[file.name]) {
        delete uploadStateRef.current[file.name];
      }
    }
    setUploadedCount((prev) => prev + 1);
  };

  const handleUpload = async () => {
    if (!files.length) return;

    setIsUploading(true);
    setInterrupted(false);

    for (let i = 0; i < files.length; i++) {
      try {
        await uploadFile(files[i], i);
      } catch (err) {
        console.error("❌ Upload failed:", err);
        break;
      }
    }

    setIsUploading(false);
  };

  const handleResume = async () => {
    setIsUploading(true);
    setInterrupted(false);

    const pendingUploads = Object.values(uploadStateRef.current);
    for (const { file } of pendingUploads) {
      try {
        const index = files.findIndex((f) => f.name === file.name);
        await uploadFile(file, index);
      } catch (err) {
        console.error("❌ Resume failed:", err);
        break;
      }
    }

    setIsUploading(false);
    setInterrupted(false);
  };

  return (
    <div>
      <h2>Upload Files or Folders</h2>
      <input type="file" onChange={handleFileChange} multiple webkitdirectory="true" directory="true" />
      <button onClick={handleUpload} disabled={isUploading || !files.length}>
        {isUploading ? `Uploading... ${progress}% (${uploadedCount} of ${files.length})` : "Upload"}
      </button>

      {interrupted && (
        <div style={{ marginTop: "10px", color: "red" }}>
          Upload interrupted. <button onClick={handleResume}>Resume</button>
        </div>
      )}

      {isUploading && (
        <div>
          <progress value={progress} max="100" style={{ width: "100%" }} />
          <p>{uploadedCount} of {files.length} files uploaded.</p>
        </div>
      )}

      {!isUploading && uploadedCount === files.length && files.length > 0 && (
        <p style={{ color: "green" }}>✅ All files uploaded successfully!</p>
      )}
    </div>
  );
};

export default FileUploader;
