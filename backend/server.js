// const express = require("express");
// const AWS = require("aws-sdk");
// const bodyParser = require("body-parser");

// require("dotenv").config();

// const app = express();

// const PORT = process.env.PORT || 8080;

// // add body parser middleware for json
// app.use(bodyParser.json());

// // Handle CORS error
// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept, Authorization"
//   );
//   if (req.method === "OPTIONS") {
//     res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
//     return res.status(200).json({});
//   }
//   next();
// });

// // AWS S3 config
// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
//   signatureVersion: "v4",
// });

// // endpoint to check if API is live
// app.get("/", (req, res) => {
//   return res.status(200).send("API is live! 🎉😎");
// });

// // Generate single presigned url to upload file
// app.post("/generate-single-presigned-url", async (req, res) => {
//   try {
//     const fileName = req.body.fileName;

//     const params = {
//       Bucket: process.env.AWS_S3_BUCKET_NAME,
//       Key: fileName,
//       Expires: 60, // Expires in 60 seconds
//       ACL: "bucket-owner-full-control",
//     };

//     let url = await s3.getSignedUrlPromise("putObject", params);

//     return res.status(200).json({ url });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({ error: "Error generating presigned URL" });
//   }
// });

// // endpoint to start multipart upload
// app.post("/start-multipart-upload", async (req, res) => {
//   // initialization
//   let fileName = req.body.fileName;
//   let contentType = req.body.contentType;

//   const params = {
//     Bucket: process.env.AWS_S3_BUCKET_NAME,
//     Key: fileName,
//   };

//   // add extra params if content type is video
//   if (contentType == "VIDEO") {
//     params.ContentDisposition = "inline";
//     params.ContentType = "video/mp4";
//   }

//   try {
//     const multipart = await s3.createMultipartUpload(params).promise();
//     res.json({ uploadId: multipart.UploadId });
//   } catch (error) {
//     console.error("Error starting multipart upload:", error);
//     return res.status(500).json({ error: "Error starting multipart upload" });
//   }
// });

// // Generate presigned url for each multiparts
// app.post("/generate-presigned-url", async (req, res) => {
//   // get values from req body
//   const { fileName, uploadId, partNumbers } = req.body;
//   const totalParts = Array.from({ length: partNumbers }, (_, i) => i + 1);
//   try {
//     const presignedUrls = await Promise.all(
//       totalParts.map(async (partNumber) => {
//         const params = {
//           Bucket: process.env.AWS_S3_BUCKET_NAME,
//           Key: fileName,
//           PartNumber: partNumber,
//           UploadId: uploadId,
//           Expires: 3600 * 3,
//         };

//         return s3.getSignedUrl("uploadPart", {
//           ...params,
//         });
//       })
//     );
//     res.json({ presignedUrls });
//   } catch (error) {
//     console.error("Error generating pre-signed URLs:", error);
//     return res.status(500).json({ error: "Error generating pre-signed URLs" });
//   }
// });

// // Complete multipart upload
// app.post("/complete-multipart-upload", async (req, res) => {

//   // Req body
//   let fileName = req.body.fileName;
//   let uploadId = req.body.uploadId;
//   let parts = req.body.parts;

//   const params = {
//     Bucket: process.env.AWS_S3_BUCKET_NAME,
//     Key: fileName,
//     UploadId: uploadId,

//     MultipartUpload: {
//       Parts: parts.map((part, index) => ({
//         ETag: part.etag,
//         PartNumber: index + 1,
//       })),
//     },
//   };
//   try {
//     const data = await s3.completeMultipartUpload(params).promise();
//     res.status(200).json({ fileData: data });
//   } catch (error) {
//     console.error("Error completing multipart upload:", error);
//     return res.status(500).json({ error: "Error completing multipart upload" });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT} - http://localhost:${PORT}`);
// });


const express = require("express");
const AWS = require("aws-sdk");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

app.use(bodyParser.json());
AWS.config.logger = console; // Enable AWS SDK debugging



// AWS S3 Config
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  signatureVersion: "v4",
  httpOptions: {
    timeout: 80000, 
  }
});

// Health Check
app.get("/", (req, res) => res.send("API is live! "));

// Single Presigned URL
app.post("/generate-single-presigned-url", async (req, res) => {
  try {
    const fileName = req.body.fileName;
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileName,
      Expires: 60,
      ACL: "bucket-owner-full-control",
    };
    const url = await s3.getSignedUrlPromise("putObject", params);
    res.json({ url });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({ error: "Failed to generate presigned URL" });
  }
});


// Start Multipart Upload
app.post("/start-multipart-upload", async (req, res) => {
  const { fileName, contentType } = req.body;

  console.log("Starting multipart upload for file:", fileName);

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileName, 
    ContentType: contentType,
  };

  // If it's a video, set specific content type and disposition
  if (contentType === "VIDEO") {
    params.ContentDisposition = "inline";
    params.ContentType = "video/mp4";
  }

  try {
    const multipart = await s3.createMultipartUpload(params).promise();
    console.log("Multipart upload started successfully. UploadId:", multipart.UploadId );
    res.json({ uploadId: multipart.UploadId  , key: fileName});
  } catch (error) {
    console.error("Error starting multipart upload:", error); // Log full error details
    res.status(500).json({ error: `Failed to start multipart upload: ${error.message}` });
  }
});


// Generate URLs for Multipart
app.post("/generate-presigned-url", async (req, res) => {
  const { fileName, uploadId, partNumbers } = req.body;
  const totalParts = Array.from({ length: partNumbers }, (_, i) => i + 1);

  try {
    const presignedUrls = await Promise.all(
      totalParts.map((partNumber) => {
        const params = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: fileName,
          PartNumber: partNumber,
          UploadId: uploadId,
          Expires: 3600,
        };
        return s3.getSignedUrlPromise("uploadPart", params);
      })
    );
    res.json({ presignedUrls });
  } catch (error) {
    console.error("Error generating multipart URLs:", error);
    res.status(500).json({ error: "Failed to generate multipart URLs" });
  }
});

// Complete Multipart
app.post("/complete-multipart-upload", async (req, res) => {
  const { fileName, uploadId, parts } = req.body;

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileName,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.map((part, index) => ({
        ETag: part.etag,
        PartNumber: index + 1,
      })),
    },
  };

  try {
    const data = await s3.completeMultipartUpload(params).promise();
    res.json({ fileData: data });
  } catch (error) {
    console.error("Error completing multipart upload:", error);
    res.status(500).json({ error: "Failed to complete multipart upload" });
  }
});


// List All Files in S3 Bucket
app.get("/list-files", async (req, res) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
  };

  try {
    const data = await s3.listObjectsV2(params).promise();
    console.log("S3 Files:", data.Contents);

    const files = data.Contents.map((item) => ({
      key: item.Key,
      lastModified: item.LastModified,
      size: item.Size,
    }));
    res.json({ files });
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).json({ error: "Failed to list files" });
  }
});

// Generate Download URL for a File
app.get("/generate-download-url", async (req, res) => {
  const { fileName } = req.query;

  if (!fileName) {
    return res.status(400).json({ error: "Missing fileName query parameter" });
  }

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileName,
    Expires: 60, // URL valid for 1 minute
    ResponseContentDisposition: "attachment", // forces download
  };

  try {
    const url = await s3.getSignedUrlPromise("getObject", params);

    res.json({ url });
  } catch (error) {
    console.error("Error generating download URL:", error);
    res.status(500).json({ error: "Failed to generate download URL" });
  }
});


app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
