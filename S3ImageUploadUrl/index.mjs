import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const s3Client = new S3Client({ region: "eu-north-1" });

export const handler = async (event) => {
    try {
        const body = JSON.parse(event.body);

        const fileName = body.fileName;
        const contentType = body.contentType;
        const userId = body.userId; // or from auth context

        const key = `users/${userId}/images/${crypto.randomUUID()}-${fileName}`;

        const command = new PutObjectCommand({
            Bucket: "YOUR_BUCKET_NAME",
            Key: key,
            ContentType: contentType
        });

        const uploadUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 300
        });

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                uploadUrl,
                key
            })
        };

    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: err.message
            })
        };
    }
};